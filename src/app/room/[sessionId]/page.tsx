import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatRoom } from '@/components/chat/ChatRoom';

interface PageProps {
    params: {
        sessionId: string;
    };
}

export default async function SessionPage({ params }: PageProps) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', params.sessionId)
        .single();

    if (!session) {
        redirect('/');
    }

    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', params.sessionId)
        .order('created_at', { ascending: true });

    return (
        <ChatRoom
            sessionId={params.sessionId}
            initialMessages={messages || []}
            sessionTitle={session.title}
            projectType={session.project_type}
        />
    );
}
