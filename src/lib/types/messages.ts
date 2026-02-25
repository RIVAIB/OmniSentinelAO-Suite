export type AgentRole = 'richard' | 'claude' | 'gemini' | 'system' | 'cross_check';
export type CrossCheckStatus = 'pending' | 'validated' | 'contradiction_found' | 'resolved';

export interface Message {
    id: string;
    session_id: string;
    role: AgentRole;
    content: string;
    metadata?: any;
    cross_check_status?: CrossCheckStatus;
    cross_check_detail?: string;
    parent_message_id?: string;
    created_at: string;
}

export interface Session {
    id: string;
    user_id: string;
    title: string;
    project_type: 'web' | 'mobile' | 'erp' | 'general';
    project_context: string;
    status: 'active' | 'archived' | 'completed';
    created_at: string;
    updated_at: string;
}
