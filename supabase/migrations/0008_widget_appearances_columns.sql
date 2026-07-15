begin;

-- =========================================================
-- Tabela widget_appearances: estrutura completa para o widget público
-- =========================================================

-- Cria a tabela se não existir
create table if not exists public.widget_appearances (
  store_id uuid primary key default gen_random_uuid(),
  status text default 'active',
  active boolean default true,

  floating_position text default 'bottom-right',
  floating_shape text default 'portrait',

  floating_width integer default 85,
  floating_height integer default 151,

  floating_border_radius integer default 12,
  floating_border_width integer default 0,
  floating_border_color text default '#0094EB',

  floating_object_fit text default 'cover',
  floating_z_index integer default 2147483647,

  floating_show_play_button boolean default true,
  floating_draggable boolean default false,

  floating_top integer default 20,
  floating_bottom integer default 20,
  floating_side integer default 20,

  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- =========================================================
-- Adiciona colunas que possam estar faltando (se a tabela já existia)
-- =========================================================

do $$
begin
  -- floating_height
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_height'
  ) then
    alter table public.widget_appearances add column floating_height integer default 151;
  end if;

  -- floating_border_radius
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_border_radius'
  ) then
    alter table public.widget_appearances add column floating_border_radius integer default 12;
  end if;

  -- floating_border_width
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_border_width'
  ) then
    alter table public.widget_appearances add column floating_border_width integer default 0;
  end if;

  -- floating_border_color
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_border_color'
  ) then
    alter table public.widget_appearances add column floating_border_color text default '#0094EB';
  end if;

  -- floating_object_fit
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_object_fit'
  ) then
    alter table public.widget_appearances add column floating_object_fit text default 'cover';
  end if;

  -- floating_z_index
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_z_index'
  ) then
    alter table public.widget_appearances add column floating_z_index integer default 2147483647;
  end if;

  -- floating_show_play_button
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_show_play_button'
  ) then
    alter table public.widget_appearances add column floating_show_play_button boolean default true;
  end if;

  -- floating_draggable
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_draggable'
  ) then
    alter table public.widget_appearances add column floating_draggable boolean default false;
  end if;

  -- active
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'active'
  ) then
    alter table public.widget_appearances add column active boolean default true;
  end if;

  -- status
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'status'
  ) then
    alter table public.widget_appearances add column status text default 'active';
  end if;

  -- floating_top
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_top'
  ) then
    alter table public.widget_appearances add column floating_top integer default 20;
  end if;

  -- floating_bottom
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_bottom'
  ) then
    alter table public.widget_appearances add column floating_bottom integer default 20;
  end if;

  -- floating_side
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_side'
  ) then
    alter table public.widget_appearances add column floating_side integer default 20;
  end if;

  -- floating_position
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_position'
  ) then
    alter table public.widget_appearances add column floating_position text default 'bottom-right';
  end if;

  -- floating_shape
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_shape'
  ) then
    alter table public.widget_appearances add column floating_shape text default 'portrait';
  end if;

  -- floating_width
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'floating_width'
  ) then
    alter table public.widget_appearances add column floating_width integer default 85;
  end if;

  -- updated_at
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'updated_at'
  ) then
    alter table public.widget_appearances add column updated_at timestamptz default now();
  end if;

  -- created_at
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'created_at'
  ) then
    alter table public.widget_appearances add column created_at timestamptz default now();
  end if;

  -- store_id
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'widget_appearances'
      and column_name = 'store_id'
  ) then
    alter table public.widget_appearances add column store_id uuid;
  end if;
end $$;

-- =========================================================
-- Garante que store_id tem constraint NOT NULL + unique
-- =========================================================

-- Garante a unique constraint em store_id para o upsert (onConflict)
create unique index if not exists widget_appearances_store_id_unique
  on public.widget_appearances(store_id);

-- =========================================================
-- RLS: permite leitura pública (anon) + escrita de membros autenticados
-- =========================================================

alter table public.widget_appearances enable row level security;

drop policy if exists "widget_appearances_public_read" on public.widget_appearances;
drop policy if exists "widget_appearances_dashboard_upsert" on public.widget_appearances;
drop policy if exists "widget_appearances_dashboard_select" on public.widget_appearances;
drop policy if exists "widget_appearances_dashboard_update" on public.widget_appearances;
drop policy if exists "widget_appearances_dashboard_delete" on public.widget_appearances;

-- Leitura pública (widget anônimo)
create policy "widget_appearances_public_read"
  on public.widget_appearances
  for select
  to anon, authenticated
  using (
    active = true and status = 'active'
  );

-- Escrita/upsert apenas para membros autenticados (admin/owner)
create policy "widget_appearances_dashboard_upsert"
  on public.widget_appearances
  for insert
  to authenticated
  with check (
    public.is_store_admin(widget_appearances.store_id)
    or public.is_store_owner(widget_appearances.store_id)
  );

create policy "widget_appearances_dashboard_update"
  on public.widget_appearances
  for update
  to authenticated
  using (
    public.is_store_admin(widget_appearances.store_id)
    or public.is_store_owner(widget_appearances.store_id)
  )
  with check (
    public.is_store_admin(widget_appearances.store_id)
    or public.is_store_owner(widget_appearances.store_id)
  );

commit;
