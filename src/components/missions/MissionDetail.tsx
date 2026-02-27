'use client';

import { X, CheckCircle, Circle, Clock, User, Zap, Bot, Tag } from 'lucide-react';

interface MissionStep {
    id: string;
    title: string;
    description?: string;
    status: string;
    order: number;
    completed_at?: string;
}

interface Mission {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority?: number;
    progress?: number;
    created_at: string;
    updated_at?: string;
    assigned_agent?: string;
    mission_steps?: MissionStep[];
    config?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

interface MissionDetailProps {
    mission: Mission;
    onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
    completed: 'var(--accent-emerald)',
    in_progress: 'var(--accent-cyan)',
    pending: 'var(--text-muted)',
    failed: '#f87171',
    skipped: 'var(--accent-amber)',
};

function fmt(dateStr?: string) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

export default function MissionDetail({ mission, onClose }: MissionDetailProps) {
    const steps = [...(mission.mission_steps ?? [])].sort((a, b) => a.order - b.order);
    const done = steps.filter((s) => s.status === 'completed').length;
    const pct = steps.length ? Math.round((done / steps.length) * 100) : (mission.progress ?? 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(10,10,15,0.97)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-start gap-4 p-5 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.20)' }}
                    >
                        <Zap size={18} style={{ color: 'var(--accent-cyan)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2
                            className="font-bold text-base leading-tight"
                            style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                        >
                            {mission.title}
                        </h2>
                        {mission.description && (
                            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {mission.description}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {mission.priority && (
                                <span
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase"
                                    style={{ background: 'rgba(251,191,36,0.10)', color: 'var(--accent-amber)', border: '1px solid rgba(251,191,36,0.20)' }}
                                >
                                    {mission.priority}
                                </span>
                            )}
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <Clock size={10} className="inline mr-1" />{fmt(mission.created_at)}
                            </span>
                            {mission.assigned_agent && (
                                <span className="text-[10px] font-mono" style={{ color: 'var(--accent-violet)' }}>
                                    <Bot size={10} className="inline mr-1" />{mission.assigned_agent}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        <span>{done}/{steps.length} pasos completados</span>
                        <span className="font-mono">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? 'var(--accent-emerald)' : 'linear-gradient(to right, var(--accent-cyan), var(--accent-violet))',
                                transition: 'width 0.5s ease',
                            }}
                        />
                    </div>
                </div>

                {/* Steps timeline */}
                <div className="flex-1 overflow-y-auto p-5">
                    {steps.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            <Tag size={24} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin pasos registrados</p>
                        </div>
                    ) : (
                        <ol className="relative space-y-0">
                            {steps.map((step, i) => {
                                const isDone = step.status === 'completed';
                                const isLast = i === steps.length - 1;
                                return (
                                    <li key={step.id} className="relative pl-8">
                                        {/* Connector line */}
                                        {!isLast && (
                                            <div
                                                className="absolute left-[13px] top-6 bottom-0 w-px"
                                                style={{ background: isDone ? 'rgba(52,211,153,0.30)' : 'rgba(255,255,255,0.06)' }}
                                            />
                                        )}
                                        {/* Icon */}
                                        <span
                                            className="absolute left-0 top-1 flex items-center justify-center w-6 h-6 rounded-full"
                                            style={{
                                                background: isDone ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${isDone ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
                                                color: STATUS_COLOR[step.status] ?? 'var(--text-muted)',
                                            }}
                                        >
                                            {isDone
                                                ? <CheckCircle size={12} />
                                                : <Circle size={12} />}
                                        </span>
                                        {/* Content */}
                                        <div className={`pb-5 ${i === 0 ? '' : ''}`}>
                                            <p
                                                className="text-sm font-medium"
                                                style={{ color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                                            >
                                                {step.title}
                                            </p>
                                            {step.description && (
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                    {step.description}
                                                </p>
                                            )}
                                            {step.completed_at && (
                                                <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--accent-emerald)' }}>
                                                    ✓ {fmt(step.completed_at)}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
}
