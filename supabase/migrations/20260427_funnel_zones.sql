-- Zonas arrastrables en el canvas de cada proyecto

create table if not exists funnel_zones (
  id          text        primary key,
  project_id  uuid        not null references projects(id) on delete cascade,
  label       text        not null default 'Nueva Zona',
  color       text        not null default '#7C3AED',
  position_x  float       not null default 60,
  position_y  float       not null default 60,
  width       float       not null default 360,
  height      float       not null default 260,
  created_at  timestamptz default now()
);

alter table funnel_zones enable row level security;

-- Owner del proyecto puede gestionar zonas
create policy "project_owner_zones" on funnel_zones for all
  using (
    exists (
      select 1 from projects
      where id = funnel_zones.project_id
        and user_id = auth.uid()
    )
  );

-- Miembros con acceso editor pueden gestionar zonas
create policy "project_editor_zones" on funnel_zones for all
  using (
    exists (
      select 1 from project_members
      where project_id = funnel_zones.project_id
        and user_id = auth.uid()
        and role in ('editor', 'owner')
    )
  );

-- Viewers solo pueden leer
create policy "project_viewer_zones_select" on funnel_zones for select
  using (
    exists (
      select 1 from project_members
      where project_id = funnel_zones.project_id
        and user_id = auth.uid()
    )
  );
