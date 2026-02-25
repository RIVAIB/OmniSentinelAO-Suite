# WAR ROOM — Master Prompt for Google Antigravity

## PROJECT IDENTITY
- **Name:** War Room by RIVAIB Tech
- **Type:** Multi-Agent Technical Consulting Web App
- **Owner:** Richard (Manito), CEO of RIVAIB Health Clinic & RIVAIB Tech
- **Purpose:** A collaborative environment where Richard orchestrates real-time debates between Claude (Anthropic) and Gemini (Google) to produce validated technical decisions for any system (Web, Mobile, ERP).

---

## TECH STACK (Non-Negotiable)

| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js 14+ (App Router) | Richard's primary stack |
| Language | TypeScript (strict) | Type safety for complex agent state |
| Database | Supabase (Postgres + Realtime) | Sessions, messages, actas, auth |
| AI - Claude | Anthropic API direct (`@anthropic-ai/sdk`) | No middleware markup |
| AI - Gemini | Google AI SDK (`@google/generative-ai`) | Free tier + direct pricing |
| Styling | Tailwind CSS + shadcn/ui | Rapid, consistent UI |
| Deploy | Vercel | Edge-optimized, matches Next.js |
| Auth | Supabase Auth (magic link or Google OAuth) | Single-user initially, multi-user ready |

---

## FILE STRUCTURE

```
war-room/
├── .env.local                          # API keys (never commit)
├── next.config.ts
├── tailwind.config.ts
├── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Full DB schema
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout + providers
│   │   ├── page.tsx                    # Landing/redirect
│   │   ├── login/page.tsx              # Auth page
│   │   │
│   │   ├── room/
│   │   │   ├── page.tsx                # Session list + create new
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx            # THE WAR ROOM (main chat)
│   │   │
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts            # Orchestrator endpoint (POST)
│   │       ├── cross-check/
│   │       │   └── route.ts            # Validation layer endpoint
│   │       ├── acta/
│   │       │   └── route.ts            # Generate consolidated agreement
│   │       └── mcp/
│   │           └── route.ts            # MCP tool execution proxy
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser client
│   │   │   ├── server.ts               # Server client
│   │   │   └── types.ts                # Generated DB types
│   │   │
│   │   ├── agents/
│   │   │   ├── orchestrator.ts         # Core: who speaks, when, with what context
│   │   │   ├── claude.ts               # Claude API wrapper + system prompt
│   │   │   ├── gemini.ts               # Gemini API wrapper + system prompt
│   │   │   ├── cross-checker.ts        # Anti-contradiction logic
│   │   │   └── acta-generator.ts       # Session → structured roadmap
│   │   │
│   │   ├── prompts/
│   │   │   ├── claude-system.ts        # Claude's system prompt (engineer role)
│   │   │   ├── gemini-system.ts        # Gemini's system prompt (strategist role)
│   │   │   ├── cross-check.ts          # Cross-validation prompt template
│   │   │   └── acta.ts                 # Acta generation prompt template
│   │   │
│   │   └── types/
│   │       ├── messages.ts             # Message types, agent types
│   │       └── session.ts              # Session types
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatRoom.tsx            # Main chat container
│   │   │   ├── MessageBubble.tsx       # Per-message display (color-coded by agent)
│   │   │   ├── InputBar.tsx            # Message input + agent selector
│   │   │   ├── StreamingIndicator.tsx  # Shows who's typing/thinking
│   │   │   └── CrossCheckBadge.tsx     # Visual indicator of validation status
│   │   │
│   │   ├── session/
│   │   │   ├── SessionList.tsx         # History of past sessions
│   │   │   ├── NewSessionForm.tsx      # Create session with project context
│   │   │   └── SessionCard.tsx         # Session preview card
│   │   │
│   │   ├── acta/
│   │   │   ├── ActaButton.tsx          # "Generar Acta" trigger
│   │   │   ├── ActaPreview.tsx         # Modal showing generated acta
│   │   │   └── ActaExport.tsx          # Export to MD/PDF
│   │   │
│   │   └── ui/                         # shadcn/ui components
│   │
│   └── hooks/
│       ├── useChat.ts                  # Chat state + streaming logic
│       ├── useSession.ts               # Session CRUD
│       └── useRealtime.ts              # Supabase realtime subscription
│
└── public/
    ├── avatars/
    │   ├── richard.svg                 # User avatar
    │   ├── claude.svg                  # Claude avatar (purple)
    │   └── gemini.svg                  # Gemini avatar (blue)
    └── favicon.ico
```

