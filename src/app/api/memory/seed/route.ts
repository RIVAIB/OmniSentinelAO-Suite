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

    // ══ JESSY — CRM ══════════════════════════════════════════════════════════
    {
        content: 'Estructura de pacientes en RIVAIB ERP: id, nombre_completo, fecha_nacimiento, DNI, teléfono, email, historial_citas[], saldo_pendiente, contrato_id, estado (activo/inactivo).',
        agent_id: 'JESSY', user_id: 'erp-scaffold',
    },
    {
        content: 'Estructura de citas en RIVAIB ERP: id, paciente_id, fecha, hora, tipo_consulta, estado (programada/confirmada/cancelada/completada), medico_asignado, sala, notas.',
        agent_id: 'JESSY', user_id: 'erp-scaffold',
    },
    {
        content: 'Protocolo H2H (Human-to-Human) de JESSY: cuando el paciente expresa urgencia o frustración, JESSY escala inmediatamente a un humano. Flujo: saludo → identificación → consulta → booking → confirmación → recordatorio 24h antes.',
        agent_id: 'JESSY', user_id: 'erp-scaffold',
    },
    {
        content: 'JESSY coordina con APEX cuando un paciente tiene saldo vencido: antes de confirmar nueva cita, JESSY consulta estado de pago. Si vencido, informa al paciente y notifica a APEX.',
        agent_id: 'JESSY', user_id: 'erp-scaffold',
    },
    {
        content: 'JESSY coordina con NEXUS: cuando un lead convertido llega desde campaña, NEXUS notifica a JESSY con los datos del nuevo paciente para hacer el intake completo.',
        agent_id: 'JESSY', user_id: 'erp-scaffold',
    },

    // ══ NEXUS — Marketing ════════════════════════════════════════════════════
    {
        content: 'Estructura de leads en RIVAIB ERP: id, fuente (Meta/Email/WhatsApp/Referido), nombre, teléfono, email, estado (capturado/contactado/calificado/convertido/perdido), campaign_id, fecha_captura, fecha_conversion.',
        agent_id: 'NEXUS', user_id: 'erp-scaffold',
    },
    {
        content: 'Estructura de campañas en RIVAIB ERP: id, plataforma (Meta Ads/Email/WhatsApp), nombre, presupuesto_mensual, fecha_inicio, fecha_fin, leads_generados, conversiones, ROI.',
        agent_id: 'NEXUS', user_id: 'erp-scaffold',
    },
    {
        content: 'KPIs de NEXUS: CPL (costo por lead), tasa de conversión lead→paciente, ROAS (retorno en gasto publicitario), alcance por plataforma, costo de adquisición de paciente (CAP).',
        agent_id: 'NEXUS', user_id: 'erp-scaffold',
    },
    {
        content: 'NEXUS opera en Meta Ads (Instagram + Facebook), Email campaigns, WhatsApp Business. Segmenta audiencias por zona geográfica, edad, intereses de salud. Genera reportes semanales de rendimiento.',
        agent_id: 'NEXUS', user_id: 'erp-scaffold',
    },
    {
        content: 'Flujo lead→paciente: NEXUS captura lead → califica por teléfono/WhatsApp → si calificado, transfiere a JESSY con datos completos → JESSY hace intake y primera cita → NEXUS registra conversión.',
        agent_id: 'NEXUS', user_id: 'erp-scaffold',
    },

    // ══ APEX — Finance ═══════════════════════════════════════════════════════
    {
        content: 'Estructura de pagos en RIVAIB ERP: id, paciente_id, monto, fecha_emision, fecha_vencimiento, metodo_pago (efectivo/transferencia/tarjeta), estado (pendiente/pagado/vencido/cancelado), contrato_id, factura_id.',
        agent_id: 'APEX', user_id: 'erp-scaffold',
    },
    {
        content: 'Estructura de contratos en RIVAIB ERP: id, paciente_id, tipo_plan, fecha_inicio, fecha_fin, monto_mensual, clausulas_especiales, estado (activo/vencido/cancelado), renovacion_automatica.',
        agent_id: 'APEX', user_id: 'erp-scaffold',
    },
    {
        content: 'APEX integra BigCapital ERP para: creación de facturas, conciliación bancaria, reportes financieros, gestión de cuentas por cobrar. APEX genera reportes mensuales: MRR, ARR, tasa de cobranza, pagos vencidos.',
        agent_id: 'APEX', user_id: 'erp-scaffold',
    },
    {
        content: 'KPIs de APEX: MRR (Monthly Recurring Revenue), ARR (Annual Recurring Revenue), tasa de cobranza (%), monto vencido total, días promedio de pago, contratos activos vs vencidos.',
        agent_id: 'APEX', user_id: 'erp-scaffold',
    },
    {
        content: 'APEX bloquea nuevas citas cuando paciente tiene más de 30 días vencidos. Notifica a JESSY y al paciente con plan de pago. Coordina con AXIOM para reportes ejecutivos de cartera vencida.',
        agent_id: 'APEX', user_id: 'erp-scaffold',
    },

    // ══ AXIOM — CEO ══════════════════════════════════════════════════════════
    {
        content: 'AXIOM es el agente estratégico de nivel ejecutivo. Tiene acceso de lectura a todos los datos del ERP. NO escribe ni modifica datos — solo analiza y recomienda. Reporta directamente al CEO/directivos.',
        agent_id: 'AXIOM', user_id: 'erp-scaffold',
    },
    {
        content: 'Dashboard ejecutivo AXIOM — KPIs principales: total pacientes activos, nuevos pacientes del mes, pacientes perdidos, ingresos del mes, ingresos acumulados YTD, tasa de ocupación de citas (%), NPS estimado.',
        agent_id: 'AXIOM', user_id: 'erp-scaffold',
    },
    {
        content: 'AXIOM genera reportes semanales consolidados recibiendo datos de: JESSY (citas/pacientes), APEX (finanzas), NEXUS (marketing/leads), FORGE (estado del sistema). Produce análisis de tendencias y proyecciones a 90 días.',
        agent_id: 'AXIOM', user_id: 'erp-scaffold',
    },
    {
        content: 'Capacidades analíticas de AXIOM: forecasting de ingresos, análisis de cohortes de pacientes, identificación de estacionalidad, comparación período-a-período, alertas automáticas cuando KPI cae más del 15%.',
        agent_id: 'AXIOM', user_id: 'erp-scaffold',
    },

    // ══ FORGE — Systems ══════════════════════════════════════════════════════
    {
        content: 'Stack tecnológico RIVAIB ERP: Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase (PostgreSQL + Auth + RLS), Anthropic SDK (Claude Sonnet 4.6), Google AI SDK (Gemini 2.5 Flash), mem0ai Docker local.',
        agent_id: 'FORGE', user_id: 'erp-scaffold',
    },
    {
        content: 'Infraestructura RIVAIB: producción en Vercel (omnisentinel-ao-suite.vercel.app), base de datos Supabase cloud, memoria contextual mem0 en Docker local (mem0 + Neo4j + pgvector), Telegram webhooks para 8 bots.',
        agent_id: 'FORGE', user_id: 'erp-scaffold',
    },
    {
        content: 'FORGE puede: generar scripts de automatización, revisar configuración de infraestructura, diagnosticar errores de deploy, gestionar variables de entorno, crear workflows n8n, documentar APIs. NUNCA hace deploy a producción sin aprobación humana explícita.',
        agent_id: 'FORGE', user_id: 'erp-scaffold',
    },
    {
        content: 'Comandos rápidos RIVAIB: npx tsc --noEmit (check TypeScript), npm run build (build local), vercel --prod (deploy prod), docker compose --env-file .env.docker up -d (stack mem0). Repo: github.com/RIVAIB/OmniSentinelAO-Suite.',
        agent_id: 'FORGE', user_id: 'erp-scaffold',
    },

    // ══ CLAWDIO — Orchestrator (expanded) ════════════════════════════════════
    {
        content: 'JESSY es el agente CRM de RIVAIB. Responsable de pacientes, citas, H2H protocol, WhatsApp. Notifica a CLAWDIO cuando hay incidencias o pacientes sin atender más de 48h.',
        agent_id: 'CLAWDIO', user_id: 'erp-scaffold',
    },
    {
        content: 'NEXUS es el agente de marketing. Maneja leads, campañas Meta Ads, email, WhatsApp Business. Reporta CPL y conversiones semanalmente a CLAWDIO.',
        agent_id: 'CLAWDIO', user_id: 'erp-scaffold',
    },
    {
        content: 'APEX es el agente financiero. BigCapital, facturas, cobranza, contratos. Alerta a CLAWDIO cuando MRR cae más de 10% o cartera vencida supera umbral.',
        agent_id: 'CLAWDIO', user_id: 'erp-scaffold',
    },
    {
        content: 'AXIOM es el agente CEO. Analítica ejecutiva de solo lectura. Recibe reporte semanal consolidado de CLAWDIO. No ejecuta acciones — solo analiza y recomienda.',
        agent_id: 'CLAWDIO', user_id: 'erp-scaffold',
    },
    {
        content: 'FORGE es el agente de sistemas. Infraestructura, código, deploys, automatización. CLAWDIO coordina con FORGE para incidentes técnicos. FORGE requiere aprobación humana para cambios en producción.',
        agent_id: 'CLAWDIO', user_id: 'erp-scaffold',
    },
    {
        content: 'CLAUD y GEM son agentes externos de revisión tecnológica. No tienen acceso al ERP. Operan en grupo separado de Telegram. CLAUD revisa código en GitHub, GEM provee contexto tecnológico de internet.',
        agent_id: 'CLAWDIO', user_id: 'erp-scaffold',
    },

    // ══ CLAUD — External Tech Reviewer ═══════════════════════════════════════
    {
        content: 'CLAUD es el revisor técnico senior del proyecto RIVAIB. Tiene acceso de lectura completo a todos los repositorios GitHub de la organización RIVAIB y acceso a internet vía web search. Opera en grupo externo — NO tiene acceso a datos de pacientes.',
        agent_id: 'CLAUD', user_id: 'ext-scaffold',
    },
    {
        content: 'Capacidades de CLAUD: revisar código fuente y arquitectura, analizar pull requests, leer historial de commits, identificar deuda técnica, vulnerabilidades de seguridad, y oportunidades de mejora. Siempre fundamenta sus respuestas en código real de GitHub.',
        agent_id: 'CLAUD', user_id: 'ext-scaffold',
    },
    {
        content: 'CLAUD colabora con GEM: GEM provee contexto de mercado y tecnologías actuales (internet), CLAUD provee la realidad del código (GitHub). Juntos dan una revisión técnica completa. Responden simultáneamente a cada pregunta.',
        agent_id: 'CLAUD', user_id: 'ext-scaffold',
    },

    // ══ GEM — External Tech Advisor ══════════════════════════════════════════
    {
        content: 'GEM es el asesor tecnológico con acceso a internet en tiempo real vía Google Search. Provee: comparativas de librerías, noticias de seguridad, mejores prácticas actuales, tendencias de la industria. NO tiene acceso a datos del ERP ni al GitHub de RIVAIB.',
        agent_id: 'GEM', user_id: 'ext-scaffold',
    },
    {
        content: 'GEM asesora a CLAUD en decisiones tecnológicas: cuando CLAUD analiza el código, GEM busca si existen alternativas más modernas, vulnerabilidades conocidas, o mejores enfoques según el mercado actual. GEM siempre cita sus fuentes.',
        agent_id: 'GEM', user_id: 'ext-scaffold',
    },
    {
        content: 'GEM puede procesar imágenes Y videos enviados en el grupo de Telegram. Puede analizar screenshots de código, diagramas de arquitectura, videos de demostración o errores en pantalla.',
        agent_id: 'GEM', user_id: 'ext-scaffold',
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
