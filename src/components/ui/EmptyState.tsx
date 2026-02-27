'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    emoji?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon: Icon,
    emoji,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="glass-panel flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
            {/* Glow orb behind icon */}
            <div className="relative">
                <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-20"
                    style={{ background: 'var(--accent-cyan)', transform: 'scale(2)' }}
                />
                <div
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{
                        background: 'rgba(34,211,238,0.06)',
                        border: '1px solid rgba(34,211,238,0.15)',
                    }}
                >
                    {emoji ?? (Icon ? <Icon size={28} style={{ color: 'var(--text-muted)' }} /> : '📭')}
                </div>
            </div>

            <div>
                <h3
                    className="font-semibold text-base"
                    style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                >
                    {title}
                </h3>
                {description && (
                    <p className="mt-1 text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                        {description}
                    </p>
                )}
            </div>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                    style={{
                        background: 'rgba(34,211,238,0.10)',
                        border: '1px solid rgba(34,211,238,0.22)',
                        color: 'var(--accent-cyan)',
                    }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
