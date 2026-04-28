-- ============================================================
-- FunnelManager — Project Members (multi-usuario)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS project_members (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID        REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT        DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- El dueño del proyecto puede gestionar miembros
CREATE POLICY "members_owner_manage" ON project_members
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Los miembros pueden ver su propia membresía
CREATE POLICY "members_self_read" ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- Actualizar RLS de projects para incluir miembros
DROP POLICY IF EXISTS "projects_owner" ON projects;

CREATE POLICY "projects_access" ON projects
  FOR ALL USING (
    user_id = auth.uid()
    OR
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- Actualizar RLS de nodos para incluir miembros
DROP POLICY IF EXISTS "nodes_owner" ON funnel_nodes;

CREATE POLICY "nodes_access" ON funnel_nodes
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Actualizar RLS de edges
DROP POLICY IF EXISTS "edges_owner" ON funnel_edges;

CREATE POLICY "edges_access" ON funnel_edges
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Actualizar RLS de tasks
DROP POLICY IF EXISTS "tasks_owner" ON node_tasks;

CREATE POLICY "tasks_access" ON node_tasks
  FOR ALL USING (
    node_id IN (
      SELECT fn.id FROM funnel_nodes fn
      JOIN projects p ON p.id = fn.project_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT fn.id FROM funnel_nodes fn
      JOIN project_members pm ON pm.project_id = fn.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Actualizar RLS de messages
DROP POLICY IF EXISTS "messages_owner" ON node_messages;

CREATE POLICY "messages_access" ON node_messages
  FOR ALL USING (
    node_id IN (
      SELECT fn.id FROM funnel_nodes fn
      JOIN projects p ON p.id = fn.project_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT fn.id FROM funnel_nodes fn
      JOIN project_members pm ON pm.project_id = fn.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Vista para ver usuarios de la plataforma (para el invite picker)
CREATE OR REPLACE VIEW public_users AS
  SELECT id, email FROM auth.users;

GRANT SELECT ON public_users TO authenticated;
