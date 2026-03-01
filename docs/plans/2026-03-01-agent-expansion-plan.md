# Agent Expansion — 8 Agents Full Build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand all 8 agents to their full capability: complete mem0 seed for the 6 ERP agents, full multimedia support (photo/video/audio) in Telegram for all bots, CLAUD with GitHub total access + Anthropic web search, and GEM with Google Search grounding + video.

**Architecture:** Four independent blocks executed sequentially. Block 1 (seed) has no code dependencies — just data. Block 2 (CLAUD module) and Block 3 (GEM module) create new standalone files. Block 4 (processor multimedia) wires everything together. Each block is independently deployable and testable via curl/Telegram.

**Tech Stack:** Next.js 16 API routes, TypeScript, mem0 REST API, Claude Sonnet 4.6 (tool_use), Gemini 2.5 Flash (googleSearch grounding), Telegram Bot API, GitHub REST API v3.

**Design doc:** `docs/plans/2026-03-01-agent-expansion-design.md`

---

## Block 1 — mem0 Seed Expansion (All 8 Agents)

### Task 1: Expand SEED_MEMORIES in the seed route

**Files:**
- Modify: `src/app/api/memory/seed/route.ts`

**Context:** Currently 9 memories covering only JESSY (2), APEX (2), CLAWDIO (5). NEXUS, AXIOM, FORGE have zero. CLAUD and GEM have no seed at all.

**Step 1: Replace SEED_MEMORIES array**

Open `src/app/api/memory/seed/route.ts`. Replace the entire `SEED_MEMORIES` constant with:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Verify with curl (Next.js dev must be running)**

```bash
curl -s -X POST http://localhost:3000/api/memory/seed \
  -H "Authorization: Bearer $(grep TELEGRAM_WEBHOOK_SECRET .env.local | cut -d= -f2)"
```
Expected: `{"ok":true,"summary":[...]}` with 37 entries, all `"status":"seeded"`. Every agent_id should appear at least once: JESSY, NEXUS, APEX, AXIOM, FORGE, CLAWDIO, CLAUD, GEM.

**Step 4: Commit**

```bash
git add src/app/api/memory/seed/route.ts
git commit -m "feat(memory): expand seed to all 8 agents (37 memories)"
```

---

## Block 2 — CLAUD Module: GitHub + Web Search + Vision

### Task 2: Add GitHub tools to MCP executor

**Files:**
- Modify: `src/lib/mcp/executor.ts`

**Context:** executor.ts already has `github_read_file` and `github_list_files`. Need to add `github_list_repos`, `github_list_commits`, `github_list_prs`.

**Step 1: Add 3 new cases to the switch in `executeMCPTool`**

Inside the `switch (toolName)` block in `src/lib/mcp/executor.ts`, after the `github_list_files` case, add:

```typescript
case 'github_list_repos': {
    const { username } = args;
    const response = await fetch(
        `https://api.github.com/users/${username}/repos?type=all&sort=updated&per_page=50`,
        { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
    );
    const repos = await response.json() as Array<{ name: string; description: string; updated_at: string; private: boolean }>;
    result = repos.map(r => ({
        name: r.name,
        description: r.description,
        updated_at: r.updated_at,
        private: r.private,
    }));
    break;
}

case 'github_list_commits': {
    const { owner, repo, limit = 10 } = args;
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`,
        { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
    );
    const commits = await response.json() as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>;
    result = commits.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
    }));
    break;
}

case 'github_list_prs': {
    const { owner, repo, state = 'open' } = args;
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`,
        { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
    );
    const prs = await response.json() as Array<{ number: number; title: string; state: string; user: { login: string }; created_at: string }>;
    result = prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        created_at: pr.created_at,
    }));
    break;
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 3: Quick manual test**

```bash
# Test list repos — should return RIVAIB repos
node -e "
const fetch = require('node:http');
" 2>/dev/null || true
# Just verify TypeScript is happy — real test is in Task 3
```

**Step 4: Commit**

```bash
git add src/lib/mcp/executor.ts
git commit -m "feat(github): add list_repos, list_commits, list_prs to MCP executor"
```

---

### Task 3: Create CLAUD Telegram handler

**Files:**
- Create: `src/lib/telegram/claud.ts`

**Context:** `callClaude()` in processor.ts is a bare API call with no system prompt and no tools. We replace it with a full tool-use agent.

