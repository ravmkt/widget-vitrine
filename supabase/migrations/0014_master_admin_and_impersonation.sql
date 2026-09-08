-- 1. Adicionar campo is_super_admin na tabela de perfis
alter table public.profiles add column if not exists is_super_admin boolean not null default false;

-- 2. Definir os e-mails de Super Admin do Rodrigo
update public.profiles 
set is_super_admin = true 
where email in ('rodrigoavicennte@gmail.com', 'ravmkt1979@gmail.com');

-- 3. Função segura para checar se o usuário atual é Super Admin (executada com credenciais de sistema)
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_super_admin from public.profiles where user_id = auth.uid() limit 1),
    false
  );
$$;

-- 4. Políticas RLS: Super Admin pode ver e gerenciar TUDO
drop policy if exists "super_admin_stores_all" on public.stores;
create policy "super_admin_stores_all" on public.stores
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "super_admin_profiles_all" on public.profiles;
create policy "super_admin_profiles_all" on public.profiles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "super_admin_subscriptions_all" on public.subscriptions;
create policy "super_admin_subscriptions_all" on public.subscriptions
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "super_admin_usage_counters_all" on public.usage_counters;
create policy "super_admin_usage_counters_all" on public.usage_counters
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "super_admin_videos_all" on public.videos;
create policy "super_admin_videos_all" on public.videos
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "super_admin_stories_all" on public.stories;
create policy "super_admin_stories_all" on public.stories
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 5. RPC: Estatísticas Consolidadas do Master Dashboard
create or replace function public.get_master_overview_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  total_stores int;
  active_subscriptions int;
  trialing_subscriptions int;
  past_due_subscriptions int;
  total_videos int;
  current_month text := to_char(now(), 'YYYY-MM');
  total_views bigint;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado: Requer privilégios de Super Admin.';
  end if;

  select count(*) into total_stores from public.stores;
  select count(*) into active_subscriptions from public.subscriptions where status = 'active';
  select count(*) into trialing_subscriptions from public.subscriptions where status = 'trialing';
  select count(*) into past_due_subscriptions from public.subscriptions where status = 'past_due';
  select count(*) into total_videos from public.videos;
  select coalesce(sum(views_count), 0) into total_views from public.usage_counters where month = current_month;

  return jsonb_build_object(
    'total_stores', total_stores,
    'active_subscriptions', active_subscriptions,
    'trialing_subscriptions', trialing_subscriptions,
    'past_due_subscriptions', past_due_subscriptions,
    'total_videos', total_videos,
    'current_month_views', total_views
  );
end;
$$;

-- 6. RPC: Lista de Lojas com dados consolidados para a tabela Master
drop function if exists public.get_master_stores_list(text, text, int, int) cascade;
drop function if exists public.get_master_stores_list cascade;
create or replace function public.get_master_stores_list(
  p_search text default null,
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  store_id uuid,
  store_name text,
  store_slug text,
  created_at timestamptz,
  owner_name text,
  owner_email text,
  plan_name text,
  subscription_status text,
  current_period_end timestamptz,
  videos_count bigint,
  month_views bigint
)
language plpgsql
security definer
as $$
declare
  curr_month text := to_char(now(), 'YYYY-MM');
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado: Requer privilégios de Super Admin.';
  end if;

  return query
  select 
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.created_at,
    coalesce(p.name, 'Não identificado') as owner_name,
    coalesce(p.email, 'Não identificado') as owner_email,
    coalesce(sub.plan_name, 'Sem plano') as plan_name,
    coalesce(sub.status, 'nenhum') as subscription_status,
    sub.current_period_end,
    (select count(*) from public.videos v where v.store_id = s.id) as videos_count,
    coalesce(uc.views_count, 0)::bigint as month_views
  from public.stores s
  left join public.profiles p on p.user_id = s.owner_user_id
  left join lateral (
    select pl.name as plan_name, sb.status, sb.current_period_end
    from public.subscriptions sb
    left join public.plans pl on pl.id = sb.plan_id
    where sb.store_id = s.id
    order by sb.created_at desc
    limit 1
  ) sub on true
  left join public.usage_counters uc on uc.store_id = s.id and uc.month = curr_month
  where 
    (p_search is null or s.name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%')
    and (p_status is null or sub.status = p_status)
  order by s.created_at desc
  limit p_limit offset p_offset;
end;
$$;

