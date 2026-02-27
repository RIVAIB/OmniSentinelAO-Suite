'use client';

import { useState, useEffect, useRef } from 'react';
import { useRealtimeEvents, type LiveEvent, type EventType } from '@/hooks/useRealtimeEvents';
import { X, ChevronRight, ChevronLeft, Trash2, Heart } from 'lucide-react';

// ─── Event metadata ───────────────────────────────────────────────────────────

const EVENT_META: Record<string, { emoji: string; label: string; color: string }> = {
    agent_heartbeat: { emoji: '💓', label: 'Heartbeat', color: '#94a3b8' },
    agent_started: { emoji: '🟢', label: 'Agente iniciado', color: 'var(--accent-emerald)' },
    agent_stopped: { emoji: '🔴', label: 'Agente detenido', color: '#f87171' },
    mission_created: { emoji: '📋', label: 'Misión creada', color: 'var(--accent-cyan)' },
    mission_started: { emoji: '🚀', label: 'Misión iniciada', color: 'var(--accent-cyan)' },
    mission_completed: { emoji: '✅', label: 'Misión completada', color: 'var(--accent-emerald)' },
    mission_failed: { emoji: '❌', label: 'Misión fallida', color: '#f87171' },
    step_started: { emoji: '⚡', label: 'Paso iniciado', color: 'var(--accent-violet)' },
    step_completed: { emoji: '✔️', label: 'Paso completado', color: 'var(--accent-emerald)' },
    step_failed: { emoji: '⚠️', label: 'Paso fallido', color: '#f59e0b' },
    agent_message: { emoji: '💬', label: 'Mensaje', color: 'var(--accent-violet)' },
    agent_thought: { emoji: '🧠', label: 'Pensamiento', color: '#a78bfa' },
    error: { emoji: '🔥', label: 'Error', color: '#f87171' },
};