**Step 1: Create `src/lib/telegram/claud.ts`**

```typescript
// src/lib/telegram/claud.ts
// CLAUD — senior tech reviewer with GitHub access + Anthropic web search + vision.
// Implements the Claude tool-use loop for Telegram messages.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? 'RIVAIB';

const CLAUD_SYSTEM = `Eres CLAUD, el revisor técnico senior del proyecto RIVAIB ERP.
Tienes acceso de lectura completo a todos los repositorios GitHub de la organización ${GITHUB_OWNER}.
También tienes acceso a búsqueda en internet en tiempo real.

Tu rol:
- Revisar código, PRs, commits y arquitectura del sistema
- Identificar vulnerabilidades de seguridad, deuda técnica y oportunidades de mejora
- Dar opiniones técnicas fundamentadas en código real, no en suposiciones
- Colaborar con GEM (Gemini) que provee contexto tecnológico de internet

IMPORTANTE: Siempre busca en GitHub o en internet ANTES de responder preguntas técnicas.
Responde en español. Sé directo y específico.`;

const CLAUD_TOOLS: Anthropic.Tool[] = [
    {
        name: 'github_list_repos',
        description: 'Lista todos los repositorios de un usuario u organización GitHub.',
        input_schema: {
            type: 'object' as const,
            properties: {
                username: { type: 'string', description: 'Usuario u organización GitHub.' },
            },
            required: ['username'],
        },
    },
    {
        name: 'github_read_file',
        description: 'Lee el contenido de un archivo en un repositorio GitHub.',
        input_schema: {
            type: 'object' as const,
            properties: {
                owner: { type: 'string', description: 'Propietario del repo.' },
                repo: { type: 'string', description: 'Nombre del repo.' },
                path: { type: 'string', description: 'Ruta al archivo (ej: src/lib/ai/agent-service.ts).' },
            },
            required: ['owner', 'repo', 'path'],
        },
    },
    {
        name: 'github_list_files',
        description: 'Lista los archivos en un directorio de un repositorio GitHub.',
        input_schema: {
            type: 'object' as const,
            properties: {
                owner: { type: 'string', description: 'Propietario del repo.' },
                repo: { type: 'string', description: 'Nombre del repo.' },
                path: { type: 'string', description: 'Ruta del directorio (ej: src/lib).' },
            },
            required: ['owner', 'repo', 'path'],
        },
    },
    {
        name: 'github_list_commits',
        description: 'Lista los commits recientes de un repositorio GitHub.',
        input_schema: {
            type: 'object' as const,
            properties: {
                owner: { type: 'string', description: 'Propietario del repo.' },
                repo: { type: 'string', description: 'Nombre del repo.' },
                limit: { type: 'number', description: 'Número de commits a retornar (default 10).' },
            },
            required: ['owner', 'repo'],
        },
    },
    {
        name: 'github_list_prs',
        description: 'Lista los pull requests de un repositorio GitHub.',
        input_schema: {
            type: 'object' as const,
            properties: {
                owner: { type: 'string', description: 'Propietario del repo.' },
                repo: { type: 'string', description: 'Nombre del repo.' },
                state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Estado de los PRs.' },
            },
            required: ['owner', 'repo'],
        },
    },
];

// GitHub API executor — mirrors MCP executor but standalone (no Supabase logging for Telegram)
async function runGitHubTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };

    switch (name) {
        case 'github_list_repos': {
            const res = await fetch(
                `https://api.github.com/users/${args.username}/repos?type=all&sort=updated&per_page=50`,
                { headers }
            );
            const repos = await res.json() as Array<{ name: string; description: string; updated_at: string; private: boolean }>;
            return repos.map(r => ({ name: r.name, description: r.description, updated_at: r.updated_at, private: r.private }));
        }
        case 'github_read_file': {
            const res = await fetch(
                `https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}`,
                { headers }
            );
            const data = await res.json() as { content?: string; message?: string };
            if (data.message) return { error: data.message };
            return { content: data.content ? Buffer.from(data.content, 'base64').toString() : '' };
        }
        case 'github_list_files': {
            const res = await fetch(
                `https://api.github.com/repos/${args.owner}/${args.repo}/contents/${args.path}`,
                { headers }
            );
            return res.json();
        }
        case 'github_list_commits': {
            const limit = (args.limit as number) ?? 10;
            const res = await fetch(
                `https://api.github.com/repos/${args.owner}/${args.repo}/commits?per_page=${limit}`,
                { headers }
            );
            const commits = await res.json() as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>;
            return commits.map(c => ({
                sha: c.sha.slice(0, 7),
                message: c.commit.message.split('\n')[0],
                author: c.commit.author.name,
                date: c.commit.author.date,
            }));
        }
        case 'github_list_prs': {
            const state = (args.state as string) ?? 'open';
            const res = await fetch(
                `https://api.github.com/repos/${args.owner}/${args.repo}/pulls?state=${state}&per_page=20`,
                { headers }
            );
            const prs = await res.json() as Array<{ number: number; title: string; state: string; user: { login: string }; created_at: string }>;
            return prs.map(pr => ({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                author: pr.user.login,
                created_at: pr.created_at,
            }));
        }
        default:
            return { error: `Tool ${name} not implemented` };
    }
}

