'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, ChevronRight, Clock, Search, Trash2, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionListProps {
    initialSessions: any[];
}

export function SessionList({ initialSessions }: SessionListProps) {
    const [sessions, setSessions] = useState(initialSessions);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.project_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (sessionId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) return;

        try {
            const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                toast.success('Sesión eliminada');
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error('Error al eliminar: ' + error.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Filtrar por título o tecnología..."
                    className="w-full bg-card border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                        <div key={session.id} className="group relative">
                            <Link href={`/room/${session.id}`}>
                                <div className="h-full border border-border/50 bg-card hover:bg-accent/50 hover:border-purple-500/50 rounded-xl p-5 transition-all duration-300 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider px-2 py-0.5 rounded bg-purple-400/10">
                                                {session.project_type}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2 group-hover:text-purple-300 transition-colors uppercase truncate pr-6">
                                            {session.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                                            {session.project_context || 'Sin contexto inicial definido.'}
                                        </p>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: es })}
                                        </div>
                                        <span className="text-green-500">Activa</span>
                                    </div>
                                </div>
                            </Link>

                            <div className="absolute top-4 right-4 z-10">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => handleDelete(session.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full border border-dashed border-border/60 rounded-2xl p-20 flex flex-col items-center justify-center text-center bg-accent/20">
                        <div className="bg-muted p-4 rounded-full mb-6">
                            <MessageSquare className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 uppercase">No se encontraron sesiones</h3>
                        <p className="max-w-[300px] text-sm text-muted-foreground">
                            Ajusta tu búsqueda o crea una nueva sesión.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