function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
    return `${Math.round(diff / 3_600_000)}h`;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60_000)}m`;
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: LiveEvent }) {
    const meta = EVENT_META[event.type] ?? { emoji: '•', label: event.type, color: '#94a3b8' };
    const p = event.payload ?? {};

    // Build contextual subtitle text from payload
    const subtitle = buildSubtitle(event.type, p);

    return (
        <div
            className="flex gap-2.5 py-2 px-2 rounded-lg transition-all hover:bg-white/5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
            <span className="flex-shrink-0 text-base">{meta.emoji}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] font-semibold truncate" style={{ color: meta.color }}>
                        {meta.label}
                    </span>
                    <span
                        className="text-[10px] flex-shrink-0 font-mono"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {relTime(event.created_at)}
                    </span>
                </div>
                {subtitle && (
                    <p
                        className="text-[10px] mt-0.5 leading-relaxed truncate"
                        style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

function buildSubtitle(type: string, p: Record<string, unknown>): string | null {
    const mission = (p.missionTitle as string | undefined);
    const step = (p.stepTitle as string | undefined);
    const agent = (p.agentName as string | undefined);
    const error = (p.error as string | undefined);
    const dur = typeof p.durationMs === 'number' ? formatDuration(p.durationMs as number) : null;
    const n = (p.stepNumber as number | undefined);
    const total = (p.totalSteps as number | undefined);
    const thought = (p.thought as string | undefined);

    switch (type) {
        case 'mission_created':
        case 'mission_started':
            return [mission, total ? `${total} pasos` : null].filter(Boolean).join(' · ');
        case 'mission_completed':
            return [mission, dur ? `en ${dur}` : null].filter(Boolean).join(' · ');
        case 'mission_failed':
            return [mission, error].filter(Boolean).join(' — ');
        case 'step_started':
            return [
                n && total ? `Paso ${n}/${total}` : null,
                step,
                agent ? `@${agent}` : null,
            ].filter(Boolean).join(' · ');
        case 'step_completed':
            return [
                step,
                agent ? `@${agent}` : null,
                dur ? `(${dur})` : null,
            ].filter(Boolean).join(' · ');
        case 'step_failed':
            return [step, error].filter(Boolean).join(' — ');
        case 'agent_thought':
            return thought ? thought.slice(0, 90) : null;
        default:
            return null;
    }
}

// ─── LiveFeed ────────────────────────────────────────────────────────────────

export default function LiveFeed({ defaultOpen = true }: { defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const [typeFilter, setTypeFilter] = useState<EventType | ''>('');
    const [hideHeartbeats, setHideHeartbeats] = useState(true);
    const { events, clear } = useRealtimeEvents(60);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [isNew, setIsNew] = useState(false);

    // Flash on new event (non-heartbeat)
    useEffect(() => {
        const hasReal = events.some((e) => e.type !== 'agent_heartbeat');
        if (!hasReal) return;
        setIsNew(true);
        const t = setTimeout(() => setIsNew(false), 600);
        return () => clearTimeout(t);
    }, [events.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll
    useEffect(() => {
        if (autoScroll) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [events, autoScroll]);

    // Apply type filter + optional heartbeat hide
    const heartbeatCount = events.filter((e) => e.type === 'agent_heartbeat').length;

    const filtered = events.filter((e) => {
        if (hideHeartbeats && e.type === 'agent_heartbeat') return false;
        if (typeFilter && e.type !== typeFilter) return false;
        return true;
    });

    // ── Collapsed pill ──────────────────────────────────────────────────────
    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 py-3 px-2 rounded-l-xl transition-all hover:scale-105"
                style={{
                    background: isNew
                        ? 'rgba(34,211,238,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRight: 'none',
                    color: 'var(--text-secondary)',
                }}
            >
                <ChevronLeft size={14} />
                {filtered.length > 0 && (
                    <span
                        className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--accent-cyan)', color: '#0a0a0f' }}
                    >
                        {filtered.length > 99 ? '99' : filtered.length}
                    </span>
                )}
                <span
                    className="text-[10px] font-medium [writing-mode:vertical-rl] rotate-180"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Live Feed
                </span>
            </button>
        );
    }

    return (
        <div
            className="flex flex-col flex-shrink-0 h-full overflow-hidden"
            style={{
                width: '280px',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(10,10,15,0.70)',
                backdropFilter: 'blur(16px)',
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
                <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'var(--accent-emerald)' }}
                />
                <span
                    className="flex-1 text-xs font-bold uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-secondary)' }}
                >
                    Live Feed
                </span>
                {/* Heartbeat toggle */}
                <button
                    onClick={() => setHideHeartbeats((v) => !v)}
                    title={hideHeartbeats ? 'Mostrar heartbeats' : 'Ocultar heartbeats'}
                    className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded transition-colors"
                    style={{
                        color: hideHeartbeats ? 'var(--text-muted)' : '#f472b6',
                        background: hideHeartbeats ? 'rgba(255,255,255,0.04)' : 'rgba(244,114,182,0.10)',
                        border: `1px solid ${hideHeartbeats ? 'rgba(255,255,255,0.06)' : 'rgba(244,114,182,0.25)'}`,
                    }}
                >
                    <Heart size={9} />
                </button>
                <button
                    onClick={() => setAutoScroll((v) => !v)}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    title="Toggle auto-scroll"
                    style={{ color: autoScroll ? 'var(--accent-cyan)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
                >
                    ↓
                </button>
                <button onClick={clear} title="Limpiar" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={12} />
                </button>
                <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Filter */}
            <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as EventType | '')}
                    className="w-full text-[10px] px-2 py-1 rounded-lg outline-none"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <option value="">Todos los eventos</option>
                    <option value="agent_thought">🧠 Pensamientos</option>
                    <option value="mission_started">🚀 Misiones</option>
                    <option value="step_completed">✔️ Pasos</option>
                    <option value="agent_message">💬 Mensajes</option>
                    <option value="error">🔥 Errores</option>
                    <option value="agent_heartbeat">💓 Heartbeats</option>
                </select>
            </div>

            {/* Events list */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
                {filtered.length === 0 && (
                    <p className="text-center text-[11px] mt-8" style={{ color: 'var(--text-muted)' }}>
                        Sin eventos aún
                    </p>
                )}
                {filtered.map((ev) => (
                    <EventRow key={ev.id} event={ev} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Footer */}
            <div
                className="px-3 py-2 text-[10px] flex-shrink-0 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
            >
                <span>{filtered.length} evento{filtered.length !== 1 ? 's' : ''}</span>
                {hideHeartbeats && heartbeatCount > 0 && (
                    <button
                        onClick={() => setHideHeartbeats(false)}
                        className="text-[10px] hover:opacity-80 transition-opacity"
                        style={{ color: '#94a3b8' }}
                    >
                        💓 {heartbeatCount} ocultos
                    </button>
                )}
            </div>
        </div>
    );
}
