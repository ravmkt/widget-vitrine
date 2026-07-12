alter table public.stories enable row level security;
alter table public.story_videos enable row level security;
alter table public.videos enable row level security;
alter table public.story_products enable row level security;
alter table public.products enable row level security;
alter table public.page_rules enable row level security;
alter table public.metrics enable row level security;

-- STORIES

drop policy if exists "stories_dashboard_select" on public.stories;
drop policy if exists "stories_dashboard_insert" on public.stories;
drop policy if exists "stories_dashboard_update" on public.stories;
drop policy if exists "stories_dashboard_delete" on public.stories;
drop policy if exists "stories_public_select_active" on public.stories;

create policy "stories_dashboard_select"
  on public.stories
  for select
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
  using (
    coalesce(nullif(video_url, ''), '') <> ''
    and (not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'videos'
        and column_name = 'status'
    ) or status = 'active')
    and (not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'videos'
        and column_name = 'active'
    ) or active = true)
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
  using (false)
  with check (false);

create policy "metrics_public_delete_none"
  on public.metrics
  for delete
  using (false);
