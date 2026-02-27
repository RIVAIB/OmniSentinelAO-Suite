'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatRoom } from '@/components/chat/ChatRoom';
import PageLoader from '@/components/ui/PageLoader';

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: PageProps) {
    const { sessionId } = use(params);
    const [session, setSession] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function load() {
            const { data: sess } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (!sess) {
                window.location.href = '/room';
                return;
            }

            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            setSession(sess);
            setMessages(msgs || []);
            setLoading(false);
        }
        load();
    }, [sessionId]);

    if (loading) return <PageLoader rows={8} />;
    if (!session) return null;

    return (
        <ChatRoom
            sessionId={sessionId}
            initialMessages={messages}
            sessionTitle={session.title}
            projectType={session.project_type}
        />
    );
}
