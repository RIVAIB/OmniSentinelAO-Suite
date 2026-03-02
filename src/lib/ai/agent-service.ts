import { createAdminClient } from '@/lib/supabase/admin';
import { callAgent, type ConversationMessage } from '@/lib/ai/claude';
import {
    getConversation,
    addMessage,
    getConversationHistory,
    assignAgent,
} from '@/lib/db/conversations';
import { retrieve, retrieveShared, memorize } from '@/lib/memory/mem0';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentRow {
    id: string;
    name: string;
    type: string;
    status: string;
    config: {
        systemPrompt?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        [key: string]: unknown;
    };
}

// ─── DB lookups ───────────────────────────────────────────────────────────────

/**
 * Fetch an agent row by its `name` column (case-insensitive).
 */
export async function getAgentByName(name: string): Promise<AgentRow | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .ilike('name', name)
        .eq('status', 'active')
        .single();

    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
        id: row.id as string,
        name: row.name as string,
        type: row.type as string,
        status: row.status as string,
        config: (row.config ?? {}) as AgentRow['config'],
    };
}

/**
 * Create a new conversation and return its ID.
 */
export async function createConversation(
    channel: string,
    contactId: string
): Promise<string> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('conversations')
        .insert({
            channel,
            contact_id: contactId,
            status: 'active',
            messages: [],
        } as never)
        .select('id')
        .single();

    if (error || !data) throw new Error(`Failed to create conversation: ${error?.message}`);
    return (data as { id: string }).id;
}

/**
 * Persist a single message to a conversation's JSONB messages array.
 * (Re-exported from db/conversations for convenience.)
 */
export { addMessage as addMessageToConversation };

// ─── Core processing ──────────────────────────────────────────────────────────

/**
 * Process a user message through an already-loaded agent row.
 * Use this when the caller already has the AgentRow to avoid a redundant DB lookup.
 */
export async function processMessageWithAgent(
    agent: AgentRow,
    conversationId: string,
    userMessage: string,
    contactId?: string
): Promise<{ response: string; agentId: string; agentName: string }> {
    // 1. Assign agent to conversation if not already
    const conv = await getConversation(conversationId);
    if (conv && !conv.agent_id) {
        await assignAgent(conversationId, agent.id);
    }

    // 2. Get conversation history for Claude
    const history: ConversationMessage[] = await getConversationHistory(conversationId, 20);

    // 3. Save user message BEFORE calling Claude
    await addMessage(conversationId, 'user', userMessage);

    // 4. Build system prompt
    const baseSystemPrompt =
        agent.config.systemPrompt ??
        `You are ${agent.name}, a helpful AI assistant for RIVAIB Health Clinic. Be professional and empathetic.`;

    // 4b. Retrieve shared memory context (best-effort, non-blocking on failure)
    const memUserId = contactId ?? conversationId;
    const [privateCtx, sharedCtx] = await Promise.all([
        retrieve(agent.name, userMessage, memUserId),
        retrieveShared(userMessage, memUserId),
    ]);

    const memBlock = [
        privateCtx  ? `## Tu memoria privada (${agent.name}):\n${privateCtx}`  : '',
        sharedCtx   ? `## Contexto compartido del equipo:\n${sharedCtx}`      : '',
    ].filter(Boolean).join('\n\n');

    const systemPrompt = memBlock
        ? `${baseSystemPrompt}\n\n${memBlock}`
        : baseSystemPrompt;

    // 5. Call Claude
    const response = await callAgent(
        {
            systemPrompt,
            model: agent.config.model,
            temperature: agent.config.temperature,
            maxTokens: agent.config.maxTokens,
        },
        history,
        userMessage
    );

    // 6. Save agent response
    await addMessage(conversationId, 'assistant', response, agent.name);

    // 6b. Memorize the exchange (fire-and-forget — must not block response)
    memorize(agent.name, userMessage, response, memUserId).catch(
        (err) => console.error('[Memory] memorize error:', err)
    );

    return { response, agentId: agent.id, agentName: agent.name };
}

/**
 * Process a user message by agent name — fetches the agent row then delegates.
 * Use this only when the caller doesn't already have an AgentRow.
 */
export async function processMessage(
    agentName: string,
    conversationId: string,
    userMessage: string,
    contactId?: string
): Promise<{ response: string; agentId: string; agentName: string }> {
    const agent = await getAgentByName(agentName);
    if (!agent) throw new Error(`Agent "${agentName}" not found or inactive`);
    return processMessageWithAgent(agent, conversationId, userMessage, contactId);
}
