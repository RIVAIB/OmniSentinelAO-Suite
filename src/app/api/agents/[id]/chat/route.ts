// src/app/api/agents/[id]/chat/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processMessage, createConversation } from '@/lib/ai/agent-service';
import { ok } from '@/lib/api/response';
import { notFound, badRequest, serverError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json() as { message?: string; conversationId?: string };
    const { message, conversationId } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return badRequest('message is required');
    }

    const supabase = await createClient();
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (agentError || !agent) return notFound(`Agent ${id}`);

    if ((agent as { status: string }).status !== 'active') {
      return badRequest(`Agent ${id} is not active`);
    }

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation('webchat', 'dashboard-test');
    }

    const result = await processMessage(
      (agent as { name: string }).name,
      convId,
      message.trim()
    );

    return ok({
      response: result.response,
      conversationId: convId,
      agentName: result.agentName,
    });
  } catch (err) {
    return serverError(err);
  }
}
