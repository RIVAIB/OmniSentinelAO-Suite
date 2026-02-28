# Telegram Integration + Memoria Compartida — Diseño Aprobado
**Fecha:** 2026-02-28
**Estado:** Aprobado — listo para implementación
**Proyecto:** OmniSentinelAO-Suite

---

## 1. Contexto y Objetivo

Conectar los 6 agentes de OmniSentinel (CLAWDIO, JESSY, NEXUS, APEX, AXIOM, FORGE) a Telegram como canales de comunicación directa, junto a un grupo separado de Claude × Gemini para asistencia general. Los agentes comparten una memoria estructurada (memU) que les permite colaborar con contexto completo, preparados para conectarse al ERP RIVAIB en una fase posterior.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM                                      │
│                                                                  │
│  💬 "Claude × Gemini"     💬 "OmniSentinel Command Center"      │
│  (debate / asistencia)    (todos los agentes + usuario)         │
│                                                                  │
│  👤 @OmniClawdioBot   👤 @OmniJessyBot   👤 @OmniApexBot       │
│  👤 @OmniNexusBot     👤 @OmniAxiomBot   👤 @OmniForgeBot       │
│  👤 @OmniClaudBot     👤 @OmniGemBot                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ POST webhook
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL — OmniSentinel (repo actual)                 │
│                                                                  │
│  /api/telegram/webhook  ──► responde 200 OK inmediato           │
│                    │                                             │
│                    ▼                                             │
│  Supabase Edge Function  ──► procesa agente async              │
│         │                                                        │
│         ├── memU.retrieve()  [contexto antes de responder]      │
│         ├── processMessage() [existente, sin cambios]           │
│         ├── memU.memorize()  [guarda después de responder]      │
│         └── bot.sendMessage() [respuesta a Telegram]            │
└─────────────────┬───────────────────────────┬───────────────────┘
                  │                           │
                  ▼                           ▼
┌─────────────────────────┐  ┌───────────────────────────────────┐
│  RAILWAY                │  │  SUPABASE (existente)              │
│  memU (Python + PG)     │  │  · conversations (channel:'tg')   │
│  · memorize()           │  │  · agents (6 agentes)             │
│  · retrieve() RAG/LLM   │  │  · missions                       │
│  · auto-categorización  │  │  · memories (audit log)           │
└─────────────────────────┘  └───────────────────────────────────┘
```

---

## 3. Estructura de Bots de Telegram

### 8 bots a crear en BotFather

| Bot | Handle sugerido | LLM / Agente | Rol |
|-----|----------------|--------------|-----|
| Claude general | @OmniClaudBot | Claude API | Asistente general + debate |
| Gemini general | @OmniGemBot | Gemini API | Asistente general + debate |
| CLAWDIO | @OmniClawdioBot | Claude + OmniSentinel | Orquestador — reportes globales |
| JESSY | @OmniJessyBot | Claude + OmniSentinel | CRM / pacientes / citas |
| NEXUS | @OmniNexusBot | Claude + OmniSentinel | Análisis / datos |
| APEX | @OmniApexBot | Claude + OmniSentinel | Finanzas / pagos |
| AXIOM | @OmniAxiomBot | Claude + OmniSentinel | Estrategia / decisiones |
| FORGE | @OmniForgeBot | Claude + OmniSentinel | Utilidades / documentos / scripts |

### Grupos a crear

| Grupo | Integrantes | Propósito |
|-------|------------|-----------|
| Claude × Gemini | @OmniClaudBot + @OmniGemBot + usuario | Debate, brainstorming, consultas generales |
| OmniSentinel Command Center | Los 6 agentes + usuario | Coordinación, misiones, reportes ERP |

---

## 4. Routing de Mensajes

### Chats individuales (1:1)
El contexto del agente es implícito — no se necesita @ mención:
```
Chat con @OmniJessyBot:
  "revisa las citas de mañana" → JESSY responde directamente
