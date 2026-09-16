create or replace function public.get_master_dashboard_stats()
returns table (
  total_stores bigint,
  active_stores bigint,
  total_views bigint,
  total_revenue numeric
)
language plpgsql
security definer
as $function$
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
      select count(distinct sb.store_id)::bigint
      from public.subscriptions sb
      where sb.is_current = true
        and sb.status in ('active', 'trialing', 'lifetime')
    ) as active_stores,
    (
      select coalesce(sum(uc.views_count), 0)::bigint
      from public.usage_counters uc
      where uc.month = curr_month
    ) as total_views,
    (
      select coalesce(sum(pl.price_cents), 0)::numeric / 100
      from public.subscriptions sb
      join public.plans pl on pl.id = sb.plan_id
      where sb.is_current = true and sb.status = 'active'
    ) as total_revenue;
end;
$function$;

grant execute on function public.get_master_dashboard_stats() to authenticated;
