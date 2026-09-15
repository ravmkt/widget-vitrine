-- ==============================================================================
-- MIGRAÇÃO 0017: SEPARAR E-MAIL DO DONO (MASTER) DO E-MAIL DE ATENDIMENTO
-- + CRIAÇÃO DA TABELA AUDIT_LOGS
-- ==============================================================================

-- 1. Tabela audit_logs
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade,
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_store_id on public.audit_logs(store_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "master_audit_logs_select" on public.audit_logs;
create policy "master_audit_logs_select"
  on public.audit_logs for select
  using (public.is_super_admin());

drop policy if exists "master_audit_logs_insert" on public.audit_logs;
create policy "master_audit_logs_insert"
  on public.audit_logs for insert
  with check (public.is_super_admin());

grant select, insert on public.audit_logs to authenticated;

-- 2. Novo campo: e-mail do dono (contato Master), separado do contact_email (atendimento)
alter table public.store_settings
  add column if not exists owner_contact_email text;

alter table public.stores
  add column if not exists owner_contact_email text;

-- 3. Atualizar RPC get_master_stores_list para usar owner_contact_email (fallback pro auth email)
drop function if exists public.get_master_stores_list(text, text, int, int) cascade;
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
  contact_email text,
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
    -- owner_email agora prioriza o e-mail cadastrado nas Configurações da loja
    coalesce(ss.owner_contact_email, s.owner_contact_email, p.email, 'Não identificado') as owner_email,
    ss.contact_email,
    coalesce(sub.plan_name, 'Sem plano') as plan_name,
    coalesce(sub.status, 'nenhum') as subscription_status,
    sub.current_period_end,
    (select count(*)::bigint from public.videos v where v.store_id = s.id) as videos_count,
    coalesce(uc.views_count, 0)::bigint as month_views
  from public.stores s
  left join public.profiles p on p.user_id = s.owner_user_id
  left join public.store_settings ss on ss.store_id = s.id
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
      or ss.owner_contact_email ilike '%' || p_search || '%'
    )
    and (p_status is null or sub.status = p_status)
  order by s.created_at desc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.get_master_stores_list(text, text, int, int) to authenticated;