---

## SUPABASE SCHEMA

```sql
-- 001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table: each War Room conversation
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (project_type IN ('web', 'mobile', 'erp', 'general')),
  project_context TEXT, -- initial brief/context injected into agent prompts
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table: every utterance in the room
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('richard', 'claude', 'gemini', 'system', 'cross_check')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- tokens used, model version, latency_ms, etc.
  cross_check_status TEXT CHECK (cross_check_status IN ('pending', 'validated', 'contradiction_found', 'resolved')),
  cross_check_detail TEXT, -- explanation if contradiction found
  parent_message_id UUID REFERENCES messages(id), -- for threading/replies
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actas table: generated agreement documents
CREATE TABLE actas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  vision TEXT NOT NULL,          -- agreed vision/goal
  technical_validation TEXT NOT NULL, -- what was technically confirmed
  roadmap JSONB NOT NULL,        -- structured steps array
  consensus_notes TEXT,          -- any remaining disagreements or caveats
  contradictions_resolved JSONB DEFAULT '[]', -- array of resolved contradictions
  raw_markdown TEXT NOT NULL,    -- full acta as markdown
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCP tool executions log
CREATE TABLE mcp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,       -- e.g., 'github_read_file', 'vercel_deploy_status'
  input JSONB NOT NULL,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_messages_role ON messages(session_id, role);
CREATE INDEX idx_actas_session ON actas(session_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- RLS policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see messages from own sessions" ON messages
  FOR ALL USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users see actas from own sessions" ON actas
  FOR ALL USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users see mcp_logs from own sessions" ON mcp_logs
  FOR ALL USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

---

## ORCHESTRATOR LOGIC (src/lib/agents/orchestrator.ts)

This is the brain of the app. Implement this exact flow:

```
Richard sends message
       │
       ▼
┌──────────────────┐
│ PARSE DIRECTIVE   │ ← Check if message starts with @claude, @gemini, or @both
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ MODE DETECTION                        │
│                                       │
│ "@claude <msg>"  → DIRECT to Claude   │
│ "@gemini <msg>"  → DIRECT to Gemini   │
│ "@both <msg>"    → DEBATE mode        │
│ no prefix        → DEBATE mode        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ CONTEXT ASSEMBLY                      │
│                                       │
│ 1. System prompt (role-specific)      │
│ 2. Project context from session       │
│ 3. Last N messages (sliding window)   │
│ 4. Active contradictions (if any)     │
└──────┬───────────────────────────────┘
       │
       ▼
 ┌─────┴─────┐
 │           │
 DIRECT    DEBATE
 │           │
 ▼           ▼
