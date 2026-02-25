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

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (!line.startsWith('event: ')) continue;
                    const eventMatch = line.match(/event: (.*)\ndata: (([\s\S]*))/);
                    if (!eventMatch) continue;

                    const event = eventMatch[1];
                    const data = JSON.parse(eventMatch[2]);

                    if (event === 'agent_start') {
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

                    if (event === 'token') {
                        if (currentAgentMsg) {
                            currentAgentMsg.content += data.token;
                            setMessages(prev => prev.map(m => m.id === currentAgentMsg?.id ? { ...currentAgentMsg } : m));
                        }
                    }

                    if (event === 'tool_start') {
                        setToolCalls(prev => [...prev, { ...data, status: 'pending', id: Date.now() }]);
                    }

                    if (event === 'tool_complete') {
                        setToolCalls(prev => prev.map(tc => tc.toolName === data.toolName ? { ...tc, status: 'success', result: data.result } : tc));
                    }

                    if (event === 'agent_complete') {
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
