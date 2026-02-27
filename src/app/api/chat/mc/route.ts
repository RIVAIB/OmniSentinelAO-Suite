import { NextRequest } from 'next/server';
import { ok, created } from '@/lib/api/response';
import { badRequest, serverError } from '@/lib/api/errors';
import { routeMessage } from '@/lib/ai/router';
import { processMessage, createConversation, getAgentByName } from '@/lib/ai/agent-service';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatRequestBody {
    message: string;
    channel?: string;
    contactId?: string;
    contactName?: string;
    conversationId?: string;
    /** If set, skip CLAWDIO routing and use this agent directly. */
    agentOverride?: string;
}

// ─── POST /api/chat/mc — CLAWDIO routing endpoint ─────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Partial<ChatRequestBody>;
        const {
            message,
            channel = 'webchat',
            contactId = 'anonymous',
            contactName,
            agentOverride,
        } = body;

        let { conversationId } = body;

        if (!message?.trim()) {
            return badRequest('Field "message" is required and cannot be empty.');
        }

        // ── 1. Find or create conversation ──────────────────────────────────
        if (!conversationId) {
            conversationId = await createConversation(channel, contactId, contactName);
        } else {
            // Verify conversation exists
            const supabase = await createClient();
            const { error } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', conversationId)
                .single();
            if (error) {
                // Conversation not found — create a new one
                conversationId = await createConversation(channel, contactId, contactName);
            }
        }

        // ── 2. Determine which agent should respond ──────────────────────────
        let agentName: string;
        let routingConfidence = 1.0;
        let routingReason = 'Agent override';

        if (agentOverride) {
            // Bypass CLAWDIO for test chat
            agentName = agentOverride.toUpperCase();
        } else {
            // Check if conversation already has an assigned agent
            const supabase = await createClient();
            const { data: conv } = await supabase
                .from('conversations')
                .select('agent_id, agents(name)')
                .eq('id', conversationId)
                .single();

            const convData = conv as Record<string, unknown> | null;
            const assignedAgent = convData?.agents as { name: string } | null;

            if (assignedAgent?.name) {
                agentName = assignedAgent.name.toUpperCase();
                routingReason = 'Existing conversation agent';
            } else {
                // Route via CLAWDIO
                const routing = await routeMessage(message);
                agentName = routing.agent;
                routingConfidence = routing.confidence;
                routingReason = routing.reason;
            }
        }

        // ── 3. Validate agent exists ─────────────────────────────────────────
        const agent = await getAgentByName(agentName);
        if (!agent) {
            // Fallback to JESSY if the routed agent isn't in DB
            agentName = 'JESSY';
        }

        // ── 4. Process through agent (saves user msg + agent reply) ──────────
        const { response, agentName: respondingAgent } = await processMessage(
            agentName,
            conversationId,
            message
        );

        // ── 5. Return ────────────────────────────────────────────────────────
        const isNew = !body.conversationId;
        const responseBody = {
            conversationId,
            response,
            agent: respondingAgent,
            routingConfidence,
            routingReason,
        };

        return isNew ? created(responseBody) : ok(responseBody);
    } catch (err) {
        return serverError(err);
    }
}

// ─── GET /api/chat/mc — health check ─────────────────────────────────────────
export async function GET() {
    return ok({ status: 'CLAWDIO Chat API ready', version: '1.0' });
}