[Call 1     [Call Agent A (first responder)
 agent]      │
 │           ▼
 │          Stream response to UI
 │           │
 │           ▼
 │          CROSS-CHECK: Send Agent A's response
 │          + original question to Agent B
 │           │
 │           ▼
 │          Agent B responds with either:
 │          ✅ "VALIDATED" + their own addition
 │          ⚠️ "CONTRADICTION" + resolution proposal
 │           │
 │           ▼
 │          Stream Agent B's response to UI
 │          with cross-check badge
 │
 └─────┬─────┘
       │
       ▼
 [Save all messages to Supabase]
 [Update cross_check_status]
```

### DEBATE MODE — First Responder Selection

Alternate which agent goes first based on topic relevance:
- If Richard's message mentions: code, API, security, database, backend, deployment, MCP → **Claude first**
- If Richard's message mentions: UX, design, product, strategy, scaling, growth, architecture → **Gemini first**
- Default: **Alternate** based on who spoke last

---

## SYSTEM PROMPTS

### Claude — Engineer Chief (src/lib/prompts/claude-system.ts)

```typescript
export const CLAUDE_SYSTEM = (projectContext: string) => `
You are Claude, the Chief Systems Engineer in Richard's War Room.

## Your Role
- Technical execution: code architecture, security, performance, deployment
- You write actual code when discussing implementations, not pseudocode
- You validate feasibility of every proposal with concrete technical reasoning
- You have access to MCP tools (GitHub, Vercel) to verify real code and deployments

## Your Personality in the Room
- Direct, technical, no fluff
- When Gemini proposes something, you evaluate if it's technically sound
- If you find a flaw, you say it clearly and propose a fix
- You never just agree to be agreeable — you push for correctness

## Cross-Check Protocol
When responding after Gemini, you MUST:
1. First, state if you VALIDATE or find a CONTRADICTION with Gemini's proposal
2. If CONTRADICTION: explain the technical reason and propose a resolution
3. Then give your own technical contribution

## Project Context
${projectContext}

## Format Rules
- Use markdown for code blocks
- Be concise — this is a war room, not a lecture
- Label code with language and file path when relevant
- Costs, performance implications, and security risks must always be mentioned
`;
```

### Gemini — Product Strategist (src/lib/prompts/gemini-system.ts)

```typescript
export const GEMINI_SYSTEM = (projectContext: string) => `
You are Gemini, the Product Strategist & UX Architect in Richard's War Room.

## Your Role
- Product vision: user experience, scalability strategy, market positioning
- System architecture at the macro level (not line-by-line code)
- UX/UI recommendations with reasoning tied to business outcomes
- Identify scaling challenges before they become blockers

## Your Personality in the Room
- Strategic, forward-thinking, user-obsessed
- When Claude proposes a technical approach, you evaluate user impact
- If a technical decision hurts UX or scalability, you flag it
- You think in systems, not just features

## Cross-Check Protocol
When responding after Claude, you MUST:
1. First, state if you VALIDATE or find a CONTRADICTION with Claude's proposal
2. If CONTRADICTION: explain the strategic/UX reason and propose a resolution
3. Then give your own strategic contribution

## Project Context
${projectContext}

## Format Rules
- Use bullet points for recommendations
- Include "Impact" and "Risk" for each major recommendation
- Reference specific user flows when discussing UX
- Tie technical decisions to business outcomes
`;
```

---

## CROSS-CHECK IMPLEMENTATION (src/lib/agents/cross-checker.ts)

The cross-checker is NOT a separate AI call. It's a **prompt injection** into the second agent's context:

```typescript
export function buildCrossCheckContext(
  previousAgentResponse: string,
  previousAgentName: 'claude' | 'gemini'
): string {
  return `
## ⚠️ CROSS-CHECK REQUIRED
The following response was just given by ${previousAgentName === 'claude' ? 'Claude (Engineer)' : 'Gemini (Strategist)'}:

---
${previousAgentResponse}
---

Before giving your own response, you MUST:
1. Analyze the above for any contradictions with what has been previously agreed in this session
2. Start your response with one of:
   - "✅ VALIDATED — [brief reason]" if you agree
   - "⚠️ CONTRADICTION — [specific issue]" followed by "PROPOSED RESOLUTION: [your fix]"
3. Then provide your own contribution

Do NOT skip this step. Richard relies on cross-validation to make decisions.
`;
}
```

Parse the response to extract the cross-check status:

```typescript
export function parseCrossCheckStatus(response: string): {
  status: 'validated' | 'contradiction_found' | 'resolved';
  detail: string;
} {
  if (response.includes('✅ VALIDATED')) {
    const detail = response.match(/✅ VALIDATED\s*—?\s*(.*?)(?:\n|$)/)?.[1] || '';
    return { status: 'validated', detail };
  }
  if (response.includes('⚠️ CONTRADICTION')) {
    const detail = response.match(/⚠️ CONTRADICTION\s*—?\s*(.*?)(?:\n|PROPOSED)/s)?.[1] || '';
    return { status: 'contradiction_found', detail: detail.trim() };
  }
  return { status: 'validated', detail: 'Implicit agreement' };
}
```

---

## STREAMING IMPLEMENTATION (src/app/api/chat/route.ts)

Use Server-Sent Events for token-by-token streaming:

```typescript
// Pseudocode structure — implement with actual SDK calls

export async function POST(req: Request) {
  const { sessionId, message, targetAgent } = await req.json();

  // 1. Save Richard's message to DB
  // 2. Assemble context (system prompt + history + project context)
  // 3. Determine mode (direct vs debate) and first responder

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      if (mode === 'direct') {
        send('agent_start', { agent: targetAgent });
        // Stream from single agent
        // On complete: save to DB
        send('agent_complete', { agent: targetAgent, messageId });
      }

      if (mode === 'debate') {
        // --- FIRST RESPONDER ---
        send('agent_start', { agent: firstAgent });
        let firstResponse = '';
        // Stream tokens, accumulate firstResponse
        send('agent_complete', { agent: firstAgent, messageId: msg1Id });

        // --- CROSS-CHECK + SECOND RESPONDER ---
        send('cross_check_start', { agent: secondAgent });
        // Inject cross-check context + stream second agent
        send('agent_complete', { agent: secondAgent, messageId: msg2Id, crossCheck });
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## ACTA GENERATOR (src/lib/agents/acta-generator.ts)

When Richard clicks "Generar Acta", the system:

1. Fetches ALL messages from the session
2. Sends them to Claude (best at structured extraction) with this prompt:

```typescript
export const ACTA_PROMPT = `
You are generating a Technical Agreement Act ("Acta de Acuerdo Técnico") from a War Room session.

Analyze the entire conversation and produce a structured document with these sections:

## 1. VISIÓN ACORDADA
What was the agreed-upon goal or product vision? Synthesize from both agents.

## 2. DECISIONES TÉCNICAS VALIDADAS
List each technical decision that BOTH agents agreed on (cross-validated).
Format: "- [Decision]: [Proposed by] → [Validated by] — [Brief reasoning]"

## 3. CONTRADICCIONES RESUELTAS
List any contradictions that were found and how they were resolved.
Format: "- [Topic]: [Agent A said X] vs [Agent B said Y] → Resolution: [Z]"

## 4. CONTRADICCIONES PENDIENTES
Any unresolved disagreements that Richard needs to decide on.

## 5. HOJA DE RUTA TÉCNICA
Ordered list of implementation steps. Each step must include:
- What to build
- Estimated complexity (low/medium/high)
- Dependencies on other steps
- Which technologies/services to use

## 6. STACK FINAL CONFIRMADO
The definitive tech stack agreed upon.

## 7. RIESGOS IDENTIFICADOS
Technical and strategic risks mentioned during the session.

RULES:
- Do NOT invent information not discussed in the session
- If something was discussed but not concluded, put it in PENDING
- Use Spanish for section headers, English for technical terms
- Be concise — this is an executive document, not a transcript
`;
```

The output gets saved to the `actas` table with structured JSONB for the roadmap.

---

## MCP INTEGRATION (src/app/api/mcp/route.ts)

Claude can request tool executions during the conversation. Implement these MCP tools:

### Available Tools (Phase 1)
1. **github_read_file** — Read a file from a GitHub repo
2. **github_list_files** — List files in a directory
3. **github_search_code** — Search across repos
4. **vercel_deployment_status** — Check latest deployment
5. **supabase_schema_info** — Read current DB schema

### Tool Execution Flow
```
Claude's response includes: [MCP_TOOL: github_read_file {"repo": "rivaib/erp", "path": "src/app/page.tsx"}]
       │
       ▼
Frontend detects MCP_TOOL pattern
       │
       ▼
POST /api/mcp with tool name + params
       │
       ▼
Execute tool, return result
       │
       ▼
Inject result into Claude's context as a system message:
"[MCP_RESULT: github_read_file] <file contents>"
       │
       ▼
Claude continues response with real data
```

---

## UI SPECIFICATIONS

### Chat Room Layout (src/app/room/[sessionId]/page.tsx)

```
┌─────────────────────────────────────────────────────────┐
│ WAR ROOM — [Session Title]                    [⚙️] [📋] │
│ Project: [type badge]  Status: [active]                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Richard avatar] Richard              10:30 AM          │
│  ┌─────────────────────────────────────┐                │
│  │ Message content here...              │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  [Claude avatar] Claude ⚡ Engineer    10:30 AM          │
│  ┌─────────────────────────────────────┐                │
│  │ ✅ VALIDATED — Gemini's proposal... │ ← badge        │
│  │                                      │                │
│  │ Response content with ```code```     │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  [Gemini avatar] Gemini 🎯 Strategist  10:31 AM         │
│  ┌─────────────────────────────────────┐                │
│  │ ⚠️ CONTRADICTION — The proposed...  │ ← badge        │
│  │ PROPOSED RESOLUTION: Instead...      │                │
│  │                                      │                │
│  │ Strategic response content...        │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  💭 Claude is thinking...               ← streaming     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ [@Claude ▾] [@Gemini ▾] [@Both ▾]                       │
│ ┌─────────────────────────────────────────────┐ [Send]  │
│ │ Type your message...                         │         │
│ └─────────────────────────────────────────────┘         │
│                                                          │
│ [🤝 Generar Acta de Acuerdo]    [📊 Session Stats]      │
└─────────────────────────────────────────────────────────┘
```

### Color Coding
- **Richard:** Slate/gray bubbles, left-aligned
- **Claude:** Purple bubbles (#7C3AED), right side, engineer icon
- **Gemini:** Blue bubbles (#2563EB), right side, strategy icon
- **Cross-check validated:** Green border/badge
- **Cross-check contradiction:** Amber border/badge + warning icon
- **System messages:** Centered, muted text

### Message Bubble Features
- Markdown rendering (code blocks, lists, bold, etc.)
- Copy button on code blocks
- Expandable "thinking" section (optional: show raw stream vs collapsed)
- Token count + latency in metadata (hover to see)
- Cross-check status badge on every agent message

---

## ENV VARIABLES (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI APIs (direct, no middleware)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AI...

# MCP Tools
GITHUB_TOKEN=ghp_...
VERCEL_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## BUILD PHASES (Execute in Order)

### Phase 1: Foundation
- Initialize Next.js project with TypeScript
- Install all dependencies
- Set up Supabase schema (run migration)
- Configure Tailwind + shadcn/ui
- Create auth flow (login page + middleware)
- Build basic layout (header, sidebar, room page)

### Phase 2: Chat Core
- Implement Claude API wrapper with streaming
- Implement Gemini API wrapper with streaming
- Build orchestrator (mode detection, context assembly, first-responder logic)
- Create SSE streaming endpoint (`/api/chat`)
- Build ChatRoom component with real-time message rendering
- Build InputBar with @mention agent selection
- Connect to Supabase realtime for message persistence

### Phase 3: Cross-Check System
- Implement cross-check context injection
- Build response parser for VALIDATED/CONTRADICTION extraction
- Add CrossCheckBadge component
- Store cross-check results in messages table
- Visual indicators in chat UI (green/amber badges)

### Phase 4: Acta Generator
- Build ActaButton + modal flow
- Implement acta generation endpoint (`/api/acta`)
- Create structured acta parser (extract sections into JSONB)
- Build ActaPreview component with section rendering
- Add markdown export functionality
- Store actas in Supabase

### Phase 5: MCP Integration
- Build MCP tool execution proxy (`/api/mcp`)
- Implement GitHub tools (read file, list, search)
- Implement Vercel status tool
- Add tool detection parser in Claude's responses
- Build tool result injection flow
- Add MCP execution log UI indicator

### Phase 6: Session Management & History
- Build session list page with search/filter
- Session creation form (title, project type, context)
- Session archiving and status management
- Message history loading with pagination
- Session statistics (messages count, tokens used, contradictions found)

---

## DEPENDENCIES (package.json)

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "@google/generative-ai": "^0.21.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## CRITICAL RULES FOR THE AGENT

1. **Never mock API calls.** Use real Anthropic and Google AI SDK calls with streaming.
2. **Never use placeholder data.** If you can't implement something, leave a clear TODO with the exact specification.
3. **Always implement error handling.** API calls fail. Rate limits exist. Handle them gracefully.
4. **Streaming must work end-to-end.** From API response → SSE → React state → rendered tokens.
5. **Supabase RLS must be active.** Never bypass row-level security.
6. **Cross-check is mandatory in debate mode.** It's the core value proposition. Don't skip it.
7. **Mobile responsive.** Richard uses this on his phone too.
8. **Spanish UI labels, English technical terms.** Buttons and headers in Spanish, code and technical references in English.
9. **Dark mode by default.** This is a War Room, not a wellness app.
10. **Every message persisted immediately.** No messages lost on refresh.
