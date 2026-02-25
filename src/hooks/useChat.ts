'use client';

import { useState, useCallback } from 'react';
import { Message, AgentRole } from '@/lib/types/messages';

export function useChat(sessionId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
    const [toolCalls, setToolCalls] = useState<any[]>([]);

    const sendMessage = useCallback(async (content: string) => {
        setIsLoading(true);
        setToolCalls([]);
        setMessages(prev => [...prev, {
            id: 'temp-' + Date.now(),
            session_id: sessionId,
            role: 'richard',
            content,
            created_at: new Date().toISOString()
        }]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: content }),
            });

            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let currentAgentMsg: Message | null = null;
            let currentEvent: string | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith('event: ')) {
                        currentEvent = trimmedLine.replace('event: ', '');
                        continue;
                    }

                    if (trimmedLine.startsWith('data: ') && currentEvent) {
                        try {
                            const data = JSON.parse(trimmedLine.replace('data: ', ''));

                            if (currentEvent === 'agent_start') {
                                setActiveAgent(data.agent);
                                currentAgentMsg = {
                                    id: 'temp-agent-' + Date.now(),
                                    session_id: sessionId,
                                    role: data.agent,
                                    content: '',
                                    created_at: new Date().toISOString()
                                };
                                setMessages(prev => [...prev.filter(m => !m.id.startsWith('temp-agent-')), currentAgentMsg!]);
                            }

                            if (currentEvent === 'token') {
                                if (currentAgentMsg) {
                                    currentAgentMsg.content += data.token;
                                    setMessages(prev => prev.map(m => m.id === currentAgentMsg?.id ? { ...currentAgentMsg } : m));
                                }
                            }

                            if (currentEvent === 'tool_start') {
                                setToolCalls(prev => [...prev, { ...data, status: 'pending', id: Date.now() }]);
                            }

                            if (currentEvent === 'tool_complete') {
                                setToolCalls(prev => prev.map(tc => tc.toolName === data.toolName ? { ...tc, status: 'success', result: data.result } : tc));
                            }

                            if (currentEvent === 'agent_complete') {
                                setActiveAgent(null);
                                if (currentAgentMsg) {
                                    currentAgentMsg.id = data.messageId;
                                    if (data.crossCheck) {
                                        currentAgentMsg.cross_check_status = data.crossCheck.status;
                                        currentAgentMsg.cross_check_detail = data.crossCheck.detail;
                                    }
                                    setMessages(prev => prev.map(m => m.id.startsWith('temp-agent-') ? { ...currentAgentMsg } as Message : m));
                                }
                            }

                            if (currentEvent === 'error') {
                                console.error('Stream error:', data.message);
                                setMessages(prev => [...prev, {
                                    id: 'error-' + Date.now(),
                                    session_id: sessionId,
                                    role: 'system' as any,
                                    content: `⚠️ Error: ${data.message}`,
                                    created_at: new Date().toISOString()
                                }]);
                            }
                        } catch (e) {
                            // Part of a multi-line JSON or malformed chunk
                        }
                        currentEvent = null;
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            setIsLoading(false);
            setActiveAgent(null);
        }
    }, [sessionId]);

    return {
        messages,
        setMessages,
        isLoading,
        sendMessage,
        activeAgent,
        toolCalls
    };
}
