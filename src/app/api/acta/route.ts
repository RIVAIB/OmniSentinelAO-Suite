import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateActa } from '@/lib/agents/acta-generator';

export async function POST(req: NextRequest) {
    const { sessionId } = await req.json();
    const supabase = createClient();

    // 1. Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Get session and all messages
    const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
        return NextResponse.json({ error: 'No messages found in this session' }, { status: 400 });
    }

    try {
        const rawMarkdown = await generateActa(session.project_context || '', messages);

        // 3. Save to database
        // Use a more compatible way to match multiline vision if /s flag is a problem
        // but typically Next.js handles ES2018+. Let's try to ensure rawMarkdown is string.
        const visionMatch = (rawMarkdown as string).match(/## 1. VISIÓN ACORDADA\n([\s\S]*?)(?:\n##|$)/);
        const vision = visionMatch?.[1]?.trim() || 'Visión generada';

        const { data: acta, error: insertError } = await supabase
            .from('actas')
            .insert({
                session_id: sessionId,
                vision: vision,
                technical_validation: 'Consolidado en markdown',
                roadmap: [], // Placeholder for parsed JSON roadmap
                raw_markdown: rawMarkdown,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json(acta);
    } catch (error: any) {
        console.error('Acta generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
