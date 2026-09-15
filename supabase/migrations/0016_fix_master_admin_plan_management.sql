-- ==============================================================================
-- MIGRAÇÃO 0016: CORREÇÃO DEFINITIVA DO GERENCIAMENTO DE PLANOS NO MASTER ADMIN
-- ==============================================================================

-- 1. Corrigir RPC get_master_dashboard_stats para ler planos e receita corretamente
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
      -- Estimativa de receita com base nos planos ativos
      select coalesce(sum(
        case 
          when lower(plan_name) like '%scale%' then 297.00
          when lower(plan_name) like '%pro%' then 147.00
          when lower(plan_name) like '%starter%' then 67.00
          else 0.00
        end
      ), 0)::numeric
      from public.subscriptions
      where status = 'active'
    ) as total_revenue;
end;
$$;

-- 2. Corrigir RPC get_master_stores_list para ler sb.plan_name diretamente
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
    select sb.plan_name, sb.status, sb.current_period_end
    from public.subscriptions sb
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

-- 3. Nova RPC atômica: admin_set_store_plan
create or replace function public.admin_set_store_plan(
  p_store_id uuid,
  p_plan_name text,
  p_status text,
  p_duration_months int default 1
)
returns json
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_end timestamptz;
  v_formatted_plan text;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado: Requer privilégios de Super Admin.';
  end if;

  -- Normalizar nome do plano
  if lower(p_plan_name) in ('starter', 'pro', 'scale') then
    v_formatted_plan := initcap(lower(p_plan_name));
  else
    v_formatted_plan := coalesce(p_plan_name, 'Pro');
  end if;

  -- Calcular data fim
  v_end := v_now + (coalesce(p_duration_months, 1) || ' months')::interval;

  -- Validar status permitido pela check constraint
  if p_status not in ('trialing', 'active', 'past_due', 'canceled') then
    p_status := 'active';
  end if;

  -- Inserir / Atualizar assinatura
  insert into public.subscriptions (
    store_id,
    plan_name,
    status,
    current_period_start,
    current_period_end,
    created_at
  )
  values (
    p_store_id,
    v_formatted_plan,
    p_status,
    v_now,
    v_end,
    v_now
  );

  return json_build_object(
    'success', true,
    'store_id', p_store_id,
    'plan_name', v_formatted_plan,
    'status', p_status,
    'current_period_end', v_end
  );
end;
$$;

grant execute on function public.admin_set_store_plan(uuid, text, text, int) to authenticated;
grant execute on function public.get_master_dashboard_stats() to authenticated;
grant execute on function public.get_master_stores_list(text, text, int, int) to authenticated;
