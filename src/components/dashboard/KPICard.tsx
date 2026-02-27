'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    description?: string;
    accentColor?: string;
    animationDelay?: number;
}

const TREND_CONFIG = {
    up: {
        icon: <TrendingUp size={12} />,
        color: 'var(--accent-emerald)',
        label: 'subida',
    },
    down: {
        icon: <TrendingDown size={12} />,
        color: 'var(--accent-rose)',
        label: 'bajada',
    },
    neutral: {
        icon: <Minus size={12} />,
        color: 'var(--text-muted)',
        label: 'sin cambio',
    },
};

export default function KPICard({
    title,
    value,
    icon,
    trend,
    trendValue,
    description,
    accentColor = 'var(--accent-cyan)',
    animationDelay = 0,
}: KPICardProps) {
    const trendConfig = trend ? TREND_CONFIG[trend] : null;

    return (
        <div
            className="glass-panel p-5 flex flex-col gap-3 animate-slide-in-up hover:scale-[1.02] transition-transform duration-200"
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            {/* ── Icon & Trend ── */}
            <div className="flex items-start justify-between">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{
                        background: `${accentColor}15`,
                        border: `1px solid ${accentColor}25`,
                    }}
                >
                    {icon}
                </div>

                {trendConfig && trendValue && (
                    <span
                        className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full"
                        style={{
                            background: `${trendConfig.color}12`,
                            color: trendConfig.color,
                            border: `1px solid ${trendConfig.color}22`,
                        }}
                        aria-label={`Tendencia: ${trendConfig.label} ${trendValue}`}
                    >
                        {trendConfig.icon}
                        {trendValue}
                    </span>
                )}
            </div>

            {/* ── Value ── */}
            <div>
                <p
                    className="text-3xl font-bold tracking-tight"
                    style={{
                        fontFamily: 'var(--font-space-grotesk)',
                        color: accentColor,
                    }}
                >
                    {value}
                </p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {title}
                </p>
            </div>

            {/* ── Description ── */}
            {description && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {description}
                </p>
            )}
        </div>
    );
}
