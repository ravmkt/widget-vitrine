-- 1. Restringe Super Admin exclusivamente para ravmkt1979@gmail.com
update public.profiles
set is_super_admin = false;

update public.profiles
set is_super_admin = true
where lower(email) = 'ravmkt1979@gmail.com';

-- 2. Função de checagem do Super Admin
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

-- 3. RPC: get_master_dashboard_stats (com os campos exatos esperados pelo frontend)
create or replace function public.get_master_dashboard_stats()
returns table (
  total_stores bigint,
  active_stores bigint,
  total_views bigint,
  total_revenue numeric
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
    (select count(*)::bigint from public.stores) as total_stores,
    (
      select count(distinct store_id)::bigint 
      from public.subscriptions 
      where status in ('active', 'trialing')
    ) as active_stores,
    (
      select coalesce(sum(views_count), 0)::bigint 
      from public.usage_counters 
      where month = curr_month
    ) as total_views,
    (
      select coalesce(sum(p.price), 0)::numeric
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.status = 'active'
    ) as total_revenue;
end;
$$;

-- 4. RPC: get_master_stores_list com busca por nome, slug ou e-mail
create or replace function public.get_master_stores_list(
  p_search text default null,
  p_status text default null,
  p_limit int default 100,
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
    (select count(*)::bigint from public.videos v where v.store_id = s.id) as videos_count,
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
    (
      p_search is null 
      or s.name ilike '%' || p_search || '%' 
      or s.slug ilike '%' || p_search || '%' 
      or p.email ilike '%' || p_search || '%'
    )
    and (p_status is null or sub.status = p_status)
  order by s.created_at desc
  limit p_limit offset p_offset;
end;
$$;
