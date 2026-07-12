alter table public.stories enable row level security;
alter table public.story_videos enable row level security;
alter table public.videos enable row level security;
alter table public.story_products enable row level security;
alter table public.products enable row level security;
alter table public.page_rules enable row level security;
alter table public.metrics enable row level security;

alter table public.stores enable row level security;
alter table public.store_members enable row level security;

-- STORES

drop policy if exists "stores_dashboard_select" on public.stores;
drop policy if exists "stores_dashboard_insert" on public.stores;
drop policy if exists "stores_dashboard_update" on public.stores;
drop policy if exists "stores_dashboard_delete" on public.stores;

create policy "stores_dashboard_select"
  on public.stores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = stores.id
        and sm.user_id = auth.uid()
    )
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
    or exists (
      select 1
      from public.store_members sm
      where sm.store_id = stores.id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  )
  with check (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.store_members sm
      where sm.store_id = stores.id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  );

create policy "stores_dashboard_delete"
  on public.stores
  for delete
  to authenticated
  using (
    owner_user_id = auth.uid()
  );

-- STORE_MEMBERS

drop policy if exists "store_members_dashboard_select" on public.store_members;
drop policy if exists "store_members_dashboard_insert" on public.store_members;
drop policy if exists "store_members_dashboard_update" on public.store_members;
drop policy if exists "store_members_dashboard_delete" on public.store_members;

create policy "store_members_dashboard_select"
  on public.store_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  );

create policy "store_members_dashboard_insert"
  on public.store_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
    or store_members.user_id = auth.uid()
  );

create policy "store_members_dashboard_update"
  on public.store_members
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  );

create policy "store_members_dashboard_delete"
  on public.store_members
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = store_members.store_id
        and sm.user_id = auth.uid()
        and sm.role = 'owner'
    )
  );

-- STORIES

drop policy if exists "stories_dashboard_select" on public.stories;
drop policy if exists "stories_dashboard_insert" on public.stories;
drop policy if exists "stories_dashboard_update" on public.stories;
drop policy if exists "stories_dashboard_delete" on public.stories;
drop policy if exists "stories_public_select_active" on public.stories;

create policy "stories_dashboard_select"
  on public.stories
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = stories.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "stories_dashboard_insert"
  on public.stories
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = stories.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "stories_dashboard_update"
  on public.stories
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = stories.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = stories.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "stories_dashboard_delete"
  on public.stories
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = stories.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "stories_public_select_active"
  on public.stories
  for select
  using (active = true);

-- STORY_VIDEOS

drop policy if exists "story_videos_dashboard_select" on public.story_videos;
drop policy if exists "story_videos_dashboard_insert" on public.story_videos;
drop policy if exists "story_videos_dashboard_update" on public.story_videos;
drop policy if exists "story_videos_dashboard_delete" on public.story_videos;
drop policy if exists "story_videos_public_select_active_story" on public.story_videos;

create policy "story_videos_dashboard_select"
  on public.story_videos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_videos_dashboard_insert"
  on public.story_videos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_videos_dashboard_update"
  on public.story_videos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_videos.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_videos_dashboard_delete"
  on public.story_videos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_videos_public_select_active_story"
  on public.story_videos
  for select
  to anon
  using (
    exists (
      select 1
      from public.stories s
      where s.id = story_videos.story_id
        and s.active = true
        and s.store_id = story_videos.store_id
    )
  );

-- VIDEOS

drop policy if exists "videos_dashboard_select" on public.videos;
drop policy if exists "videos_dashboard_insert" on public.videos;
drop policy if exists "videos_dashboard_update" on public.videos;
drop policy if exists "videos_dashboard_delete" on public.videos;
drop policy if exists "videos_public_select_active" on public.videos;

create policy "videos_dashboard_select"
  on public.videos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "videos_dashboard_insert"
  on public.videos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "videos_dashboard_update"
  on public.videos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = videos.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "videos_dashboard_delete"
  on public.videos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = videos.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "videos_public_select_active"
  on public.videos
  for select
  to anon
  using (
    video_url is not null
    and video_url <> ''
    and status = 'active'
    and active = true
  );

create policy "videos_public_select_active_fallback"
  on public.videos
  for select
  to anon
  using (
    video_url is not null
    and video_url <> ''
    and active = true
  );

