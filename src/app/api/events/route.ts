import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok, paginated } from '@/lib/api/response';
import { serverError } from '@/lib/api/errors';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
    type: z.string().optional(),
    agent: z.string().optional(),
    mission: z.string().optional(),
    limit: z.coerce.number().int().positive().max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
});

// ─── GET /api/events ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);

        const q = QuerySchema.parse({
            type: searchParams.get('type') ?? undefined,
            agent: searchParams.get('agent') ?? undefined,
            mission: searchParams.get('mission') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
            offset: searchParams.get('offset') ?? undefined,
        });

        let query = supabase
            .from('events')
            .select('*, agents(id, name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(q.offset, q.offset + q.limit - 1);

        if (q.type) query = query.eq('type', q.type);
        if (q.agent) query = query.eq('agent_id', q.agent);
        if (q.mission) query = query.eq('mission_id', q.mission);

        const { data, error, count } = await query;
        if (error) throw new Error(error.message);

        const total = count ?? 0;
        return paginated(data ?? [], {
            page: Math.floor(q.offset / q.limit) + 1,
            pageSize: q.limit,
            total,
            totalPages: Math.ceil(total / q.limit),
        });
    } catch (err) {
        return serverError(err);
    }
}
