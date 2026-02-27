import { NextRequest } from 'next/server';
import { runtime } from '@/lib/runtime';
import { ok, created } from '@/lib/api/response';
import { serverError, badRequest } from '@/lib/api/errors';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── GET /api/runtime — runtime status ───────────────────────────────────────
export async function GET() {
    return ok(runtime.getStatus());
}

// ─── POST /api/runtime — start runtime ───────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({})) as Record<string, unknown>;

        // Optional config patch
        const ConfigSchema = z.object({
            heartbeatInterval: z.number().int().positive().optional(),
            missionPollInterval: z.number().int().positive().optional(),
            maxConcurrentMissions: z.number().int().positive().max(10).optional(),
        });
        const parsed = ConfigSchema.safeParse(body);
        if (parsed.success && Object.keys(parsed.data).length > 0) {
            runtime.configure(parsed.data);
        }

        await runtime.start();
        return created({ message: 'Runtime started', status: runtime.getStatus() });
    } catch (err) {
        return serverError(err);
    }
}

// ─── DELETE /api/runtime — stop runtime ──────────────────────────────────────
export async function DELETE() {
    try {
        await runtime.stop();
        return ok({ message: 'Runtime stopped', status: runtime.getStatus() });
    } catch (err) {
        return serverError(err);
    }
}
