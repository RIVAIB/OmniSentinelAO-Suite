'use client';

import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface ChartProps {
    title: string;
    subtitle?: string;
    type: 'line' | 'bar' | 'pie';
    data: Array<Record<string, unknown>>;
    dataKey: string;
    nameKey?: string;
    accentColor?: string;
    height?: number;
    colors?: string[];
}

const CHART_COLORS = [
    'var(--accent-cyan)',
    'var(--accent-violet)',
    'var(--accent-emerald)',
    'var(--accent-amber)',
    '#f87171',
    '#a78bfa',
];

const TOOLTIP_STYLE = {
    contentStyle: {
        background: 'rgba(10,10,15,0.95)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        fontSize: '12px',
    },
    cursor: { fill: 'rgba(255,255,255,0.04)' },
};

export default function AnalyticsChart({
    title,
    subtitle,
    type,
    data,
    dataKey,
    nameKey = 'name',
    accentColor = 'var(--accent-cyan)',
    height = 220,
    colors,
}: ChartProps) {
    const palette = colors ?? CHART_COLORS;

    return (
        <div
            className="glass-panel p-5 flex flex-col gap-4"
            style={{ minHeight: height + 80 }}
        >
            {/* Header */}
            <div>
                <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: 'var(--font-space-grotesk)', color: 'var(--text-primary)' }}
                >
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={height}>
                {type === 'line' ? (
                    <LineChart data={data}>
                        <XAxis dataKey={nameKey} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={accentColor}
                            strokeWidth={2}
                            dot={{ fill: accentColor, strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5, fill: accentColor }}
                        />
                    </LineChart>
                ) : type === 'bar' ? (
                    <BarChart data={data}>
                        <XAxis dataKey={nameKey} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                            {data.map((_, index) => (
                                <Cell key={index} fill={palette[index % palette.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                ) : (
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={dataKey}
                            nameKey={nameKey}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={44}
                            paddingAngle={3}
                        >
                            {data.map((_, index) => (
                                <Cell key={index} fill={palette[index % palette.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                        />
                    </PieChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
