import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SessionList } from '@/components/session/SessionList';
import { NewSessionForm } from '@/components/session/NewSessionForm';

export default async function WarRoomPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .order('updated_at', { ascending: false });

    return (
        <div className="p-6 lg:p-8 flex flex-col gap-6">
            {/* Ambient */}
            <div
                className="fixed inset-0 pointer-events-none"
                aria-hidden
                style={{ background: 'radial-gradient(ellipse at 40% 20%, rgba(139,92,246,0.05) 0%, transparent 50%)' }}
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
            <SessionList initialSessions={sessions || []} />
        </div>
    );
}
