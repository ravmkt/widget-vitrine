alter table public.profiles
  add column if not exists user_id uuid unique,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists created_at timestamptz not null default now();

alter table public.store_members
  add column if not exists store_id uuid,
  add column if not exists user_id uuid,
  add column if not exists role text,
  add column if not exists created_at timestamptz not null default now();

alter table public.subscriptions
  add column if not exists store_id uuid,
  add column if not exists plan_name text,
  add column if not exists status text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table public.usage_counters
  add column if not exists store_id uuid,
  add column if not exists month text,
  add column if not exists videos_count integer not null default 0,
  add column if not exists views_count integer not null default 0,
  add column if not exists users_count integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
