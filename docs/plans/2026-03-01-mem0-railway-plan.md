# mem0 Railway Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy mem0 memory server to Railway (cloud) using Supabase as pgvector backend, and add a memory gate in agent-service.ts to prevent lead saturation.

**Architecture:** Single Railway service (mem0 FastAPI from `services/mem0/`) connects to existing Supabase project for vector storage. Memory gate in `agent-service.ts` skips retrieve/memorize for Telegram contacts until CRM integration activates the `is_patient` flag per contact.

**Tech Stack:** Python 3.12, mem0ai 1.0.4, FastAPI, Supabase pgvector, Railway (Docker deployment), Next.js/TypeScript agent-service.

---

## Task 1: Supabase prerequisites

**Files:**
- No code files — Supabase SQL Editor only

**Step 1: Run in Supabase SQL Editor**

Go to https://supabase.com → your project → SQL Editor → run:

```sql
-- Enable pgvector (probably already active, safe to re-run)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add memory gate flag to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_patient BOOLEAN DEFAULT false;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contacts' AND column_name = 'is_patient';
```

**Expected output:** One row showing `is_patient | boolean | false`

**Step 2: Get Supabase direct connection string**

Go to Supabase → Project Settings → Database → Connection string → "URI" tab → copy the **direct connection** (NOT pooler):
```
postgresql://postgres:[YOUR-PASSWORD]@db.hzboawlugswyqinqxpay.supabase.co:5432/postgres
```

Save this — you'll need it in Tasks 6 and 8.

---

## Task 2: Update services/mem0/main.py — remove Neo4j

**Files:**
- Modify: `services/mem0/main.py:35-71`

**Step 1: Replace DEFAULT_CONFIG**

Replace the entire `DEFAULT_CONFIG` block (lines 35-71) with:

```python
# ── Modification C: DEFAULT_CONFIG with pgvector → Supabase ──────────────────
DEFAULT_CONFIG = {
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "url": os.environ.get("DATABASE_URL"),  # Supabase direct connection
            "collection_name": "memories",
            "embedding_model_dims": 1536,
        }
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "api_key": os.environ.get("OPENAI_API_KEY", ""),
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": os.environ.get("OPENAI_API_KEY", ""),
        }
    },
    "history_db_path": os.environ.get("HISTORY_DB_PATH", "/app/history/history.db"),
}
```

Also update the comment on line 6 to:
```python
#   C) DEFAULT_CONFIG uses pgvector → Supabase (env-driven, no Neo4j)
```

**Step 2: Verify no Neo4j references remain**

```bash
grep -n "neo4j\|graph_store\|NEO4J\|POSTGRES_HOST\|POSTGRES_PORT\|POSTGRES_DB\|POSTGRES_USER\|POSTGRES_PASSWORD" services/mem0/main.py
```

Expected output: empty (no matches)

**Step 3: Commit**

```bash
git add services/mem0/main.py
git commit -m "feat(mem0): switch to Supabase pgvector, remove Neo4j graph store"
```

---

## Task 3: Update services/mem0/requirements.txt — remove Neo4j deps

**Files:**
- Modify: `services/mem0/requirements.txt`

**Step 1: Replace file contents**

```
mem0ai==1.0.4
uvicorn==0.34.0
fastapi==0.115.0
python-dotenv==1.0.1
psycopg2-binary==2.9.10
rank-bm25==0.2.2
```

Removed: `neo4j==5.27.0` and `langchain-neo4j==0.4.0`

**Step 2: Commit**

```bash
git add services/mem0/requirements.txt
git commit -m "chore(mem0): remove neo4j dependencies"
```

---

## Task 4: Simplify docker-compose.yml for local dev

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Replace entire file**

```yaml
# docker-compose.yml — OmniSentinel local services stack
# Run: docker-compose --env-file .env.docker up -d
# Requires: Docker Desktop installed, .env.docker file filled in
# Note: mem0 uses Supabase as pgvector backend (same as production)

version: "3.9"

services:

  # ── mem0 Memory Server ────────────────────────────────────────────────────
  mem0:
    build: ./services/mem0
    container_name: omni_mem0
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
      HISTORY_DB_PATH: /app/history/history.db
    volumes:
      - mem0_history:/app/history
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  mem0_history:
```

**Step 2: Update .env.docker**

Add `DATABASE_URL` and remove Neo4j/Postgres vars. Your `.env.docker` should contain:

```bash
OPENAI_API_KEY=sk-proj-...     # your actual key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.hzboawlugswyqinqxpay.supabase.co:5432/postgres
```

**Step 3: Test local build**

```bash
docker compose --env-file .env.docker build mem0
```

Expected: build completes without errors

**Step 4: Start and verify**

```bash
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
```

Expected: `omni_mem0` shows `Up (healthy)`

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

**Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "chore(docker): simplify compose to single mem0 service using Supabase pgvector"
```

---

## Task 5: Add memory gate in agent-service.ts

**Files:**
- Modify: `src/lib/ai/agent-service.ts:110-144`

**Step 1: Add gate helper after imports (before core processing section)**

Add this function after line 79 (`export { addMessage as addMessageToConversation };`):

```typescript
/**
 * Memory gate — returns true only for confirmed patients.
 * Currently stubbed as false for all Telegram contacts (contactId present).
 * Web chat (no contactId) always gets memory (staff interactions).
 * TODO: wire to contacts.is_patient via CRM payment confirmation (Phase 2).
 */
