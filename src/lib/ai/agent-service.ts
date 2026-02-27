import { createClient } from '@/lib/supabase/server';
import { callAgent, type ConversationMessage } from '@/lib/ai/claude';
import {
    getConversation,
    addMessage,
    getConversationHistory,
    assignAgent,
} from '@/lib/db/conversations';

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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
 * Process a user message through a specific agent.
 *
 * - Fetches agent config from DB
 * - Loads last 20 messages as Claude history
 * - Calls Claude
 * - Saves the agent response
 * - Returns the response text and agent metadata
 */
export async function processMessage(
    agentName: string,
    conversationId: string,
    userMessage: string
): Promise<{ response: string; agentId: string; agentName: string }> {
    // 1. Load agent
    const agent = await getAgentByName(agentName);
    if (!agent) throw new Error(`Agent "${agentName}" not found or inactive`);

    // 2. Assign agent to conversation if not already
    const conv = await getConversation(conversationId);
    if (conv && !conv.agent_id) {
        await assignAgent(conversationId, agent.id);
    }

    // 3. Get conversation history for Claude
    const history: ConversationMessage[] = await getConversationHistory(conversationId, 20);

    // 4. Save user message BEFORE calling Claude
    await addMessage(conversationId, 'user', userMessage);

    // 5. Build system prompt
    const systemPrompt =
        agent.config.systemPrompt ??
        `You are ${agent.name}, a helpful AI assistant for RIVAIB Health Clinic. Be professional and empathetic.`;

    // 6. Call Claude
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

    // 7. Save agent response
    await addMessage(conversationId, 'assistant', response, agent.name);

    return { response, agentId: agent.id, agentName: agent.name };
}
