/**
 * RIVAIB Mission Control — Real Agent Definitions
 * Source of truth for all agents in the system.
 */

import type { Agent, AgentType, AgentStatus } from '@/types/database';

export interface AgentMeta extends Omit<Agent, 'id' | 'created_at' | 'updated_at'> {
    /** Short codename */
    codename: string;
    /** One-line role description */
    role: string;
    /** Accent color key for UI */
    accentColor: string;
    /** Emoji icon for quick identification */
    icon: string;
    /** Protocol or special notes */
    protocol?: string;
    /** Integration highlights */
    integrations?: string[];
}

export const RIVAIB_AGENTS: AgentMeta[] = [
    {
        codename: 'CLAWDIO',
        name: 'CLAWDIO',
        type: 'orchestrator' as AgentType,
        status: 'active' as AgentStatus,
        role: 'Central orchestrator — routes messages to specialists and coordinates all agent workflows',
        accentColor: 'cyan',
        icon: '🧠',
        integrations: ['All agents', 'Supabase', 'Webhook router'],
        config: {
            description: 'Central orchestrator for RIVAIB Health Clinic multi-agent system',
            capabilities: ['routing', 'planning', 'delegation', 'context-management'],
            priority: 1,
            maxConcurrentMissions: 10,
        },
    },
    {
        codename: 'JESSY',
        name: 'JESSY',
        type: 'specialist' as AgentType,
        status: 'active' as AgentStatus,
        role: 'WhatsApp bot — handles patient conversations, books appointments, H2H protocol',
        accentColor: 'emerald',
        icon: '💬',
        protocol: 'H2H (Human-to-Human)',
        integrations: ['WhatsApp Business API', 'Appointment system', 'Patient records'],
        config: {
            description: 'WhatsApp specialist with Human-to-Human conversational protocol',
            capabilities: ['messaging', 'appointment-booking', 'patient-intake', 'reminders'],
            protocol: 'H2H',
            channel: 'whatsapp',
        },
    },
    {
        codename: 'NEXUS',
        name: 'NEXUS',
        type: 'specialist' as AgentType,
        status: 'active' as AgentStatus,
        role: 'Marketing automation — lead capture, remarketing campaigns, patient acquisition',
        accentColor: 'violet',
        icon: '📡',
        integrations: ['Meta Ads', 'Email campaigns', 'CRM', 'Landing pages'],
        config: {
            description: 'Marketing automation specialist for RIVAIB patient acquisition',
            capabilities: ['lead-capture', 'remarketing', 'campaign-management', 'segmentation'],
            channels: ['instagram', 'facebook', 'email', 'whatsapp'],
        },
    },
    {
        codename: 'APEX',
        name: 'APEX',
        type: 'specialist' as AgentType,
        status: 'inactive' as AgentStatus,
        role: 'Finance management — BigCapital integration, billing, revenue reporting',
        accentColor: 'amber',
        icon: '💰',
        integrations: ['BigCapital', 'Bank feeds', 'Invoice system'],
        config: {
            description: 'Finance and billing specialist with BigCapital ERP integration',
            capabilities: ['invoicing', 'payment-tracking', 'financial-reporting', 'reconciliation'],
            erp: 'BigCapital',
        },
    },
    {
        codename: 'AXIOM',
        name: 'AXIOM',
        type: 'specialist' as AgentType,
        status: 'active' as AgentStatus,
        role: 'CEO dashboard — strategic metrics, business intelligence, executive reporting',
        accentColor: 'rose',
        icon: '📊',
        integrations: ['All data sources', 'Google Data Studio', 'Supabase analytics'],
        config: {
            description: 'Business intelligence and executive reporting specialist',
            capabilities: ['kpi-tracking', 'strategic-metrics', 'executive-reports', 'forecasting'],
            accessLevel: 'executive',
        },
    },
    {
        codename: 'FORGE',
        name: 'FORGE',
        type: 'utility' as AgentType,
        status: 'maintenance' as AgentStatus,
        role: 'Development assistant — code generation, system configuration, deployments',
        accentColor: 'glass',
        icon: '⚙️',
        integrations: ['GitHub', 'Vercel', 'Supabase CLI', 'n8n'],
        config: {
            description: 'Development and infrastructure utility agent',
            capabilities: ['code-generation', 'deployment', 'configuration', 'debugging'],
            environment: 'development',
        },
    },
];

/** Map from codename to agent meta */
export const AGENT_BY_CODENAME = Object.fromEntries(
    RIVAIB_AGENTS.map((a) => [a.codename, a])
);

/** Accent CSS variable map */
export const ACCENT_CSS: Record<string, string> = {
    cyan: 'var(--accent-cyan)',
    violet: 'var(--accent-violet)',
    emerald: 'var(--accent-emerald)',
    rose: 'var(--accent-rose)',
    amber: 'var(--accent-amber)',
    glass: 'rgba(255,255,255,0.4)',
};

export type { AgentType, AgentStatus };
