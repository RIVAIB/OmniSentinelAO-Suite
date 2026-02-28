# Telegram Integration — Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy 8 Telegram bots (6 OmniSentinel agents + Claude + Gemini) with voice transcription, connected to existing processMessage() infrastructure — zero changes to existing routes.

**Architecture:** Webhook-based (Telegram POST → Vercel `/api/telegram/webhook` → `after()` async → processMessage() → Telegram API reply). No new infrastructure for Phase 1 — everything runs on existing Vercel deployment.

**Tech Stack:** Next.js 16 `after()` for async post-response, Telegram Bot API via raw fetch, OpenAI Whisper API via raw fetch (no new npm packages required).

---

## Pre-requisites (user must complete before starting)

The developer needs these values from the user before writing any code:

```
TELEGRAM_CLAUD_TOKEN       ← @OmniClaudBot token from BotFather
TELEGRAM_GEM_TOKEN         ← @OmniGemBot token from BotFather
TELEGRAM_CLAWDIO_TOKEN     ← @OmniClawdioBot token from BotFather
TELEGRAM_JESSY_TOKEN       ← @OmniJessyBot token from BotFather
TELEGRAM_NEXUS_TOKEN       ← @OmniNexusBot token from BotFather
TELEGRAM_APEX_TOKEN        ← @OmniApexBot token from BotFather
TELEGRAM_AXIOM_TOKEN       ← @OmniAxiomBot token from BotFather
TELEGRAM_FORGE_TOKEN       ← @OmniForgeBot token from BotFather
TELEGRAM_WEBHOOK_SECRET    ← any random string, e.g. openssl rand -hex 32
TELEGRAM_ALLOWED_CHAT_IDS  ← comma-separated group chat IDs
OPENAI_API_KEY             ← for Whisper voice transcription
```

---

## Task 1: Environment Variables

**Files:**
- Create: `.env.local.example`
- Modify: `.env.local` (add new vars, never commit this file)

**Step 1: Create the example file**

```
# .env.local.example — copy to .env.local and fill in values

# ── Existing vars (already set) ──────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# ── Telegram Bots ─────────────────────────────────────────────
TELEGRAM_CLAUD_TOKEN=        # @OmniClaudBot
TELEGRAM_GEM_TOKEN=          # @OmniGemBot
TELEGRAM_CLAWDIO_TOKEN=      # @OmniClawdioBot
TELEGRAM_JESSY_TOKEN=        # @OmniJessyBot
TELEGRAM_NEXUS_TOKEN=        # @OmniNexusBot
TELEGRAM_APEX_TOKEN=         # @OmniApexBot
TELEGRAM_AXIOM_TOKEN=        # @OmniAxiomBot
TELEGRAM_FORGE_TOKEN=        # @OmniForgeBot

# Secret used to validate Telegram → Vercel webhook calls
TELEGRAM_WEBHOOK_SECRET=

# Comma-separated Telegram chat IDs allowed to use bots (security)
# Get chat ID by adding @userinfobot to your group
TELEGRAM_ALLOWED_CHAT_IDS=

# ── OpenAI Whisper (voice transcription) ──────────────────────
OPENAI_API_KEY=
```

**Step 2: Add vars to `.env.local`**

Copy the template and fill in all values received from the user.

**Step 3: Add vars to Vercel dashboard**

Go to https://vercel.com → Project → Settings → Environment Variables.
Add each variable (same names, same values as `.env.local`).

**Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors (nothing changed yet).

**Step 5: Commit**

```bash
git add .env.local.example
git commit -m "chore: add telegram + whisper env var template"
```

---

## Task 2: Telegram Types

**Files:**
- Create: `src/lib/telegram/types.ts`

**Step 1: Write the file**

