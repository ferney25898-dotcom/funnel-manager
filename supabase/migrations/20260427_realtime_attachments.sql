-- ── Realtime publication ─────────────────────────────────────────
-- Permite que Supabase Realtime transmita cambios de estas tablas
alter publication supabase_realtime add table node_messages;
alter publication supabase_realtime add table node_tasks;

-- ── Adjuntos en mensajes ─────────────────────────────────────────
alter table node_messages
  add column if not exists file_url  text,
  add column if not exists file_type text;

-- ── Storage bucket para adjuntos ─────────────────────────────────
-- Crear en Supabase Dashboard → Storage → New bucket:
--   Name: node-attachments
--   Public: true
--   Allowed MIME types: image/*, application/pdf, application/msword,
--     application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Política de storage (ejecutar en SQL Editor):
insert into storage.buckets (id, name, public)
  values ('node-attachments', 'node-attachments', true)
  on conflict (id) do nothing;

create policy "Authed users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'node-attachments');

create policy "Public can read attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'node-attachments');

create policy "Users can delete own attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'node-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
