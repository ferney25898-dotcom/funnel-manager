-- ============================================================
-- FunnelManager — Schema v1
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  client      TEXT        DEFAULT '',
  status      TEXT        DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'blocked')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Funnel Nodes
CREATE TABLE IF NOT EXISTS funnel_nodes (
  id             TEXT        PRIMARY KEY,
  project_id     UUID        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title          TEXT        NOT NULL,
  subtitle       TEXT        DEFAULT '',
  icon           TEXT        DEFAULT '📦',
  role           TEXT        NOT NULL DEFAULT 'ghl',
  owner_initials TEXT        DEFAULT '',
  owner_color    TEXT        DEFAULT '#7C3AED',
  has_unread     BOOLEAN     DEFAULT FALSE,
  position_x     FLOAT       DEFAULT 0,
  position_y     FLOAT       DEFAULT 160,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Node Tasks
CREATE TABLE IF NOT EXISTS node_tasks (
  id        TEXT    PRIMARY KEY,
  node_id   TEXT    REFERENCES funnel_nodes(id) ON DELETE CASCADE NOT NULL,
  text      TEXT    NOT NULL,
  done      BOOLEAN DEFAULT FALSE,
  ord       INTEGER DEFAULT 0
);

-- Node Messages
CREATE TABLE IF NOT EXISTS node_messages (
  id             TEXT        PRIMARY KEY,
  node_id        TEXT        REFERENCES funnel_nodes(id) ON DELETE CASCADE NOT NULL,
  user_id        TEXT        DEFAULT '',
  user_name      TEXT        DEFAULT '',
  user_initials  TEXT        DEFAULT '',
  user_color     TEXT        DEFAULT '#7C3AED',
  text           TEXT        NOT NULL,
  is_me          BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Funnel Edges
CREATE TABLE IF NOT EXISTS funnel_edges (
  id            TEXT    PRIMARY KEY,
  project_id    UUID    REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  source        TEXT    NOT NULL,
  target        TEXT    NOT NULL,
  source_handle TEXT    DEFAULT NULL,
  target_handle TEXT    DEFAULT NULL,
  animated      BOOLEAN DEFAULT FALSE,
  dashed        BOOLEAN DEFAULT FALSE,
  label         TEXT    DEFAULT NULL
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_nodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_edges  ENABLE ROW LEVEL SECURITY;

-- Projects: solo el dueño
CREATE POLICY "projects_owner" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Nodes: via proyecto del dueño
CREATE POLICY "nodes_owner" ON funnel_nodes
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Tasks: via nodo del dueño
CREATE POLICY "tasks_owner" ON node_tasks
  FOR ALL USING (
    node_id IN (
      SELECT fn.id FROM funnel_nodes fn
      JOIN projects p ON p.id = fn.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Messages: via nodo del dueño
CREATE POLICY "messages_owner" ON node_messages
  FOR ALL USING (
    node_id IN (
      SELECT fn.id FROM funnel_nodes fn
      JOIN projects p ON p.id = fn.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Edges: via proyecto del dueño
CREATE POLICY "edges_owner" ON funnel_edges
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- Auto-update updated_at en projects
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