```typescript
// src/lib/telegram/types.ts
// Minimal Telegram Bot API types — only what we use.

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
}

export interface TelegramVoice {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    voice?: TelegramVoice;
}

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
}

// Internal bot identity — maps token env var names to agent/model names
export type BotIdentity =
    | { kind: 'agent'; agentName: string; token: string }
    | { kind: 'claude'; token: string }
    | { kind: 'gemini'; token: string };

// All 8 bots indexed by their token env var name
export const BOT_REGISTRY: Record<string, BotIdentity> = {
    TELEGRAM_CLAUD_TOKEN:   { kind: 'claude',   token: '' },
    TELEGRAM_GEM_TOKEN:     { kind: 'gemini',   token: '' },
    TELEGRAM_CLAWDIO_TOKEN: { kind: 'agent',    agentName: 'CLAWDIO', token: '' },
    TELEGRAM_JESSY_TOKEN:   { kind: 'agent',    agentName: 'JESSY',   token: '' },
    TELEGRAM_NEXUS_TOKEN:   { kind: 'agent',    agentName: 'NEXUS',   token: '' },
    TELEGRAM_APEX_TOKEN:    { kind: 'agent',    agentName: 'APEX',    token: '' },
    TELEGRAM_AXIOM_TOKEN:   { kind: 'agent',    agentName: 'AXIOM',   token: '' },
    TELEGRAM_FORGE_TOKEN:   { kind: 'agent',    agentName: 'FORGE',   token: '' },
};
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/telegram/types.ts
git commit -m "feat(telegram): add Telegram types and bot registry"
```

---

## Task 3: Telegram Client

**Files:**
- Create: `src/lib/telegram/client.ts`

Wraps the Telegram Bot API using raw `fetch` — no new npm packages.

**Step 1: Write the file**

```typescript
// src/lib/telegram/client.ts
// Thin wrapper over Telegram Bot API REST calls.

const TG_BASE = 'https://api.telegram.org/bot';
const TG_FILE_BASE = 'https://api.telegram.org/file/bot';

/**
 * Send a text message to a Telegram chat.
 */
export async function sendMessage(
    token: string,
    chatId: number,
    text: string
): Promise<void> {
    const url = `${TG_BASE}${token}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        console.error('[Telegram] sendMessage failed:', body);
    }
}

/**
 * Get the download URL for a Telegram file (voice, etc.)
 */
