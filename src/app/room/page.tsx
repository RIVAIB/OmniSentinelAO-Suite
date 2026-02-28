'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SessionList } from '@/components/session/SessionList';
import { NewSessionForm } from '@/components/session/NewSessionForm';
import PageLoader from '@/components/ui/PageLoader';
import { Swords, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WarRoomPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
    const supabase = createClient();

    useEffect(() => {
        async function init() {
            // Check auth first
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthed(!!user);

            // Load sessions regardless (anon can read public sessions)
            const { data } = await supabase
                .from('sessions')
                .select('*')
                .order('updated_at', { ascending: false });

            setSessions(data || []);
            setLoading(false);
        }
        init();

        // Realtime subscription
        const channel = supabase
            .channel('room-sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                supabase
                    .from('sessions')
                    .select('*')
                    .order('updated_at', { ascending: false })
                    .then(({ data }: { data: any[] | null }) => setSessions(data || []));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return <PageLoader rows={4} />;

    return (
        <div className="p-6 lg:p-8 flex flex-col gap-6">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{
                    background: 'radial-gradient(ellipse at 40% 20%, rgba(139,92,246,0.05) 0%, transparent 50%)',
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1
                        className="text-2xl font-bold"
                        style={{
                            fontFamily: 'var(--font-space-grotesk)',
                            background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        War Room
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Technical Debate & Decision Engine — Claude × Gemini
                    </p>
                </div>

                {/* Show login button or new session form depending on auth state */}
                {isAuthed === false ? (
                    <Link
                        href="/login?next=/room"
                        onClick={() => { document.cookie = 'postAuthRedirect=%2Froom; path=/; max-age=3600; SameSite=Lax'; }}
                    >
                        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <LogIn size={16} />
                            Iniciar sesión
                        </Button>
                    </Link>
                ) : (
                    <NewSessionForm />
                )}
            </div>

            {/* Auth notice if not logged in */}
            {isAuthed === false && (
                <div
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.25)',
                    }}
                >
                    <Swords size={16} style={{ color: 'var(--accent-violet)', flexShrink: 0 }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Para crear nuevas sesiones necesitas{' '}
                        <Link
                            href="/login?next=/room"
                            onClick={() => { document.cookie = 'postAuthRedirect=%2Froom; path=/; max-age=3600; SameSite=Lax'; }}
                            className="font-semibold underline"
                            style={{ color: 'var(--accent-violet)' }}
                        >
                            iniciar sesión
                        </Link>
                        . Puedes ver las sesiones existentes sin cuenta.
                    </p>
                </div>
            )}

            {/* Sessions */}
            <SessionList initialSessions={sessions} />
        </div>
    );
}
