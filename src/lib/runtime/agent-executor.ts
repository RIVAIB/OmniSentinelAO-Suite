import { createClient } from '@/lib/supabase/server';
import { callAgent } from '@/lib/ai/claude';
import { emitAgentThought } from './events';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentTask {
    instruction: string;
    context: Record<string, unknown>;
    tools?: string[];
}

export interface AgentResult {
    success: boolean;
    output: string;
    tokensUsed: number;
    error?: string;
}

interface AgentConfig {
    systemPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

interface AgentRow {
    id: string;
    name: string;
    status: string;
    config: AgentConfig | null;
}

// ─── Main executor ────────────────────────────────────────────────────────────

export async function executeAgent(
    agentIdOrName: string,
    task: AgentTask,
    missionId?: string
): Promise<AgentResult> {
    try {
        const supabase = await createClient();

        // Fetch agent by id or name
        const isUuid = /^[0-9a-f-]{36}$/i.test(agentIdOrName);
        const { data: agentRow, error: agentError } = isUuid
            ? await supabase.from('agents').select('*').eq('id', agentIdOrName).single()
            : await supabase.from('agents').select('*').ilike('name', agentIdOrName).single();

        if (agentError || !agentRow) {
            return { success: false, output: '', tokensUsed: 0, error: `Agent not found: ${agentIdOrName}` };
        }

        const agent = agentRow as AgentRow;
        const cfg = agent.config ?? {} as AgentConfig;

        // Build system prompt augmented with context
        const contextStr = Object.entries(task.context)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join('\n');

        const augmentedSystem = cfg.systemPrompt
            ? `${cfg.systemPrompt}\n\n---\nCONTEXTO DE MISIÓN:\n${contextStr}`
            : `You are ${agent.name}, an AI agent.\n\nCONTEXTO:\n${contextStr}`;

        // Emit thought before calling
        await emitAgentThought(agent.id, `Procesando: ${task.instruction.slice(0, 80)}`, missionId);

        const output = await callAgent(
            {
                systemPrompt: augmentedSystem,
                model: cfg.model ?? 'claude-sonnet-4-6',
                temperature: cfg.temperature ?? 0.5,
                maxTokens: cfg.maxTokens ?? 2048,
            },
            [],
            task.instruction
        );

        return { success: true, output, tokensUsed: 0 };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, output: '', tokensUsed: 0, error };
    }
}