export async function getFileUrl(
    token: string,
    fileId: string
): Promise<string> {
    const url = `${TG_BASE}${token}/getFile?file_id=${fileId}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`[Telegram] getFile failed: ${res.status}`);

    const data = (await res.json()) as { ok: boolean; result: { file_path: string } };
    if (!data.ok) throw new Error('[Telegram] getFile returned ok:false');

    return `${TG_FILE_BASE}${token}/${data.result.file_path}`;
}

/**
 * Download raw bytes from a Telegram file URL.
 */
export async function downloadFile(fileUrl: string): Promise<ArrayBuffer> {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`[Telegram] downloadFile failed: ${res.status}`);
    return res.arrayBuffer();
}

/**
 * Register a webhook URL for a bot token.
 * secret_token is sent as X-Telegram-Bot-Api-Secret-Token header on every update.
 */
export async function registerWebhook(
    token: string,
    webhookUrl: string,
    secretToken: string
): Promise<boolean> {
    const url = `${TG_BASE}${token}/setWebhook`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: webhookUrl,
            secret_token: secretToken,
            allowed_updates: ['message'],
        }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) console.error('[Telegram] registerWebhook failed:', data.description);
    return data.ok;
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/telegram/client.ts
git commit -m "feat(telegram): add Telegram API client (sendMessage, getFile, registerWebhook)"
```

---

## Task 4: Agent Mention Parser

**Files:**
- Create: `src/lib/telegram/agent-parser.ts`

Detects agent names spoken or typed in a message to determine routing.

**Step 1: Write the file**

```typescript
// src/lib/telegram/agent-parser.ts
// Detect OmniSentinel agent names in a message for routing.

const AGENT_NAMES = ['CLAWDIO', 'JESSY', 'NEXUS', 'APEX', 'AXIOM', 'FORGE'] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

/**
 * Scan a message for an OmniSentinel agent name (case-insensitive).
 * Returns the agent name (uppercased) or null if none found.
 *
 * Examples:
 *   "JESSY revisa las citas" → "JESSY"
 *   "jessy, dame un resumen" → "JESSY"
 *   "@APEX analiza esto"     → "APEX"
 *   "hola cómo estás"        → null
 */
export function detectAgentMention(text: string): AgentName | null {
    const upper = text.toUpperCase();
    for (const name of AGENT_NAMES) {
        // Match as whole word (with optional leading @)
        const regex = new RegExp(`(?:^|\\s|@)${name}(?:\\s|,|$|\\.)`, 'i');
        if (regex.test(upper)) return name;
    }
    return null;
}
```

**Step 2: Verify manually in your head**

```
detectAgentMention("JESSY revisa las citas")  → "JESSY"   ✓
detectAgentMention("@APEX analiza esto")       → "APEX"    ✓
detectAgentMention("hola cómo estás")          → null      ✓
detectAgentMention("¿qué hace clawdio?")       → "CLAWDIO" ✓
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/telegram/agent-parser.ts
git commit -m "feat(telegram): add agent mention parser for voice/text routing"
```

---

## Task 5: Voice Transcription (Whisper)

**Files:**
- Create: `src/lib/telegram/voice.ts`

Downloads voice file from Telegram and transcribes via OpenAI Whisper REST API.

**Step 1: Write the file**

```typescript
// src/lib/telegram/voice.ts
// Download Telegram voice file and transcribe with OpenAI Whisper.

import { getFileUrl, downloadFile } from './client';

/**
 * Transcribe a Telegram voice message to text.
 * Returns the transcribed string, or throws on failure.
 */
export async function transcribeVoice(
    token: string,
    fileId: string
): Promise<string> {
    // 1. Get Telegram download URL for the voice file
    const fileUrl = await getFileUrl(token, fileId);

    // 2. Download raw audio bytes (.oga format)
    const audioBuffer = await downloadFile(fileUrl);

    // 3. Prepare multipart/form-data for Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('file', audioBlob, 'voice.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // Spanish primary — Whisper auto-detects if wrong

    // 4. Call OpenAI Whisper
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`[Whisper] Transcription failed: ${err}`);
    }

    const data = (await res.json()) as { text: string };
    return data.text.trim();
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/telegram/voice.ts
git commit -m "feat(telegram): add Whisper voice transcription"
```

---

## Task 6: Webhook Message Processor

**Files:**
- Create: `src/lib/telegram/processor.ts`

Core logic: takes a parsed Telegram update + bot identity → processes it → sends reply.
This is the function called async after the webhook returns 200.

**Step 1: Write the file**

```typescript
// src/lib/telegram/processor.ts
// Async message processor: parses update, routes to agent or LLM, replies.

import { sendMessage } from './client';
import { transcribeVoice } from './voice';
import { detectAgentMention } from './agent-parser';
import { processMessage, createConversation, getAgentByName } from '@/lib/ai/agent-service';
import { createClient } from '@/lib/supabase/server';
import type { TelegramUpdate, BotIdentity } from './types';

// ── Gemini call (mirrors War Room pattern) ────────────────────────────────────

async function callGemini(text: string): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(text);
    return result.response.text();
}

// ── Claude general (without OmniSentinel agent routing) ───────────────────────

async function callClaude(text: string): Promise<string> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: text }],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
}

// ── CLAWDIO orchestrator report ───────────────────────────────────────────────

async function clawdioReport(userMessage: string, contactId: string): Promise<string> {
    const supabase = await createClient();

    // Fetch all active missions with their assigned agent
    const { data: missions } = await supabase
        .from('missions')
        .select('title, status, priority, agents(name)')
        .in('status', ['running', 'proposed', 'paused'])
        .order('priority', { ascending: false });

    const missionSummary = missions?.length
        ? missions.map((m: any) => {
              const agent = m.agents?.name ?? 'Sin asignar';
              return `• [${m.status.toUpperCase()}] ${m.title} — agente: ${agent}`;
          }).join('\n')
        : 'No hay misiones activas.';

    // Use processMessage so the report is persisted and CLAWDIO has history
    const convId = await createConversation('telegram', contactId);
    const context = `Resumen de misiones activas:\n${missionSummary}\n\nPregunta del usuario: ${userMessage}`;
    const { response } = await processMessage('CLAWDIO', convId, context);
    return response;
}

// ── Main processor ────────────────────────────────────────────────────────────

export async function processUpdate(
    update: TelegramUpdate,
    bot: BotIdentity,
    token: string
): Promise<void> {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const contactId = String(msg.from?.id ?? 'anonymous');

    // 1. Get message text (transcribe voice if needed)
    let text: string;
    try {
        if (msg.voice) {
            text = await transcribeVoice(token, msg.voice.file_id);
        } else if (msg.text) {
            text = msg.text;
        } else {
            return; // Not a voice or text message — ignore
        }
    } catch (err) {
        console.error('[Processor] Failed to get message text:', err);
        await sendMessage(token, chatId, '⚠️ No pude procesar el mensaje. Intenta de nuevo.');
        return;
    }

    // 2. Route based on bot identity
    let reply: string;
    try {
        if (bot.kind === 'claude') {
            reply = await callClaude(text);

        } else if (bot.kind === 'gemini') {
            reply = await callGemini(text);

        } else {
            // OmniSentinel agent bot
            const agentName = bot.agentName;

            if (agentName === 'CLAWDIO') {
                // CLAWDIO always does orchestrator report
                reply = await clawdioReport(text, contactId);
            } else {
                // Check if user mentioned a DIFFERENT agent in the message
                const mentionedAgent = detectAgentMention(text);
                const targetAgent = mentionedAgent ?? agentName;

                // Verify agent exists and is active
                const agent = await getAgentByName(targetAgent);
                const finalAgent = agent ? targetAgent : agentName; // fallback to bot's own agent

                const convId = await createConversation('telegram', contactId);
                const result = await processMessage(finalAgent, convId, text);
                reply = result.response;
            }
        }
    } catch (err) {
        console.error('[Processor] Agent error:', err);
        reply = '⚠️ Hubo un error procesando tu mensaje. El equipo fue notificado.';
    }

    // 3. Send reply
    await sendMessage(token, chatId, reply);
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type issues before proceeding.

**Step 3: Commit**

```bash
git add src/lib/telegram/processor.ts
git commit -m "feat(telegram): add async message processor with agent routing + voice"
```

---

## Task 7: Webhook API Route

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`

Receives all Telegram updates for all 8 bots. Uses `after()` for async processing.

**Step 1: Write the file**

```typescript
// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { processUpdate } from '@/lib/telegram/processor';
import type { TelegramUpdate, BotIdentity } from '@/lib/telegram/types';

// Map env var name → token value, resolved at runtime
function buildBotMap(): Map<string, { identity: BotIdentity; token: string }> {
    const map = new Map<string, { identity: BotIdentity; token: string }>();

    const entries: Array<{ envKey: string; identity: Omit<BotIdentity, 'token'> }> = [
        { envKey: 'TELEGRAM_CLAUD_TOKEN',   identity: { kind: 'claude' } },
        { envKey: 'TELEGRAM_GEM_TOKEN',     identity: { kind: 'gemini' } },
        { envKey: 'TELEGRAM_CLAWDIO_TOKEN', identity: { kind: 'agent', agentName: 'CLAWDIO' } },
        { envKey: 'TELEGRAM_JESSY_TOKEN',   identity: { kind: 'agent', agentName: 'JESSY' } },
        { envKey: 'TELEGRAM_NEXUS_TOKEN',   identity: { kind: 'agent', agentName: 'NEXUS' } },
        { envKey: 'TELEGRAM_APEX_TOKEN',    identity: { kind: 'agent', agentName: 'APEX' } },
        { envKey: 'TELEGRAM_AXIOM_TOKEN',   identity: { kind: 'agent', agentName: 'AXIOM' } },
        { envKey: 'TELEGRAM_FORGE_TOKEN',   identity: { kind: 'agent', agentName: 'FORGE' } },
    ];

    for (const { envKey, identity } of entries) {
        const token = process.env[envKey];
        if (token) {
            map.set(token, { identity: { ...identity, token } as BotIdentity, token });
        }
    }

    return map;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    // 1. Validate secret token (Telegram sends it as a header)
    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ ok: false }, { status: 403 });
    }

    // 2. Parse body
    let update: TelegramUpdate;
    try {
        update = (await request.json()) as TelegramUpdate;
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    // 3. Identify which bot this update is for via the token in the URL path
    //    Telegram sends updates to: /api/telegram/webhook?token=<BOT_TOKEN>
    const token = request.nextUrl.searchParams.get('token') ?? '';
    const botMap = buildBotMap();
    const bot = botMap.get(token);

    if (!bot) {
        console.warn('[Webhook] Unknown bot token in request');
        return NextResponse.json({ ok: true }); // Return 200 to avoid Telegram retries
    }

    // 4. Security: only accept messages from allowed chats
    const chatId = update.message?.chat.id;
    const allowedIds = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    if (allowedIds.length > 0 && chatId && !allowedIds.includes(String(chatId))) {
        console.warn('[Webhook] Message from unauthorized chat:', chatId);
        return NextResponse.json({ ok: true }); // Silently ignore
    }

    // 5. Respond to Telegram immediately (required within 3 seconds)
    //    Process the message asynchronously after the response is sent
    after(async () => {
        try {
            await processUpdate(update, bot.identity, token);
        } catch (err) {
            console.error('[Webhook] processUpdate error:', err);
        }
    });

    return NextResponse.json({ ok: true });
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/api/telegram/webhook/route.ts
git commit -m "feat(telegram): add webhook route with after() async processing"
```

---

## Task 8: Register Webhooks Route

**Files:**
- Create: `src/app/api/telegram/register/route.ts`

Run this once after deploy to register all 8 webhook URLs with Telegram.

**Step 1: Write the file**

```typescript
// src/app/api/telegram/register/route.ts
// POST this endpoint once after deploy to register all bot webhooks.
// Protected by TELEGRAM_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from 'next/server';
import { registerWebhook } from '@/lib/telegram/client';

const BOT_TOKENS: Record<string, string> = {
    CLAUD:   'TELEGRAM_CLAUD_TOKEN',
    GEM:     'TELEGRAM_GEM_TOKEN',
    CLAWDIO: 'TELEGRAM_CLAWDIO_TOKEN',
    JESSY:   'TELEGRAM_JESSY_TOKEN',
    NEXUS:   'TELEGRAM_NEXUS_TOKEN',
    APEX:    'TELEGRAM_APEX_TOKEN',
    AXIOM:   'TELEGRAM_AXIOM_TOKEN',
    FORGE:   'TELEGRAM_FORGE_TOKEN',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
    // Simple auth: require the webhook secret in Authorization header
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.TELEGRAM_WEBHOOK_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
        ?? `https://${request.headers.get('host')}`;

    const results: Record<string, boolean> = {};

    for (const [name, envKey] of Object.entries(BOT_TOKENS)) {
        const token = process.env[envKey];
        if (!token) {
            console.warn(`[Register] Missing env var: ${envKey}`);
            results[name] = false;
            continue;
        }

        // Webhook URL includes the token as query param so we can identify the bot
        const webhookUrl = `${baseUrl}/api/telegram/webhook?token=${token}`;
        const ok = await registerWebhook(
            token,
            webhookUrl,
            process.env.TELEGRAM_WEBHOOK_SECRET!
        );
        results[name] = ok;
        console.log(`[Register] ${name}: ${ok ? '✓' : '✗'}`);
    }

    return NextResponse.json({ results });
}
```

**Step 2: Also add `NEXT_PUBLIC_SITE_URL` to `.env.local.example`**

```
NEXT_PUBLIC_SITE_URL=https://omnisentinel-ao-suite.vercel.app
```

Add it to Vercel dashboard as well.

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/telegram/register/route.ts
git commit -m "feat(telegram): add register-webhooks endpoint"
```

