# Agent Expansion Design — OmniSentinel 8 Agents Full Build
**Date:** 2026-03-01
**Status:** Approved
**Scope:** mem0 seed expansion + multimedia Telegram + CLAUD/GEM capabilities

---

## Context

After the mem0 Docker smoke test (2026-03-01), only 3 of the 8 agents had seed memories (JESSY, APEX, CLAWDIO). NEXUS, AXIOM, and FORGE had zero. Additionally, CLAUD and GEM — the two external review agents — were bare LLM calls with no system prompts, no tools, no multimedia support.

This document captures the approved design for the full 8-agent buildout.

---

## Agent Taxonomy

### Group A — 6 ERP-Connected Agents (powered by Claude)
| Agent | Domain | Bot |
|-------|---------|-----|
| CLAWDIO | Orchestrator — routes and coordinates | @Clawdio_Omni_Bot |
| JESSY | CRM — patients, appointments, H2H | @Jessy_CRM_Bot |
| NEXUS | Marketing — leads, campaigns, Meta Ads | @Nexus_Mtk_Bot |
| APEX | Finance — payments, invoices, BigCapital | @Apex_FIN_Bot |
| AXIOM | CEO — strategy, KPIs, executive reports | @Axiom_CEO_Bot |
| FORGE | Systems — GitHub, Vercel, n8n, infra | @Forge_SIS_Bot |

All use `processMessage()` → Claude + mem0 memory injection.

### Group B — 2 External Review Agents (separate Telegram group)
| Agent | Model | Capability |
|-------|-------|------------|
| CLAUD | Claude Sonnet 4.6 | GitHub total access + Anthropic web search + vision |
| GEM | Gemini 2.5 Flash | Google Search grounding + vision + video |

CLAUD and GEM are **not** connected to the ERP. They operate in a shared Telegram group for technology review and system protocol analysis. They respond **simultaneously** — each independently answers the user's query from their perspective.

---

## Block 1 — mem0 Seed Expansion

### Design
File: `src/app/api/memory/seed/route.ts`

Expand `SEED_MEMORIES` from 9 entries to ~40, covering all 8 agents with domain-specific knowledge.

### ERP Agent Seed Content

**JESSY (CRM)**
- Patient schema (already exists)
- Appointments schema (already exists)
- H2H protocol: patient intake flow, escalation rules
- Relationship with APEX (payment conflicts), NEXUS (lead conversion)

**NEXUS (Marketing)**
- Lead schema: id, source, name, phone, email, status, campaign_id, conversion_date
- Campaign schema: id, platform (Meta/Email/WhatsApp), budget, start/end, ROI
- Lead lifecycle: captured → contacted → qualified → converted/lost
- Integration: Meta Ads API, email campaigns, WhatsApp Business
- KPIs: CPL (cost per lead), conversion rate, ROAS

**APEX (Finance)**
- Payments schema (already exists)
- Contracts schema (already exists)
- BigCapital integration: invoice creation, bank feed reconciliation
- Financial KPIs: MRR, ARR, collection rate, overdue rate
- Relationship with JESSY: blocks/flags appointments for overdue patients

**AXIOM (CEO)**
- Role: strategic decision-making, executive-level reporting
- KPI dashboard: patients total, monthly revenue, satisfaction rate, occupancy
- Forecasting: trend analysis, capacity planning
- Access level: reads from all agents — never writes to ERP directly
- Relationship: receives weekly summaries from CLAWDIO

**FORGE (Systems)**
- Tech stack: Next.js 16, Tailwind v4, Supabase, Anthropic SDK, Docker
- Deployment: Vercel (production), local Docker (mem0 stack)
- GitHub access: OmniSentinelAO-Suite repo, RIVAIB org
- n8n: automation orchestration, webhook management
- Role: generates scripts, configs, troubleshoots infra — does NOT deploy to production without human approval

**CLAWDIO (Orchestrator)** — expanded
- Already knows all agents; add: mission priority matrix, escalation rules
- Knows CLAUD and GEM exist as external reviewers (separate group)
- Weekly report format: active missions, agent status, blockers

### External Agent Seed Content (separate `user_id: 'ext-scaffold'`)

**CLAUD**
- Role: senior technical reviewer with read access to all RIVAIB GitHub repos
- Capabilities: code review, PR analysis, commit history, architecture review
- Relationship with GEM: GEM provides market/tech context, CLAUD provides code reality
- Does NOT have access to ERP patient data — operates externally

**GEM**
- Role: technology advisor with real-time internet search via Google
- Capabilities: tech news, library comparisons, security advisories, best practices
- Provides context TO CLAUD for informed code reviews
- Does NOT have access to ERP patient data — operates externally

---

## Block 2 — CLAUD: GitHub Total + Anthropic Web Search

