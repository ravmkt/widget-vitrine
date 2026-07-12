begin;

-- =========================================================
-- HELPERS
-- =========================================================

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
  );
$$;

create or replace function public.is_store_admin(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_store_owner(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
      and s.owner_user_id = auth.uid()
  );
$$;

create or replace function public.store_exists(target_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
  );
$$;

-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.stores enable row level security;
alter table public.store_members enable row level security;

-- =========================================================
-- STORES
-- =========================================================

drop policy if exists "stores_dashboard_select" on public.stores;
drop policy if exists "stores_dashboard_insert" on public.stores;
drop policy if exists "stores_dashboard_update" on public.stores;
drop policy if exists "stores_dashboard_delete" on public.stores;

drop policy if exists "Owners can delete their stores" on public.stores;
drop policy if exists "Owners can update their stores" on public.stores;
drop policy if exists "Users can create own stores" on public.stores;
drop policy if exists "Users can view stores they own or belong to" on public.stores;

create policy "stores_dashboard_select"
  on public.stores
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or public.is_store_member(stores.id)
  );

create policy "stores_dashboard_insert"
  on public.stores
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
  );

create policy "stores_dashboard_update"
  on public.stores
  for update
  to authenticated
  using (
    owner_user_id = auth.uid()
    or public.is_store_admin(stores.id)
  )
  with check (
    owner_user_id = auth.uid()
    or public.is_store_admin(stores.id)
  );

create policy "stores_dashboard_delete"
  on public.stores
  for delete
  to authenticated
  using (
    owner_user_id = auth.uid()
  );

-- =========================================================
-- STORE_MEMBERS
-- =========================================================

drop policy if exists "store_members_dashboard_select" on public.store_members;
drop policy if exists "store_members_dashboard_insert" on public.store_members;
drop policy if exists "store_members_dashboard_update" on public.store_members;
drop policy if exists "store_members_dashboard_delete" on public.store_members;

drop policy if exists "Store owners can delete members" on public.store_members;
drop policy if exists "Store owners can insert members" on public.store_members;
drop policy if exists "Store owners can update members" on public.store_members;
drop policy if exists "Users can view store memberships they have access to" on public.store_members;

create policy "store_members_dashboard_select"
  on public.store_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_store_admin(store_members.store_id)
    or public.is_store_owner(store_members.store_id)
  );

create policy "store_members_dashboard_insert"
  on public.store_members
  for insert
  to authenticated
  with check (
    (
      public.is_store_admin(store_members.store_id)
      and store_members.user_id <> auth.uid()
      and store_members.role in ('admin', 'member')
    )
    or (
      public.is_store_owner(store_members.store_id)
      and store_members.user_id = auth.uid()
      and store_members.role = 'owner'
    )
  );

create policy "store_members_dashboard_update"
  on public.store_members
  for update
  to authenticated
  using (
    public.is_store_owner(store_members.store_id)
    or (
      public.is_store_admin(store_members.store_id)
      and store_members.role <> 'owner'
    )
  )
  with check (
    public.is_store_owner(store_members.store_id)
    or (
      public.is_store_admin(store_members.store_id)
      and store_members.role in ('admin', 'member')
    )
  );

create policy "store_members_dashboard_delete"
  on public.store_members
  for delete
  to authenticated
  using (
    public.is_store_owner(store_members.store_id)
    or (
      public.is_store_admin(store_members.store_id)
      and store_members.role <> 'owner'
    )
    or store_members.user_id = auth.uid()
  );

commit;
