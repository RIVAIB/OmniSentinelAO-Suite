'use client';

import { Clock, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationRowProps {
    conversation: {
        id: string;
        channel: string;
        contact_id: string;
        contact_name?: string;
        status: string;
        assigned_agent?: string | null;
        last_message?: { content: string; role: string; timestamp: string } | null;
        message_count?: number;
        updated_at: string;
    };
    onClick?: () => void;
}

const CHANNEL_META: Record<string, { icon: string; color: string; label: string }> = {
    whatsapp: { icon: '💬', color: 'rgba(37,211,102,0.12)', label: 'WhatsApp' },
    telegram: { icon: '✈️', color: 'rgba(0,136,204,0.12)', label: 'Telegram' },
    webchat: { icon: '🌐', color: 'rgba(34,211,238,0.10)', label: 'WebChat' },
    internal: { icon: '🔒', color: 'rgba(139,92,246,0.10)', label: 'Interno' },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
    active: { bg: 'rgba(52,211,153,0.10)', text: 'var(--accent-emerald)', border: 'rgba(52,211,153,0.22)', label: 'Activa' },
    closed: { bg: 'rgba(255,255,255,0.04)', text: 'var(--text-muted)', border: 'rgba(255,255,255,0.08)', label: 'Cerrada' },
    escalated: { bg: 'rgba(251,191,36,0.10)', text: 'var(--accent-amber)', border: 'rgba(251,191,36,0.22)', label: 'Escalada' },
};

export default function ConversationRow({ conversation: c, onClick }: ConversationRowProps) {
    const ch = CHANNEL_META[c.channel] ?? CHANNEL_META.webchat;
    const st = STATUS_BADGE[c.status] ?? STATUS_BADGE.closed;
    const name = c.contact_name ?? c.contact_id;

    const ago = formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: es });

    return (
        <div
            onClick={onClick}
            className="glass-panel px-4 py-3 flex items-center gap-4 cursor-pointer hover:scale-[1.005] transition-all duration-200"
        >
            {/* Channel icon */}
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: ch.color, border: '1px solid rgba(255,255,255,0.08)' }}
                title={ch.label}
            >
                {ch.icon}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {name}
                    </p>
                    {c.assigned_agent && (
                        <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--accent-violet)', border: '1px solid rgba(139,92,246,0.18)' }}
                        >
                            <Bot size={8} className="inline mr-0.5" />{c.assigned_agent}
                        </span>
                    )}
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {c.last_message
                        ? `${c.last_message.role === 'user' ? '👤' : '🤖'} ${c.last_message.content}`
                        : 'Sin mensajes'}
                </p>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-right">
                <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                >
                    {st.label}
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={9} />{ago}
                </span>
                {(c.message_count ?? 0) > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {c.message_count} msg
                    </span>
                )}
            </div>
        </div>
    );
}
