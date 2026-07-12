create extension if not exists "pgcrypto";

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  story_id uuid,
  video_id uuid,
  product_id uuid,
  event_type text not null check (
    event_type in (
      'view',
      'play',
      'pause',
      'click',
      'cta_click',
      'product_click',
      'whatsapp_click',
      'like',
      'share',
      'comment',
      'close',
      'conversion'
    )
  ),
  page_url text,
  device_type text,
  browser text,
  referrer text,
  created_at timestamptz not null default now()
);

alter table public.metrics
  add constraint if not exists metrics_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;

alter table public.metrics
  add constraint if not exists metrics_story_id_fkey foreign key (story_id) references public.stories(id) on delete set null;

alter table public.metrics
  add constraint if not exists metrics_video_id_fkey foreign key (video_id) references public.videos(id) on delete set null;

alter table public.metrics
  add constraint if not exists metrics_product_id_fkey foreign key (product_id) references public.products(id) on delete set null;

alter table public.metrics enable row level security;

drop policy if exists "metrics_select_store_members" on public.metrics;
drop policy if exists "metrics_insert_public" on public.metrics;
drop policy if exists "metrics_update_none" on public.metrics;
drop policy if exists "metrics_delete_none" on public.metrics;

create policy "metrics_select_store_members"
  on public.metrics
  for select
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_insert_public"
  on public.metrics
  for insert
  with check (
    store_id is not null
    and exists (
      select 1
      from public.stores s
      where s.id = metrics.store_id
    )
  );

create policy "metrics_update_none"
  on public.metrics
  for update
  using (false)
  with check (false);

create policy "metrics_delete_none"
  on public.metrics
  for delete
  using (false);

create index if not exists metrics_store_id_created_at_idx on public.metrics (store_id, created_at);
create index if not exists metrics_video_id_created_at_idx on public.metrics (video_id, created_at);
create index if not exists metrics_story_id_created_at_idx on public.metrics (story_id, created_at);
create index if not exists metrics_event_type_idx on public.metrics (event_type);
