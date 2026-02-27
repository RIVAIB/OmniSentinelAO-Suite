import { NextRequest } from 'next/server';
import { runtime } from '@/lib/runtime';
import { ok, created } from '@/lib/api/response';
import { serverError, badRequest } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    agent_id: z.string().uuid().optional(),
    priority: z.number().int().min(1).max(10).default(5),
    steps: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        agent_id: z.string().uuid().optional(),
        order: z.number().int().optional(),
    })).optional(),
    executeNow: z.boolean().default(false),
});

// ─── POST /api/runtime/missions — create + optionally queue ──────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = CreateSchema.safeParse(body);
        if (!parsed.success) return badRequest('Validation error', parsed.error.issues);

        const { title, description, agent_id, priority, steps, executeNow } = parsed.data;
        const supabase = await createClient();

        // Create mission
        const { data: missionData, error: missionErr } = await supabase
            .from('missions')
            .insert({ title, description, agent_id, priority, status: 'pending' } as never)
            .select()
            .single();

        if (missionErr || !missionData) throw new Error(missionErr?.message ?? 'Failed to create mission');
        const mission = missionData as { id: string };

        // Create steps
        if (steps?.length) {
            const stepRows = steps.map((s, i) => ({
                mission_id: mission.id,
                title: s.title,
                description: s.description ?? null,
                agent_id: s.agent_id ?? agent_id ?? null,
                order: s.order ?? i + 1,
                status: 'pending',
            }));
            await supabase.from('mission_steps').insert(stepRows as never);
        }

        // Optionally queue for immediate execution
        if (executeNow && runtime.isRunning()) {
            await runtime.queueMission(mission.id);
        }

        return created({ missionId: mission.id, queued: executeNow && runtime.isRunning() });
    } catch (err) {
        return serverError(err);
    }
}

// ─── GET /api/runtime/missions — active + queued missions ────────────────────
export async function GET() {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('missions')
            .select('*, agents(id, name)')
            .in('status', ['pending', 'running'])
            .order('priority', { ascending: false })
            .limit(20);

        return ok({ missions: data ?? [], runtime: runtime.getStatus() });
    } catch (err) {
        return serverError(err);
    }
}
