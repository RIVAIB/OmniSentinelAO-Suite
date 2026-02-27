'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Bot, Zap, Wrench, AlertCircle } from 'lucide-react';
import AgentCard from '@/components/agents/AgentCard';
import type { AgentMeta } from '@/data/agents';
import { ACCENT_CSS } from '@/data/agents';
import type { AgentType, AgentStatus } from '@/types/database';

type FilterType = AgentType | 'all';
type FilterStatus = AgentStatus | 'all';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApiAgent {
    id: string;
    name: string;
    type: string;
    status: string;
    role?: string;
    config?: Record<string, unknown>;
}

function toAgentMeta(a: ApiAgent): AgentMeta & { id: string } {
    const ICON_MAP: Record<string, string> = {
        orchestrator: '🧠',
        specialist: '💬',
        utility: '⚙️',
    };
    const COLOR_MAP: Record<string, string> = {
        orchestrator: 'cyan',
        specialist: 'violet',
        utility: 'glass',
    };
    const configObj = (a.config ?? {}) as Record<string, unknown>;
    return {
        id: a.id,
        codename: a.name,
        name: a.name,
        type: a.type as AgentMeta['type'],
        status: a.status as AgentMeta['status'],
        role: (configObj.description as string) ?? a.role ?? a.name,
        accentColor: COLOR_MAP[a.type] ?? 'cyan',
        icon: ICON_MAP[a.type] ?? '🤖',
        config: configObj,
        integrations: (configObj.channels as string[]) ?? [],
    };
}

// ─── Filter config ────────────────────────────────────────────────────────

const TYPE_FILTERS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Todos', icon: <Bot size={13} /> },
    { value: 'orchestrator', label: 'Orquestador', icon: <Zap size={13} /> },
    { value: 'specialist', label: 'Especialistas', icon: <Bot size={13} /> },
    { value: 'utility', label: 'Utilidades', icon: <Wrench size={13} /> },
];

const STATUS_FILTERS: { value: FilterStatus; label: string; color: string }[] = [
    { value: 'all', label: 'Todos', color: 'var(--text-muted)' },
    { value: 'active', label: 'Activo', color: 'var(--accent-emerald)' },
    { value: 'inactive', label: 'Inactivo', color: 'var(--text-muted)' },
    { value: 'maintenance', label: 'Mantenimiento', color: 'var(--accent-amber)' },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────

function AgentCardSkeleton() {
    return (
        <div
            className="glass-panel p-5 flex flex-col gap-4 animate-pulse"
            style={{ minHeight: 220 }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="w-11 h-11 rounded-2xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="h-3 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="h-5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="h-3 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
            <div className="flex gap-2 mt-auto pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 h-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="flex-1 h-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-8 w-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AgentsPage() {
    const [agents, setAgents] = useState<(AgentMeta & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchAgents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (typeFilter !== 'all') params.set('type', typeFilter);

            const res = await fetch(`/api/agents?${params.toString()}`);
            if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

            const json = await res.json();
            const raw: ApiAgent[] = json.data ?? [];
            setAgents(raw.map(toAgentMeta));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar agentes');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // ── Toggle status via PATCH ────────────────────────────────────────────
    async function handleToggle(id: string, newStatus: string) {
        const res = await fetch(`/api/agents/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.message ?? `Error ${res.status}`);
        }
        // Optimistic update: flip status locally, then re-fetch
        setAgents((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: newStatus as AgentStatus } : a))
        );
        // Re-fetch to stay in sync (respects current filters)
        fetchAgents();
    }

    // ── Local search filter (client-side for instant feel) ────────────────
    const filtered = agents.filter((agent) => {
        if (search === '') return true;
        return (
            agent.codename.toLowerCase().includes(search.toLowerCase()) ||
            agent.role.toLowerCase().includes(search.toLowerCase())
        );
    });

    const stats = {
        total: agents.length,
        active: agents.filter((a) => a.status === 'active').length,
        maintenance: agents.filter((a) => a.status === 'maintenance').length,
    };

    // suppress unused import warning for ACCENT_CSS (used in AgentCard children)
    void ACCENT_CSS;

    return (
        <div className="p-6 lg:p-8 flex flex-col gap-6 min-h-full">
            {/* Ambient glow */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                    background:
                        'radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 50%)',
                }}
            />

            {/* ── Header ── */}
            <header>
                <h1
                    className="text-2xl font-bold"
                    style={{
                        fontFamily: 'var(--font-space-grotesk)',
                        background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    Agentes IA
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Gestión y monitoreo de agentes del sistema
                </p>

                {/* Stats pills */}
                {!loading && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {[
                            { label: `${stats.total} agentes`, color: 'var(--text-secondary)' },
                            { label: `${stats.active} activos`, color: 'var(--accent-emerald)' },
                            { label: `${stats.maintenance} en mantenimiento`, color: 'var(--accent-amber)' },
                        ].map((s) => (
                            <span
                                key={s.label}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-full glass-panel-sm"
                                style={{ color: s.color }}
                            >
                                {s.label}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            {/* ── Error banner ── */}
            {error && (
                <div
                    className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-sm"
                    style={{
                        background: 'rgba(239,68,68,0.10)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#fca5a5',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => { setError(null); fetchAgents(); }}
                        className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* ── Search + Filters ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                        type="search"
                        placeholder="Buscar por nombre o rol..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            color: 'var(--text-primary)',
                        }}
                    />
                </div>

                {/* Type filter */}
                <div className="flex gap-1.5 flex-wrap">
                    {TYPE_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setTypeFilter(f.value)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                            style={{
                                background: typeFilter === f.value
                                    ? 'rgba(34,211,238,0.12)'
                                    : 'rgba(255,255,255,0.04)',
                                color: typeFilter === f.value
                                    ? 'var(--accent-cyan)'
                                    : 'var(--text-muted)',
                                border: typeFilter === f.value
                                    ? '1px solid rgba(34,211,238,0.22)'
                                    : '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="flex gap-1.5">
                    <Filter size={14} className="self-center flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                            style={{
                                background: statusFilter === f.value ? `${f.color}15` : 'rgba(255,255,255,0.04)',
                                color: statusFilter === f.value ? f.color : 'var(--text-muted)',
                                border: statusFilter === f.value
                                    ? `1px solid ${f.color}30`
                                    : '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Results info ── */}
            {!loading && (
                <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Mostrando{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{filtered.length}</span>{' '}
                        de {agents.length} agentes
                    </span>
                    {(typeFilter !== 'all' || statusFilter !== 'all' || search) && (
                        <button
                            onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
                            className="text-[11px] px-2 py-0.5 rounded-full transition-colors"
                            style={{
                                color: 'var(--accent-cyan)',
                                background: 'rgba(34,211,238,0.08)',
                                border: '1px solid rgba(34,211,238,0.15)',
                            }}
                        >
                            Limpiar filtros ✕
                        </button>
                    )}
                </div>
            )}

            {/* ── Agent Grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <AgentCardSkeleton key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div
                    className="glass-panel p-12 text-center"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <Bot size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                        {agents.length === 0
                            ? 'No hay agentes en la base de datos aún.'
                            : 'No se encontraron agentes con esos filtros.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((agent, i) => (
                        <div
                            key={agent.id}
                            className="animate-slide-in-up"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <AgentCard
                                agent={agent}
                                onToggle={handleToggle}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
