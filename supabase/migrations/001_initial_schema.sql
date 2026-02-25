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
