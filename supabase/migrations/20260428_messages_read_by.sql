-- ============================================================
-- TAREA-04: Mensajes no leídos por usuario (read_by[])
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Agregar columna read_by a node_messages
ALTER TABLE node_messages
  ADD COLUMN IF NOT EXISTS read_by TEXT[] DEFAULT '{}';

-- 2. Función para marcar mensajes como leídos por un usuario
--    Solo marca los mensajes de OTROS usuarios (no los propios)
CREATE OR REPLACE FUNCTION mark_node_messages_read(
  p_node_id  TEXT,
  p_user_id  TEXT
)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE node_messages
  SET    read_by = array_append(read_by, p_user_id)
  WHERE  node_id  = p_node_id
    AND  user_id != p_user_id
    AND  NOT (p_user_id = ANY(read_by));
$$;