// Build the user content block — text + optional image
function buildUserContent(
    text: string,
    imageBase64?: string,
    imageMimeType = 'image/jpeg'
): Anthropic.MessageParam['content'] {
    if (!imageBase64) return text;
    return [
        {
            type: 'image',
            source: { type: 'base64', media_type: imageMimeType as 'image/jpeg', data: imageBase64 },
        },
        { type: 'text', text: text || 'Analiza esta imagen.' },
    ];
}

/**
 * CLAUD agent handler — tool-use loop with GitHub + web search + vision.
 * @param text        User message text
 * @param imageBase64 Optional base64-encoded image from Telegram
 */
export async function callClaud(text: string, imageBase64?: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: buildUserContent(text, imageBase64) },
    ];

    // Tool-use loop — max 5 iterations to prevent infinite loops
    for (let i = 0; i < 5; i++) {
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: CLAUD_SYSTEM,
            tools: [
                { type: 'web_search_20250305' as 'web_search_20250305', name: 'web_search', max_uses: 3 },
                ...CLAUD_TOOLS,
            ],
            messages,
        });

        // If no tool calls, return the text response
        if (response.stop_reason === 'end_turn') {
            const textBlock = response.content.find(b => b.type === 'text');
            return textBlock ? (textBlock as Anthropic.TextBlock).text : '(sin respuesta)';
        }

        // Append assistant turn
        messages.push({ role: 'assistant', content: response.content });

        // Execute all tool calls in this turn
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
            if (block.type !== 'tool_use') continue;
            let output: unknown;
            try {
                output = await runGitHubTool(block.name, block.input as Record<string, unknown>);
            } catch (err) {
                output = { error: String(err) };
            }
            toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(output),
            });
        }

        // Append tool results and loop
        messages.push({ role: 'user', content: toolResults });
    }

    return '(CLAUD alcanzó el límite de iteraciones de herramientas)';
}
```

**Step 2: Add `GITHUB_OWNER` to `.env.local`**

```bash
echo "GITHUB_OWNER=RIVAIB" >> .env.local
```
(Or whatever the actual GitHub org/username is — verify with `curl -s https://api.github.com/user -H "Authorization: token $(grep GITHUB_TOKEN .env.local | cut -d= -f2)" | grep login`)

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/telegram/claud.ts .env.local .env.local.example
git commit -m "feat(claud): add CLAUD handler with GitHub tools + web search + vision"
```

---

## Block 3 — GEM Module: Google Search + Vision + Video

### Task 4: Create GEM Telegram handler

**Files:**
- Create: `src/lib/telegram/gem.ts`

**Context:** `callGemini()` in processor.ts is a bare Gemini call with no system prompt, no search, no vision/video.

**Step 1: Create `src/lib/telegram/gem.ts`**

```typescript
// src/lib/telegram/gem.ts
// GEM — tech advisor with Google Search grounding + vision + video.

import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const GEM_SYSTEM = `Eres GEM, el asesor tecnológico del proyecto RIVAIB ERP.
Tienes acceso a búsqueda en internet en tiempo real vía Google Search.

Tu rol:
- Proveer contexto tecnológico actualizado: comparativas de librerías, noticias de seguridad, mejores prácticas
- Asesorar a CLAUD (Claude) sobre decisiones tecnológicas con información actual del mercado
- Analizar imágenes y videos que se envíen en el grupo
- Responder preguntas de tecnología con fuentes reales y actualizadas

IMPORTANTE: Busca en internet ANTES de responder preguntas técnicas. Siempre cita tus fuentes.
Responde en español. Sé directo y cita los links relevantes.`;

