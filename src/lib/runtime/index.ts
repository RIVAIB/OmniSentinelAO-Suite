import { createClient } from '@/lib/supabase/server';
import { MissionExecutor } from './mission-executor';
import { emitHeartbeat, emitEvent } from './events';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RuntimeConfig {
    heartbeatInterval: number; // ms
    missionPollInterval: number; // ms
    maxConcurrentMissions: number;
}

interface MissionRow {
    id: string;
    title: string;
    status: string;
    agent_id: string | null;
    priority: number | null;
}

// ─── AgentRuntime ─────────────────────────────────────────────────────────────
//
// NOTE: This runs in the Next.js Node.js process (not a separate daemon).
// The singleton is stored in globalThis so it survives hot-reloads in dev.

class AgentRuntime {
    private running = false;
    private heartbeatId?: ReturnType<typeof setInterval>;
    private pollId?: ReturnType<typeof setInterval>;
    private activeMissions = new Map<string, MissionExecutor>();
    private startedAt?: Date;

    private config: RuntimeConfig = {
        heartbeatInterval: 300_000, // 5 minutes
        missionPollInterval: 5_000,
        maxConcurrentMissions: 3,
    };

    // ── Public API ────────────────────────────────────────────────────────────

    isRunning() { return this.running; }

    getStatus() {
        return {
            running: this.running,
            startedAt: this.startedAt?.toISOString() ?? null,
            activeMissions: this.activeMissions.size,
            maxConcurrent: this.config.maxConcurrentMissions,
            config: this.config,
        };
    }

    configure(patch: Partial<RuntimeConfig>) {
        Object.assign(this.config, patch);
    }

    async start(): Promise<void> {
        if (this.running) return;
        this.running = true;
        this.startedAt = new Date();

        console.log('[runtime] Starting AgentRuntime…');
        await emitEvent({ type: 'agent_started', payload: { configuredAt: this.startedAt.toISOString() } });

        // Heartbeat loop
        this.heartbeatId = setInterval(async () => {
            await this.sendHeartbeats();
        }, this.config.heartbeatInterval);

        // Mission poll loop
        this.pollId = setInterval(async () => {
            await this.executeNextMissions();
        }, this.config.missionPollInterval);

        // Run a first tick immediately
        await this.executeNextMissions();
    }

    async stop(): Promise<void> {
        if (!this.running) return;
        this.running = false;

        if (this.heartbeatId) clearInterval(this.heartbeatId);
        if (this.pollId) clearInterval(this.pollId);

        // Abort active missions
        for (const [id, executor] of Array.from(this.activeMissions)) {
            executor.abort();
            this.activeMissions.delete(id);
        }

        console.log('[runtime] Stopped.');
        await emitEvent({ type: 'agent_stopped' });
    }

    /** Queue a mission for execution immediately */
    async queueMission(missionId: string): Promise<void> {
        await this.launchMission(missionId);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private async executeNextMissions(): Promise<void> {
        if (!this.running) return;
        if (this.activeMissions.size >= this.config.maxConcurrentMissions) return;

        try {
            const supabase = await createClient();
            const slots = this.config.maxConcurrentMissions - this.activeMissions.size;

            const { data } = await supabase
                .from('missions')
                .select('id, title, status, agent_id, priority')
                .eq('status', 'pending')
                .order('priority', { ascending: false })
                .limit(slots);

            const pending = ((data ?? []) as MissionRow[]).filter(
                (m) => !this.activeMissions.has(m.id)
            );

            for (const mission of pending) {
                await this.launchMission(mission.id);
            }
        } catch (err) {
            console.error('[runtime] Poll error:', err);
        }
    }

    private async launchMission(missionId: string): Promise<void> {
        if (this.activeMissions.has(missionId)) return;

        const supabase = await createClient();
        const { data } = await supabase
            .from('missions')
            .select('*')
            .eq('id', missionId)
            .single();

        if (!data) return;

        const raw = data as { id: string; title: string; status: string; agent_id: string | null; priority?: number | null };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executor = new MissionExecutor({ ...raw, priority: raw.priority ?? undefined } as any);
        this.activeMissions.set(missionId, executor);

        // Run async, remove from map when done
        executor.execute().finally(() => {
            this.activeMissions.delete(missionId);
        });
    }

    private async sendHeartbeats(): Promise<void> {
        if (!this.running) return;
        try {
            const supabase = await createClient();
            const { data } = await supabase
                .from('agents')
                .select('id')
                .eq('status', 'active');

            for (const { id } of (data ?? []) as { id: string }[]) {
                await emitHeartbeat(id);
                await supabase
                    .from('agents')
                    .update({ last_heartbeat: new Date().toISOString() } as never)
                    .eq('id', id);
            }
        } catch (err) {
            console.error('[runtime] Heartbeat error:', err);
        }
    }
}

// ─── Singleton (survives Next.js hot-reload) ──────────────────────────────────

declare global {
    // eslint-disable-next-line no-var
    var __agentRuntime: AgentRuntime | undefined;
}

if (!global.__agentRuntime) {
    global.__agentRuntime = new AgentRuntime();
}

export const runtime: AgentRuntime = global.__agentRuntime;
