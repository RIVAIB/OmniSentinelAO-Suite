'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    LayoutDashboard,
    Bot,
    Target,
    MessageSquare,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    Swords,
    PlusCircle,
    Search,
    History,
    Zap,
    Power,
    Building2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: string | number;
}

interface RuntimeStatus {
    running: boolean;
    activeMissions: number;
}

// ─── Navigation items ────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'agents', label: 'Agentes', href: '/agents', icon: <Bot size={18} /> },
    { id: 'missions', label: 'Misiones', href: '/missions', icon: <Target size={18} /> },
    { id: 'conversations', label: 'Conversaciones', href: '/conversations', icon: <MessageSquare size={18} /> },
    { id: 'warroom', label: 'War Room', href: '/room', icon: <Swords size={18} /> },
    { id: 'analytics', label: 'Analytics', href: '/analytics', icon: <BarChart3 size={18} /> },
    { id: 'office', label: 'Virtual Office', href: '/office-editor', icon: <Building2 size={18} /> },
    { id: 'settings', label: 'Configuración', href: '/settings', icon: <Settings size={18} /> },
];

// ─── Component ───────────────────────────────────────────────

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
    const [togglingRuntime, setTogglingRuntime] = useState(false);

    // War Room sessions (only loaded when in /room section)
    const [sessions, setSessions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const supabase = createClient();

    const isInWarRoom = pathname.startsWith('/room');

    // ── Runtime polling ──
    useEffect(() => {
        let cancelled = false;
        async function poll() {
            try {
                const res = await fetch('/api/runtime');
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setRuntimeStatus(json.data ?? null);
            } catch { /* ignore */ }
        }
        poll();
        const id = setInterval(poll, 15_000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    // ── War Room sessions (only when in /room) ──
    useEffect(() => {
        if (!isInWarRoom) return;

        fetchSessions();
        const channel = supabase
            .channel('sidebar-sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isInWarRoom]);

    async function fetchSessions() {
        const { data } = await supabase
            .from('sessions')
            .select('*')
            .order('updated_at', { ascending: false });
        if (data) setSessions(data);
    }

    async function toggleRuntime() {
        if (togglingRuntime) return;
        setTogglingRuntime(true);
        try {
            const method = runtimeStatus?.running ? 'DELETE' : 'POST';
            const res = await fetch('/api/runtime', { method });
            const json = await res.json();
            setRuntimeStatus(json.data?.status ?? null);
        } finally {
            setTogglingRuntime(false);
        }
    }

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <aside
                className="fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out"
                style={{
                    width: collapsed ? '72px' : '260px',
                    background: 'rgba(10,10,15,0.85)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                {/* ── Logo ── */}
                <div
                    className="flex items-center h-16 px-4 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div
                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))',
                            boxShadow: '0 0 20px rgba(34,211,238,0.3)',
                        }}
                    >
                        <Zap size={16} className="text-[#0a0a0f]" strokeWidth={2.5} />
                    </div>
                    {!collapsed && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-bold tracking-wider leading-none gradient-text">
                                OMNISENTINEL
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                RIVAIB Command Center
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Runtime status ── */}
                {!collapsed && (
                    <div
                        className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg flex items-center gap-2 flex-shrink-0"
                        style={{
                            background: runtimeStatus?.running ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.05)',
                            border: runtimeStatus?.running ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(239,68,68,0.12)',
                        }}
                    >
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                                background: runtimeStatus?.running ? 'var(--accent-emerald)' : '#f87171',
                                boxShadow: runtimeStatus?.running ? '0 0 6px var(--accent-emerald)' : 'none',
                                animation: runtimeStatus?.running ? 'pulse-glow 2s infinite' : 'none',
                            }}
                        />
                        <span
                            className="flex-1 text-[11px] font-mono"
                            style={{ color: runtimeStatus?.running ? 'var(--accent-emerald)' : '#f87171' }}
                        >
                            {runtimeStatus?.running
                                ? `Runtime · ${runtimeStatus.activeMissions} misión${runtimeStatus.activeMissions !== 1 ? 'es' : ''}`
                                : 'Runtime detenido'}
                        </span>
                        <button
                            onClick={toggleRuntime}
                            disabled={togglingRuntime}
                            title={runtimeStatus?.running ? 'Detener runtime' : 'Iniciar runtime'}
                            className="flex-shrink-0 transition-all hover:scale-110 disabled:opacity-40 cursor-pointer"
                            style={{ color: runtimeStatus?.running ? '#f87171' : 'var(--accent-emerald)' }}
                        >
                            <Power size={11} />
                        </button>
                    </div>
                )}
                {collapsed && (
                    <div className="flex justify-center mt-3 mb-1 flex-shrink-0">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: runtimeStatus?.running ? 'var(--accent-emerald)' : '#f87171' }}
                            title={runtimeStatus?.running ? 'Runtime activo' : 'Runtime detenido'}
                        />
                    </div>
                )}

                {/* ── Main Navigation ── */}
                <nav className="px-2 py-3 space-y-1 flex-shrink-0">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.href === '/room'
                            ? pathname.startsWith('/room')
                            : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && !pathname.startsWith('/room'));

                        return (
                            <Link
                                key={item.id}
                                href={item.href === '/room' ? '/' : item.href}
                                title={collapsed ? item.label : undefined}
                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative"
                                style={{
                                    background: isActive ? 'rgba(34,211,238,0.10)' : 'transparent',
                                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                    border: isActive ? '1px solid rgba(34,211,238,0.18)' : '1px solid transparent',
                                }}
                            >
                                {isActive && (
                                    <span
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                        style={{ background: 'var(--accent-cyan)' }}
                                    />
                                )}
                                <span className="flex-shrink-0" style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                                    {item.icon}
                                </span>
                                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* ── War Room Sessions (only visible when in /room) ── */}
                {isInWarRoom && !collapsed && (
                    <div className="flex-1 flex flex-col overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Search */}
                        <div className="px-3 py-3 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar sesión..."
                                    className="w-full rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'var(--text-primary)',
                                    }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Session list */}
                        <div className="flex-1 overflow-y-auto px-2">
                            <div className="flex items-center gap-2 px-3 mb-2">
                                <History className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                    Sesiones
                                </span>
                            </div>
                            {filteredSessions.map((session) => {
                                const isActive = pathname === `/room/${session.id}`;
                                return (
                                    <Link key={session.id} href={`/room/${session.id}`}>
                                        <div
                                            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-0.5 cursor-pointer transition-all duration-200"
                                            style={{
                                                background: isActive ? 'rgba(139,92,246,0.10)' : 'transparent',
                                                color: isActive ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                                borderRight: isActive ? '2px solid var(--accent-violet)' : '2px solid transparent',
                                            }}
                                        >
                                            <Swords className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span className="truncate text-xs font-medium">{session.title}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* New session button */}
                        <div className="p-3 flex-shrink-0">
                            <Link href="/">
                                <button
                                    className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold cursor-pointer transition-all"
                                    style={{
                                        border: '1px dashed rgba(139,92,246,0.3)',
                                        color: 'var(--accent-violet)',
                                        background: 'transparent',
                                    }}
                                >
                                    <PlusCircle size={14} />
                                    NUEVA SESIÓN
                                </button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── Spacer (when not in War Room, push collapse to bottom) ── */}
                {!isInWarRoom && <div className="flex-1" />}

                {/* ── Collapse toggle ── */}
                <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="w-full flex items-center justify-center rounded-xl py-2 transition-all duration-200 cursor-pointer"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-muted)',
                        }}
                    >
                        {collapsed ? (
                            <ChevronRight size={16} />
                        ) : (
                            <span className="flex items-center gap-2 text-xs">
                                <ChevronLeft size={14} />
                                <span>Colapsar</span>
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* ── Content offset spacer ── */}
            <div
                className="flex-shrink-0 transition-all duration-300"
                style={{ width: collapsed ? '72px' : '260px' }}
            />
        </>
    );
}
