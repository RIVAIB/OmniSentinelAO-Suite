'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import KPICard from '@/components/dashboard/KPICard';
import AgentCard from '@/components/agents/AgentCard';
import MissionPipeline from '@/components/missions/MissionPipeline';
import LiveFeed from '@/components/live-feed/LiveFeed';
import VirtualOffice from '@/components/virtual-office/VirtualOffice';
import type { AgentMeta } from '@/data/agents';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { MessageSquare, Clock, Bot, Power, Zap, FlaskConical } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiAgent {
    id: string;
    name: string;
    type: string;
    status: string;
    role?: string;
    config?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}

interface RuntimeStatus {
    running: boolean;
    activeMissions: number;
    startedAt?: string | null;
}

function toAgentMeta(a: ApiAgent): AgentMeta & { id: string } {
    const ICON_MAP: Record<string, string> = { orchestrator: '🧠', specialist: '💬', utility: '⚙️' };
    const COLOR_MAP: Record<string, string> = { orchestrator: 'cyan', specialist: 'violet', utility: 'glass' };
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

// ─── Runtime Controls Strip ───────────────────────────────────────────────────

function RuntimeControl({ onStatusChange }: { onStatusChange?: (s: RuntimeStatus) => void }) {
    const [status, setStatus] = useState<RuntimeStatus | null>(null);
    const [toggling, setToggling] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        fetch('/api/runtime')
            .then((r) => r.json())
            .then((j: { data?: RuntimeStatus }) => setStatus(j.data ?? null))
            .catch(() => { });
    }, []);

    async function toggle() {
        if (toggling) return;
        setToggling(true);
        try {
            const method = status?.running ? 'DELETE' : 'POST';
            const res = await fetch('/api/runtime', { method });
            const json = await res.json() as { data?: { status?: RuntimeStatus } };
            const next = json.data?.status ?? null;
            setStatus(next);
            onStatusChange?.(next as RuntimeStatus);
        } finally {
            setToggling(false);
        }
    }

    async function generateTestEvents() {
        if (testing) return;
        setTesting(true);
        try {
            await fetch('/api/events/test', { method: 'POST' });
        } finally {
            setTesting(false);
        }
    }

    const isRunning = status?.running ?? false;

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* Status dot */}
            <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                    background: isRunning ? 'var(--accent-emerald)' : '#f87171',
                    boxShadow: isRunning ? '0 0 8px var(--accent-emerald)' : 'none',
                    animation: isRunning ? 'pulse 2s infinite' : 'none',
                }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: isRunning ? 'var(--accent-emerald)' : '#f87171' }}>
                    Runtime {isRunning ? 'Activo' : 'Detenido'}
                </p>
                {isRunning && status?.activeMissions !== undefined && (
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {status.activeMissions} misión{status.activeMissions !== 1 ? 'es' : ''} en ejecución
                    </p>
                )}
            </div>

            {/* Test Events button */}
            <button
                onClick={generateTestEvents}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: 'var(--accent-violet)' }}
                title="Generar eventos de prueba en Live Feed"
            >
                <FlaskConical size={12} />
                {testing ? 'Generando…' : 'Test'}
            </button>

            {/* Start/Stop */}
            <button
                onClick={toggle}
                disabled={toggling}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
                style={{
                    background: isRunning ? 'rgba(239,68,68,0.10)' : 'rgba(52,211,153,0.10)',
                    border: isRunning ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(52,211,153,0.22)',
                    color: isRunning ? '#f87171' : 'var(--accent-emerald)',
                }}
            >
                <Power size={12} />
                {toggling ? '…' : isRunning ? 'Detener' : 'Iniciar'}
            </button>
        </div>
    );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function KPISkeleton() {
    return (
        <div className="glass-panel p-5 flex flex-col gap-3 animate-pulse" style={{ minHeight: 110 }}>
            <div className="h-4 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-8 w-16 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="h-3 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
    );
}