/**
 * GEM agent handler — Google Search grounding + vision + video.
 * @param text          User message text (or image caption)
 * @param mediaBase64   Optional base64 media (image or video)
 * @param mediaMimeType MIME type of the media (image/jpeg, video/mp4, etc.)
 */
export async function callGem(
    text: string,
    mediaBase64?: string,
    mediaMimeType = 'image/jpeg'
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: GEM_SYSTEM,
    });

    const parts: Part[] = [];

    // Add media if present
    if (mediaBase64) {
        parts.push({
            inlineData: {
                mimeType: mediaMimeType,
                data: mediaBase64,
            },
        });
    }

    // Add text prompt
    parts.push({ text: text || (mediaBase64 ? 'Analiza este contenido.' : '') });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        tools: [{ googleSearch: {} }],
    });

    return result.response.text();
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors. If `Part` import fails, use `import type { Part } from '@google/generative-ai'` — the type is already in the package.

**Step 3: Commit**

```bash
git add src/lib/telegram/gem.ts
git commit -m "feat(gem): add GEM handler with Google Search grounding + vision + video"
```

---

## Block 4 — Telegram Processor: Multimedia for All Agents

### Task 5: Add photo/video download utility

**Files:**
- Create: `src/lib/telegram/media.ts`

**Step 1: Create `src/lib/telegram/media.ts`**

