'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, Bot, User, RotateCcw, X } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    agentName?: string;
}

interface Conversation {
    id: string;
    channel: string;
    contact_id: string;
    status: string;
    agent_id?: string | null;
    agents?: { id: string; name: string } | null;
    messages: StoredMessage[];
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

interface AgentOption { id: string; name: string; }

const STATUS_LABEL: Record<string, string> = {
    active: 'Activa', closed: 'Cerrada', escalated: 'Escalada',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const bottomRef = useRef<HTMLDivElement>(null);

    const [conv, setConv] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [agents, setAgents] = useState<AgentOption[]>([]);
    const [closing, setClosing] = useState(false);
    const [reassigning, setReassigning] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState('');

    // Fetch conversation
    const loadConv = useCallback(async () => {
        const res = await fetch(`/api/conversations/${id}`);
        const json = await res.json() as { data?: Conversation };
        if (json.data) {
            setConv(json.data);
            setSelectedAgent(json.data.agents?.id ?? '');
        }
        setLoading(false);
    }, [id]);

    // Fetch agents for reassign dropdown
    useEffect(() => {
        fetch('/api/agents')
            .then(r => r.json())
            .then((j: { data?: AgentOption[] }) => setAgents(j.data ?? []));
    }, []);

    useEffect(() => { loadConv(); }, [loadConv]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.messages]);

    // Send staff reply
    async function sendReply() {
        if (!reply.trim() || sending) return;
        setSending(true);
        try {
            await fetch(`/api/conversations/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: reply, role: 'assistant' }),
            });
            setReply('');
            await loadConv();
        } finally {
            setSending(false);
        }
    }

    // Close conversation
    async function closeConversation() {
        setClosing(true);
        await fetch(`/api/conversations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'closed' }),
        });
        await loadConv();
        setClosing(false);
    }

    // Reassign agent
    async function reassign() {
        if (!selectedAgent) return;
        setReassigning(true);
        await fetch(`/api/conversations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: selectedAgent }),
        });
        await loadConv();
        setReassigning(false);
    }

    if (loading) return <PageLoader rows={5} />;
    if (!conv) return (
        <div className="p-6">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft size={16} /> Volver
            </button>
            <p style={{ color: 'var(--text-muted)' }}>Conversación no encontrada.</p>
        </div>
    );

    const contactName = (conv.metadata?.contactName as string) ?? conv.contact_id;
    const messages = Array.isArray(conv.messages) ? conv.messages : [];

    return (
        <div className="flex flex-col h-screen">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{ background: 'radial-gradient(ellipse at 30% 10%, rgba(34,211,238,0.03) 0%, transparent 50%)' }}
            />

            {/* Header */}
            <div
                className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.80)', backdropFilter: 'blur(12px)' }}
            >
                <button onClick={() => router.push('/conversations')} style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{contactName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {conv.channel} · {STATUS_LABEL[conv.status] ?? conv.status} · {messages.length} mensajes
                        {conv.agents && ` · ${conv.agents.name}`}
                    </p>
                </div>

                {/* Reassign */}
                <div className="flex gap-2 items-center">
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-secondary)' }}
                    >
                        <option value="">Sin agente</option>
                        {agents.map((a) => (
                            <option key={a.id} value={a.id} style={{ background: '#0a0a0f' }}>{a.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={reassign}
                        disabled={reassigning}
                        className="px-2 py-1.5 rounded-lg text-xs"
                        style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', color: 'var(--accent-violet)' }}
                    >
                        {reassigning ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                    </button>

                    {conv.status !== 'closed' && (
                        <button
                            onClick={closeConversation}
                            disabled={closing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}
                        >
                            {closing ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                            Cerrar
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                {messages.length === 0 && (
                    <p className="text-center text-sm mt-8" style={{ color: 'var(--text-muted)' }}>
                        Sin mensajes aún
                    </p>
                )}
                {messages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={i} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                                style={
                                    isUser
                                        ? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }
                                        : { background: 'rgba(34,211,238,0.10)', color: 'var(--accent-cyan)' }
                                }
                            >
                                {isUser ? <User size={12} /> : <Bot size={12} />}
                            </div>

                            <div className="max-w-[72%]">
                                {/* Agent name */}
                                {!isUser && msg.agentName && (
                                    <p className="text-[10px] font-mono mb-1 ml-1" style={{ color: 'var(--accent-violet)' }}>
                                        {msg.agentName}
                                    </p>
                                )}
                                {/* Bubble */}
                                <div
                                    className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                                    style={
                                        isUser
                                            ? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }
                                            : { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)', color: 'var(--text-primary)' }
                                    }
                                >
                                    {msg.content}
                                </div>
                                <p className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)', textAlign: isUser ? 'right' : 'left' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            {conv.status !== 'closed' && (
                <div
                    className="flex-shrink-0 flex items-end gap-3 px-5 py-4"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,10,15,0.80)', backdropFilter: 'blur(12px)' }}
                >
                    <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                        }}
                        placeholder="Escribe una respuesta…"
                        rows={2}
                        className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed px-3 py-2 rounded-xl"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            color: 'var(--text-primary)',
                        }}
                    />
                    <button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-105 disabled:opacity-40"
                        style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.22)', color: 'var(--accent-cyan)' }}
                    >
                        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                </div>
            )}
        </div>
    );
}