function AgentCardSkeleton() {
    return (
        <div className="glass-panel p-5 flex flex-col gap-4 animate-pulse" style={{ minHeight: 200 }}>
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <div className="h-3 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
            </div>
            <div className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [agents, setAgents] = useState<(AgentMeta & { id: string })[]>([]);
    const [runningCount, setRunningCount] = useState<number>(0);
    const [convsToday, setConvsToday] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashView, setDashView] = useState<'main' | 'office'>('main');

    const { conversations: recentConvs } = useRealtimeConversations({ limit: 5 });

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true); setError(null);
            try {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const [agentsRes, missionsRes, convsRes] = await Promise.all([
                    fetch('/api/agents'),
                    fetch('/api/missions?status=running'),
                    fetch(`/api/conversations?since=${todayStart.toISOString()}`).catch(() => null),
                ]);
                if (!agentsRes.ok) throw new Error(`Agents API: ${agentsRes.status}`);
                if (!missionsRes.ok) throw new Error(`Missions API: ${missionsRes.status}`);
                const agentsJson = await agentsRes.json();
                const missionsJson = await missionsRes.json();
                if (cancelled) return;
                setAgents((agentsJson.data ?? []).map(toAgentMeta));
                setRunningCount(missionsJson.total ?? missionsJson.data?.length ?? 0);
                if (convsRes?.ok) {
                    const convsJson = await convsRes.json();
                    setConvsToday(convsJson.total ?? convsJson.data?.length ?? 0);
                }
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Error al cargar datos');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();

        // Auto-start runtime if enabled in settings
        if (typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem('settings_general');
                if (raw) {
                    const parsed = JSON.parse(raw) as { autoStart?: boolean };
                    if (parsed.autoStart) {
                        fetch('/api/runtime')
                            .then((r) => r.json())
                            .then((j: { data?: { running?: boolean } }) => {
                                if (!j.data?.running) {
                                    fetch('/api/runtime', { method: 'POST' }).catch(() => { });
                                }
                            })
                            .catch(() => { });
                    }
                }
            } catch { }
        }

        return () => { cancelled = true; };
    }, []);

    const activeCount = agents.filter((a) => a.status === 'active').length;
    const activeAgents = agents.filter((a) => a.status === 'active');
    const otherAgents = agents.filter((a) => a.status !== 'active');

    const KPIS = [
        { title: 'Agentes Activos', value: loading ? '—' : activeCount, icon: '🤖', trend: 'up' as const, trendValue: '+1', description: 'vs. semana pasada', accentColor: 'var(--accent-cyan)' },
        { title: 'Misiones en Marcha', value: loading ? '—' : runningCount, icon: '🎯', trend: 'neutral' as const, description: 'Con status running', accentColor: 'var(--accent-violet)' },
        { title: 'Conversaciones Hoy', value: loading ? '—' : convsToday, icon: '💬', trend: 'neutral' as const, description: 'Canales activos hoy', accentColor: 'var(--accent-emerald)' },
        { title: 'Pacientes Registrados', value: '7,000+', icon: '🏥', trend: 'up' as const, trendValue: '+12%', description: 'Crecimiento mensual', accentColor: 'var(--accent-amber)' },
    ];

    return (
        // Outer wrapper: main content + LiveFeed panel side by side
        <div className="flex h-full">

            {/* ─── Main content area ─────────────────────────────────────────── */}
            <div className="flex-1 p-6 lg:p-8 flex flex-col gap-8">

                {/* Ambient glows */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    aria-hidden="true"
                    style={{
                        background:
                            'radial-gradient(ellipse at 30% 0%, rgba(34,211,238,0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(139,92,246,0.05) 0%, transparent 50%)',
                    }}
                />

                {/* Page Header */}
                <header className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1
                            className="text-2xl font-bold gradient-text"
                            style={{ fontFamily: 'var(--font-space-grotesk)' }}
                        >
                            Mission Control
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Centro de orquestación — RIVAIB Health Clinic
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View toggle */}
                        <div
                            className="flex rounded-xl p-0.5"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {(['main', 'office'] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setDashView(v)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{
                                        background: dashView === v ? 'rgba(34,211,238,0.12)' : 'transparent',
                                        color: dashView === v ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                        border: dashView === v ? '1px solid rgba(34,211,238,0.18)' : '1px solid transparent',
                                    }}
                                >
                                    {v === 'main' ? '📊 Dashboard' : '🏢 Oficina Virtual'}
                                </button>
                            ))}
                        </div>
                        {/* Live badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-sm">
                            <span className="status-dot status-dot-active" />
                            <span className="text-xs font-mono" style={{ color: 'var(--accent-emerald)' }}>EN VIVO</span>
                        </div>
                    </div>
                </header>

                {/* Runtime Control Strip */}
                <RuntimeControl />

                {/* Error banner */}
                {error && (
                    <div
                        className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-sm"
                        style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
                    >
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                {dashView === 'main' ? (
                    <>
                        {/* KPI Row */}
                        <section aria-label="KPIs">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {loading
                                    ? Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
                                    : KPIS.map((kpi, i) => (
                                        <KPICard
                                            key={kpi.title}
                                            title={kpi.title}
                                            value={kpi.value}
                                            icon={kpi.icon}
                                            trend={kpi.trend}
                                            trendValue={kpi.trendValue}
                                            description={kpi.description}
                                            accentColor={kpi.accentColor}
                                            animationDelay={i * 60}
                                        />
                                    ))}
                            </div>
                        </section>

                        {/* Active Agents */}
                        <section aria-label="Agentes activos">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                    Agentes Activos
                                </h2>
                                <a
                                    href="/agents"
                                    className="text-xs px-3 py-1 rounded-full transition-colors"
                                    style={{ color: 'var(--accent-cyan)', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}
                                >
                                    Ver todos →
                                </a>
                            </div>
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {Array.from({ length: 3 }).map((_, i) => <AgentCardSkeleton key={i} />)}
                                </div>
                            ) : activeAgents.length === 0 ? (
                                <div className="glass-panel p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                    🤖 No hay agentes activos.{' '}
                                    <a href="/agents" style={{ color: 'var(--accent-cyan)' }}>Administrar agentes →</a>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {activeAgents.map((agent, i) => (
                                        <div key={agent.id} className="animate-slide-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                                            <AgentCard agent={agent} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Inactive Agents */}
                        {!loading && otherAgents.length > 0 && (
                            <section aria-label="Agentes inactivos">
                                <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                                    Inactivos / Mantenimiento
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {otherAgents.map((agent, i) => (
                                        <div
                                            key={agent.id}
                                            className="animate-slide-in-up"
                                            style={{ animationDelay: `${(activeAgents.length + i) * 80}ms`, opacity: 0.7 }}
                                        >
                                            <AgentCard agent={agent} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Mission Pipeline */}
                        <section
                            aria-label="Mission pipeline"
                            className="glass-panel p-5 animate-slide-in-up"
                            style={{ animationDelay: `${agents.length * 80 + 100}ms` }}
                        >
                            <MissionPipeline />
                        </section>

                        {/* Recent Conversations */}
                        <section aria-label="Últimas conversaciones">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                    Últimas Conversaciones
                                </h2>
                                <Link
                                    href="/conversations"
                                    className="text-xs px-3 py-1 rounded-full transition-colors"
                                    style={{ color: 'var(--accent-emerald)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
                                >
                                    Ver todas →
                                </Link>
                            </div>
                            {recentConvs.length === 0 ? (
                                <div className="glass-panel p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                                    <MessageSquare size={20} className="mx-auto mb-2 opacity-40" />
                                    No hay conversaciones aún
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentConvs.slice(0, 5).map((conv) => {
                                        const last = conv.messages.at(-1);
                                        return (
                                            <Link
                                                key={conv.id}
                                                href={`/conversations/${conv.id}`}
                                                className="glass-panel px-4 py-3 flex items-center gap-3 hover:scale-[1.005] transition-all duration-200 block"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                                                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
                                                >
                                                    <MessageSquare size={14} style={{ color: 'var(--accent-emerald)' }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {(conv.metadata as Record<string, unknown>)?.contactName?.toString() ?? conv.contact_id}
                                                    </p>
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                                        {last ? last.content.slice(0, 60) : 'Sin mensajes'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    {conv.agents?.name && (
                                                        <span className="text-[10px] font-mono" style={{ color: 'var(--accent-violet)' }}>
                                                            <Bot size={9} className="inline mr-0.5" />{conv.agents.name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                        <Clock size={9} className="inline mr-0.5" />
                                                        {new Date(conv.updated_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    /* Virtual Office */
                    <VirtualOffice />
                )}

                <footer className="text-xs text-center pb-2" style={{ color: 'var(--text-muted)' }}>
                    RIVAIB Mission Control · Fase 7 · Claude AI + Supabase Realtime
                </footer>
            </div>

            {/* ─── LiveFeed right panel ──────────────────────────────────────── */}
            <LiveFeed defaultOpen={true} />
        </div>
    );
}
