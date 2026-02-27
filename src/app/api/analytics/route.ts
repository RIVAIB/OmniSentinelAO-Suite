import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok } from '@/lib/api/response';
import { dbError, serverError } from '@/lib/api/errors';

// ─── GET /api/analytics ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);

        // Default date range: last 30 days
        const to = searchParams.get('to') ?? new Date().toISOString();
        const from = searchParams.get('from') ?? (() => {
            const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString();
        })();

        // ── Total conversations in range ───────────────────────────────────────
        const { count: totalConvs } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', from)
            .lte('created_at', to);

        // ── Active today ───────────────────────────────────────────────────────
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart.toISOString());

        // ── By channel ─────────────────────────────────────────────────────────
        const { data: allConvs } = await supabase
            .from('conversations')
            .select('channel, status, created_at, agent_id, agents(name)')
            .gte('created_at', from)
            .lte('created_at', to);

        const convRows = (allConvs ?? []) as Array<Record<string, unknown>>;

        // Aggregate by_channel
        const channelMap: Record<string, number> = {};
        const agentMap: Record<string, number> = {};
        const dayMap: Record<string, number> = {};
        let closedCount = 0;

        for (const row of convRows) {
            const ch = (row.channel as string) ?? 'unknown';
            channelMap[ch] = (channelMap[ch] ?? 0) + 1;

            const agentName = (row.agents as { name: string } | null)?.name ?? 'Sin asignar';
            agentMap[agentName] = (agentMap[agentName] ?? 0) + 1;

            const day = (row.created_at as string).slice(0, 10);
            dayMap[day] = (dayMap[day] ?? 0) + 1;

            if (row.status === 'closed') closedCount++;
        }

        const byChannel = Object.entries(channelMap).map(([name, count]) => ({ name, count }));
        const byAgent = Object.entries(agentMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        const byDay = Object.entries(dayMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const resolutionRate = convRows.length > 0
            ? Math.round((closedCount / convRows.length) * 100)
            : 0;

        if (allConvs === null) return dbError();

        return ok({
            kpis: {
                totalConversations: totalConvs ?? 0,
                conversationsToday: todayCount ?? 0,
                resolutionRate,
                activeAgents: byAgent.filter(a => a.name !== 'Sin asignar').length,
            },
            conversationsByDay: byDay,
            byChannel,
            byAgent,
            dateRange: { from, to },
        });
    } catch (err) {
        return serverError(err);
    }
}
