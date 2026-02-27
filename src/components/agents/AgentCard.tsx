'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Power, Settings2, Loader2, MessageSquare } from 'lucide-react';
import type { AgentMeta } from '@/data/agents';
import { ACCENT_CSS } from '@/data/agents';
import AgentTestChat from '@/components/agents/AgentTestChat';

interface AgentCardProps {
    agent: AgentMeta & { id?: string };
    /** Called when the Power button is clicked. Receives the DB id and the desired new status. */
    onToggle?: (id: string, newStatus: string) => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = {
    orchestrator: 'Orquestador',
    specialist: 'Especialista',
    utility: 'Utilidad',
};

const STATUS_LABEL: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    maintenance: 'Mantenimiento',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    active: {
        bg: 'rgba(52,211,153,0.10)',
        text: 'var(--accent-emerald)',
        border: 'rgba(52,211,153,0.22)',
    },
    inactive: {
        bg: 'rgba(255,255,255,0.04)',
        text: 'var(--text-muted)',
        border: 'rgba(255,255,255,0.08)',
    },
    maintenance: {
        bg: 'rgba(251,191,36,0.10)',
        text: 'var(--accent-amber)',
        border: 'rgba(251,191,36,0.22)',
    },
};

export default function AgentCard({ agent, onToggle }: AgentCardProps) {
    const [configOpen, setConfigOpen] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const accent = ACCENT_CSS[agent.accentColor] ?? ACCENT_CSS.cyan;
    const statusStyle = STATUS_STYLES[agent.status] ?? STATUS_STYLES.inactive;

    const newStatus = agent.status === 'active' ? 'inactive' : 'active';

    async function handleToggle() {
        if (!onToggle || !agent.id || toggling) return;
        setToggling(true);
        try {
            await onToggle(agent.id, newStatus);
        } finally {
            setToggling(false);
        }
    }

    return (
        <article
            className="glass-panel p-5 flex flex-col gap-4 group transition-all duration-300 hover:scale-[1.01]"
            style={{
                '--agent-accent': accent,
            } as React.CSSProperties}
        >
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    {/* Icon bubble */}
                    <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 relative"
                        style={{
                            background: `linear-gradient(135deg, ${accent}22, ${accent}0a)`,
                            border: `1px solid ${accent}33`,
                            boxShadow: agent.status === 'active' ? `0 0 16px ${accent}22` : 'none',
                        }}
                    >
                        {agent.icon}
                        {/* Live pulse for active */}
                        {agent.status === 'active' && (
                            <span
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
                                style={{
                                    background: 'var(--accent-emerald)',
                                    borderColor: 'var(--bg-base)',
                                    boxShadow: '0 0 6px rgba(52,211,153,0.8)',
                                    animation: 'pulse-glow 2s ease-in-out infinite',
                                }}
                            />
                        )}
                    </div>

                    <div>
                        <h3
                            className="font-bold text-base tracking-wide"
                            style={{
                                fontFamily: 'var(--font-space-grotesk)',
                                color: accent,
                            }}
                        >
                            {agent.codename}
                        </h3>
                        <span
                            className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                            style={{
                                background: `${accent}15`,
                                color: accent,
                                border: `1px solid ${accent}25`,
                            }}
                        >
                            {TYPE_LABELS[agent.type] ?? agent.type}
                        </span>
                    </div>
                </div>

                {/* Status badge */}
                <span
                    className="text-[11px] font-mono px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                    }}
                >
                    {STATUS_LABEL[agent.status] ?? agent.status}
                </span>
            </div>

            {/* ── Role description ── */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {agent.role}
            </p>

            {/* ── Protocol + Integrations ── */}
            <div className="flex flex-wrap gap-1.5">
                {agent.protocol && (
                    <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{
                            background: 'rgba(139,92,246,0.10)',
                            color: 'var(--accent-violet)',
                            border: '1px solid rgba(139,92,246,0.20)',
                        }}
                    >
                        {agent.protocol}
                    </span>
                )}
                {(agent.integrations ?? []).slice(0, 3).map((integration) => (
                    <span
                        key={integration}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {integration}
                    </span>
                ))}
            </div>

            {/* ── Config Preview (collapsible) ── */}
            <div>
                <button
                    onClick={() => setConfigOpen((o) => !o)}
                    className="w-full flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg transition-colors"
                    style={{
                        color: 'var(--text-muted)',
                        background: configOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                    }}
                >
                    <span className="font-mono">CONFIG</span>
                    {configOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {configOpen && (
                    <pre
                        className="mt-2 p-3 rounded-xl text-[10px] font-mono overflow-x-auto"
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            lineHeight: 1.6,
                        }}
                    >
                        {JSON.stringify(agent.config, null, 2)}
                    </pre>
                )}
            </div>

            {/* ── Quick Actions ── */}
            <div
                className="flex gap-2 pt-1"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
                {/* Probar — opens test chat modal */}
                <button
                    onClick={() => setChatOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={{
                        background: `${accent}12`,
                        color: accent,
                        border: `1px solid ${accent}22`,
                    }}
                    title="Probar agente"
                >
                    <MessageSquare size={13} />
                    <span>Probar</span>
                </button>

                <button
                    onClick={handleToggle}
                    disabled={toggling || !onToggle || !agent.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: toggling
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.04)',
                        color: 'var(--text-secondary)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    title={agent.status === 'active' ? 'Desactivar' : 'Activar'}
                >
                    {toggling
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Power size={13} />
                    }
                    <span>{agent.status === 'active' ? 'Pausar' : 'Activar'}</span>
                </button>

                <button
                    className="flex items-center justify-center p-2 rounded-xl transition-all duration-200 hover:scale-105"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    title="Configurar"
                >
                    <Settings2 size={13} />
                </button>
            </div>

            {/* ── Test Chat Modal ── */}
            {chatOpen && (
                <AgentTestChat
                    agentId={agent.id ?? ''}
                    agentName={agent.codename}
                    agentIcon={agent.icon}
                    accentColor={agent.accentColor}
                    onClose={() => setChatOpen(false)}
                />
            )}
        </article>
    );
}