async function shouldMemorize(contactId: string | undefined): Promise<boolean> {
    if (!contactId) return true; // web chat / staff — always memorize
    return false; // Telegram contacts: gated until CRM activates is_patient flag
}
```

**Step 2: Apply gate in processMessageWithAgent**

In `processMessageWithAgent`, replace lines 112-120 (the retrieve block) with:

```typescript
    // 4b. Retrieve memory context — gated by patient status
    const memUserId = contactId ?? conversationId;
    const memEnabled = await shouldMemorize(contactId);

    const [privateCtx, sharedCtx] = memEnabled
        ? await Promise.all([
            retrieve(agent.name, userMessage, memUserId),
            retrieveShared(userMessage, memUserId),
          ])
        : ['', ''];
```

Replace lines 142-144 (the memorize call) with:

```typescript
    // 6b. Memorize — gated by patient status (fire-and-forget)
    if (memEnabled) {
        memorize(agent.name, userMessage, response, memUserId).catch(
            (err) => console.error('[Memory] memorize error:', err)
        );
    }
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 4: Commit**

```bash
git add src/lib/ai/agent-service.ts
git commit -m "feat(memory): add patient gate — skip retrieve/memorize for ungated Telegram contacts"
```

---

## Task 6: Add Railway configuration file

**Files:**
- Create: `services/mem0/railway.json`

**Step 1: Create railway.json**

```json
{
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
    },
    "deploy": {
        "healthcheckPath": "/health",
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 3
    }
}
```

**Step 2: Commit**

```bash
git add services/mem0/railway.json
git commit -m "chore(railway): add Railway deployment config for mem0 service"
```

---

## Task 7: Deploy to Railway (manual steps)

This task is done in the Railway web UI, not in code.

**Step 1: Create Railway account**

Go to https://railway.app → Sign up with GitHub

**Step 2: Create new project**

- Click "New Project"
- Select "Deploy from GitHub repo"
- Authorize Railway and select `RIVAIB/OmniSentinelAO-Suite` (or your repo name)

**Step 3: Configure the service**

In Railway service settings:
- **Root Directory:** `services/mem0`
- **Builder:** Dockerfile (auto-detected)
- **Service name:** `mem0-api`

**Step 4: Add environment variables**

In Railway → service → Variables tab, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.hzboawlugswyqinqxpay.supabase.co:5432/postgres` |
| `OPENAI_API_KEY` | your OpenAI API key |
| `HISTORY_DB_PATH` | `/app/history/history.db` |

**Step 5: Deploy**

Click "Deploy" and wait for build to complete (~3-5 minutes)

**Step 6: Get public URL**

In Railway → service → Settings → Networking → Generate Domain
You'll get a URL like: `https://mem0-api-production-xxxx.up.railway.app`

**Step 7: Verify deployment**

```bash
curl https://mem0-api-production-xxxx.up.railway.app/health
```

Expected: `{"status":"ok"}`

---

## Task 8: Update environment variables

**Files:**
- Modify: `.env.local`
- Update in Vercel dashboard

**Step 1: Update .env.local**

Replace `MEM0_BASE_URL` line:
```bash
MEM0_BASE_URL=https://mem0-api-production-xxxx.up.railway.app
```

**Step 2: Update Vercel**

Go to Vercel → Project → Settings → Environment Variables:
- Find `MEM0_BASE_URL` → Edit → set to Railway public URL
- If it doesn't exist, add it

**Step 3: Redeploy Vercel**

```bash
vercel --prod
```

Or trigger redeploy from Vercel dashboard (Settings → Environment Variables → Redeploy).

---

## Task 9: End-to-end verification

**Step 1: Test mem0 search from Vercel**

From a Telegram chat with any ERP agent, send a message. Then check Railway logs:

Railway → service → Logs tab → should show mem0 FastAPI receiving POST /search request.

**Step 2: Verify gate is working**

Send a test message via Telegram. In Railway logs you should NOT see any /memories POST (because gate is false for Telegram). If you see it, the gate is not applied.

**Step 3: Verify web chat still memorizes**

In the web app, open an agent chat and send a message. Railway logs SHOULD show /memories POST (web chat has no contactId → gate returns true).

**Step 4: Test mem0 health from Next.js**

In browser devtools console on your site:
```javascript
fetch('/api/telegram/webhook') // just to confirm routing works
```

Or add a temporary test endpoint if needed.

---

## Task 10: Commit and push

**Step 1: Final TypeScript check**

```bash
npx tsc --noEmit
```

**Step 2: Push to GitHub**

```bash
git push origin main
```

**Step 3: Update MEMORY.md**

Add to project memory:
- Railway URL for mem0
- Memory gate status (stub, Telegram gated, web always enabled)
- is_patient column added to contacts

---

## Future Phase: CRM Memory Gate Activation

When APEX has full payment flow (Phase 2), add to `shouldMemorize()`:

```typescript
async function shouldMemorize(contactId: string | undefined): Promise<boolean> {
    if (!contactId) return true;
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('contacts')
        .select('is_patient')
        .eq('telegram_id', contactId)  // field TBD per contacts schema
        .single();
    return (data as any)?.is_patient === true;
}
```

APEX tool to activate: `UPDATE contacts SET is_patient = true WHERE telegram_id = $1`
Triggered when: full session payment (200 Bs) confirmed by staff.
