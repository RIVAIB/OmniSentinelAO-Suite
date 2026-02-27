import { createClient } from '@/lib/supabase/server';
import type { ConversationMessage } from '@/lib/ai/claude';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    agentName?: string;
}

export interface Conversation {
    id: string;
    channel: string;
    contact_id: string;
    agent_id: string | null;
    status: string;
    messages: StoredMessage[];
    created_at: string;
    updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single conversation with parsed messages.
 */
export async function getConversation(id: string): Promise<Conversation | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;

    return {
        ...(data as Record<string, unknown>),
        messages: Array.isArray((data as Record<string, unknown>).messages)
            ? ((data as Record<string, unknown>).messages as StoredMessage[])
            : [],
    } as Conversation;
}

/**
 * Append a message to a conversation's messages JSONB array.
 */
export async function addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    agentName?: string
): Promise<void> {
    const supabase = await createClient();

    // Fetch current messages
    const { data } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

    const existing: StoredMessage[] = Array.isArray((data as unknown as Record<string, unknown>)?.messages)
        ? ((data as unknown as Record<string, unknown>).messages as StoredMessage[])
        : [];

    const newMessage: StoredMessage = {
        role,
        content,
        timestamp: new Date().toISOString(),
        ...(agentName ? { agentName } : {}),
    };

    await supabase
        .from('conversations')
        .update({
            messages: [...existing, newMessage],
            updated_at: new Date().toISOString(),
        } as never)
        .eq('id', conversationId);
}

/**
 * Get the last `limit` messages formatted as Claude conversation history.
 */
export async function getConversationHistory(
    conversationId: string,
    limit = 20
): Promise<ConversationMessage[]> {
    const conv = await getConversation(conversationId);
    if (!conv) return [];

    return conv.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-limit)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

/**
 * Update the assigned agent on a conversation (by agent name, resolved to ID separately).
 */
export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
    const supabase = await createClient();
    await supabase
        .from('conversations')
        .update({ agent_id: agentId, updated_at: new Date().toISOString() } as never)
        .eq('id', conversationId);
}
