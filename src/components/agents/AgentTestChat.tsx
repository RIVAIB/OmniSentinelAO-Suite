'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Bot, User, Zap } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    agent?: string;
    timestamp: Date;
}

interface AgentTestChatProps {
    agentId: string;
    agentName: string;
    agentIcon: string;
    accentColor: string;
    onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
    cyan: 'var(--accent-cyan)',
    violet: 'var(--accent-violet)',
    glass: 'var(--accent-cyan)',
};

export default function AgentTestChat({
    agentId,
    agentName,
    agentIcon,
    accentColor,
    onClose,
}: AgentTestChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [convId, setConvId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const accent = COLOR_MAP[accentColor] ?? 'var(--accent-cyan)';

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage() {
        const text = input.trim();
        if (!text || sending) return;

        setMessages((prev) => [
            ...prev,
            { role: 'user', content: text, timestamp: new Date() },
        ]);
        setInput('');
        setSending(true);

        try {
            const res = await fetch(`/api/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversationId: convId ?? undefined,
                }),
            });

            const json = (await res.json()) as {
                data?: { conversationId: string; response: string; agentName: string };
                error?: string;
            };

            if (json.data) {
                if (!convId) setConvId(json.data.conversationId);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: json.data!.response,
                        agent: json.data!.agentName,
                        timestamp: new Date(),
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: `❌ Error: ${json.error ?? 'Unknown error'}`,
                        timestamp: new Date(),
                    },
                ]);
            }
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `❌ Network error: ${err instanceof Error ? err.message : String(err)}`,
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Modal */}
            <div
                className="relative flex flex-col w-full max-w-lg h-[600px] rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(10,10,15,0.95)',
                    border: `1px solid ${accent}30`,
                    boxShadow: `0 0 60px ${accent}15, 0 25px 50px rgba(0,0,0,0.6)`,
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: `1px solid ${accent}20` }}
                >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
                    >
                        {agentIcon}
                    </div>
                    <div>
                        <p
                            className="text-sm font-bold tracking-widest"
                            style={{ color: accent, fontFamily: 'var(--font-space-grotesk)' }}
                        >
                            {agentName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Modo prueba — webchat
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span
                            className="text-[10px] font-mono px-2 py-1 rounded-full"
                            style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}20` }}
                        >
                            <Zap size={9} className="inline mr-1" />TEST
                        </span>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1.5 transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                            <Bot size={32} style={{ color: accent }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Envía un mensaje para iniciar
                            </p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div
                                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                                style={
                                    msg.role === 'user'
                                        ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }
                                        : { background: `${accent}18`, color: accent }
                                }
                            >
                                {msg.role === 'user' ? <User size={12} /> : agentIcon}
                            </div>
                            <div
                                className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                                style={
                                    msg.role === 'user'
                                        ? {
                                            background: `${accent}18`,
                                            border: `1px solid ${accent}25`,
                                            color: 'var(--text-primary)',
                                        }
                                        : {
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'var(--text-primary)',
                                        }
                                }
                            >
                                {msg.content}
                                <div
                                    className="text-[10px] mt-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div className="flex gap-2.5">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                                style={{ background: `${accent}18`, color: accent }}
                            >
                                {agentIcon}
                            </div>
                            <div
                                className="rounded-2xl px-4 py-3 flex items-center gap-2"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <Loader2 size={14} className="animate-spin" style={{ color: accent }} />
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>respondiendo…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div
                    className="px-4 py-3 flex items-end gap-2 flex-shrink-0"
                    style={{ borderTop: `1px solid ${accent}15` }}
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder={`Escribe a ${agentName}…`}
                        rows={1}
                        disabled={sending}
                        className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${input ? accent + '40' : 'rgba(255,255,255,0.10)'}`,
                            color: 'var(--text-primary)',
                            minHeight: '44px',
                            maxHeight: '120px',
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={sending || !input.trim()}
                        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                        style={{
                            background: sending || !input.trim() ? 'rgba(255,255,255,0.05)' : accent,
                            color: sending || !input.trim() ? 'var(--text-muted)' : '#0a0a0f',
                            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );

    // Use portal to render outside the card's stacking context
    if (!mounted) return null;
    return createPortal(modalContent, document.body);
}
