import { createClient } from '@/lib/supabase/server';

// ─── Event types (mirroring the DB enum) ─────────────────────────────────────

export type EventType =
    | 'agent_heartbeat'
    | 'agent_started'
    | 'agent_stopped'
    | 'mission_created'
    | 'mission_started'
    | 'mission_completed'
    | 'mission_failed'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'agent_message'
    | 'agent_thought'
    | 'error';

export interface RuntimeEvent {
    id: string;
    type: EventType;
    agent_id?: string | null;
    mission_id?: string | null;
    step_id?: string | null;
    payload: Record<string, unknown>;
    created_at: string;
}

// ─── Core emit function ───────────────────────────────────────────────────────

export async function emitEvent(event: {
    type: EventType;
    agentId?: string;
    missionId?: string;
    stepId?: string;
    payload?: Record<string, unknown>;
}): Promise<void> {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('events').insert({
            type: event.type,
            agent_id: event.agentId ?? null,
            mission_id: event.missionId ?? null,
            step_id: event.stepId ?? null,
            payload: event.payload ?? {},
        } as never);
        if (error) console.error('[events] Insert error:', error.message);
    } catch (err) {
        console.error('[events] Unexpected error:', err);
    }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export async function emitHeartbeat(agentId: string): Promise<void> {
    await emitEvent({
        type: 'agent_heartbeat',
        agentId,
        payload: { timestamp: new Date().toISOString() },
    });
}

export async function emitMissionStarted(
    missionId: string,
    agentId?: string,
    extra?: { missionTitle?: string; totalSteps?: number }
): Promise<void> {
    await emitEvent({
        type: 'mission_started',
        missionId,
        agentId,
        payload: extra ?? {},
    });
}

export async function emitMissionCompleted(
    missionId: string,
    agentId?: string,
    extra?: { missionTitle?: string; durationMs?: number }
): Promise<void> {
    await emitEvent({
        type: 'mission_completed',
        missionId,
        agentId,
        payload: extra ?? {},
    });
}

export async function emitMissionFailed(
    missionId: string,
    error: string,
    extra?: { missionTitle?: string }
): Promise<void> {
    await emitEvent({
        type: 'mission_failed',
        missionId,
        payload: { error, ...extra },
    });
}

export async function emitStepStarted(
    stepId: string,
    missionId: string,
    agentId?: string,
    extra?: { stepTitle?: string; stepNumber?: number; totalSteps?: number; agentName?: string; missionTitle?: string }
): Promise<void> {
    await emitEvent({
        type: 'step_started',
        stepId,
        missionId,
        agentId,
        payload: extra ?? {},
    });
}

export async function emitStepCompleted(
    stepId: string,
    missionId: string,
    output?: unknown,
    extra?: { stepTitle?: string; agentName?: string; missionTitle?: string; durationMs?: number }
): Promise<void> {
    await emitEvent({
        type: 'step_completed',
        stepId,
        missionId,
        payload: { output, ...extra },
    });
}

export async function emitStepFailed(
    stepId: string,
    missionId: string,
    error: string,
    extra?: { stepTitle?: string; agentName?: string; missionTitle?: string }
): Promise<void> {
    await emitEvent({
        type: 'step_failed',
        stepId,
        missionId,
        payload: { error, ...extra },
    });
}

export async function emitAgentThought(agentId: string, thought: string, missionId?: string): Promise<void> {
    await emitEvent({ type: 'agent_thought', agentId, missionId, payload: { thought } });
}

export async function emitAgentMessage(fromAgentId: string, toAgentId: string, content: string): Promise<void> {
    await emitEvent({
        type: 'agent_message',
        agentId: fromAgentId,
        payload: { to: toAgentId, content },
    });
}