```typescript
// src/lib/telegram/media.ts
// Download photos and videos from Telegram and convert to base64.

/**
 * Download a Telegram file and return as base64 string.
 * Uses the Telegram getFile API to resolve the file path, then downloads.
 */
export async function downloadTelegramFile(
    token: string,
    fileId: string
): Promise<{ base64: string; mimeType: string }> {
    // 1. Resolve file path
    const metaRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
    );
    const meta = await metaRes.json() as { ok: boolean; result?: { file_path: string } };
    if (!meta.ok || !meta.result?.file_path) {
        throw new Error(`Telegram getFile failed for file_id ${fileId}`);
    }

    // 2. Download file bytes
    const fileRes = await fetch(
        `https://api.telegram.org/file/bot${token}/${meta.result.file_path}`
    );
    if (!fileRes.ok) throw new Error(`Telegram file download failed: ${fileRes.status}`);

    const buffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // 3. Infer MIME type from path extension
    const ext = meta.result.file_path.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp',
        mp4: 'video/mp4', mov: 'video/mp4', avi: 'video/mp4',
    };
    const mimeType = mimeMap[ext] ?? 'image/jpeg';

    return { base64, mimeType };
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/telegram/media.ts
git commit -m "feat(telegram): add media download utility for photo/video"
```

---

### Task 6: Upgrade processor.ts — wire multimedia + new handlers

**Files:**
- Modify: `src/lib/telegram/processor.ts`

**Context:** processor.ts currently only handles `text` and `voice`. We add `photo` and `video` routing, replace the bare `callClaude`/`callGemini` with `callClaud`/`callGem`, and add vision to ERP agents.

**Step 1: Update imports at top of `src/lib/telegram/processor.ts`**

Replace the current imports block:

```typescript
// src/lib/telegram/processor.ts
import { sendMessage } from './client';
import { transcribeVoice } from './voice';
import { detectAgentMention } from './agent-parser';
import { processMessage, createConversation, getAgentByName } from '@/lib/ai/agent-service';
import { createClient } from '@/lib/supabase/server';
import { callClaud } from './claud';
import { callGem } from './gem';
import { downloadTelegramFile } from './media';
import type { TelegramUpdate, BotIdentity } from './types';
```

**Step 2: Remove the inline `callGemini` and `callClaude` functions**

Delete these two functions entirely (they're now replaced by `claud.ts` and `gem.ts`).

**Step 3: Update the `TelegramUpdate` type to include photo and video**

Open `src/lib/telegram/types.ts` and check if `photo` and `video` fields exist on the message type. If not, add them:

```typescript
// In src/lib/telegram/types.ts — add to the message interface:
photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
video?: { file_id: string; duration: number; mime_type?: string; file_size?: number };
caption?: string;
```

**Step 4: Update `processUpdate` in processor.ts**

Replace the message-text extraction block (steps 1 and 2 in processUpdate) and the routing block (step 2) with this updated version:

```typescript
export async function processUpdate(
    update: TelegramUpdate,
    bot: BotIdentity,
    token: string
): Promise<void> {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const contactId = String(msg.from?.id ?? 'anonymous');

    // ── 1. Extract text + optional media ──────────────────────────────────────
    let text = '';
    let imageBase64: string | undefined;
    let imageMimeType = 'image/jpeg';
    let isVideo = false;

    try {
        if (msg.voice) {
            text = await transcribeVoice(token, msg.voice.file_id);

        } else if (msg.photo) {
            // Take the largest photo (last in array)
            const largest = msg.photo[msg.photo.length - 1];
            const media = await downloadTelegramFile(token, largest.file_id);
            imageBase64 = media.base64;
            imageMimeType = media.mimeType;
            text = msg.caption ?? '';

        } else if (msg.video) {
            const media = await downloadTelegramFile(token, msg.video.file_id);
            imageBase64 = media.base64;
            imageMimeType = media.mimeType;
            text = msg.caption ?? '';
            isVideo = true;

        } else if (msg.text) {
            text = msg.text;

        } else {
            return; // Unsupported message type
        }
    } catch (err) {
        console.error('[Processor] Failed to get message content:', err);
        await sendMessage(token, chatId, '⚠️ No pude procesar el mensaje. Intenta de nuevo.');
        return;
    }

    // ── 2. Route based on bot identity ────────────────────────────────────────
    let reply: string;
    try {
        if (bot.kind === 'claude') {
            // CLAUD — external tech reviewer
            if (isVideo) {
                reply = '🎬 No proceso video. GEM puede analizar videos — escríbele a @Gem_ERP_Bot';
            } else {
                reply = await callClaud(text, imageBase64);
            }

        } else if (bot.kind === 'gemini') {
            // GEM — external tech advisor with search + vision + video
            reply = await callGem(text, imageBase64, imageMimeType);

        } else {
            // ERP agents — all use processMessage() with mem0
            const agentName = bot.agentName;

            if (isVideo) {
                reply = '🎬 No proceso video. Para análisis de video usa @Gem_ERP_Bot';

            } else {
                if (agentName === 'CLAWDIO') {
                    reply = await clawdioReport(text, contactId, imageBase64);
                } else {
                    const mentionedAgent = detectAgentMention(text);
                    const targetAgent = mentionedAgent ?? agentName;
                    const agent = await getAgentByName(targetAgent);
                    const finalAgent = agent ? targetAgent : agentName;

                    const convId = await createConversation('telegram', contactId);
                    // Pass image context in the message if present
                    const messageWithContext = imageBase64
                        ? `[El usuario envió una imagen] ${text || '(sin texto)'}`
                        : text;
                    const result = await processMessage(finalAgent, convId, messageWithContext, contactId);
                    reply = result.response;
                }
            }
        }
    } catch (err) {
        console.error('[Processor] Agent error:', err);
        reply = '⚠️ Hubo un error procesando tu mensaje. El equipo fue notificado.';
    }

    // ── 3. Send reply ──────────────────────────────────────────────────────────
    await sendMessage(token, chatId, reply);
}
```

**Note on ERP agents + images:** ERP agents (JESSY, APEX, etc.) use Claude via `processMessage()` which calls `callAgent()`. To pass the image to Claude, we'd need to modify `callAgent()` in `claude.ts` too. For now, the image is described as `[El usuario envió una imagen]` in the text — this is intentional to keep the scope manageable. Vision for ERP agents can be a follow-up task.

**Step 5: Update `clawdioReport` signature to accept optional image**

```typescript
async function clawdioReport(
    userMessage: string,
    contactId: string,
    imageBase64?: string
): Promise<string> {
    const supabase = await createClient();
    const { data: missions } = await supabase
        .from('missions')
        .select('title, status, priority, agents(name)')
        .in('status', ['running', 'proposed', 'paused'])
        .order('priority', { ascending: false });

    const missionSummary = missions?.length
        ? missions.map((m: Record<string, unknown>) => {
              const agentData = m.agents as { name: string } | null;
              const agent = agentData?.name ?? 'Sin asignar';
              return `• [${String(m.status).toUpperCase()}] ${m.title} — agente: ${agent}`;
          }).join('\n')
        : 'No hay misiones activas.';

    const convId = await createConversation('telegram', contactId);
    const imageNote = imageBase64 ? '\n[El usuario también envió una imagen]' : '';
    const context = `Resumen de misiones activas:\n${missionSummary}\n\nPregunta del usuario: ${userMessage}${imageNote}`;
    const { response } = await processMessage('CLAWDIO', convId, context, contactId);
    return response;
}
```

**Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors. Fix any type mismatches in the `TelegramUpdate` type if needed.

**Step 7: Commit**

```bash
git add src/lib/telegram/processor.ts src/lib/telegram/types.ts
git commit -m "feat(telegram): add photo/video multimedia support for all 8 bots"
```

---

## Block 5 — Deploy & End-to-End Verification

### Task 7: Deploy to production and run acceptance tests

**Step 1: Build locally to catch any remaining errors**

```bash
npm run build
```
Expected: build completes with no TypeScript or compilation errors.

**Step 2: Add GITHUB_OWNER to Vercel env vars**

```bash
vercel env add GITHUB_OWNER production
# Enter value: RIVAIB (or the actual org name)
```

**Step 3: Deploy to production**

```bash
vercel --prod
```
Expected: deployment URL confirmed.

**Step 4: Re-run seed against production**

```bash
curl -s -X POST https://omnisentinel-ao-suite.vercel.app/api/memory/seed \
  -H "Authorization: Bearer $(grep TELEGRAM_WEBHOOK_SECRET .env.local | cut -d= -f2)"
