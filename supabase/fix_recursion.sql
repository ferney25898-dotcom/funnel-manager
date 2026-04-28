-- ============================================================
-- Fix: infinite recursion en policies de projects ↔ project_members
-- Ejecutar en: Supabase Dashboard → SQL Editor (NUEVA query)
-- ============================================================

-- 1. Drop todas las policies problemáticas
DROP POLICY IF EXISTS "projects_access"        ON projects;
DROP POLICY IF EXISTS "projects_owner"         ON projects;
DROP POLICY IF EXISTS "nodes_access"           ON funnel_nodes;
DROP POLICY IF EXISTS "nodes_owner"            ON funnel_nodes;
DROP POLICY IF EXISTS "edges_access"           ON funnel_edges;
DROP POLICY IF EXISTS "edges_owner"            ON funnel_edges;
DROP POLICY IF EXISTS "tasks_access"           ON node_tasks;
DROP POLICY IF EXISTS "tasks_owner"            ON node_tasks;
DROP POLICY IF EXISTS "messages_access"        ON node_messages;
DROP POLICY IF EXISTS "messages_owner"         ON node_messages;
DROP POLICY IF EXISTS "members_owner_manage"   ON project_members;
DROP POLICY IF EXISTS "members_self_read"      ON project_members;

-- 2. Función SECURITY DEFINER que rompe la recursión
CREATE OR REPLACE FUNCTION user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p WHERE p.id = p_project_id AND p.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_owns_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p WHERE p.id = p_project_id AND p.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Recrear policies usando las funciones
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    user_id = auth.uid()
    OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- Members
CREATE POLICY "members_owner_manage" ON project_members
  FOR ALL USING (user_owns_project(project_id))
  WITH CHECK (user_owns_project(project_id));

CREATE POLICY "members_self_read" ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- Nodes
CREATE POLICY "nodes_access" ON funnel_nodes
  FOR ALL USING (user_can_access_project(project_id))
  WITH CHECK (user_can_access_project(project_id));

-- Edges
CREATE POLICY "edges_access" ON funnel_edges
  FOR ALL USING (user_can_access_project(project_id))
  WITH CHECK (user_can_access_project(project_id));

-- Tasks (via node)
CREATE POLICY "tasks_access" ON node_tasks
  FOR ALL USING (
    node_id IN (
      SELECT id FROM funnel_nodes WHERE user_can_access_project(project_id)
    )
  )
  WITH CHECK (
    node_id IN (
      SELECT id FROM funnel_nodes WHERE user_can_access_project(project_id)
    )
  );

-- Messages (via node)
CREATE POLICY "messages_access" ON node_messages
  FOR ALL USING (
    node_id IN (
      SELECT id FROM funnel_nodes WHERE user_can_access_project(project_id)
    )
  )
  WITH CHECK (
    node_id IN (
      SELECT id FROM funnel_nodes WHERE user_can_access_project(project_id)
    )
  );
