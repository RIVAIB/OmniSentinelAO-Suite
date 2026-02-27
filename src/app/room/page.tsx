'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SessionList } from '@/components/session/SessionList';
import { NewSessionForm } from '@/components/session/NewSessionForm';
import PageLoader from '@/components/ui/PageLoader';

export default function WarRoomPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function loadSessions() {
            const { data } = await supabase
                .from('sessions')
                .select('*')
                .order('updated_at', { ascending: false });

            setSessions(data || []);
            setLoading(false);
        }
        loadSessions();

        // Realtime subscription
        const channel = supabase
            .channel('room-sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                loadSessions();
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
                <NewSessionForm />
            </div>

            {/* Sessions */}
            <SessionList initialSessions={sessions} />
        </div>
    );
}