```
Expected: `{"ok":true,"summary":[...]}` — all 37 entries, all `"seeded"`.

**Step 5: Acceptance tests — run each in Telegram**

| Test | Bot | Message | Expected |
|------|-----|---------|----------|
| 1 | @Jessy_CRM_Bot | "¿Qué campos tiene un paciente en el ERP?" | Menciona id, nombre, DNI, teléfono, etc. |
| 2 | @Nexus_Mtk_Bot | "¿Cuáles son mis KPIs de marketing?" | Menciona CPL, ROAS, conversión |
| 3 | @Apex_FIN_Bot | "¿Qué pasa si un paciente tiene más de 30 días vencidos?" | Menciona bloqueo de citas, notificación |
| 4 | @Axiom_CEO_Bot | "¿Qué KPIs me tienes que reportar?" | Dashboard ejecutivo, MRR, ocupación |
| 5 | @Forge_SIS_Bot | "¿Cuál es el stack del proyecto?" | Next.js 16, Supabase, Anthropic SDK |
| 6 | @Claude_ERP_Bot | "¿Cuántos repos tiene la org en GitHub?" | Llama a github_list_repos, responde con número real |
| 7 | @Claude_ERP_Bot | (enviar foto de pantalla de código) | CLAUD analiza la imagen |
| 8 | @Gem_ERP_Bot | "¿Cuál es el framework de IA más popular en 2026?" | Responde con búsqueda real + fuentes |
| 9 | @Gem_ERP_Bot | (enviar foto de un diagrama) | GEM analiza la imagen |
| 10 | @Gem_ERP_Bot | (enviar video corto) | GEM describe el video |
| 11 | @Apex_FIN_Bot | (enviar video) | "No proceso video, usa @Gem_ERP_Bot" |

**Step 6: Final commit (if any adjustments)**

```bash
git add -p  # stage only relevant changes
git commit -m "fix: post-deploy adjustments from acceptance tests"
```

---

## Quick Reference — Files Touched

| File | Action |
|------|--------|
| `src/app/api/memory/seed/route.ts` | MODIFY — 37 memories |
| `src/lib/mcp/executor.ts` | MODIFY — 3 new GitHub tools |
| `src/lib/telegram/claud.ts` | CREATE — CLAUD handler |
| `src/lib/telegram/gem.ts` | CREATE — GEM handler |
| `src/lib/telegram/media.ts` | CREATE — file download util |
| `src/lib/telegram/processor.ts` | MODIFY — multimedia routing |
| `src/lib/telegram/types.ts` | MODIFY — add photo/video types |
| `.env.local` | MODIFY — add GITHUB_OWNER |

## Env Vars Required

| Var | Status |
|-----|--------|
| `ANTHROPIC_API_KEY` | ✓ already set |
| `GOOGLE_AI_API_KEY` | ✓ already set |
| `GITHUB_TOKEN` | ✓ already set |
| `TELEGRAM_WEBHOOK_SECRET` | ✓ already set |
| `GITHUB_OWNER` | ⚠️ NEW — add to .env.local + Vercel |
