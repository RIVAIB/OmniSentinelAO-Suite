'use client';

import { AlertCircle, CheckCircle2, Clock, Pause, Play, MoreHorizontal } from 'lucide-react';
import type { MissionStatus } from '@/types/database';

// ─── Mock data for Phase 2 visualization ───────────────────────────────────

interface MissionCard {
    id: string;
    title: string;
    status: MissionStatus;
    priority: number;
    agentName: string;
    agentIcon: string;
    stepsTotal: number;
    stepsDone: number;
    description?: string;
}

const MOCK_MISSIONS: MissionCard[] = [
    {
        id: '1',
        title: 'Campaña Reactivación Q1',
        status: 'proposed',
        priority: 8,
        agentName: 'NEXUS',
        agentIcon: '📡',
        stepsTotal: 5,
        stepsDone: 0,
        description: 'Remarketing a pacientes inactivos +90 días',
    },
    {
        id: '2',
        title: 'Recordatorios Citas Semana',
        status: 'running',
        priority: 9,
        agentName: 'JESSY',
        agentIcon: '💬',
        stepsTotal: 3,
        stepsDone: 1,
        description: 'WhatsApp reminders para citas del lunes',
    },
    {
        id: '3',
        title: 'Reporte Financiero Enero',
        status: 'paused',
        priority: 6,
        agentName: 'APEX',
        agentIcon: '💰',
        stepsTotal: 4,
        stepsDone: 2,
        description: 'Consolidación BigCapital + análisis',
    },
    {
        id: '4',
        title: 'Onboarding Nuevos Pacientes',
        status: 'done',
        priority: 7,
        agentName: 'JESSY',
        agentIcon: '💬',
        stepsTotal: 3,
        stepsDone: 3,
    },
    {
        id: '5',
        title: 'Métricas Dashboard CEO',
        status: 'running',
        priority: 10,
        agentName: 'AXIOM',
        agentIcon: '📊',
        stepsTotal: 6,
        stepsDone: 4,
        description: 'KPIs estratégicos febrero 2026',
    },
];

// ─── Column config ──────────────────────────────────────────────────────────

interface Column {
    id: MissionStatus | 'failed';
    label: string;
    icon: React.ReactNode;
    accentColor: string;
    borderColor: string;
}

const COLUMNS: Column[] = [
    {
        id: 'proposed',
        label: 'Propuestas',
        icon: <Clock size={14} />,
        accentColor: 'var(--text-muted)',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    {
        id: 'running',
        label: 'En Marcha',
        icon: <Play size={14} />,
        accentColor: 'var(--accent-cyan)',
        borderColor: 'rgba(34,211,238,0.25)',
    },
    {
        id: 'paused',
        label: 'Pausadas',
        icon: <Pause size={14} />,
        accentColor: 'var(--accent-amber)',
        borderColor: 'rgba(251,191,36,0.25)',
    },
    {
        id: 'done',
        label: 'Completadas',
        icon: <CheckCircle2 size={14} />,
        accentColor: 'var(--accent-emerald)',
        borderColor: 'rgba(52,211,153,0.25)',
    },
    {
        id: 'failed',
        label: 'Fallidas',
        icon: <AlertCircle size={14} />,
        accentColor: 'var(--accent-rose)',
        borderColor: 'rgba(251,113,133,0.25)',
    },
];

// ─── Priority dot ───────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: number }) {
    const color =
        priority >= 9
            ? 'var(--accent-rose)'
            : priority >= 7
                ? 'var(--accent-amber)'
                : 'var(--accent-emerald)';
    return (
        <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
            title={`Prioridad ${priority}/10`}
        />
    );
}

// ─── Mission mini-card ──────────────────────────────────────────────────────

function MissionMiniCard({ mission }: { mission: MissionCard }) {
    const progress = mission.stepsTotal > 0
        ? Math.round((mission.stepsDone / mission.stepsTotal) * 100)
        : 0;

    return (
        <div
            className="p-3 rounded-xl flex flex-col gap-2 cursor-pointer hover:scale-[1.02] transition-transform duration-150"
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <PriorityDot priority={mission.priority} />
                    <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {mission.title}
                    </span>
                </div>
                <button
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <MoreHorizontal size={13} />
                </button>
            </div>

            {/* Description */}
            {mission.description && (
                <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {mission.description}
                </p>
            )}

            {/* Agent + Progress */}
            <div className="flex items-center justify-between mt-1">
                <span
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <span>{mission.agentIcon}</span>
                    <span>{mission.agentName}</span>
                </span>

                {mission.stepsTotal > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {mission.stepsDone}/{mission.stepsTotal}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {mission.stepsTotal > 0 && (
                <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progress}%`,
                            background:
                                progress === 100
                                    ? 'var(--accent-emerald)'
                                    : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MissionPipeline() {
    const getMissionsForStatus = (status: MissionStatus | 'failed') =>
        MOCK_MISSIONS.filter((m) => m.status === status);

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Pipeline de Misiones
                </h2>
                <span
                    className="text-[10px] font-mono px-2.5 py-1 rounded-full"
                    style={{
                        background: 'rgba(34,211,238,0.08)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(34,211,238,0.18)',
                    }}
                >
                    {MOCK_MISSIONS.length} misiones
                </span>
            </div>

            {/* Kanban board — horizontal scroll on small screens */}
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
                {COLUMNS.map((col) => {
                    const missions = getMissionsForStatus(col.id);
                    return (
                        <div
                            key={col.id}
                            className="flex-shrink-0 flex flex-col gap-2 group"
                            style={{ width: '220px', scrollSnapAlign: 'start' }}
                        >
                            {/* Column header */}
                            <div
                                className="flex items-center justify-between px-3 py-2 rounded-xl"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${col.borderColor}`,
                                }}
                            >
                                <span
                                    className="flex items-center gap-1.5 text-xs font-semibold"
                                    style={{ color: col.accentColor }}
                                >
                                    {col.icon}
                                    {col.label}
                                </span>
                                <span
                                    className="text-[10px] font-mono w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{
                                        background: `${col.accentColor}15`,
                                        color: col.accentColor,
                                    }}
                                >
                                    {missions.length}
                                </span>
                            </div>

                            {/* Mission cards */}
                            <div className="flex flex-col gap-2 min-h-[80px]">
                                {missions.length === 0 ? (
                                    <div
                                        className="h-16 rounded-xl flex items-center justify-center text-[11px]"
                                        style={{
                                            border: '1px dashed rgba(255,255,255,0.08)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        Sin misiones
                                    </div>
                                ) : (
                                    missions.map((mission) => (
                                        <MissionMiniCard key={mission.id} mission={mission} />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