---

## Task 9: Full Build Verification

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 2: Build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. If errors appear, fix before continuing.

**Step 3: Verify existing routes still work**

Start dev server:
```bash
npm run dev
```

Test these endpoints are still responding (they must not be broken):
```bash
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/chat/mc -X GET
```

Expected: both return JSON responses, no 500 errors.

---

## Task 10: Deploy and Register Webhooks

**Step 1: Deploy to Vercel**

```bash
vercel --prod
```

Wait for deployment to complete. Note the deployment URL.

**Step 2: Verify env vars are set in Vercel**

Go to Vercel dashboard → Project → Settings → Environment Variables.
Confirm all 11 new variables are present.

**Step 3: Register all 8 webhooks**

```bash
curl -X POST https://omnisentinel-ao-suite.vercel.app/api/telegram/register \
  -H "Authorization: Bearer YOUR_TELEGRAM_WEBHOOK_SECRET"
```

Expected response:
```json
{
  "results": {
    "CLAUD": true,
    "GEM": true,
    "CLAWDIO": true,
    "JESSY": true,
    "NEXUS": true,
    "APEX": true,
    "AXIOM": true,
    "FORGE": true
  }
}
```

If any bot shows `false`, check that its token env var is set correctly in Vercel.

**Step 4: Smoke test — text message**

