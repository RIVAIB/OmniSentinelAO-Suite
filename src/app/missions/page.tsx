'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import MissionCard from '@/components/missions/MissionCard';
import MissionDetail from '@/components/missions/MissionDetail';
import CreateMissionModal from '@/components/missions/CreateMissionModal';
import PageLoader from '@/components/ui/PageLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissionStep {
    id: string; title: string; description?: string; status: string; order: number; completed_at?: string;
}

interface Mission {
    id: string; title: string; description?: string; status: string;
    priority?: number; progress?: number; created_at: string; updated_at?: string;
    assigned_agent?: string; mission_steps?: MissionStep[];
    config?: Record<string, unknown>; metadata?: Record<string, unknown>;
}

const COLUMNS: { key: string; label: string; accent: string }[] = [
    { key: 'pending', label: 'Pendiente', accent: 'var(--accent-amber)' },
    { key: 'running', label: 'En marcha', accent: 'var(--accent-cyan)' },
    { key: 'completed', label: 'Completada', accent: 'var(--accent-emerald)' },
    { key: 'failed', label: 'Fallida', accent: '#f87171' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Agent { id: string; name: string; }

export default function MissionsPage() {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Mission | null>(null);
    const [agentFilter, setAgentFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);

    // Fetch agents for the create modal dropdown
    useEffect(() => {
        fetch('/api/agents')
            .then((r) => r.json())
            .then((j: { data?: Agent[] }) => setAgents(j.data ?? []))
            .catch(() => { });
    }, []);

    const fetchMissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/missions');
            const json = await res.json() as { data?: Mission[] };
            setMissions(json.data ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMissions(); }, [fetchMissions]);

    const filtered = missions.filter((m) =>
        !agentFilter || (m.assigned_agent ?? '').toLowerCase().includes(agentFilter.toLowerCase())
    );

    const byStatus = (key: string) => filtered.filter((m) => m.status === key);

    if (loading) return <PageLoader rows={6} />;

    return (
        <div className="p-6 flex flex-col gap-6 min-h-screen">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(251,191,36,0.04) 0%, transparent 60%)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-2xl font-bold tracking-wide"
                        style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                    >
                        Misiones
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {missions.length} misión{missions.length !== 1 ? 'es' : ''} en total
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchMissions}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text-secondary)' }}
                    >
                        <RefreshCw size={13} /> Actualizar
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.22)', color: 'var(--accent-cyan)' }}
                    >
                        <Plus size={13} /> Nueva Misión
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3">
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Filter size={13} style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={agentFilter}
                        onChange={(e) => setAgentFilter(e.target.value)}
                        placeholder="Filtrar por agente…"
                        className="bg-transparent text-sm outline-none w-44"
                        style={{ color: 'var(--text-primary)' }}
                    />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Mostrando {filtered.length} misiones
                </span>
            </div>

            {/* Kanban board */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
                {COLUMNS.map((col) => {
                    const cards = byStatus(col.key);
                    return (
                        <div key={col.key} className="flex flex-col gap-3 min-h-[400px]">
                            {/* Column header */}
                            <div
                                className="flex items-center justify-between px-3 py-2 rounded-xl sticky top-0"
                                style={{
                                    background: 'rgba(10,10,15,0.90)',
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${col.accent}22`,
                                }}
                            >
                                <span
                                    className="text-xs font-semibold uppercase tracking-wider"
                                    style={{ color: col.accent }}
                                >
                                    {col.label}
                                </span>
                                <span
                                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                                    style={{ background: `${col.accent}12`, color: col.accent, border: `1px solid ${col.accent}22` }}
                                >
                                    {cards.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex flex-col gap-2 flex-1">
                                {cards.length === 0 ? (
                                    <div
                                        className="flex-1 rounded-2xl flex items-center justify-center text-xs"
                                        style={{
                                            border: `1px dashed ${col.accent}18`,
                                            color: 'var(--text-muted)',
                                            minHeight: '120px',
                                        }}
                                    >
                                        Sin misiones
                                    </div>
                                ) : (
                                    cards.map((m) => (
                                        <MissionCard
                                            key={m.id}
                                            mission={m}
                                            onClick={() => setSelected(m)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create modal */}
            {showCreate && (
                <CreateMissionModal
                    agents={agents}
                    onClose={() => setShowCreate(false)}
                    onCreated={() => {
                        setShowCreate(false);
                        fetchMissions();
                    }}
                />
            )}

            {/* Detail modal */}
            {selected && (
                <MissionDetail
                    mission={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}
