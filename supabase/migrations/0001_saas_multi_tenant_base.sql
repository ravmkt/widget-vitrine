create extension if not exists "pgcrypto";

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  name text not null default 'Minha loja',
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_name text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  month text not null,
  videos_count integer not null default 0,
  views_count integer not null default 0,
  users_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, month)
);

do $$
begin
  if to_regclass('public.videos') is not null then
    alter table public.videos add column if not exists store_id uuid;
  end if;

  if to_regclass('public.stories') is not null then
    alter table public.stories add column if not exists store_id uuid;
  end if;

  if to_regclass('public.products') is not null then
    alter table public.products add column if not exists store_id uuid;
  end if;

  if to_regclass('public.comments') is not null then
    alter table public.comments add column if not exists store_id uuid;
  end if;

  if to_regclass('public.metrics') is not null then
    alter table public.metrics add column if not exists store_id uuid;
  end if;

  if to_regclass('public.appearances') is not null then
    alter table public.appearances add column if not exists store_id uuid;
  end if;

  if to_regclass('public.display_locations') is not null then
    alter table public.display_locations add column if not exists store_id uuid;
  end if;

  if to_regclass('public.page_rules') is not null then
    alter table public.page_rules add column if not exists store_id uuid;
  end if;

  if to_regclass('public.story_products') is not null then
    alter table public.story_products add column if not exists store_id uuid;
  end if;

  if to_regclass('public.story_videos') is not null then
    alter table public.story_videos add column if not exists store_id uuid;
  end if;

  if to_regclass('public.sizing_models') is not null then
    alter table public.sizing_models add column if not exists store_id uuid;
  end if;
end $$;

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_store_members_store_id on public.store_members(store_id);
create index if not exists idx_store_members_user_id on public.store_members(user_id);
create index if not exists idx_subscriptions_store_id on public.subscriptions(store_id);
create index if not exists idx_usage_counters_store_id on public.usage_counters(store_id);
