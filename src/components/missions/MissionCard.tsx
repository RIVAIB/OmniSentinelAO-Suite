'use client';

import { Clock, User, ChevronRight } from 'lucide-react';

interface MissionStep {
    id: string;
    title: string;
    status: string;
    order: number;
}

interface MissionCardProps {
    mission: {
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
    };
    onClick?: () => void;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: 'rgba(239,68,68,0.10)', text: '#f87171', border: 'rgba(239,68,68,0.20)' },
    medium: { bg: 'rgba(251,191,36,0.10)', text: 'var(--accent-amber)', border: 'rgba(251,191,36,0.20)' },
    low: { bg: 'rgba(52,211,153,0.10)', text: 'var(--accent-emerald)', border: 'rgba(52,211,153,0.20)' },
    urgent: { bg: 'rgba(239,68,68,0.18)', text: '#fc8181', border: 'rgba(239,68,68,0.35)' },
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
}

export default function MissionCard({ mission, onClick }: MissionCardProps) {
    const priorityLevel = mission.priority ?? 5;
    const priority = priorityLevel >= 8 ? 'high' : priorityLevel >= 5 ? 'medium' : 'low';
    const pStyle = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;
    const progress = mission.progress ?? calcProgress(mission.mission_steps ?? []);
    const totalSteps = mission.mission_steps?.length ?? 0;
    const doneSteps = mission.mission_steps?.filter((s) => s.status === 'completed').length ?? 0;

    return (
        <div
            onClick={onClick}
            className="glass-panel p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-white/15 group"
        >
            {/* Priority + menu row */}
            <div className="flex items-center justify-between gap-2">
                {mission.priority && (
                    <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: pStyle.bg, color: pStyle.text, border: `1px solid ${pStyle.border}` }}
                    >
                        {priority}
                    </span>
                )}
                <ChevronRight
                    size={14}
                    className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                />
            </div>

            {/* Title */}
            <p
                className="text-sm font-semibold leading-snug line-clamp-2"
                style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
            >
                {mission.title}
            </p>

            {/* Progress bar */}
            {totalSteps > 0 && (
                <div>
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>{doneSteps}/{totalSteps} pasos</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                                background: progress >= 100
                                    ? 'var(--accent-emerald)'
                                    : 'linear-gradient(to right, var(--accent-cyan), var(--accent-violet))',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {mission.assigned_agent && (
                    <span className="flex items-center gap-1">
                        <User size={9} />{mission.assigned_agent}
                    </span>
                )}
                <span className="flex items-center gap-1 ml-auto">
                    <Clock size={9} />{timeAgo(mission.updated_at ?? mission.created_at)}
                </span>
            </div>
        </div>
    );
}

function calcProgress(steps: MissionStep[]): number {
    if (steps.length === 0) return 0;
    const done = steps.filter((s) => s.status === 'completed').length;
    return Math.round((done / steps.length) * 100);
}