```

### Grupo Command Center
Se requiere @ mención para dirigirse a un agente específico:
```
@JESSY agenda al paciente Juan Pérez para el viernes
@APEX hay un conflicto de pago en el paciente ID-1042
@CLAWDIO dame el estado de las misiones de JESSY y APEX
```

Sin @ mención en el grupo → CLAWDIO responde como moderador.

### Rol de CLAWDIO en Telegram
CLAWDIO **NO enruta** en Telegram (eso es solo para el web chat).
En Telegram, CLAWDIO **agrega y reporta**:
- Consulta misiones activas por agente en Supabase
- Lee SHARED/auditoria/ en memU
- Devuelve resumen orquestado del estado del equipo

### Grupo Claude × Gemini
Ambos bots responden siempre a cada mensaje del usuario.
No hay routing — cada uno responde desde su perspectiva de forma independiente.

---

## 5. Flujo de Mensajes de Voz

```
🎙️ Usuario graba audio en Telegram
         │
         ▼
Webhook descarga archivo .oga de Telegram
         │
         ▼
OpenAI Whisper API → transcripción en texto
         │
         ▼
Texto procesado igual que mensaje escrito:
  · detección de nombre de agente en el texto
  · routing al agente correspondiente
         │
         ▼
Respuesta enviada como texto al chat
```

El nombre del agente dicho en voz es detectado igual que si fuera escrito:
- "JESSY revisa las citas" → route a JESSY
- "CLAWDIO dame el estado del equipo" → CLAWDIO reporta
- Sin nombre de agente → responde el bot del chat activo

---

## 6. Arquitectura de Memoria Compartida (memU)

### Principio fundamental
Lo que un agente hace, todos los demás pueden leerlo. No hay silos.

### Estructura de memoria

```
memory/
├── SHARED/                    ← todos los agentes leen y escriben
│   ├── erp/
│   │   ├── pacientes/         ← JESSY escribe → APEX/todos leen
│   │   ├── citas/             ← JESSY escribe → CLAWDIO lee
│   │   ├── pagos/             ← APEX escribe → JESSY ve conflictos
│   │   ├── finanzas/          ← APEX escribe → todos consultan
│   │   └── contratos/         ← FORGE escribe → APEX valida
│   ├── misiones/              ← CLAWDIO escribe → todos siguen
│   ├── decisiones/            ← cualquier agente escribe
│   └── auditoria/             ← quién hizo qué y cuándo
│
└── PRIVATE/                   ← notas internas de cada agente
    ├── JESSY/
    ├── APEX/
    ├── NEXUS/
    ├── AXIOM/
    ├── FORGE/
    └── CLAWDIO/
```

### Flujo de memoria por conversación

```
① Mensaje entra
② memU.retrieve(query, scope: SHARED + PRIVATE/agente)
   → contexto semántico inyectado al system prompt
③ Agente responde con contexto real
④ memU.memorize(interacción)
   → extrae hechos, acciones ERP, decisiones → SHARED/
   → notas internas → PRIVATE/agente/
```

### Reglas de escritura en memoria compartida

| Tipo de acción | Destino en memU |
|---|---|
| Acción sobre ERP (paciente, cita, pago) | `SHARED/erp/{entidad}/` |
| Misión creada o actualizada | `SHARED/misiones/` |
| Decisión tomada por cualquier agente | `SHARED/decisiones/` |
| Cualquier acción | `SHARED/auditoria/` (siempre) |

### Coexistencia con tabla `memories` de Supabase

| Supabase `memories` | memU en Railway |
|---|---|
| Key-value simple, sin semántica | Semántico + embeddings + RAG |
| Registro histórico / audit log | Contexto activo de agentes |
| Se mantiene sin cambios | Nuevo, aditivo |

---

## 7. Scaffold ERP RIVAIB (Fase 3)

Las categorías del ERP se crean en memU desde el día 1 con los schemas definidos. Los agentes conocen la estructura aunque el ERP no esté conectado aún:

```
SHARED/erp/pacientes_schema.md   → campos disponibles en el ERP
SHARED/erp/citas_schema.md       → estructura de citas
SHARED/erp/pagos_schema.md       → estructura de pagos y contratos
```

Cuando el ERP se conecte, solo se activan los endpoints — sin refactor de agentes.

---

## 8. Archivos Nuevos — Nada se Rompe

### Zona protegida (no se toca)
```
/api/chat/mc          → War Room intacto
/api/agents/[id]/chat → chat web intacto
/api/agents/seed      → seed intacto
/room                 → UI War Room intacta
/dashboard, /missions, /conversations, /agents → sin cambios
src/lib/ai/claude.ts, router.ts, agent-service.ts → sin cambios
```

### Archivos nuevos a crear (100% aditivos)
```
src/lib/telegram/
  ├── client.ts
  ├── webhook-handler.ts
  └── voice.ts

