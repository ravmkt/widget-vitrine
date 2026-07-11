-- Pre-RLS tenant integrity migration
-- Do not enable RLS or create policies here.

alter table public.videos add column if not exists store_id uuid;
alter table public.stories add column if not exists store_id uuid;
alter table public.products add column if not exists store_id uuid;
alter table public.appearances add column if not exists store_id uuid;
alter table public.sizing_models add column if not exists store_id uuid;
alter table public.comments add column if not exists store_id uuid;
alter table public.metrics add column if not exists store_id uuid;
alter table public.story_videos add column if not exists store_id uuid;
alter table public.story_products add column if not exists store_id uuid;
alter table public.display_locations add column if not exists store_id uuid;
alter table public.page_rules add column if not exists store_id uuid;
alter table public.general_settings add column if not exists store_id uuid;
alter table public.subscriptions add column if not exists store_id uuid;
alter table public.usage_counters add column if not exists store_id uuid;

update public.story_videos sv
set store_id = s.store_id
from public.stories s
where sv.story_id = s.id
  and sv.store_id is null;

update public.story_products sp
set store_id = s.store_id
from public.stories s
where sp.story_id = s.id
  and sp.store_id is null;

update public.display_locations dl
set store_id = s.store_id
from public.stories s
where dl.story_id = s.id
  and dl.store_id is null;

update public.page_rules pr
set store_id = s.store_id
from public.stories s
where pr.story_id = s.id
  and pr.store_id is null;

update public.comments c
set store_id = s.store_id
from public.stories s
where c.story_id = s.id
  and c.store_id is null;

update public.comments c
set store_id = v.store_id
from public.videos v
where c.story_id is null
  and c.video_id = v.id
  and c.store_id is null;

update public.metrics m
set store_id = s.store_id
from public.stories s
where m.story_id = s.id
  and m.store_id is null;

update public.metrics m
set store_id = v.store_id
from public.videos v
where m.store_id is null
  and m.video_id = v.id;

update public.metrics m
set store_id = p.store_id
from public.products p
where m.store_id is null
  and m.product_id = p.id;

create index if not exists idx_videos_store_id on public.videos(store_id);
create index if not exists idx_stories_store_id on public.stories(store_id);
create index if not exists idx_products_store_id on public.products(store_id);
create index if not exists idx_appearances_store_id on public.appearances(store_id);
create index if not exists idx_sizing_models_store_id on public.sizing_models(store_id);
create index if not exists idx_comments_store_id on public.comments(store_id);
create index if not exists idx_metrics_store_id on public.metrics(store_id);
create index if not exists idx_story_videos_store_id on public.story_videos(store_id);
create index if not exists idx_story_products_store_id on public.story_products(store_id);
create index if not exists idx_display_locations_store_id on public.display_locations(store_id);
create index if not exists idx_page_rules_store_id on public.page_rules(store_id);
create index if not exists idx_general_settings_store_id on public.general_settings(store_id);
create index if not exists idx_subscriptions_store_id on public.subscriptions(store_id);
create index if not exists idx_usage_counters_store_id on public.usage_counters(store_id);

create index if not exists idx_story_videos_store_story on public.story_videos(store_id, story_id);
create index if not exists idx_story_products_store_story on public.story_products(store_id, story_id);
create index if not exists idx_display_locations_store_story on public.display_locations(store_id, story_id);
create index if not exists idx_page_rules_store_story on public.page_rules(store_id, story_id);
create index if not exists idx_comments_store_story on public.comments(store_id, story_id);
create index if not exists idx_comments_store_video on public.comments(store_id, video_id);
create index if not exists idx_metrics_store_created_at on public.metrics(store_id, created_at);
create index if not exists idx_metrics_store_video on public.metrics(store_id, video_id);
create index if not exists idx_metrics_store_story on public.metrics(store_id, story_id);

create index if not exists idx_products_store_active on public.products(store_id, active);
create index if exists idx_videos_store_status on public.videos(store_id, status);
create index if exists idx_stories_store_active on public.stories(store_id, active);

-- Preflight: detect remaining NULL store_id values before enforcing NOT NULL.
do $$
begin
  if exists (select 1 from public.videos where store_id is null) then raise exception 'videos still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.stories where store_id is null) then raise exception 'stories still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.products where store_id is null) then raise exception 'products still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.appearances where store_id is null) then raise exception 'appearances still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.sizing_models where store_id is null) then raise exception 'sizing_models still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.comments where store_id is null) then raise exception 'comments still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.metrics where store_id is null) then raise exception 'metrics still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.story_videos where store_id is null) then raise exception 'story_videos still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.story_products where store_id is null) then raise exception 'story_products still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.display_locations where store_id is null) then raise exception 'display_locations still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.page_rules where store_id is null) then raise exception 'page_rules still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.general_settings where store_id is null) then raise exception 'general_settings still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.subscriptions where store_id is null) then raise exception 'subscriptions still has rows without store_id after backfill'; end if;
  if exists (select 1 from public.usage_counters where store_id is null) then raise exception 'usage_counters still has rows without store_id after backfill'; end if;
end $$;