### System Prompt
```
You are CLAUD, the senior technical reviewer for the RIVAIB ERP system.
You have full read access to all GitHub repositories in the RIVAIB organization.
You also have access to real-time web search.

Your role:
- Review code, PRs, commits, and architecture
- Identify security vulnerabilities, technical debt, and improvement opportunities
- Provide informed technical opinions grounded in actual code, not assumptions
- Collaborate with GEM (Gemini) who provides internet tech context

Always ground your responses in real data from GitHub or web search before answering.
```

### Tool-Use Loop (Claude tool_use API)
```
Tools available to CLAUD:
  1. web_search (type: "web_search_20250305") — Anthropic native
  2. github_list_repos(username) — list all repos for owner
  3. github_read_file(owner, repo, path) — read file content
  4. github_list_files(owner, repo, path) — list directory
  5. github_list_commits(owner, repo, limit) — recent commits
  6. github_list_prs(owner, repo, state) — open/closed PRs
```

Implementation: `src/lib/telegram/claud.ts` — new module.
Pattern: tool-use loop (call Claude → if tool_use → execute → append result → call Claude again → repeat until text response).

### Multimedia
- Photos: download from Telegram → base64 → pass as `image` block in Claude messages
- Video: respond with "No proceso video. GEM puede analizar videos."
- Audio (voice): already handled by Whisper → text

---

## Block 3 — GEM: Google Search Grounding + Vision + Video

### System Prompt
```
You are GEM, the technology intelligence advisor for the RIVAIB ERP project.
You have real-time access to the internet via Google Search.

Your role:
- Provide current technology recommendations and market context
- Research security advisories, library updates, and best practices
- Advise CLAUD on technology choices with up-to-date information
- Analyze images and videos shared in the group

Always cite your sources. Use web search before answering tech questions.
```

### Google Search Grounding
```ts
tools: [{ googleSearch: {} }]
```
Native to `gemini-2.5-flash`. No additional API key required.

### Multimedia
- Photos: inline base64 as `inlineData` part in Gemini message
- Video: inline base64 as `inlineData` with MIME type `video/mp4`
- Audio (voice): Whisper → text (same pipeline as other bots)

Implementation: Upgrade existing `callGemini()` in `processor.ts` or extract to `src/lib/telegram/gem.ts`.

---

## Block 4 — Telegram Multimedia (All Agents)

### Updated Message Type Handling in `processUpdate()`

```
TelegramUpdate.message
  ├── .text     → string, route directly ✓ existing
  ├── .voice    → Whisper transcription ✓ existing
  ├── .photo[]  → download largest photo → base64 → agent with vision
  └── .video    → download video → base64 → GEM only
                  ERP agents (Claude): reply "No proceso video, usa @Gem_ERP_Bot"
```

### Photo Download Flow
1. Take `msg.photo[msg.photo.length - 1]` (largest resolution)
2. Call `GET https://api.telegram.org/bot{token}/getFile?file_id={file_id}`
3. Download from `https://api.telegram.org/file/bot{token}/{file_path}`
4. Convert to base64
5. Pass to agent alongside any caption text as the user message

### Video Download Flow (GEM only)
1. Same download steps as photo
2. GEM: pass as `inlineData` with `mimeType: "video/mp4"`
3. Other agents: skip download, return the "use @Gem_ERP_Bot" message

### Caption Handling
If `msg.photo` or `msg.video` has a `.caption`, include it as the text prompt alongside the media.

---

## Architecture Impact

### Files to Create
- `src/lib/telegram/claud.ts` — CLAUD handler with tool-use loop
- `src/lib/telegram/gem.ts` — GEM handler with search + vision + video

### Files to Modify
- `src/app/api/memory/seed/route.ts` — expand SEED_MEMORIES to ~40 entries
- `src/lib/telegram/processor.ts` — add photo/video handling, call new claud.ts / gem.ts
- `src/lib/mcp/executor.ts` — add github_list_repos, github_list_commits, github_list_prs

### No schema changes required
- mem0 seed uses existing `/memories` endpoint
- No new Supabase tables needed
- No new env vars needed (GITHUB_TOKEN already present)

---

## Success Criteria

1. `POST /api/memory/seed` returns 40+ memories seeded, all agents present in summary
2. Sending a photo to @Jessy_CRM_Bot → JESSY describes the image content
3. Sending a photo to @Claude_ERP_Bot → CLAUD analyzes it + can reference GitHub
4. Sending a video to @Gem_ERP_Bot → GEM describes the video
5. Sending a video to @Apex_FIN_Bot → APEX responds "No proceso video, usa @Gem_ERP_Bot"
6. Asking CLAUD "¿cuántos repos tiene RIVAIB en GitHub?" → CLAUD calls github_list_repos and answers with real data
7. Asking GEM "¿cuál es el framework de IA más popular en 2026?" → GEM searches and cites sources