-- STORY_PRODUCTS

drop policy if exists "story_products_dashboard_select" on public.story_products;
drop policy if exists "story_products_dashboard_insert" on public.story_products;
drop policy if exists "story_products_dashboard_update" on public.story_products;
drop policy if exists "story_products_dashboard_delete" on public.story_products;
drop policy if exists "story_products_public_select_active_story" on public.story_products;

create policy "story_products_dashboard_select"
  on public.story_products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_products_dashboard_insert"
  on public.story_products
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_products_dashboard_update"
  on public.story_products
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_products.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_products_dashboard_delete"
  on public.story_products
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = story_products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "story_products_public_select_active_story"
  on public.story_products
  for select
  to anon
  using (
    exists (
      select 1
      from public.stories s
      where s.id = story_products.story_id
        and s.active = true
        and s.store_id = story_products.store_id
    )
  );

-- PRODUCTS

drop policy if exists "products_dashboard_select" on public.products;
drop policy if exists "products_dashboard_insert" on public.products;
drop policy if exists "products_dashboard_update" on public.products;
drop policy if exists "products_dashboard_delete" on public.products;
drop policy if exists "products_public_select_active" on public.products;

create policy "products_dashboard_select"
  on public.products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "products_dashboard_insert"
  on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "products_dashboard_update"
  on public.products
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = products.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "products_dashboard_delete"
  on public.products
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = products.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "products_public_select_active"
  on public.products
  for select
  to anon
  using (active = true);

-- PAGE_RULES

drop policy if exists "page_rules_dashboard_select" on public.page_rules;
drop policy if exists "page_rules_dashboard_insert" on public.page_rules;
drop policy if exists "page_rules_dashboard_update" on public.page_rules;
drop policy if exists "page_rules_dashboard_delete" on public.page_rules;
drop policy if exists "page_rules_public_select_active_story" on public.page_rules;

create policy "page_rules_dashboard_select"
  on public.page_rules
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = page_rules.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "page_rules_dashboard_insert"
  on public.page_rules
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = page_rules.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "page_rules_dashboard_update"
  on public.page_rules
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = page_rules.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = page_rules.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "page_rules_dashboard_delete"
  on public.page_rules
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = page_rules.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "page_rules_public_select_active_story"
  on public.page_rules
  for select
  to anon
  using (
    exists (
      select 1
      from public.stories s
      where s.id = page_rules.story_id
        and s.active = true
        and s.store_id = page_rules.store_id
    )
  );

-- METRICS

drop policy if exists "metrics_select_store_members" on public.metrics;
drop policy if exists "metrics_insert_public" on public.metrics;
drop policy if exists "metrics_update_none" on public.metrics;
drop policy if exists "metrics_delete_none" on public.metrics;
drop policy if exists "metrics_dashboard_select" on public.metrics;
drop policy if exists "metrics_dashboard_insert" on public.metrics;
drop policy if exists "metrics_dashboard_update" on public.metrics;
drop policy if exists "metrics_dashboard_delete" on public.metrics;
drop policy if exists "metrics_public_insert_widget" on public.metrics;
drop policy if exists "metrics_public_update_none" on public.metrics;
drop policy if exists "metrics_public_delete_none" on public.metrics;

create policy "metrics_dashboard_select"
  on public.metrics
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_dashboard_insert_auth"
  on public.metrics
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_dashboard_update_auth"
  on public.metrics
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_dashboard_delete_auth"
  on public.metrics
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_dashboard_insert"
  on public.metrics
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_dashboard_update"
  on public.metrics
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_dashboard_delete"
  on public.metrics
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_members sm
      where sm.store_id = metrics.store_id
        and sm.user_id = auth.uid()
    )
  );

create policy "metrics_public_insert_widget"
  on public.metrics
  for insert
  to anon
  with check (
    store_id is not null
    and event_type in ('view', 'play', 'cta_click', 'product_click', 'whatsapp_click')
    and page_url is not null
    and device_type is not null
    and browser is not null
    and exists (
      select 1
      from public.stores s
      where s.id = metrics.store_id
    )
  );

create policy "metrics_public_update_none"
  on public.metrics
  for update
  to anon
  using (false)
  with check (false);

create policy "metrics_public_delete_none"
  on public.metrics
  for delete
  to anon
  using (false);
