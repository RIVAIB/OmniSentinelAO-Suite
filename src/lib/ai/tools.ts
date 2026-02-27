// ─── Tool Definitions ─────────────────────────────────────────────────────────
// Descriptive catalogue of what each agent can do.
// Used in system prompts and future MCP/function-calling integration.

export interface ToolDefinition {
    name: string;
    description: string;
    agent: string | string[];
    parameters?: Record<string, string>;
}

export const AGENT_TOOLS: ToolDefinition[] = [
    // ── JESSY tools (appointments / WhatsApp) ─────────────────────────────────
    {
        name: 'check_availability',
        description: 'Check appointment availability for a given date and service type.',
        agent: 'JESSY',
        parameters: { date: 'ISO date', service: 'string' },
    },
    {
        name: 'book_appointment',
        description: 'Book an appointment and save it to Notion.',
        agent: 'JESSY',
        parameters: { patient_name: 'string', date: 'ISO datetime', service: 'string', phone: 'string' },
    },
    {
        name: 'send_whatsapp',
        description: 'Send a WhatsApp message to a patient phone number.',
        agent: 'JESSY',
        parameters: { to: 'E.164 phone', message: 'string' },
    },
    {
        name: 'get_patient_info',
        description: 'Retrieve patient record by phone or name.',
        agent: 'JESSY',
        parameters: { query: 'string' },
    },

    // ── NEXUS tools (marketing) ───────────────────────────────────────────────
    {
        name: 'capture_lead',
        description: 'Save a new lead to the CRM.',
        agent: 'NEXUS',
        parameters: { name: 'string', phone: 'string', source: 'string', notes: 'string' },
    },
    {
        name: 'send_promotion',
        description: 'Send a promotional message to a segment of patients.',
        agent: 'NEXUS',
        parameters: { segment: 'string', message_template: 'string' },
    },

    // ── APEX tools (finance) ──────────────────────────────────────────────────
    {
        name: 'create_invoice',
        description: 'Generate a patient invoice in BigCapital.',
        agent: 'APEX',
        parameters: { patient_id: 'string', amount: 'number', description: 'string' },
    },
    {
        name: 'check_payment_status',
        description: 'Check if a patient has pending or overdue payments.',
        agent: 'APEX',
        parameters: { patient_id: 'string' },
    },

    // ── AXIOM tools (analytics / reports) ────────────────────────────────────
    {
        name: 'generate_report',
        description: 'Generate a business report for a given period.',
        agent: 'AXIOM',
        parameters: { type: 'daily|weekly|monthly', from: 'ISO date', to: 'ISO date' },
    },
    {
        name: 'query_metrics',
        description: 'Query key business metrics and KPIs from the database.',
        agent: 'AXIOM',
        parameters: { metric: 'string', period: 'string' },
    },

    // ── Shared tools (all agents) ─────────────────────────────────────────────
    {
        name: 'send_message_to_agent',
        description: 'Send a task or question to another agent.',
        agent: ['JESSY', 'NEXUS', 'APEX', 'AXIOM', 'CLAWDIO'],
        parameters: { to_agent: 'string', message: 'string', type: 'task|question|notification' },
    },
    {
        name: 'create_mission',
        description: 'Create a new mission with step-by-step actions for one or more agents.',
        agent: ['CLAWDIO'],
        parameters: { title: 'string', description: 'string', steps: 'array of {agent, task}' },
    },
    {
        name: 'update_memory',
        description: 'Persist important information to agent memory for future sessions.',
        agent: ['JESSY', 'NEXUS', 'APEX', 'AXIOM', 'CLAWDIO'],
        parameters: { key: 'string', value: 'any' },
    },
];

/** Get tools available for a specific agent */
export function getAgentTools(agentName: string): ToolDefinition[] {
    const upper = agentName.toUpperCase();
    return AGENT_TOOLS.filter((t) =>
        Array.isArray(t.agent) ? t.agent.includes(upper) : t.agent === upper
    );
}

/** Format tools as a readable list for system prompts */
export function formatToolsForPrompt(tools: ToolDefinition[]): string {
    if (tools.length === 0) return 'Sin herramientas disponibles.';
    return tools
        .map((t) => `• ${t.name}: ${t.description}`)
        .join('\n');
}
