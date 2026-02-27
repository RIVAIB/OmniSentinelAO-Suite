'use client';

import { useState, useEffect } from 'react';
import AnalyticsChart from '@/components/analytics/AnalyticsChart';
import PageLoader from '@/components/ui/PageLoader';
import { RefreshCw, TrendingUp, MessageSquare, Bot, CheckCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
    kpis: {
        totalConversations: number;
        conversationsToday: number;
        resolutionRate: number;
        activeAgents: number;
    };
    conversationsByDay: Array<{ date: string; count: number }>;
    byChannel: Array<{ name: string; count: number }>;
    byAgent: Array<{ name: string; count: number }>;
    dateRange: { from: string; to: string };
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    unit?: string;
    accent: string;
}

function StatCard({ icon, label, value, unit, accent }: StatCardProps) {
    return (
        <div
            className="glass-panel p-5 flex flex-col gap-3"
            style={{ borderTop: `2px solid ${accent}44` }}
        >
            <div className="flex items-center gap-2">
                <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${accent}12`, color: accent }}
                >
                    {icon}
                </div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {label}
                </p>
            </div>
            <p
                className="text-3xl font-bold"
                style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
            >
                {value}
                {unit && <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<'7' | '30' | '90'>('30');

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const from = new Date();
            from.setDate(from.getDate() - parseInt(range));
            const res = await fetch(`/api/analytics?from=${from.toISOString()}`);
            const json = await res.json() as { data?: AnalyticsData };
            if (!res.ok) throw new Error('Error al cargar analytics');
            setData(json.data ?? null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [range]);

    if (loading) return <PageLoader rows={4} />;

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.04) 0%, transparent 60%)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-2xl font-bold"
                        style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                    >
                        Analytics
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Métricas de conversaciones e IA
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Range selector */}
                    {(['7', '30', '90'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => setRange(d)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                            style={{
                                background: range === d ? 'var(--accent-violet)' : 'rgba(255,255,255,0.04)',
                                color: range === d ? '#0a0a0f' : 'var(--text-secondary)',
                                border: range === d ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {d}d
                        </button>
                    ))}
                    <button
                        onClick={load}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs ml-1"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-secondary)' }}
                    >
                        <RefreshCw size={12} /> Actualizar
                    </button>
                </div>
            </div>

            {error && (
                <div
                    className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171' }}
                >
                    ⚠️ {error}
                </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<MessageSquare size={16} />} label="Total Conversaciones" value={data?.kpis.totalConversations ?? 0} accent="var(--accent-cyan)" />
                <StatCard icon={<TrendingUp size={16} />} label="Conversaciones Hoy" value={data?.kpis.conversationsToday ?? 0} accent="var(--accent-emerald)" />
                <StatCard icon={<CheckCircle size={16} />} label="Tasa Resolución" value={data?.kpis.resolutionRate ?? 0} unit="%" accent="var(--accent-violet)" />
                <StatCard icon={<Bot size={16} />} label="Agentes Activos" value={data?.kpis.activeAgents ?? 0} accent="var(--accent-amber)" />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnalyticsChart
                    title="Conversaciones por Día"
                    subtitle={`Últimos ${range} días`}
                    type="line"
                    data={(data?.conversationsByDay ?? []).map(d => ({ ...d, name: d.date.slice(5) }))}
                    dataKey="count"
                    nameKey="name"
                    accentColor="var(--accent-cyan)"
                />
                <AnalyticsChart
                    title="Distribución por Canal"
                    subtitle="Canales de comunicación"
                    type="pie"
                    data={data?.byChannel ?? []}
                    dataKey="count"
                    nameKey="name"
                />
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnalyticsChart
                    title="Mensajes por Agente"
                    subtitle="Conversaciones atendidas"
                    type="bar"
                    data={data?.byAgent?.slice(0, 6) ?? []}
                    dataKey="count"
                    nameKey="name"
                />

                {/* Top agents table */}
                <div className="glass-panel p-5 flex flex-col gap-4">
                    <div>
                        <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}>
                            Top Agentes
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Por conversaciones atendidas</p>
                    </div>
                    <div className="space-y-2">
                        {(data?.byAgent ?? []).slice(0, 5).map((a, i) => {
                            const max = data?.byAgent[0]?.count ?? 1;
                            const pct = Math.round((a.count / max) * 100);
                            const COLORS = ['var(--accent-cyan)', 'var(--accent-violet)', 'var(--accent-emerald)', 'var(--accent-amber)', '#f87171'];
                            return (
                                <div key={a.name} className="flex items-center gap-3">
                                    <span
                                        className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                        style={{ background: `${COLORS[i]}15`, color: COLORS[i] }}
                                    >
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="truncate font-mono" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>{a.count}</span>
                                        </div>
                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i] }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!data?.byAgent?.length) && (
                            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                Sin datos de agentes aún
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
