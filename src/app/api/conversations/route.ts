import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok, paginated } from '@/lib/api/response';
import { dbError, serverError, validationError } from '@/lib/api/errors';
import { z } from 'zod';

const FiltersSchema = z.object({
    channel: z.string().optional(),
    status: z.string().optional(),
    agent: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    since: z.string().datetime({ offset: true }).optional(),
});

// ─── GET /api/conversations ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);

        const parsed = FiltersSchema.safeParse({
            channel: searchParams.get('channel') ?? undefined,
            status: searchParams.get('status') ?? undefined,
            agent: searchParams.get('agent') ?? undefined,
            search: searchParams.get('search') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
            offset: searchParams.get('offset') ?? undefined,
            since: searchParams.get('since') ?? undefined,
        });

        if (!parsed.success) return validationError(parsed.error.issues);
        const f = parsed.data;

        let query = supabase
            .from('conversations')
            .select('*, agents(id, name)', { count: 'exact' })
            .order('updated_at', { ascending: false })
            .range(f.offset, f.offset + f.limit - 1);

        if (f.channel) query = query.eq('channel', f.channel);
        if (f.status) query = query.eq('status', f.status);
        if (f.since) query = query.gte('created_at', f.since);

        // agent filter via joined agents.name
        if (f.agent) {
            const { data: agentRow } = await supabase
                .from('agents')
                .select('id')
                .ilike('name', `%${f.agent}%`)
                .maybeSingle();
            if (agentRow) {
                query = query.eq('agent_id', (agentRow as { id: string }).id);
            }
        }

        const { data, error, count } = await query;
        if (error) return dbError(error);

        // Enrich with last_message + contact_name
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        const enriched = rows.map((row) => {
            const messages = Array.isArray(row.messages)
                ? (row.messages as Array<Record<string, unknown>>)
                : [];
            const last = messages.at(-1) ?? null;
            return {
                ...row,
                last_message: last
                    ? { content: String(last.content ?? '').slice(0, 120), role: last.role, timestamp: last.timestamp }
                    : null,
                contact_name: (row.metadata as Record<string, unknown> | null)?.contactName ?? row.contact_id,
                assigned_agent: (row.agents as { name: string } | null)?.name ?? null,
                message_count: messages.length,
            };
        });

        const total = count ?? 0;
        return paginated(enriched, {
            page: Math.floor(f.offset / f.limit) + 1,
            pageSize: f.limit,
            total,
            totalPages: Math.ceil(total / f.limit),
        });
    } catch (err) {
        return serverError(err);
    }
}