-- Preflight: detect orphaned relations before adding/depending on FKs.
do $$
begin
  if exists (select 1 from public.story_videos sv left join public.stories s on s.id = sv.story_id where sv.story_id is not null and s.id is null) then raise exception 'story_videos has orphaned story_id rows'; end if;
  if exists (select 1 from public.story_videos sv left join public.videos v on v.id = sv.video_id where sv.video_id is not null and v.id is null) then raise exception 'story_videos has orphaned video_id rows'; end if;
  if exists (select 1 from public.story_products sp left join public.stories s on s.id = sp.story_id where sp.story_id is not null and s.id is null) then raise exception 'story_products has orphaned story_id rows'; end if;
  if exists (select 1 from public.story_products sp left join public.products p on p.id = sp.product_id where sp.product_id is not null and p.id is null) then raise exception 'story_products has orphaned product_id rows'; end if;
  if exists (select 1 from public.display_locations dl left join public.stories s on s.id = dl.story_id where dl.story_id is not null and s.id is null) then raise exception 'display_locations has orphaned story_id rows'; end if;
  if exists (select 1 from public.page_rules pr left join public.stories s on s.id = pr.story_id where pr.story_id is not null and s.id is null) then raise exception 'page_rules has orphaned story_id rows'; end if;
  if exists (select 1 from public.comments c left join public.stories s on s.id = c.story_id where c.story_id is not null and s.id is null) then raise exception 'comments has orphaned story_id rows'; end if;
  if exists (select 1 from public.comments c left join public.videos v on v.id = c.video_id where c.video_id is not null and v.id is null) then raise exception 'comments has orphaned video_id rows'; end if;
  if exists (select 1 from public.metrics m left join public.stories s on s.id = m.story_id where m.story_id is not null and s.id is null) then raise exception 'metrics has orphaned story_id rows'; end if;
  if exists (select 1 from public.metrics m left join public.videos v on v.id = m.video_id where m.video_id is not null and v.id is null) then raise exception 'metrics has orphaned video_id rows'; end if;
  if exists (select 1 from public.metrics m left join public.products p on p.id = m.product_id where m.product_id is not null and p.id is null) then raise exception 'metrics has orphaned product_id rows'; end if;
end $$;

-- Preflight: detect duplicates before unique constraints.
do $$
begin
  if exists (
    select 1
    from public.store_members
    group by store_id, user_id
    having count(*) > 1
  ) then raise exception 'store_members has duplicate (store_id, user_id) rows'; end if;

  if exists (
    select 1
    from public.general_settings
    group by store_id
    having count(*) > 1
  ) then raise exception 'general_settings has duplicate store_id rows'; end if;

  if exists (
    select 1
    from public.usage_counters
    group by store_id, month
    having count(*) > 1
  ) then raise exception 'usage_counters has duplicate (store_id, month) rows'; end if;
end $$;

alter table public.store_members
  drop constraint if exists store_members_store_id_user_id_key;

alter table public.store_members
  add constraint store_members_store_id_user_id_key unique (store_id, user_id);

alter table public.general_settings
  drop constraint if exists general_settings_store_id_key;

alter table public.general_settings
  add constraint general_settings_store_id_key unique (store_id);

alter table public.usage_counters
  drop constraint if exists usage_counters_store_id_month_key;

alter table public.usage_counters
  add constraint usage_counters_store_id_month_key unique (store_id, month);

do $$ begin
  alter table public.videos add constraint videos_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.stories add constraint stories_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.products add constraint products_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.appearances add constraint appearances_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sizing_models add constraint sizing_models_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.comments add constraint comments_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.metrics add constraint metrics_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.story_videos add constraint story_videos_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.story_products add constraint story_products_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.display_locations add constraint display_locations_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.page_rules add constraint page_rules_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.general_settings add constraint general_settings_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.subscriptions add constraint subscriptions_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.usage_counters add constraint usage_counters_store_id_fkey foreign key (store_id) references public.stores(id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.story_videos add constraint story_videos_story_id_fkey foreign key (story_id) references public.stories(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.story_videos add constraint story_videos_video_id_fkey foreign key (video_id) references public.videos(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.story_products add constraint story_products_story_id_fkey foreign key (story_id) references public.stories(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.story_products add constraint story_products_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.display_locations add constraint display_locations_story_id_fkey foreign key (story_id) references public.stories(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.page_rules add constraint page_rules_story_id_fkey foreign key (story_id) references public.stories(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.comments add constraint comments_story_id_fkey foreign key (story_id) references public.stories(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.comments add constraint comments_video_id_fkey foreign key (video_id) references public.videos(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.metrics add constraint metrics_story_id_fkey foreign key (story_id) references public.stories(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.metrics add constraint metrics_video_id_fkey foreign key (video_id) references public.videos(id);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.metrics add constraint metrics_product_id_fkey foreign key (product_id) references public.products(id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.videos alter column store_id set not null;
exception when others then raise exception 'videos still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.stories alter column store_id set not null;
exception when others then raise exception 'stories still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.products alter column store_id set not null;
exception when others then raise exception 'products still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.appearances alter column store_id set not null;
exception when others then raise exception 'appearances still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.sizing_models alter column store_id set not null;
exception when others then raise exception 'sizing_models still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.comments alter column store_id set not null;
exception when others then raise exception 'comments still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.metrics alter column store_id set not null;
exception when others then raise exception 'metrics still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.story_videos alter column store_id set not null;
exception when others then raise exception 'story_videos still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.story_products alter column store_id set not null;
exception when others then raise exception 'story_products still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.display_locations alter column store_id set not null;
exception when others then raise exception 'display_locations still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.page_rules alter column store_id set not null;
exception when others then raise exception 'page_rules still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.general_settings alter column store_id set not null;
exception when others then raise exception 'general_settings still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.subscriptions alter column store_id set not null;
exception when others then raise exception 'subscriptions still has rows without store_id after backfill'; end $$;
do $$ begin
  alter table public.usage_counters alter column store_id set not null;
exception when others then raise exception 'usage_counters still has rows without store_id after backfill'; end $$;