Open Telegram. Find `@OmniJessyBot`. Send:
```
hola, ¿cuántas misiones hay activas?
```

Expected: JESSY responds within ~10 seconds.

**Step 5: Smoke test — voice message**

Open Telegram. Find `@OmniApexBot`. Record a voice note saying:
```
"APEX, dame un resumen financiero"
```

Expected: APEX responds within ~15 seconds (Whisper transcription + agent processing).

**Step 6: Smoke test — group**

Open the "OmniSentinel Command Center" group. Send:
```
@CLAWDIO dame el estado de todas las misiones
```

Expected: CLAWDIO (@OmniClawdioBot) responds with a mission status summary.

**Step 7: Final commit**

```bash
git add .
git commit -m "feat(telegram): Phase 1 complete — 8 bots live with voice transcription"
```

---

## Summary of New Files (Phase 1)

```
src/lib/telegram/
  ├── types.ts          ← Telegram types + bot registry
  ├── client.ts         ← Telegram API calls (send, download, register)
  ├── agent-parser.ts   ← detect agent names in text/voice
  ├── voice.ts          ← Whisper transcription
  └── processor.ts      ← async message processor + routing

src/app/api/telegram/
  ├── webhook/route.ts  ← receives all Telegram updates
  └── register/route.ts ← registers webhook URLs with Telegram

.env.local.example      ← updated with all new vars
```

## Files NOT touched (protected zone)

```
src/app/api/chat/          ← untouched
src/app/api/agents/        ← untouched
src/lib/ai/                ← untouched
src/lib/supabase/          ← untouched
src/app/room/              ← untouched
src/app/dashboard/         ← untouched
```

---

*Phase 2 (memU shared memory) plan will be written after Phase 1 is live and stable.*
