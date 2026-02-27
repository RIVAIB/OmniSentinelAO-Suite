'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, MessageSquare } from 'lucide-react';
import ConversationRow from '@/components/conversations/ConversationRow';
import PageLoader from '@/components/ui/PageLoader';
import EmptyState from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
    id: string;
    channel: string;
    contact_id: string;
    contact_name?: string;
    status: string;
    assigned_agent?: string | null;
    last_message?: { content: string; role: string; timestamp: string } | null;
    message_count?: number;
    updated_at: string;
}

interface PaginatedResponse {
    data: Conversation[];
    pagination: { total: number; limit: number; offset: number; totalPages: number };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
    const router = useRouter();
    const [convs, setConvs] = useState<Conversation[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [channel, setChannel] = useState('');
    const [status, setStatus] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (channel) p.set('channel', channel);
            if (status) p.set('status', status);
            if (search) p.set('search', search);
            p.set('limit', '50');

            const res = await fetch(`/api/conversations?${p}`);
            const json = await res.json() as PaginatedResponse;
            setConvs(json.data ?? []);
            setTotal(json.pagination?.total ?? 0);
        } finally {
            setLoading(false);
        }
    }, [channel, status, search]);

    useEffect(() => { load(); }, [load]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(load, 320);
        return () => clearTimeout(t);
    }, [search]);

    if (loading) return <PageLoader rows={8} />;

    return (
        <div className="p-6 flex flex-col gap-5">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(52,211,153,0.04) 0%, transparent 55%)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-2xl font-bold"
                        style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                    >
                        Conversaciones
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {total} conversación{total !== 1 ? 'es' : ''}
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-secondary)' }}
                >
                    <RefreshCw size={13} /> Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-48"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Search size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar contacto…"
                        className="bg-transparent text-sm outline-none flex-1"
                        style={{ color: 'var(--text-primary)' }}
                    />
                </div>

                {/* Channel filter */}
                <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
                >
                    <option value="">Todos los canales</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="webchat">WebChat</option>
                    <option value="telegram">Telegram</option>
                    <option value="internal">Interno</option>
                </select>

                {/* Status filter */}
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
                >
                    <option value="">Todos los estados</option>
                    <option value="active">Activa</option>
                    <option value="closed">Cerrada</option>
                    <option value="escalated">Escalada</option>
                </select>
            </div>

            {/* List */}
            {convs.length === 0 ? (
                <EmptyState
                    icon={MessageSquare}
                    title="Sin conversaciones"
                    description="Las conversaciones aparecerán aquí cuando lleguen mensajes por cualquier canal."
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {convs.map((c) => (
                        <ConversationRow
                            key={c.id}
                            conversation={c}
                            onClick={() => router.push(`/conversations/${c.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
