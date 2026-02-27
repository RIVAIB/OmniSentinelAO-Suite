/**
 * RIVAIB Mission Control — Database Types
 * Auto-derived from Supabase schema: 001_mission_control.sql
 */

// ─────────────────────────────────────────────────────────────
// ENUM TYPES
// ─────────────────────────────────────────────────────────────

export type AgentType = 'orchestrator' | 'specialist' | 'utility';
export type AgentStatus = 'active' | 'inactive' | 'maintenance';

export type MissionStatus = 'proposed' | 'running' | 'paused' | 'done' | 'failed';
export type TriggerType = 'manual' | 'scheduled' | 'event';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export type ChannelType = 'whatsapp' | 'telegram' | 'webchat' | 'internal';
export type ConversationStatus = 'active' | 'closed' | 'escalated';

// ─────────────────────────────────────────────────────────────
// TABLE INTERFACES
// ─────────────────────────────────────────────────────────────

export interface Agent {
    id: string;
    name: string;
    type: AgentType;
    config: Record<string, unknown>;
    status: AgentStatus;
    created_at: string;
    updated_at: string;
}

export interface Mission {
    id: string;
    title: string;
    description: string | null;
    status: MissionStatus;
    priority: number; // 1–10
    trigger_type: TriggerType;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface MissionStep {
    id: string;
    mission_id: string;
    agent_id: string;
    step_order: number;
    status: StepStatus;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
}

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface Conversation {
    id: string;
    channel: ChannelType;
    contact_id: string;
    agent_id: string | null;
    messages: Message[];
    status: ConversationStatus;
    created_at: string;
    updated_at: string;
}

export interface Memory {
    id: string;
    agent_id: string;
    contact_id: string | null;
    key: string;
    value: Record<string, unknown>;
    importance: number; // 1–10
    expires_at: string | null;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────
// SUPABASE DATABASE NAMESPACE (for generic client typing)
// ─────────────────────────────────────────────────────────────

export type Database = {
    public: {
        Tables: {
            agents: {
                Row: Agent;
                Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'> & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<Agent, 'id' | 'created_at'>>;
            };
            missions: {
                Row: Mission;
                Insert: Omit<Mission, 'id' | 'created_at' | 'updated_at'> & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<Mission, 'id' | 'created_at'>>;
            };
            mission_steps: {
                Row: MissionStep;
                Insert: Omit<MissionStep, 'id'> & { id?: string };
                Update: Partial<Omit<MissionStep, 'id'>>;
            };
            conversations: {
                Row: Conversation;
                Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'> & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<Conversation, 'id' | 'created_at'>>;
            };
            memories: {
                Row: Memory;
                Insert: Omit<Memory, 'id' | 'created_at'> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<Memory, 'id' | 'created_at'>>;
            };
        };
        Enums: {
            agent_type: AgentType;
            agent_status: AgentStatus;
            mission_status: MissionStatus;
            trigger_type: TriggerType;
            step_status: StepStatus;
            channel_type: ChannelType;
            conversation_status: ConversationStatus;
        };
    };
};
