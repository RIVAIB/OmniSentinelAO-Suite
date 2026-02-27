-- ============================================================
-- OmniSentinelAO-Suite — Migration 003
-- Adds Mission Control tables to War Room base
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ENUM TYPES (Mission Control)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE agent_type AS ENUM ('orchestrator', 'specialist', 'utility');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mission_status AS ENUM ('proposed', 'pending', 'running', 'paused', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trigger_type AS ENUM ('manual', 'scheduled', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE step_status AS ENUM ('pending', 'running', 'done', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('whatsapp', 'telegram', 'webchat', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('active', 'closed', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents
-- The AI agents that power the system (CLAWDIO, JESSY, etc.)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  type        agent_type   NOT NULL DEFAULT 'utility',
  config      JSONB        NOT NULL DEFAULT '{}',
  status      agent_status NOT NULL DEFAULT 'inactive',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents (status);
CREATE INDEX IF NOT EXISTS idx_agents_type   ON agents (type);

-- ─────────────────────────────────────────────────────────────
-- TABLE: missions
-- Automated tasks that agents execute
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS missions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255)    NOT NULL,
  description  TEXT,
  status       mission_status  NOT NULL DEFAULT 'proposed',
  priority     SMALLINT        NOT NULL DEFAULT 5
                 CHECK (priority BETWEEN 1 AND 10),
  trigger_type trigger_type    NOT NULL DEFAULT 'manual',
  metadata     JSONB           NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_status   ON missions (status);
CREATE INDEX IF NOT EXISTS idx_missions_priority ON missions (priority DESC);

-- ─────────────────────────────────────────────────────────────
-- TABLE: mission_steps
-- Individual steps within a mission, assigned to agents
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mission_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id   UUID        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  agent_id     UUID        NOT NULL REFERENCES agents(id)   ON DELETE RESTRICT,
  step_order   INT         NOT NULL DEFAULT 0,
  status       step_status NOT NULL DEFAULT 'pending',
  input        JSONB       NOT NULL DEFAULT '{}',
  output       JSONB,
  error        TEXT,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (mission_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_steps_mission ON mission_steps (mission_id);
CREATE INDEX IF NOT EXISTS idx_steps_agent   ON mission_steps (agent_id);
CREATE INDEX IF NOT EXISTS idx_steps_status  ON mission_steps (status);

-- ─────────────────────────────────────────────────────────────
-- TABLE: conversations
-- Patient/contact conversations across channels
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     channel_type        NOT NULL,
  contact_id  VARCHAR(255)        NOT NULL,
  agent_id    UUID                REFERENCES agents(id) ON DELETE SET NULL,
  messages    JSONB[]             NOT NULL DEFAULT '{}',
  status      conversation_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_agent   ON conversations (agent_id);
CREATE INDEX IF NOT EXISTS idx_conv_status  ON conversations (status);
CREATE INDEX IF NOT EXISTS idx_conv_contact ON conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_conv_channel ON conversations (channel);

-- ─────────────────────────────────────────────────────────────
-- TABLE: memories
-- Agent memory store (key-value with importance scoring)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  contact_id  VARCHAR(255),
  key         VARCHAR(255) NOT NULL,
  value       JSONB        NOT NULL DEFAULT '{}',
  importance  SMALLINT     NOT NULL DEFAULT 5
                CHECK (importance BETWEEN 1 AND 10),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, contact_id, key)
);

CREATE INDEX IF NOT EXISTS idx_mem_agent   ON memories (agent_id);
CREATE INDEX IF NOT EXISTS idx_mem_contact ON memories (contact_id);
CREATE INDEX IF NOT EXISTS idx_mem_expires ON memories (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- TABLE: events
-- Live feed of system events (heartbeats, agent actions, etc.)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(50) NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}',
  agent_id   UUID        REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);
CREATE INDEX IF NOT EXISTS idx_events_time ON events (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS: auto-update updated_at
-- (reuses update_updated_at() from migration 002)
-- ─────────────────────────────────────────────────────────────

CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────

ALTER TABLE agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;

-- Authenticated users get full access (internal dashboard tool)
CREATE POLICY "auth_full_agents"        ON agents        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_missions"      ON missions      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_steps"         ON mission_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_conversations" ON conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_memories"      ON memories      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_events"        ON events        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ─────────────────────────────────────────────────────────────
-- SEED: Initial agents
-- ─────────────────────────────────────────────────────────────

INSERT INTO agents (name, type, status, config) VALUES
  ('CLAWDIO', 'orchestrator', 'active',
   '{"description": "Central orchestrator — routes messages and coordinates all agent workflows", "capabilities": ["routing", "planning", "delegation", "context-management"]}'),
  ('JESSY', 'specialist', 'active',
   '{"description": "WhatsApp bot — patient conversations, appointments, H2H protocol", "capabilities": ["messaging", "appointment-booking", "patient-intake", "reminders"], "protocol": "H2H", "channel": "whatsapp"}'),
  ('NEXUS', 'specialist', 'active',
   '{"description": "Marketing specialist — campaigns, lead capture, remarketing", "capabilities": ["meta-ads", "lead-capture", "remarketing", "content"]}'),
  ('APEX', 'specialist', 'inactive',
   '{"description": "Finance specialist — billing, payments, financial reports", "capabilities": ["invoicing", "payment-tracking", "reports"]}'),
  ('AXIOM', 'specialist', 'inactive',
   '{"description": "Strategic intelligence — KPIs, analytics, business decisions", "capabilities": ["analytics", "kpi-tracking", "strategic-reports"]}'),
  ('FORGE', 'utility', 'active',
   '{"description": "Development agent — code generation, deployments, technical tasks", "capabilities": ["code-gen", "deployment", "debugging"]}')
ON CONFLICT DO NOTHING;
