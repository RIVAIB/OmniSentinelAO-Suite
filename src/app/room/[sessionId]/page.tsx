import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatRoom } from '@/components/chat/ChatRoom';

interface PageProps {
    params: Promise<{
        sessionId: string;
    }>;
}

export default async function SessionPage({ params }: PageProps) {
    const { sessionId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (!session) {
        redirect('/');
    }

    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    return (
        <ChatRoom
            sessionId={sessionId}
            initialMessages={messages || []}
            sessionTitle={session.title}
            projectType={session.project_type}
        />
    );
}