src/lib/memory/
  ├── memu-client.ts
  ├── shared-memory.ts
  └── erp-scaffold.ts

src/lib/erp/              ← Fase 3, scaffold solo
  └── tools/

src/app/api/telegram/
  ├── webhook/route.ts
  └── register/route.ts
```

---

## 9. Variables de Entorno Nuevas

```env
# Telegram — 8 bots
TELEGRAM_CLAUD_TOKEN=
TELEGRAM_GEM_TOKEN=
TELEGRAM_CLAWDIO_TOKEN=
TELEGRAM_JESSY_TOKEN=
TELEGRAM_NEXUS_TOKEN=
TELEGRAM_APEX_TOKEN=
TELEGRAM_AXIOM_TOKEN=
TELEGRAM_FORGE_TOKEN=
TELEGRAM_ALLOWED_CHAT_IDS=   # IDs de grupos autorizados (seguridad)

# Whisper (voz)
OPENAI_API_KEY=

# memU (Railway)
MEMU_BASE_URL=
MEMU_API_KEY=
```

---

## 10. Fases de Implementación

### Fase 1 — Telegram Foundation
**Costo adicional:** $0 (solo Vercel)
**Entregables:**
- 8 bots activos en Telegram
- Chats 1:1 por agente funcionando
- Grupos Claude×Gemini y Command Center armados
- Voz transcrita con Whisper
- Historial en Supabase (`channel: 'telegram'`)

**Requisitos del usuario antes de Fase 1:**
1. Crear 8 bots en BotFather → entregar los 8 tokens
2. OpenAI API key (para Whisper)
3. Agregar variables de entorno en Vercel

### Fase 2 — Memoria Compartida con memU
**Costo adicional:** ~$5-8/mes (Railway Hobby)
**Entregables:**
- memU desplegado en Railway
- Memoria SHARED activa entre todos los agentes
- Agentes responden con contexto enriquecido
- Scaffold ERP en memoria (schemas definidos)

**Requisitos del usuario antes de Fase 2:**
1. Cuenta en Railway
2. Deploy de RIVAIB/memU en Railway
3. Agregar MEMU_BASE_URL y MEMU_API_KEY en Vercel

### Fase 3 — Conexión ERP RIVAIB
**Costo adicional:** según infraestructura ERP
**Entregables:**
- Agentes con acceso real al ERP
- JESSY crea/lee pacientes y citas
- APEX gestiona pagos y reportes financieros
- FORGE genera documentos y contratos
- CLAWDIO reporta estado financiero + operacional completo

**Requisitos antes de Fase 3:**
1. ERP RIVAIB desplegado y accesible
2. Endpoints definidos y documentados

---

## 11. Infraestructura y Costos

| Servicio | Propósito | Costo |
|---|---|---|
| Vercel (existente) | OmniSentinel + webhooks Telegram | $0 adicional |
| Supabase (existente) | DB + Edge Functions async | $0 adicional |
| Railway Hobby | memU Python + PostgreSQL | ~$5-8/mes |
| OpenAI Whisper | Transcripción de voz | ~$0.006/min de audio |
| Telegram Bot API | 8 bots | Gratis |

---

*Diseño aprobado por el usuario el 2026-02-28.*
*Próximo paso: plan de implementación técnica (writing-plans).*
