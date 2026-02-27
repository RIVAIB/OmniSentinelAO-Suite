import { createClient } from '@/lib/supabase/server';
import { executeAgent } from './agent-executor';
import {
    emitStepStarted,
    emitStepCompleted,
    emitStepFailed,
    emitMissionStarted,
    emitMissionCompleted,
    emitMissionFailed,
} from './events';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissionStep {
    id: string;
    mission_id: string;
    agent_id?: string | null;
    title: string;
    description?: string;
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
    status: string;
    // DB column may be 'order' or 'step_order'; we accept both
    order?: number;
    step_order?: number;
}

interface AgentRow {
    id: string;
    name: string;
}

interface Mission {
    id: string;
    title: string;
    description?: string;
    status: string;
    agent_id?: string | null;
    priority?: number;
    mission_steps?: MissionStep[];
}

export interface StepResult {
    success: boolean;
    output: string;
    error?: string;
}

const MAX_STEP_RETRIES = 1;

// ─── MissionExecutor ─────────────────────────────────────────────────────────

export class MissionExecutor {
    private mission: Mission;
    private aborted = false;

    constructor(mission: Mission) {
        this.mission = mission;
    }

    abort() { this.aborted = true; }

    async execute(): Promise<void> {
        const supabase = await createClient();
        const { id: missionId, title: missionTitle } = this.mission;
        const missionStartedAt = Date.now();

        // Mark mission as running
        await supabase
            .from('missions')
            .update({ status: 'running', updated_at: new Date().toISOString() } as never)
            .eq('id', missionId);

        // Load steps — try both 'step_order' and fall back to 'order'
        const { data: stepsData } = await supabase
            .from('mission_steps')
            .select('*, agent:agents(id, name)')
            .eq('mission_id', missionId)
            .order('step_order', { ascending: true, nullsFirst: false })
            .then(async (res) => {
                // If we got results, great. Otherwise try legacy 'order' column.
                if (res.data && res.data.length > 0) return res;
                return supabase
                    .from('mission_steps')
                    .select('*, agent:agents(id, name)')
                    .eq('mission_id', missionId)
                    .order('order', { ascending: true });
            });

        const steps = (stepsData ?? []) as (MissionStep & { agent?: AgentRow | null })[];

        await emitMissionStarted(missionId, this.mission.agent_id ?? undefined, {
            missionTitle,
            totalSteps: steps.length,
        });

        let failed = false;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (this.aborted) {
                failed = true;
                break;
            }

            const result = await this.executeStep(step, i + 1, steps.length, missionTitle);
            if (!result.success) {
                failed = true;
                break;
            }
        }

        const durationMs = Date.now() - missionStartedAt;
        const finalStatus = failed ? 'failed' : 'completed';

        await supabase
            .from('missions')
            .update({
                status: finalStatus,
                progress: failed ? undefined : 100,
                updated_at: new Date().toISOString(),
            } as never)
            .eq('id', missionId);

        if (failed) {
            await emitMissionFailed(missionId, 'One or more steps failed', { missionTitle });
        } else {
            await emitMissionCompleted(missionId, this.mission.agent_id ?? undefined, {
                missionTitle,
                durationMs,
            });
        }
    }

    async executeStep(
        step: MissionStep & { agent?: AgentRow | null },
        stepNumber: number,
        totalSteps: number,
        missionTitle: string,
    ): Promise<StepResult> {
        const supabase = await createClient();
        const stepStartedAt = Date.now();
        const agentName = step.agent?.name ?? undefined;

        // Mark step as running
        await supabase
            .from('mission_steps')
            .update({ status: 'running', updated_at: new Date().toISOString() } as never)
            .eq('id', step.id);

        await emitStepStarted(step.id, step.mission_id, step.agent_id ?? undefined, {
            stepTitle: step.title,
            stepNumber,
            totalSteps,
            agentName,
            missionTitle,
        });

        for (let attempt = 0; attempt <= MAX_STEP_RETRIES; attempt++) {
            try {
                const agentId = step.agent_id ?? this.mission.agent_id;
                if (!agentId) throw new Error('No agent assigned to step or mission');

                const result = await executeAgent(agentId, {
                    instruction: step.description ?? step.title,
                    context: {
                        missionTitle: this.mission.title,
                        stepTitle: step.title,
                        stepInput: step.input ?? {},
                        priority: this.mission.priority ?? 5,
                    },
                }, step.mission_id);

                if (!result.success) throw new Error(result.error ?? 'Agent failed');

                const durationMs = Date.now() - stepStartedAt;

                // Save step output
                await supabase
                    .from('mission_steps')
                    .update({
                        status: 'completed',
                        output: { text: result.output },
                        completed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    } as never)
                    .eq('id', step.id);

                // Update mission progress
                await this.updateMissionProgress(step.mission_id);

                await emitStepCompleted(step.id, step.mission_id, result.output, {
                    stepTitle: step.title,
                    agentName,
                    missionTitle,
                    durationMs,
                });

                return { success: true, output: result.output };
            } catch (err) {
                if (attempt < MAX_STEP_RETRIES) {
                    await new Promise((r) => setTimeout(r, 2000));
                    continue;
                }
                const error = err instanceof Error ? err.message : String(err);
                await supabase
                    .from('mission_steps')
                    .update({ status: 'failed', updated_at: new Date().toISOString() } as never)
                    .eq('id', step.id);
                await emitStepFailed(step.id, step.mission_id, error, {
                    stepTitle: step.title,
                    agentName,
                    missionTitle,
                });
                return { success: false, output: '', error };
            }
        }

        return { success: false, output: '', error: 'Max retries exceeded' };
    }

    private async updateMissionProgress(missionId: string): Promise<void> {
        const supabase = await createClient();
        const { data: allSteps } = await supabase
            .from('mission_steps')
            .select('status')
            .eq('mission_id', missionId);

        const steps = (allSteps ?? []) as { status: string }[];
        const done = steps.filter((s) => s.status === 'completed').length;
        const total = steps.length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        await supabase
            .from('missions')
            .update({ progress, updated_at: new Date().toISOString() } as never)
            .eq('id', missionId);
    }
}
