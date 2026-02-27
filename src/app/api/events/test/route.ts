import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ok } from '@/lib/api/response';
import { serverError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

// ─── POST /api/events/test — insert sample events for testing ─────────────────
export async function POST(_request: NextRequest) {
    try {
        const supabase = await createClient();

        // Fetch any agent ID to attach events to
        const { data: agents } = await supabase
            .from('agents')
            .select('id, name')
            .limit(6);

        const agentList = (agents ?? []) as { id: string; name: string }[];

        const eventTypes = [
            'agent_heartbeat',
            'agent_thought',
            'mission_started',
            'step_completed',
            'agent_message',
            'mission_completed',
            'step_started',
            'agent_thought',
        ] as const;

        const rows = eventTypes.map((type, i) => {
            const agent = agentList[i % agentList.length];
            const payloads: Record<string, unknown> = {
                agent_heartbeat: { timestamp: new Date().toISOString() },
                agent_thought: { thought: `Analizando solicitud del paciente para optimizar respuesta #${i}` },
                mission_started: { title: 'Campaña WhatsApp Semana 8' },
                step_completed: { output: 'Ok, tarea completada exitosamente.' },
                agent_message: { to: agentList[(i + 1) % Math.max(agentList.length, 1)]?.name, content: 'Necesito coordinación para este paciente' },
                mission_completed: { title: 'Campaña WhatsApp Semana 8', duration_ms: 12_400 },
                step_started: { step: `Paso ${i + 1}` },
            };
            return {
                type,
                agent_id: agent?.id ?? null,
                mission_id: null,
                step_id: null,
                payload: payloads[type] ?? {},
            };
        });

        const { error } = await supabase.from('events').insert(rows as never);
        if (error) throw new Error(error.message);

        return ok({ inserted: rows.length, message: `${rows.length} eventos de prueba insertados` });
    } catch (err) {
        return serverError(err);
    }
}
