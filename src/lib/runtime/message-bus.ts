import { createClient } from '@/lib/supabase/server';
import { emitAgentMessage } from './events';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentMessage {
    id: string;
    from_agent_id: string;
    to_agent_id: string;
    mission_id?: string | null;
    content: string;
    message_type: string;
    status: 'pending' | 'read' | 'processed';
    created_at: string;
}

// ─── Agent Message Bus ───────────────────────────────────────────────────────

class AgentMessageBus {
    /** Send a message from one agent to another */
    async sendMessage(
        fromAgentId: string,
        toAgentId: string,
        content: string,
        missionId?: string,
        type = 'task'
    ): Promise<void> {
        const supabase = await createClient();
        await supabase.from('agent_messages').insert({
            from_agent_id: fromAgentId,
            to_agent_id: toAgentId,
            mission_id: missionId ?? null,
            content,
            message_type: type,
            status: 'pending',
        } as never);
        await emitAgentMessage(fromAgentId, toAgentId, content);
    }

    /** Check inbox for an agent — returns unread messages */
    async checkInbox(agentId: string): Promise<AgentMessage[]> {
        const supabase = await createClient();
        const { data } = await supabase
            .from('agent_messages')
            .select('*')
            .eq('to_agent_id', agentId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
        return (data ?? []) as AgentMessage[];
    }

    /** Get messages between two agents */
    async getMessages(agentId: string, status?: string): Promise<AgentMessage[]> {
        const supabase = await createClient();
        let q = supabase
            .from('agent_messages')
            .select('*')
            .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)
            .order('created_at', { ascending: false })
            .limit(50);
        if (status) q = q.eq('status', status);
        const { data } = await q;
        return (data ?? []) as AgentMessage[];
    }

    /** Mark message(s) as processed */
    async markAsProcessed(messageId: string): Promise<void> {
        const supabase = await createClient();
        await supabase
            .from('agent_messages')
            .update({ status: 'processed' } as never)
            .eq('id', messageId);
    }

    /** Reply from agent */
    async reply(
        originalMessage: AgentMessage,
        content: string
    ): Promise<void> {
        await this.markAsProcessed(originalMessage.id);
        await this.sendMessage(
            originalMessage.to_agent_id,
            originalMessage.from_agent_id,
            content,
            originalMessage.mission_id ?? undefined,
            'response'
        );
    }
}

export const messageBus = new AgentMessageBus();
