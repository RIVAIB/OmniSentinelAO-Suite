// src/app/api/memory/seed/route.ts
// Seeds mem0 with ERP domain knowledge for all agents.
// Call once: POST /api/memory/seed
// Protected by TELEGRAM_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from 'next/server';

const MEM0_BASE = process.env.MEMU_BASE_URL ?? 'http://localhost:8000';

interface SeedMemory {
    content: string;
    agent_id: string;
    user_id: string;
}

// ERP schemas and agent roles injected as semantic memories
const SEED_MEMORIES: SeedMemory[] = [
    // ── SHARED ERP SCHEMAS ────────────────────────────────────────────────
    {
        content: 'Estructura de pacientes en RIVAIB ERP: id, nombre completo, fecha de nacimiento, DNI, teléfono, email, historial de citas, saldo pendiente, contrato activo.',
        agent_id: 'JESSY',
        user_id: 'erp-scaffold',
    },
    {
        content: 'Estructura de citas en RIVAIB ERP: id, paciente_id, fecha, hora, tipo de consulta, estado (programada/confirmada/cancelada/completada), médico asignado, sala.',
        agent_id: 'JESSY',
        user_id: 'erp-scaffold',
    },
    {
        content: 'Estructura de pagos en RIVAIB ERP: id, paciente_id, monto, fecha, método de pago, estado (pendiente/pagado/vencido), contrato_id.',
        agent_id: 'APEX',
        user_id: 'erp-scaffold',
    },
    {
        content: 'Estructura de contratos en RIVAIB ERP: id, paciente_id, tipo de plan, fecha inicio, fecha fin, monto mensual, cláusulas especiales.',
        agent_id: 'APEX',
        user_id: 'erp-scaffold',
    },
    {
        content: 'JESSY es el agente CRM responsable de gestionar pacientes, citas y comunicación directa con el paciente. Tiene acceso completo a la tabla de pacientes y citas.',
        agent_id: 'CLAWDIO',
        user_id: 'erp-scaffold',
    },
    {
        content: 'APEX es el agente financiero responsable de pagos, contratos, facturación y reportes económicos. Notifica a JESSY cuando hay conflictos de pago con citas.',
        agent_id: 'CLAWDIO',
        user_id: 'erp-scaffold',
    },
    {
        content: 'NEXUS es el agente de análisis de datos. Genera reportes estadísticos sobre ocupación, tendencias de pacientes y métricas operacionales.',
        agent_id: 'CLAWDIO',
        user_id: 'erp-scaffold',
    },
    {
        content: 'AXIOM es el agente estratégico. Evalúa decisiones de negocio, analiza opciones y recomienda acciones de alto nivel al equipo directivo.',
        agent_id: 'CLAWDIO',
        user_id: 'erp-scaffold',
    },
    {
        content: 'FORGE es el agente utilitario. Genera documentos, contratos, scripts de automatización y herramientas de soporte operacional.',
        agent_id: 'CLAWDIO',
        user_id: 'erp-scaffold',
    },
];

async function seedMemory(seed: SeedMemory): Promise<{ ok: boolean; agent_id: string }> {
    const res = await fetch(`${MEM0_BASE}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [{ role: 'user', content: seed.content }],
            agent_id: seed.agent_id,
            user_id: seed.user_id,
        }),
    });
    return { ok: res.ok, agent_id: seed.agent_id };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.TELEGRAM_WEBHOOK_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await Promise.allSettled(SEED_MEMORIES.map(seedMemory));

    const summary = results.map((r, i) => ({
        agent: SEED_MEMORIES[i].agent_id,
        status: r.status === 'fulfilled' && r.value.ok ? 'seeded' : 'failed',
    }));

    const allOk = summary.every(s => s.status === 'seeded');

    return NextResponse.json({ ok: allOk, summary });
}
