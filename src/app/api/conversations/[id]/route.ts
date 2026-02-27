import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok } from '@/lib/api/response';
import { dbError, notFound, serverError, badRequest } from '@/lib/api/errors';
import { z } from 'zod';
import { addMessage } from '@/lib/db/conversations';

type RouteParams = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
    status: z.enum(['active', 'closed', 'escalated']).optional(),
    agent_id: z.string().uuid().optional(),
});

// ─── GET /api/conversations/[id] ─────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('conversations')
            .select('*, agents(id, name)')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return notFound('Conversation');
            return dbError(error);
        }

        return ok(data);
    } catch (err) {
        return serverError(err);
    }
}

// ─── PATCH /api/conversations/[id] — update status or agent ──────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const body = await request.json();

        const parsed = PatchSchema.safeParse(body);
        if (!parsed.success) return badRequest('Invalid fields', parsed.error.issues);

        const { data, error } = await supabase
            .from('conversations')
            .update({ ...parsed.data, updated_at: new Date().toISOString() } as never)
            .eq('id', id)
            .select('*, agents(id, name)')
            .single();

        if (error) {
            if (error.code === 'PGRST116') return notFound('Conversation');
            return dbError(error);
        }

        return ok(data);
    } catch (err) {
        return serverError(err);
    }
}

// ─── POST /api/conversations/[id] — add manual staff message ─────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = (await request.json()) as { content?: string; role?: string };

        if (!body.content?.trim()) return badRequest('"content" is required');

        await addMessage(id, (body.role ?? 'user') as 'user' | 'assistant' | 'system', body.content);

        return ok({ message: 'Message added', conversationId: id });
    } catch (err) {
        return serverError(err);
    }
}
