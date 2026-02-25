'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MessageSquare,
    PlusCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    History,
    LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const pathname = usePathname();
    const [sessions, setSessions] = useState<any[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const supabase = createClient();

    useEffect(() => {
        fetchSessions();

        const channel = supabase
            .channel('public:sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchSessions() {
        const { data } = await supabase
            .from('sessions')
            .select('*')
            .order('updated_at', { ascending: false });
        if (data) setSessions(data);
    }

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className={cn(
            "relative flex flex-col border-r bg-card transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
        )}>
            {/* Collapse Toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background z-50 hover:bg-purple-600 hover:text-white"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            {/* Header */}
            <div className="p-4 flex flex-col gap-4">
                {!isCollapsed && (
                    <div className="flex items-center gap-2 px-2">
                        <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
                            <span className="font-bold text-white">WR</span>
                        </div>
                        <span className="font-bold text-sm tracking-tight uppercase">War Room</span>
                    </div>
                )}

                <Link href="/">
                    <Button variant={pathname === '/' ? 'secondary' : 'ghost'} className={cn(
                        "w-full justify-start",
                        isCollapsed && "px-2"
                    )}>
                        <LayoutDashboard className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                        {!isCollapsed && <span>DASHBOARD</span>}
                    </Button>
                </Link>
            </div>

            {!isCollapsed && (
                <div className="px-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar sesión..."
                            className="w-full bg-slate-900/50 border rounded-md py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Session List */}
            <ScrollArea className="flex-1 px-4">
                <div className="space-y-1 py-2">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 px-2 mb-2">
                            <History className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                                Recientes
                            </span>
                        </div>
                    )}

                    {filteredSessions.map((session) => {
                        const isActive = pathname === `/room/${session.id}`;
                        return (
                            <Link key={session.id} href={`/room/${session.id}`}>
                                <Button
                                    variant={isActive ? 'secondary' : 'ghost'}
                                    size={isCollapsed ? 'icon' : 'sm'}
                                    className={cn(
                                        "w-full justify-start overflow-hidden whitespace-nowrap",
                                        isActive && "bg-purple-600/10 text-purple-400 border-r-2 border-purple-600 rounded-r-none",
                                        isCollapsed ? "justify-center" : "px-3"
                                    )}
                                >
                                    <MessageSquare className={cn("h-4 w-4", !isCollapsed && "mr-3 flex-shrink-0")} />
                                    {!isCollapsed && (
                                        <span className="truncate text-xs font-medium">{session.title}</span>
                                    )}
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 mt-auto border-t">
                <Link href="/">
                    <Button variant="outline" className={cn(
                        "w-full border-dashed border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/5",
                        isCollapsed && "px-0"
                    )}>
                        <PlusCircle className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                        {!isCollapsed && <span>NUEVA SESIÓN</span>}
                    </Button>
                </Link>
            </div>
        </aside>
    );
}
