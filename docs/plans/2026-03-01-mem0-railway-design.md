# mem0 Railway Deployment — Design Document
**Date:** 2026-03-01
**Status:** Approved
**Scope:** Deploy mem0 memory server to Railway (cloud) and add intelligent memory gate for JESSY

---

## Problem Statement

mem0 currently runs via Docker on the developer's local PC. Since Vercel serverless functions resolve `localhost` to Vercel's own servers (not the dev PC), **memory has never worked in production**. All `memorize()` and `retrieve()` calls silently fail via the `try/catch` best-effort pattern.

Additionally, during Facebook Ads campaigns, JESSY receives ~150 leads/day. Storing memory for every lead would saturate Supabase in ~2 months and create noise in the memory system (irrelevant leads mixed with real patients).

---

## Architecture Decision

### Option Selected: Railway mem0 + Supabase pgvector (Option A)

```
Any device → Vercel (agents) → Railway mem0 FastAPI → Supabase pgvector
```

**What deploys to Railway:** Only the mem0 FastAPI service (`services/mem0/`)
**What does NOT deploy:** No Neo4j, no separate Railway Postgres
**Vector storage:** Supabase existing project (pgvector extension) — no new DB costs
**Cost:** ~$5/month (Railway mem0 service only)

---

## Memory Gate Design

### Business Context

| Event | Patient status | Memory |
|---|---|---|
| Lead writes for the first time | Lead | ❌ No memory |
| Lead pays 50 Bs reservation | Lead (might no-show) | ❌ No memory |
| Patient attends + pays 200 Bs session | ✅ Real client | ✅ Memory active |
| No-show (loses reservation) | Remains lead | ❌ No memory |

**Volume context:**
- Campaigns: ~150 leads/day (never enter memory)
- Real patients: 2-5 new/day, Mon-Sat (~50-125/month)
- Sustainable capacity: ~20,000 memories on Supabase free tier (~2+ years at current volume)

### Gate Implementation

**Supabase schema change:**
```sql
ALTER TABLE contacts ADD COLUMN is_patient BOOLEAN DEFAULT false;
CREATE EXTENSION IF NOT EXISTS vector;
```

**Gate logic in `agent-service.ts`:** Before every `retrieve()` and `memorize()` call, check `contacts.is_patient` for the given `contactId`. If false → skip memory operations entirely.

**Activation mechanism:** `is_patient = true` is set when full session payment (200 Bs) is confirmed. The trigger hook is left as a stub to be connected to APEX/CRM payment flow in a future phase. Non-technical staff (secretary, sales agent) never touch Supabase directly.

**Current behavior during stub phase:** Gate defaults to `false` for all contacts → memory is disabled system-wide until CRM payment flow activates it. This is intentional — better to have no memory than noisy memory.

---

## Technical Configuration

### Railway Service

```
Railway Project: omni-mem0
└── mem0-api
    ├── services/mem0/main.py   ← updated config (no Neo4j)
    ├── services/mem0/requirements.txt
    └── services/mem0/Dockerfile
```

### mem0 Configuration (main.py)

```python
config = {
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "url": os.environ["DATABASE_URL"]  # Supabase direct connection
        }
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "api_key": os.environ["OPENAI_API_KEY"]
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": os.environ["OPENAI_API_KEY"]
        }
    }
}
```

### Environment Variables

**Railway (mem0 service):**
| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:[password]@db.hzboawlugswyqinqxpay.supabase.co:5432/postgres` |
| `OPENAI_API_KEY` | existing key |

**Vercel (update):**
| Variable | Value |
|---|---|
| `MEM0_BASE_URL` | `https://[service-name].up.railway.app` |

### Local Development (docker-compose)

Simplify to single service — remove `omni_neo4j` and `omni_postgres`. `omni_mem0` points to Supabase too, making local and production environments identical.

---

## Out of Scope (Future Phases)

- APEX tool to trigger `is_patient = true` on full payment confirmation
- Patient source tracking (TikTok, referrals, Facebook, Instagram) — deferred, requires scraping infrastructure
- Neo4j graph relationships — deferred indefinitely (overkill for current scale)
- Vision support in ERP agents (separate plan)

---

## Success Criteria

1. mem0 FastAPI running 24/7 on Railway, accessible via public HTTPS URL
2. Vercel agents can successfully call Railway mem0 from serverless functions
3. Memory gate blocks memorize/retrieve for contacts where `is_patient = false`
4. Local development continues to work via simplified docker-compose
5. No regression in agent response behavior (memory failures remain non-blocking)
