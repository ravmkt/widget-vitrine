# Auditoria Completa — Vidlytics

**Data da inspeção:** 20/08/2026 (12:27 UTC)
**Método:** leitura direta de `pg_catalog` (tabelas, colunas, policies, grants, funções, triggers, views, cron) + leitura do código-fonte (`src/`, `public/`, `supabase/functions/`) + comparação com `supabase/migrations/`. Nenhuma informação abaixo foi inferida de migrations; divergências entre repo e banco estão explicitamente marcadas.

---

## Sumário executivo — 8 achados mais graves

| # | Achado | Evidência |
|---|--------|-----------|
| 1 | **Webhook Asaas 100% quebrado**: grava em `public.asaas_webhook_events` que **não existe** → todo webhook retorna 500 antes de processar pagamento | `supabase/functions/asaas-webhook/index.ts:118` + `to_regclass('public.asaas_webhook_events') = NULL` |
| 2 | **Loja que pagou será bloqueada**: `stores.subscription_status` nunca é atualizado após pagamento. Loja `050a…` tem assinatura `active` no Asaas mas store segue `trialing` (expira 23/08/2026) → `track_widget_event` vai recusar eventos | SQL: store 050a `subscription_status='trialing'`, `current_sub_status='active'`; grep não encontra nenhum writer de `stores.subscription_status` |
| 3 | **Dashboards de métricas leem tabelas sem GRANT para `authenticated`**: `daily_store_metrics` e `daily_video_metrics` só têm grant `service_role`/`postgres`. Policies existem, mas o PostgREST devolve `permission denied` antes do RLS. Todas as leituras (analytics.ts, metrics-service.ts, overview-tab) caem no `catch` → zeros silenciosos | `information_schema.role_table_grants`; leitores: `src/lib/analytics.ts:86,119`, `src/services/metrics-service.ts:96,106,114`, `src/components/performance/overview-tab.tsx:197` |
| 4 | **Escrita pública em `videos`**: policies públicas `INSERT/UPDATE/DELETE … true` + grant `ALL` para `anon` → qualquer pessoa com a anon key altera/apaga **todos os vídeos de todas as lojas** | pg_policies: "Permitir atualizacao de videos" (public, UPDATE, `true`), "Permitir exclusao de videos" (public, DELETE, `true`), "Permitir insercao de videos"/"Insert publico" (with check `true`) |
| 5 | **Views públicas são auto-updatable sem `security_invoker`**: `stores_public` tem grant `ALL` para **anon**; operações via view executam como owner (`postgres`, que burla RLS porque as tabelas não usam `FORCE RLS`) → qualquer anônimo pode `UPDATE stores.subscription_status` ou `DELETE` lojas através da view | `information_schema.views.is_insertable_into=YES`, `reloptions=NULL`, `relforcerowsecurity=false` |
| 6 | **`story_likes` não existe**: `src/lib/likesService.ts:39,77,84` lê/grava tabela inexistente; usado pelo preview `StoriesWidgetPage.tsx` | `to_regclass('public.story_likes') = NULL` |
| 7 | **`yampi-conversion` segue sem qualquer autenticação** e o novo `public/vidlytics-tracking.js` envia `?token=` que a edge **ignora** | `supabase/functions/yampi-conversion/index.ts` (nenhum check de auth/token) |
| 8 | **`track-conversion` é funcionalmente morto**: exige `store_activity_events.metadata.visitor_id` como prova, mas a RPC só grava `{device_type, page_path}` → 57 eventos, 0 com `visitor_id` → sempre 403 | `supabase/functions/track-conversion/index.ts:55-70` vs corpo da `track_widget_event` |

Outros destaques: edge `widget-selector` **deployada mas não versionada** no repo; `track-event` do repo está **desatualizada** em relação à deployada (whitelist de 5 eventos vs ~10 aceitos de fato); migration `20260814000000_storage_usage_trigger.sql` está **vazia (0 bytes)**; ~30 objetos do banco foram criados fora das migrations.

---

# 1. SCHEMA DO BANCO (inspeção real em 20/08/2026)

## 1.0 Visão geral

- **35 tabelas + 2 views** no schema `public`.
- **RLS habilitado em TODAS as 35 tabelas** (`pg_tables.rowsecurity = true`), incluindo as de backup e as órfãs.
- **8 tabelas sem nenhuma policy** (RLS deny-by-default para anon/authenticated; `service_role` passa direto): `analytics_rate_limits`, `appearances_backup`, `appearances_backup_pre_cleanup`, `benchmarks`, `video_placements`, `widget_selectors` e as views não têm RLS próprio.
- **Padrão de grants**: quase todas as tabelas foram criadas com `GRANT ALL` para `anon`, `authenticated` e `service_role`. Exceções relevantes:
  - `analytics_rate_limits`, `daily_store_metrics`, `daily_video_metrics` → **apenas `service_role`** (+ postgres)
  - `store_activity_events` → `authenticated` só tem `SELECT`; `anon` **nada**
  - `stores` e `comments` → `anon` só tem `REFERENCES, TRIGGER`
  - `comments_public` (view) → `anon` só `SELECT`; `authenticated` `ALL`
  - `stores_public` (view) → `anon` `ALL` (⚠️ ver achado 5 do sumário)
- **Tabelas órfãs / sem uso no código**: `app_settings`, `appearances_backup`, `appearances_backup_pre_cleanup`, `video_placements` (+ `widget_selectors`/`selector_sessions` usadas apenas pela edge `widget-selector` que não está versionada no repo). Detalhe por tabela na seção 1.1.
- **Redundâncias**: 3 policies equivalentes em `billing_info`, 2 em `invoices` (SELECT), 2 em `store_activity_events` (SELECT), 2 em `plans` (SELECT), 2 unique indexes idênticos em `usage_counters` (`usage_counters_store_id_month_key` e `usage_counters_store_month_unique`, ambos `(store_id, month)`).
- **Views**:
  - `stores_public` = `select id,name,logo_url,subscription_status,trial_ends_at,past_due_since from public.stores` — lida pelo widget (`public/widget.js:5087`) para bloqueio client-side.
  - `comments_public` = `select id,video_id,store_id,user_name,content,status,parent_id,created_at,reply_content,reply_status from public.comments where status='approved'` — lida pelo widget (`public/widget.js:937`).

Notação usada abaixo: `col tipo` (⚠ nullable/default quando relevante). Policies no formato `nome — roles — cmd — USING/CHECK`.

## 1.1 Tabelas (ordem alfabética)

### analytics_rate_limits
| Coluna | Tipo |
|---|---|
| client_hash | text NOT NULL (PK composta) |
| store_id | uuid NOT NULL (PK composta) |
| window_minute | bigint NOT NULL (PK composta) |
| request_count | integer NOT NULL default 1 |
| created_at | timestamptz NOT NULL default now() |

- **RLS:** habilitada, **sem policies** (só `service_role` acessa; escrita acontece via RPCs `SECURITY DEFINER`).
- **Grants:** `service_role` = INSERT/SELECT/UPDATE/DELETE. `anon`/`authenticated` = nenhum.
- **Uso:** escrita por `track_widget_event` (rate limit 60/min) e `_check_rate_limit` (likes 20/min, comments 5/min); purga por `purge_old_activity_events`. **Ativa.**

### app_settings
Colunas: `id uuid PK default gen_random_uuid()`, `store_id uuid nullable`, `settings jsonb default '{}'`, `platform text nullable`, `created_at/updated_at timestamptz default now()`.

- **Policies:**
  - `Owner admin gerencia` — authenticated — ALL — `is_store_owner_or_admin(store_id)`
  - `Select widget` — anon+authenticated — SELECT — `true`
- **Grants:** anon/authenticated/service_role = ALL.
- **Uso:** **ÓRFÃ.** Nenhuma query no código (única menção é um comentário em `src/pages/CommentsPage.tsx:104`). 0 políticas têm chamador.

### appearances
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `name text NOT NULL default 'Default'`, `is_default boolean default false`, `use_global_appearance boolean default true`, `primary_color text default '#000000'`, `secondary_color text default '#000000'`, `text_color text default '#0F172A'`, `background_color text default '#FFFFFF'`, `button_color text default '#0094EB'`, `font_family text default 'Inter, sans-serif'`, `floating_config/carousel_config/grid_config/modal_config jsonb nullable`, `url text nullable`, `created_at/updated_at timestamptz default now()`, `font_size text default '14'`.

- **Policies:**
  - `Membro ve` — authenticated — SELECT — `is_store_owner_or_member(store_id)`
  - `Owner insere` — authenticated — INSERT — CHECK `is_store_owner(store_id)`
  - `Owner atualiza` — authenticated — UPDATE — `is_store_owner(store_id)`
  - `Owner deleta` — authenticated — DELETE — `is_store_owner(store_id)`
  - `Select publico` — public — SELECT — `true` (widget público lê)
- **Grants:** anon/authenticated/service_role = ALL.
- **Triggers:** `trg_sanitize_appearances` BEFORE INSERT/UPDATE → `sanitize_appearance_colors`.
- **Uso:** dashboard (`src/lib/db.ts:1070,1120`, `DashboardPage.tsx:131`) e widget (leitura pública). **Ativa.**

### appearances_backup ⚠️ ÓRFÃ
Snapshot legado da `appearances` (pós-migração para colunas jsonb). **135 colunas**, todas nullable, sem defaults. Estrutura: `id, store_id, created_at, updated_at, style_name, is_default, same_appearance_all_devices`, cores (`primary_color, secondary_color, text_color, background_color, button_color`), `font_family, font_size`, e blocos `floating_*`, `carousel_*`, `grid_*`, `modal_*` — cada campo de floating/carousel/grid existe em 3 variantes: base, `_mobile`, `_desktop` (ex.: `floating_shape`, `floating_shape_mobile`, `floating_shape_desktop`, `carousel_border_radius_mobile`, `grid_columns_desktop`, …) — mais os jsonb `floating_config, carousel_config, grid_config, modal_config`.

- **RLS:** habilitada, **sem policies** (inacessível a anon/authenticated).
- **Grants:** anon/authenticated/service_role = ALL.
- **Uso:** **ÓRFÃ** — nenhuma referência no código. **0 linhas.**

### appearances_backup_pre_cleanup ⚠️ ÓRFÃ
Snapshot pré-limpeza da `appearances` com 31 colunas: `id, store_id, name, is_default, use_global_appearance, primary_color, secondary_color, text_color, background_color, button_color, border_radius int, shadow_enabled bool, font_family, widget_shape, widget_size, widget_animation, carousel_card_shape, carousel_visible_items int, carousel_gap int, show_title, show_play_button, show_product, show_like_button, show_comment_button, show_share_button, show_whatsapp_button, show_product_button, floating_config jsonb, carousel_config jsonb, grid_config jsonb, modal_config jsonb, url, created_at, updated_at, font_size` (todas nullable, sem defaults).

- **RLS:** habilitada, **sem policies**.
- **Grants:** anon/authenticated/service_role = ALL.
- **Uso:** **ÓRFÃ** — nenhuma referência no código. **1 linha.**

### benchmarks
Colunas: `id uuid PK`, `sector_id uuid nullable`, `metric_key text NOT NULL`, `value_low/value_high/value_mid numeric nullable`, `unit text default '%'`, `description text nullable`, `source text nullable`, `updated_at timestamptz default now()`, `metric_label text nullable`.

- **RLS:** habilitada, **sem policies** (apenas service_role/postgres leem).
- **Grants:** service_role = ALL; anon/authenticated = nenhum.
- **Uso:** lida por `src/services/metrics-service.ts:278` (comparativos da aba Performance) — **via sessão authenticated** → funciona? **Não**: sem grant para authenticated, a leitura falha silenciosamente (mesmo padrão do bug 3 do sumário). Escrita: nenhum writer no código (12 linhas = seed manual). **Semiestagnada.**

### billing_info
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `document_type text NOT NULL default 'cpf'`, `document_number text`, `legal_name text`, `billing_email text`, `address_zip_code/address_street/address_number/address_complement/address_neighborhood/address_city/address_state text nullable`, `created_at/updated_at timestamptz NOT NULL default now()`, + duplicatas legadas: `cnpj_cpf, email, phone, cep, address, number, complement, neighborhood, city, state` (todas text nullable).

- **Policies (3 equivalentes — redundantes):**
  - `billing_info_select_own_store` — public — SELECT — store do owner
  - `billing_info_upsert_own_store` — public — ALL — USING/CHECK store do owner
  - `billing_info_all_own_store` — public — ALL — USING/CHECK store do owner
- **Grants:** anon/authenticated/service_role = ALL.
- **Triggers:** `trg_billing_info_updated_at` BEFORE UPDATE → `set_updated_at`.
- **Uso:** `src/pages/BillingPage.tsx:163,207` (leitura/upsert) e `supabase/functions/create-asaas-subscription` (leitura). **Ativa.**

### comments
Colunas: `id uuid PK`, `video_id uuid NOT NULL`, `store_id uuid NOT NULL`, `user_name text`, `user_email text`, `content text NOT NULL`, `status text default 'pending'`, `parent_id uuid nullable`, `created_at/updated_at timestamptz default now()`, `reply_content text`, `reply_status text`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - *(sem policy pública — widget escreve via RPC `create_comment_safe` SECURITY DEFINER e lê via view `comments_public`)*
- **Grants:** `anon` = REFERENCES, TRIGGER (nada de DML); authenticated/service_role = ALL.
- **Triggers:** `set_updated_at` BEFORE UPDATE → `trigger_set_updated_at`.
- **Dados:** 16 comentários (10 approved). **Ativa.**

### conversions
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `video_id uuid`, `product_id uuid`, `visitor_id text NOT NULL`, `order_id text`, `order_value numeric default 0`, `currency text default 'BRL'`, `status text default 'pending'`, `source text default 'yampi'`, `created_at timestamptz default now()`.

- **Policies:**
  - `Owner admin ve` — authenticated — SELECT — `is_store_owner_or_admin(store_id)`
  - `Membro insere` — authenticated — INSERT — CHECK `is_store_owner_or_member(store_id)`
  - `Membro deleta` — authenticated — DELETE — `is_store_owner_or_member(store_id)`
- **Grants:** ⚠️ anon/authenticated/service_role = ALL (grant `ALL` para anon é resíduo; RLS sem policy de anon bloqueia anon, mas o grant não deveria existir).
- **Índices:** apenas PK — **sem unique (store_id, order_id)** → dedup depende só da aplicação (`yampi-conversion` não faz dedup server-side).
- **Dados:** **0 linhas** (pipeline de conversão nunca gravou nada — ver seção 5).
- **Uso:** escrita pelas edges `yampi-conversion` e `track-conversion` (service_role); leitura em `src/lib/analytics.ts:165`, `src/services/metrics-service.ts:144`, `overview-tab.tsx:216`, `BillingPage` não usa. **Ativa (escrita via edge), vazia.**

### daily_store_metrics ⚠️ GRANT faltante
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `date date NOT NULL`, `views_count int NOT NULL default 0`, `cta_clicks_count int default 0`, `product_clicks_count int default 0`, `estimated_revenue numeric NOT NULL default 0.00`, `created_at/updated_at timestamptz NOT NULL default now()`, `shares_count int default 0`, `video_close_count int default 0`, `whatsapp_clicks_count int default 0`, `website_clicks_count int default 0`, `likes_count int default 0`, `unlikes_count int default 0`, `comments_count int default 0`, `story_opens_count int default 0`.

- **Índices únicos:** `(store_id, date)` além da PK.
- **Policies:** `daily_metrics_owner_select` — authenticated — SELECT — store do owner. (Só SELECT; escrita é exclusiva da RPC `track_widget_event` via service_role.)
- **Grants:** ⚠️ **apenas service_role** (+ postgres). `authenticated` **não tem SELECT** → policy existe mas é inalcançável (bug 3 do sumário).
- **Dados:** 3 linhas (2 lojas); ex.: loja 050a em 18/08: views=11, cta=3, website=2, whatsapp=1.
- **Nota:** `estimated_revenue` não tem writer em nenhum lugar → sempre 0.

### daily_video_metrics ⚠️ GRANT faltante
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `video_id uuid NOT NULL`, `date date NOT NULL`, `views_count int default 0`, `cta_clicks_count int default 0`, `shares_count int default 0`, `next_video_count int default 0`, `video_close_count int default 0`, `whatsapp_clicks_count int default 0`, `website_clicks_count int default 0`, `likes_count int default 0`, `unlikes_count int default 0`, `comments_count int default 0`.

- **Índices únicos:** `(store_id, video_id, date)` além da PK.
- **Policies:** `daily_video_metrics_owner_select` — authenticated — SELECT — store do owner.
- **Grants:** ⚠️ **apenas service_role** (+ postgres) — mesmo bloqueio da tabela acima.
- **Dados:** 3 linhas.

### display_locations
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `story_id uuid`, `location text`, `selector text`, `position text`, `active boolean NOT NULL default true`, `created_at/updated_at timestamptz NOT NULL default now()`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - `Select publico` — public — SELECT — `true`
- **Grants:** todos = ALL.
- **Triggers:** `trg_display_locations_updated_at` BEFORE UPDATE → `set_updated_at`.
- **Uso:** leitura pública no embed do widget (`src/pages/embed/[token].ts:195`), gravação via `src/lib/server/saveRules.ts:40` (código morto estilo Next.js — ver seção 2) e leitura em `DashboardPage.tsx:132`. **Ativa.**

### insights
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `insight_type text NOT NULL`, `title text NOT NULL`, `description text NOT NULL`, `action_label text`, `related_video_id uuid`, `related_placement_id uuid`, `metric_key text`, `metric_value numeric`, `metric_comparison_value numeric`, `read boolean default false`, `dismissed boolean default false`, `created_at timestamptz default now()`, `completed boolean default false`, `action_url text`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - `Select membro` — public — SELECT — `is_store_owner_or_member(store_id)` (para anon, `auth.uid()` é NULL → false)
  - `Service role full` — service_role — ALL — `true`
  - `Insert widget` — public — INSERT — CHECK `true` ⚠️ (qualquer anônimo pode inserir insights; **nenhum chamador** usa essa policy — policy órfã/spam possível)
- **Grants:** todos = ALL.
- **Dados:** 6 linhas — **nenhum writer no código** (seed manual; só leitura/update em `useInsights.ts:34` e `insights-tab.tsx:183,328,347`).

### invoices
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `subscription_id uuid`, `amount_cents int NOT NULL default 0`, `currency text NOT NULL default 'BRL'`, `status text NOT NULL default 'pending'`, `description text`, `due_date date`, `paid_at timestamptz`, `gateway_provider text`, `gateway_invoice_id text`, `invoice_pdf_url text`, `created_at/updated_at timestamptz NOT NULL default now()`, `asaas_payment_id text`, `invoice_url text`, `payment_method text`.

- **Policies (2 equivalentes de SELECT):**
  - `Usuários podem ver faturas de suas lojas` — authenticated — SELECT — store do owner
  - `invoices_select_own_store` — public — SELECT — store do owner
- **Grants:** todos = ALL.
- **Triggers:** `trg_invoices_updated_at` BEFORE UPDATE → `set_updated_at`.
- **Dados:** 2 faturas, ambas `paid` ⚠️ — como o webhook atual está quebrado (tabela `asaas_webhook_events` inexistente), esses registros só podem ter sido gravados por uma versão anterior da edge ou manualmente.
- **Uso:** escrita por `asaas-webhook`; leitura em `BillingPage.tsx:154`. **Ativa.**

### page_rules
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `story_id uuid`, `created_at/updated_at timestamptz NOT NULL default now()`, `condition_type text`, `value text`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - `Select publico` — public — SELECT — `true`
- **Grants:** todos = ALL.
- **Triggers:** `trg_page_rules_updated_at` BEFORE UPDATE → `set_updated_at`.
- **Uso:** leitura no embed (`embed/[token].ts:203`) e gravação em `saveRules.ts:28,33`. **Ativa.**

### plans
Colunas: `id uuid PK`, `slug text NOT NULL`, `name text NOT NULL`, `description text`, `price_cents int NOT NULL default 0`, `billing_cycle text NOT NULL default 'monthly'`, `views_limit int NOT NULL default 0`, `storage_limit_bytes bigint NOT NULL default 0`, `pages_limit int NOT NULL default 0`, `features jsonb default '[]'`, `is_popular boolean NOT NULL default false`, `is_active boolean NOT NULL default true`, `sort_order int NOT NULL default 0`, `created_at/updated_at timestamptz NOT NULL default now()`.

- **Policies (2 equivalentes):**
  - `Permitir leitura pública de planos` — anon+authenticated — SELECT — `true`
  - `plans_select_all` — public — SELECT — `true`
- **Grants:** todos = ALL.
- **Triggers:** `trg_plans_updated_at` BEFORE UPDATE → `set_updated_at`.
- **Dados:** 4 planos.
- **Uso:** `PlansPage.tsx:74` e `create-asaas-subscription` (leitura); sem writer no código. **Ativa (catálogo).**

### products
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `external_id text`, `name text NOT NULL`, `category text`, `price numeric`, `sale_price numeric`, `images jsonb default '[]'`, `product_url text`, `created_at/updated_at timestamptz default now()`, `image_url text`, `sku text`, `short_description text`, `active boolean default true`, `origin text`, `import_source text`, `xml_id text`, `is_active boolean default true` (⚠️ duplicado conceitual de `active`), `last_imported_at timestamptz`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - `Select publico` — public — SELECT — `true`
- **Grants:** todos = ALL.
- **Triggers:** `set_updated_at` BEFORE UPDATE → `trigger_set_updated_at`.
- **Uso:** CRUD em `ProductsPage`, `db.ts:1199`, `DashboardPage.tsx:129`; import XML via `import-products-xml`; widget lê publicamente. **Ativa.**

### profiles
Colunas: `id uuid PK` (= auth.users.id, sem default), `email text`, `name text`, `avatar_url text`, `role text default 'user'`, `created_at/updated_at timestamptz default now()`, `user_id uuid` (espelho de id), `document_number text`, `phone text`.

- **Policies:**
  - `Usuario gerencia proprio perfil` — authenticated — ALL — `id = auth.uid()`
  - `Permitir inserção de perfil no signup` — public — INSERT — CHECK `true`
  - `Usuários podem ver seu próprio profile` — public — SELECT — ⚠️ **`(auth.uid()=user_id OR auth.uid()=id OR true)`** → o `OR true` torna **todos os profiles legíveis por qualquer um** (inclui `document_number` e `phone`)
  - `Usuários podem atualizar seu próprio profile` — public — UPDATE — `auth.uid()=user_id OR auth.uid()=id`
- **Grants:** todos = ALL.
- **Triggers:** `set_updated_at` BEFORE UPDATE → `trigger_set_updated_at`.
- **Uso:** criada por trigger `on_auth_user_created` (auth.users → `handle_new_user`); lida em `auth.ts`, `create-asaas-subscription`. **Ativa.**

### sectors
Colunas: `id uuid PK`, `name text NOT NULL`, `slug text NOT NULL`, `icon text`, `order integer default 0`, `display_order integer default 0` (⚠️ duplicado conceitual).

- **Policies:** `Select publico` — public — SELECT — `true` (única).
- **Grants:** todos = ALL.
- **Uso:** `SettingsPage.tsx:269` (listagem no onboarding). Sem writer no código (3 linhas = seed). **Ativa.**

### selector_sessions ⚠️ semiestrante
Colunas: `id uuid PK`, `token text NOT NULL`, `selector text NOT NULL`, `story_id uuid`, `store_id uuid`, `created_at/updated_at timestamptz default now()`.

- **Policies:**
  - `Permitir insert anônimo em selector_sessions` — anon — INSERT — CHECK `true`
  - `Permitir select authenticated em selector_sessions` — authenticated — SELECT — `true`
  - `Permitir update authenticated em selector_sessions` — authenticated — UPDATE — `true`
- **Grants:** todos = ALL.
- **Dados:** 6 linhas.
- **Uso:** gravada/lida pela edge `widget-selector` — que **não está versionada no repo** (ver seção 2.2). Nenhuma query em `src/` ou `public/`. **Semiviva (depende de edge não versionada).**

### sizing_models
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `name text NOT NULL`, `measures jsonb NOT NULL default '[]'`, `size_name text`, `created_at/updated_at timestamptz default now()`.

- **Policies:**
  - `Autenticado full` — authenticated — ALL — ⚠️ **`true`** (qualquer usuário autenticado gerencia modelos de **todas** as lojas)
  - `Select publico` — public — SELECT — `true`
- **Grants:** todos = ALL.
- **Uso:** `src/lib/db.ts:1152` e `StoragePage.tsx:396`. **Ativa.**

### store_activity_events ⚠️ grant parcial
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `event_type text NOT NULL`, `video_id uuid`, `product_id uuid`, `metadata jsonb default '{}'`, `created_at timestamptz NOT NULL default now()`.

- **Policies (2 equivalentes de SELECT):**
  - `Lojistas podem ver eventos de suas lojas` — authenticated — SELECT — owner da store
  - `activity_owner_select` — authenticated — SELECT — owner da store
- **Grants:** ⚠️ `authenticated` = **apenas SELECT**; `service_role` = ALL; `anon` = nada. (Escrita só via RPC SECURITY DEFINER.)
- **Dados:** 57 eventos; último em **19/08/2026**; tipos observados: `video_view` (43), `share` (4), `next_video` (3), `website_click` (3), `video_close` (2), `whatsapp_click` (2). **0 eventos com `visitor_id` no metadata.**
- **Uso:** feed do Dashboard (`DashboardPage.tsx:133`); purga de 90 dias pelo cron. **Ativa.**

### store_integrations
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `platform varchar NOT NULL`, `account_id varchar`, `account_username varchar`, `access_token text NOT NULL`, `refresh_token text`, `token_expires_at timestamptz`, `created_at/updated_at timestamptz default now()`.

- **Policies:**
  - `Lojistas gerenciam suas próprias conexões` — authenticated — ALL — ⚠️ **`true`** → **qualquer usuário autenticado lê (inclui `access_token`/`refresh_token`!) e edita integrações de TODAS as lojas**
- **Grants:** todos = ALL.
- **Uso:** `services/instagram.ts:21`, `services/integrations.ts:93`, edges `instagram-auth`/`tiktok-oauth-callback`/`get-tiktok-media`. **Ativa — policy crítica.**

### store_members
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `user_id uuid NOT NULL`, `role text default 'member'`, `created_at/updated_at timestamptz default now()`.

- **Policies:**
  - `Usuario ve sua associacao` — authenticated — SELECT — `user_id = auth.uid()`
  - `Owner gerencia membros` — authenticated — ALL — `is_store_owner(store_id)`
- **Grants:** todos = ALL.
- **Uso:** `auth.ts:125,195` e RPC `create_or_get_user_tenant`. **Ativa.**

### store_settings
Colunas (35): `id uuid PK`, `store_id uuid NOT NULL`, `modules jsonb default '{"analytics":true,"video_showcase":true,"whatsapp_button":true}'`, `whatsapp_number text`, `whatsapp_message text default 'Olá!…'`, `security_token text default gen_random_uuid()::text`, `created_at/updated_at timestamptz default now()`, `store_name text NOT NULL default ''`, `store_url text NOT NULL default ''`, `logo_url text`, `contact_email text`, `whatsapp_default_message text`, `whatsapp_message_template text`, `app_enabled bool default true`, `stories_enabled bool default true`, `carousel_enabled bool default true`, `floating_widget_enabled bool default true`, `widget_enabled bool default true`, `whatsapp_button_enabled bool default false`, `whatsapp_enabled bool default false` (⚠️ duplicado), `open_product_new_tab bool default false`, `autoplay bool default false`, `muted_by_default bool default false`, `show_video_controls bool default true`, `pause_on_invisible bool default true`, `pause_on_leave bool default true`, `timezone text NOT NULL default 'America/Sao_Paulo'`, `language text NOT NULL default 'pt-BR'`, `default_template text`, `default_appearance_id uuid`, `public_installation_key text`, `public_live_key text`, `store_public_id text`, `auto_approve_comments bool default false`, `logo_file_size bigint default 0`.

- **Policies:**
  - `Usuários podem ver configurações de sua loja` — authenticated — ALL — store do owner
  - `Owner admin gerencia` — authenticated — ALL — `is_store_owner_or_admin(store_id)`
  - `Select publico` — public — SELECT — `true` ⚠️ (widget precisa ler, mas expõe `security_token` e chaves públicas a qualquer anônimo)
- **Grants:** todos = ALL.
- **Triggers:** `set_updated_at` BEFORE UPDATE → `trigger_set_updated_at`.
- **Uso:** `auth.ts:140`, `SettingsPage.tsx:227`, `CommentsPage.tsx:120,149`, `IntegrationPage.tsx:67`, `StoragePage.tsx:947`, `AppearancePage.tsx:2486`, edge `track-event`. **Ativa.**

### stores
Colunas (22): `id uuid PK`, `name text NOT NULL`, `url text`, `platform text default 'yampi'`, `logo_url text`, `contact_email text`, `settings jsonb default '{}'`, `created_at/updated_at timestamptz default now()`, `owner_user_id uuid`, `sector_id uuid`, `storage_used_bytes bigint default 0`, `storage_limit_bytes bigint default 1073741824` (1 GiB), `plan_id uuid`, `asaas_customer_id text`, `subscription_status text NOT NULL default 'trialing'`, `trial_ends_at timestamptz`, `past_due_since timestamptz`, `plan_tier text default 'starter'`, `current_period_end timestamptz`, `stripe_customer_id text`, `stripe_subscription_id text` (⚠️ colunas Stripe sem uso no código — billing é Asaas).

- **Unique:** `owner_user_id` (1 loja por usuário; usado pelo `ON CONFLICT` da RPC de tenant).
- **Policies:**
  - `Owner full access` — authenticated — ALL — `owner_user_id = auth.uid()`
  - `Usuários podem ver suas próprias lojas` — authenticated — SELECT — owner
  - `Usuários podem atualizar suas próprias lojas` — authenticated — UPDATE — owner
  - `Usuários podem inserir suas próprias lojas` — authenticated — INSERT — CHECK owner
  - `Insert autenticado` — authenticated — INSERT — CHECK **`true`** (redundante com a de cima; com o unique de owner, limita a 1 loja/usuário)
  - `Membros visualizam` — authenticated — SELECT — `is_store_owner_or_member(id)`
- **Grants:** ⚠️ `anon` = apenas REFERENCES, TRIGGER; authenticated/service_role = ALL.
- **Triggers:** `set_updated_at` BEFORE UPDATE (`trigger_set_updated_at`); `trg_set_trial_defaults` BEFORE INSERT (`set_store_trial_defaults`); 3 triggers AFTER de storage vindos de `videos`.
- **Dados:** 3 lojas (1 `active`, 2 `trialing`). ⚠️ A loja `050a…` (trial até 23/08) tem assinatura Asaas `active` — nenhum código atualiza `stores.subscription_status` após pagamento.
- **Uso:** onboarding (`auth.ts:184`), layout (`AppLayout.tsx:38,65`), billing, settings, widget (via view `stores_public`). **Ativa.**

### stories
Colunas (24): `id uuid PK`, `store_id uuid NOT NULL`, `title text NOT NULL`, `icon_name text`, `format text NOT NULL default 'carousel'`, `scroll_direction text default 'horizontal'`, `appearance_id uuid`, `active bool default true`, `position int default 0`, `display_selector text`, `display_position text default 'below'`, `page_rule_type text default 'all_pages'`, `page_rule_value text`, `created_at/updated_at timestamptz default now()`, `model_id uuid` (⚠️ legado), `click_count int default 0`, `cta_enabled bool default false`, `cta_text text`, `cta_url text`, `is_active bool default true` (⚠️ duplicado de `active`), `cta_type text`, `whatsapp_message text`, `view_count int default 0`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - `Select publico` — public — SELECT — `true`
  - `Select stories ativos` — public — SELECT — `active = true` (redundante)
- **Grants:** todos = ALL.
- **Triggers:** `set_updated_at` BEFORE UPDATE.
- **Uso:** CRUD de stories (Dashboard, `db.ts`), widget público. **Ativa.**

### story_products
Colunas: `id uuid PK`, `story_id uuid NOT NULL`, `product_id uuid NOT NULL`, `created_at timestamptz default now()`, `store_id uuid NOT NULL`.

- **Policies:** `Membro gerencia` (authenticated, ALL, member) + `Select publico` (public, SELECT, true).
- **Grants:** todos = ALL. **Uso:** widget + dashboard. **Ativa.**

### story_videos
Colunas: `id uuid PK`, `story_id uuid NOT NULL`, `video_id uuid NOT NULL`, `position int default 0`, `created_at timestamptz default now()`, `store_id uuid NOT NULL`, `is_cover bool default false`.

- **Policies:** `Membro gerencia` + `Select publico`.
- **Grants:** todos = ALL. **Uso:** widget + dashboard. **Ativa.**

### subscriptions
Colunas (19): `id uuid PK`, `store_id uuid NOT NULL`, `plan_id uuid NOT NULL`, `status text NOT NULL default 'active'`, `billing_cycle text NOT NULL default 'monthly'`, `current_period_start timestamptz NOT NULL default now()`, `current_period_end timestamptz`, `cancel_at_period_end bool NOT NULL default false`, `canceled_at timestamptz`, `gateway_provider text`, `gateway_customer_id text`, `gateway_subscription_id text`, `gateway_payment_method_id text`, `is_current bool NOT NULL default true`, `created_at/updated_at timestamptz NOT NULL default now()`, `asaas_subscription_id text`, `payment_method text default 'PIX'`, `asaas_customer_id text`, `billing_provider text default 'asaas'` (⚠️ tripla redundância: gateway_*, asaas_*, billing_provider).

- **Policies:**
  - `Usuários podem ver assinaturas de suas lojas` — authenticated — SELECT — owner
  - `subscriptions_all_own_store` — public — ALL — owner
- **Grants:** todos = ALL.
- **Triggers:** `trg_subscriptions_updated_at` BEFORE UPDATE; `trg_sync_store_plan_id` AFTER INSERT/UPDATE/DELETE → `sync_store_plan_id` (sincroniza `stores.plan_id` quando `is_current=true`).
- **Dados:** 8 assinaturas, 2 `is_current=true` (status `active`). ⚠️ `create-asaas-subscription` insere com `is_current: false` (linha 247) → o trigger **não** promove `stores.plan_id` no checkout; nada no código promove depois.
- **Uso:** escrita por `create-asaas-subscription`/`asaas-webhook`; leitura em `BillingPage.tsx:135`. **Ativa.**

### usage_counters
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `month text NOT NULL`, `videos_count int NOT NULL default 0`, `views_count int NOT NULL default 0`, `users_count int NOT NULL default 0`, `created_at/updated_at timestamptz NOT NULL default now()`.

- **Índices:** ⚠️ **dois unique idênticos** `(store_id, month)`: `usage_counters_store_id_month_key` e `usage_counters_store_month_unique`.
- **Policies:**
  - `Usuários gerenciam contadores da própria loja` — authenticated — ALL — owner
  - `Membro ve` — authenticated — SELECT — `user_has_store_access(store_id)`
- **Grants:** todos = ALL.
- **Dados:** 1 linha (loja 050a, mês 2026-08, `views_count=0`) ⚠️ — apesar de 43 `video_view` registrados em daily metrics; a versão **atual** da RPC incrementa `views_count`, mas nenhum `video_view` ocorreu após a última atualização da RPC (último evento 19/08). O contador do Dashboard (`DashboardPage.tsx:128`) hoje lê 0.
- **Uso:** `create_or_get_user_tenant` (cria linha), `track_widget_event` (incrementa views), Dashboard lê. **Ativa.**

### video_likes
Colunas: `id uuid PK`, `video_id uuid NOT NULL`, `created_at timestamptz default now()`, `store_id uuid`, `user_fingerprint text`.

- **Policies:** `Select publico` — public — SELECT — `true` (única; escrita exclusivamente via RPC `toggle_video_like_safe` SECURITY DEFINER).
- **Grants:** todos = ALL.
- **Dados:** 3 likes.
- **Uso:** widget (RPC), leitura em `analytics.ts:203`, `metrics-service.ts:125`, `overview-tab.tsx:203`. **Ativa.**

### video_placements ⚠️ ÓRFÃ
Colunas: `id uuid PK`, `store_id uuid NOT NULL`, `video_id uuid NOT NULL`, `page text NOT NULL`, `position text NOT NULL`, `content_type text`, `active bool default true`, `created_at/updated_at timestamptz default now()`.

- **RLS:** habilitada, **sem policies**. **Grants:** todos = ALL.
- **Uso:** **ÓRFÃ** — nenhuma query no código. **0 linhas.** (Existe apenas a FK conceitual usada por `insights.related_placement_id`.)

### videos
Colunas (21): `id uuid PK`, `store_id uuid NOT NULL`, `title text NOT NULL`, `video_source_type text default 'url'`, `video_url text`, `video_file_path text`, `thumbnail_source_type text default 'auto'`, `thumbnail_url text`, `thumbnail_file_path text`, `product_id uuid`, `sizing_model_id uuid`, `status text default 'active'`, `created_at/updated_at timestamptz default now()`, `active bool NOT NULL default true` (⚠️ duplicado de `status`), `model_id uuid` (⚠️ legado), `source_type text` (⚠️ duplicado de `video_source_type`), `qr_code_url text`, `file_size bigint default 0`, `thumbnail_file_size bigint default 0`.

- **Policies:**
  - `Membro gerencia` — authenticated — ALL — `is_store_owner_or_member(store_id)`
  - `Permitir leitura de videos` — public — SELECT — `true`
  - `Select publico` — public — SELECT — `true` (redundante)
  - `Select videos ativos` — public — SELECT — `status='active'`
  - `Permitir insercao de videos` — public — INSERT — CHECK `true` ⚠️
  - `Insert publico` — anon — INSERT — CHECK `true` ⚠️
  - `Permitir atualizacao de videos` — public — UPDATE — USING/CHECK `true` ⚠️ **crítico**
  - `Permitir exclusao de videos` — public — DELETE — `true` ⚠️ **crítico**
- **Grants:** ⚠️ **anon = ALL** (SELECT, INSERT, UPDATE, DELETE, TRIGGER, REFERENCES); authenticated/service_role = ALL.
- **Triggers** (por evento, ordem alfabética dos AFTER): `set_updated_at` BEFORE UPDATE; AFTER INSERT/DELETE/UPDATE → `trg_sync_storage_bytes`, `trg_update_storage`, `trg_update_store_storage_usage` (detalhe na seção 3).
- **Uso:** CRUD em `StoragePage.tsx:499,534,667,772,1022`, `VideoEditPage`, `db.ts`; widget lê publicamente. **Ativa — tabela com a pior exposição pública do projeto.**

### widget_selectors ⚠️ semiestrante
Colunas: `id bigint PK (sequence widget_selectors_id_seq)`, `token text NOT NULL`, `selector text NOT NULL`, `story_id text`, `created_at/updated_at timestamptz default now()`.

- **RLS:** habilitada, **sem policies** (anon/authenticated não acessam).
- **Grants:** todos = ALL.
- **Dados:** 7 linhas.
- **Uso:** usada apenas pela edge `widget-selector` (**não versionada no repo**). Nenhuma query em `src/`/`public/`. **Semiviva.**

### Views

| View | Definição | Grants | Risco |
|---|---|---|---|
| `stores_public` | `SELECT id,name,logo_url,subscription_status,trial_ends_at,past_due_since FROM stores` | **anon = ALL**; authenticated/service_role = ALL | ⚠️ Auto-updatable (`is_insertable_into=YES`), owner `postgres`, **sem** `security_invoker` e **sem** `FORCE RLS` na base → escrita via view executa como owner e burla RLS/grants da `stores` |
| `comments_public` | `SELECT … FROM comments WHERE status='approved'` | anon = SELECT; **authenticated = ALL** | Mesmo mecanismo: authenticated pode INSERT/UPDATE/DELETE comments aprovados via view burlando RLS |

## 1.2 Resumo de órfãs / status de uso

| Tabela | Status |
|---|---|
| `app_settings` | **Órfã** (0 queries; só menção em comentário) |
| `appearances_backup` | **Órfã** (0 linhas, 0 queries) |
| `appearances_backup_pre_cleanup` | **Órfã** (1 linha, 0 queries) |
| `video_placements` | **Órfã** (0 linhas, 0 queries) |
| `widget_selectors` / `selector_sessions` | **Semivivas** — só a edge `widget-selector` (deploy sem código no repo) |
| `benchmarks` | Lida por `metrics-service.ts:278`, mas **sem grant p/ authenticated** → leitura falha silenciosamente; sem writer |
| `insights` | Lida/atualizada pelo dashboard, **sem writer** no código (seed manual); policy pública de INSERT sem chamador |
| Demais 27 tabelas | Ativas (leitura e/ou escrita no código) |

---

# 2. FUNÇÕES E RPCs

## 2.1 Funções PostgreSQL (25 existentes hoje)

| Função | Retorno | SECURITY | Chamador(es) | Status |
|---|---|---|---|---|
| `_check_rate_limit(p_store_id, p_client_hash, p_max_per_minute)` | boolean | DEFINER | Interna: `toggle_video_like_safe` (20/min) e `create_comment_safe` (5/min) | **Ativa** |
| `create_comment_safe(p_store_id, p_video_id, p_user_fingerprint, p_user_name, p_user_email, p_content)` | `comments` | DEFINER | `public/widget.js:1980` (POST `rpc/create_comment_safe`) | **Ativa** — rate limit, valida 1–1000 chars, status conforme `store_settings.auto_approve_comments` |
| `create_or_get_user_tenant(p_user_id, p_user_name, p_user_email, p_store_name)` | jsonb | DEFINER | `src/lib/auth.ts:41` | **Ativa** — cria store+members+settings+usage_counters atomicamente; exige `p_user_id = auth.uid()` |
| `handle_new_user()` | trigger | DEFINER | Trigger `on_auth_user_created` AFTER INSERT ON `auth.users` | **Ativa** — cria `profiles` no signup |
| `is_store_admin(target_store_id)` | boolean | DEFINER | — | **Órfã** (nenhuma policy/código chama) |
| `is_store_member(p_store_id)` | boolean | DEFINER | — | **Órfã** (nenhuma policy/código chama) |
| `is_store_owner(check_store_id)` | boolean | DEFINER | Policies: `appearances` (Owner insere/atualiza/deleta), `store_members` (Owner gerencia) | **Ativa (via RLS)** |
| `is_store_owner_or_admin(check_store_id)` | boolean | DEFINER | Policies: `app_settings`, `store_settings` (Owner admin gerencia), `conversions` (Owner admin ve) | **Ativa (via RLS)** |
| `is_store_owner_or_member(check_store_id)` | boolean | DEFINER | Policies de `appearances, comments, conversions, display_locations, insights, page_rules, products, stories, story_products, story_videos, videos` ("Membro gerencia") e `stores` ("Membros visualizam") | **Ativa (via RLS)** — função mais usada do projeto |
| `purge_old_activity_events(p_retention_days default 90)` | jsonb | DEFINER | Cron `daily-analytics-purge` (0 3 * * *, ativo) | **Ativa** — apaga eventos >90d e rate limits >60min |
| `recalculate_store_storage_bytes(p_store_id)` | void | INVOKER | `trigger_sync_store_storage_bytes` | **Ativa (indireta)** |
| `sanitize_appearance_colors()` | trigger | INVOKER | Trigger `trg_sanitize_appearances` (appearances, INSERT/UPDATE) | **Ativa** |
| `set_store_trial_defaults()` | trigger | INVOKER | Trigger `trg_set_trial_defaults` BEFORE INSERT ON stores | **Ativa** — default `trialing` + 7 dias + `plan_tier='starter'` |
| `set_trial_defaults()` | trigger | INVOKER | — | **Órfã** — versão antiga (setava `plan_id` fixo `c8c634e6-…`); nenhum trigger a usa |
| `set_updated_at()` | trigger | INVOKER | Triggers de `page_rules, display_locations, plans, subscriptions, invoices, billing_info` | **Ativa** |
| `store_exists(target_store_id)` | boolean | DEFINER | — | **Órfã** |
| `sync_store_plan_id()` | trigger | DEFINER | Trigger `trg_sync_store_plan_id` (subscriptions, INSERT/UPDATE/DELETE) | **Ativa** — mas só age quando `is_current=true`; checkout insere `is_current=false` → nunca dispara na prática |
| `toggle_video_like_safe(p_store_id, p_video_id, p_user_fingerprint)` | TABLE(likes_count, viewer_liked) | DEFINER | `public/widget.js:2078` | **Ativa** — insert/delete alternado + rate 20/min |
| `track_widget_event(p_store_id, p_event_type, p_video_id, p_product_id, p_device_type, p_page_path, p_client_hash)` | boolean | DEFINER | `supabase/functions/track-event/index.ts:142` (service_role) | **Ativa** — ver fluxo na seção 4.1 |
| `trigger_set_updated_at()` | trigger | INVOKER | Triggers de `videos, stories, stores, store_settings, profiles, products, comments` | **Ativa** (duplicata funcional de `set_updated_at`) |
| `trigger_sync_store_storage_bytes()` | trigger | INVOKER | Trigger `trg_sync_storage_bytes` (videos) | **Ativa** — recalcula storage exato |
| `update_appearances_updated_at()` | trigger | INVOKER | — | **Órfã** |
| `update_store_storage()` | trigger | INVOKER | Trigger `trg_update_storage` (videos) | **Ativa — redundante** (delta só de `file_size`, ignora thumbnail) |
| `update_store_storage_usage()` | trigger | INVOKER | Trigger `trg_update_store_storage_usage` (videos) | **Ativa — redundante** (delta ciente de `video_source_type='upload'`) |
| `user_has_store_access(check_store_id)` | boolean | DEFINER | Policy `usage_counters` ("Membro ve") | **Ativa (via RLS)** — wrapper de `is_store_owner_or_member` |

**Resumo:** 20 ativas, 5 órfãs (`is_store_admin`, `is_store_member`, `set_trial_defaults`, `store_exists`, `update_appearances_updated_at`). Nenhuma função quebrada por referência inexistente (o problema está nos *chamadores inexistentes* e nas tabelas faltantes usadas pelas edges — seção 5).

## 2.2 Edge functions

### No repo (`supabase/functions/`) — 14

| Edge | Autenticação | Observações |
|---|---|---|
| `asaas-webhook` | Custom: header `asaas-access-token` (segredo ASAAS_WEBHOOK_SECRET) + service_role | ⚠️ **QUEBRADA**: insere em `public.asaas_webhook_events` (inexistente) antes de qualquer processamento → todo evento retorna 500 (`asaas-webhook/index.ts:118` e seguintes) |
| `create-asaas-subscription` | **JWT do usuário** (`Authorization` → `getUser`, linhas 19/33) + service_role p/ escritas | Íntegra. Cria customer/subscription no Asaas (sandbox por padrão), insere `subscriptions` com `is_current:false` (linha 247) |
| `fetch-thumbnail` | ⚠️ **Nenhuma verificação de usuário** — usa service_role direto (linha ~28) | Chamada por `src/lib/video.ts:88`. Qualquer portador da anon key pode disparar |
| `get-tiktok-media` | Repassa `Authorization` do chamador (RLS aplica) | Chamada por `services/tiktok.ts:5` |
| `import-instagram-video` | Repassa `Authorization` (RLS aplica) | Chamada por `StoragePage.tsx:359` |
| `import-products-xml` | **JWT** (`Authorization` → `getUser`) + service_role | Chamada por dashboard de produtos |
| `import-pinterest-video` | service_role (fallback anon key) + repassa `Authorization`; **sem getUser** | Chamada por `StoragePage.tsx:479` |
| `import-tiktok-video` | Idem pinterest | Chamada por `StoragePage.tsx:322` |
| `instagram-auth` | OAuth (code exchange); grava via service_role; sem `getUser` | Chamada por `InstagramCallback.tsx:27` |
| `proxy-xml` | ⚠️ **Nenhuma** | Proxy HTTP aberto (`{url}` arbitrária); chamado por `ProductsPage.tsx:762` com a URL do XML do lojista |
| `tiktok-oauth-callback` | OAuth callback; grava `store_integrations` via service_role | Redirect URI registrado |
| `track-conversion` | ⚠️ Nenhuma (service_role) | **Morta na prática**: prova exige `store_activity_events.metadata.visitor_id`, que nunca é gravado (0/57 eventos) → sempre 403. Nenhum script a chama |
| `track-event` | Custom: `Origin`/`Referer` obrigatório + validação contra `store.url` (+ subdomínios e **localhost**) | ⚠️ **Repo desatualizado**: whitelist do repo = 5 eventos (`video_view, cta_click, product_view, story_complete, product_click`); a versão **deployada** aceita `share, next_video, website_click, video_close, whatsapp_click` (evidência: esses tipos existem em `store_activity_events`/`daily_store_metrics`). Um re-deploy do repo regrediria as métricas |
| `yampi-conversion` | ⚠️ **NENHUMA** (service_role; ignora o `?token=` que `public/vidlytics-tracking.js:104` e `conversion-tracking.js:104` enviam) | Grava `conversions` sem dedup de `order_id` (a dedup é só client-side, via sessionStorage) |

### Deployada sem código no repo — 1

| Edge | Evidência | Função |
|---|---|---|
| `widget-selector` | Chamada por `public/widget.js:4956` e `src/pages/StoryDetailsPage.tsx:449` (`…/functions/v1/widget-selector?story_id=…`) | Fluxo de posicionamento visual do widget: cria/consulta `widget_selectors` e `selector_sessions` (ambas com dados no banco: 7 e 6 linhas) |

### Código de servidor morto no repo (estilo Next.js em app Vite)

- `src/api/proxy-xml.ts`, `src/api/vidlytics/save-rules.ts`, `src/lib/server/saveRules.ts`, `src/lib/server/supabaseAdmin.ts` (usa `process.env.NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — não existem em runtime Vite).
- `vercel.json` faz rewrite `/(api|.*)` → `/(api|src/pages)/$1`, sugerindo deploy antigo por rotas de arquivo. Hoje `saveRules.ts` (que grava `page_rules`/`display_locations` com service_role) **não é chamado por nenhum componente do front**.

---

# 3. TRIGGERS (19 em `public` + 1 em `auth.users`)

Ordenados por tabela. Em cada evento, BEFORE dispara antes de AFTER; triggers do mesmo evento/mesmo timing disparam em **ordem alfabética do nome**.

| Tabela | Trigger | Momento | Evento | Função | O que faz |
|---|---|---|---|---|---|
| `videos` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `videos` | `trg_sync_storage_bytes` | AFTER | INSERT / DELETE / UPDATE **OF** `file_size, thumbnail_file_size, status, store_id` | `trigger_sync_store_storage_bytes` | **Recalcula** `stores.storage_used_bytes` do zero (soma `file_size+thumbnail_file_size` de todos os vídeos da loja). Trata troca de `store_id` |
| `videos` | `trg_update_storage` | AFTER | INSERT / DELETE / UPDATE **OF** `file_size, status, store_id` | `update_store_storage` | **Delta incremental** (só `file_size`, ignora thumbnail) |
| `videos` | `trg_update_store_storage_usage` | AFTER | **QUALQUER** INSERT / DELETE / UPDATE | `update_store_storage_usage` | **Delta incremental** ciente de `video_source_type='upload'` (soma file+thumb; não-upload conta 0) |
| `stories` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `stores` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `stores` | `trg_set_trial_defaults` | BEFORE | INSERT | `set_store_trial_defaults` | defaults: `subscription_status='trialing'`, `trial_ends_at=now()+7d`, `plan_tier='starter'` |
| `store_settings` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `profiles` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `products` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `comments` | `set_updated_at` | BEFORE | UPDATE | `trigger_set_updated_at` | `updated_at = now()` |
| `appearances` | `trg_sanitize_appearances` | BEFORE | INSERT + UPDATE | `sanitize_appearance_colors` | remove caracteres perigosos (`<>"'`;&(){}`\\`) de cores e `font_family` |
| `page_rules` | `trg_page_rules_updated_at` | BEFORE | UPDATE | `set_updated_at` | `updated_at = now()` |
| `display_locations` | `trg_display_locations_updated_at` | BEFORE | UPDATE | `set_updated_at` | `updated_at = now()` |
| `plans` | `trg_plans_updated_at` | BEFORE | UPDATE | `set_updated_at` | `updated_at = now()` |
| `subscriptions` | `trg_subscriptions_updated_at` | BEFORE | UPDATE | `set_updated_at` | `updated_at = now()` |
| `subscriptions` | `trg_sync_store_plan_id` | AFTER | INSERT / UPDATE / DELETE | `sync_store_plan_id` | mantém `stores.plan_id` sincronizado com a assinatura `is_current=true`; zera quando a corrente é desativada/excluída |
| `invoices` | `trg_invoices_updated_at` | BEFORE | UPDATE | `set_updated_at` | `updated_at = now()` |
| `billing_info` | `trg_billing_info_updated_at` | BEFORE | UPDATE | `set_updated_at` | `updated_at = now()` |
| `auth.users` | `on_auth_user_created` | AFTER | INSERT | `handle_new_user` | cria `profiles` (id = user_id = auth uid, name de `raw_user_meta_data`) |

### ⚠️ Redundância tripla de storage em `videos`

Para um **INSERT** de vídeo hospedado (`video_source_type='upload'`, file X + thumb Y), disparam em ordem alfabética:
1. `trg_sync_storage_bytes` → `storage = X+Y` (exato)
2. `trg_update_storage` → `storage += X`
3. `trg_update_store_storage_usage` → `storage += X+Y`

Ou seja, **novo upload infla o contador em ~3× o tamanho real** (recalculo + dois deltas). O mesmo vale para UPDATE de tamanhos. Hoje as 3 lojas têm `storage_used_bytes` **exatamente igual** à soma real (verificado por SQL), o que indica que os uploads ocorreram antes da coexistência dos três triggers — o próximo upload novo incorrerá na tripla contagem.

---

# 4. FLUXOS CRÍTICOS ATUAIS

## 4.1 Analytics — do clique no widget ao banco (e ao dashboard)

**Escrita (funcionando parcialmente):**

1. **Evento no player/widget** — `public/widget.js`:
   - `video_view`: player inicia (`widget.js:1878`) ou card do carrossel clicado (`widget.js:4431`)
   - `story_complete` (`widget.js:1881`), `video_close` (`:2877`), `product_click` (`:4175`), `product_view` (`:4179`), `website_click` (`:3209`), `whatsapp_click` (`:3238`)
   - Via wrapper `trackMetric` (`:1773`): `play` (`:1809-1855`), `comment` (`:1991`, `:2804`), `share` (`:2148/2176/2197`), `next_video` (`:3276`), `story_open` (`:3394`); likes/unlikes (`:2069`)
2. **`sendAnalyticsEvent`** (`widget.js:1711`) — throttle local de 4s por (tipo+vídeo) (`:1715-1721`); POST para `{SUPABASE}/functions/v1/track-event` (`:1756`) com `{store_id, event_type, video_id, product_id, device_type, page_path}`.
3. **Edge `track-event`** (`supabase/functions/track-event/index.ts`):
   - exige `Origin`/`Referer` (`:34`); whitelist de eventos (`:47` — 5 no repo, ~10 na versão deployada, ver 2.2)
   - carrega loja (`:61`) e exige `widget_enabled`/`app_enabled` do `store_settings` (`~:73`)
   - valida origem contra `stores.url` (+subdomínios; **aceita localhost**, `:86-96`)
   - `client_hash = sha256(IP + User-Agent + store_id)` (`:100`)
   - chama `supabase.rpc('track_widget_event')` com **service_role** (`:142`)
4. **RPC `track_widget_event`** (SECURITY DEFINER, no banco):
   - valida `event_type` contra lista de **14** tipos aceitos
   - lê `stores.subscription_status/trial_ends_at/past_due_since`: `active` → ok; `trialing` → ok se não expirado; `past_due` → ok se < 72h; senão **retorna FALSE** (widget bloqueado)
   - rate limit: upsert `analytics_rate_limits` (client_hash, store, minuto) — **> 60/min = FALSE**
   - se `video_id` não pertencer à loja → anula `video_id`
   - sanitiza `page_path` (remove query, corta 255) e `device_type` (mobile/tablet/desktop, senão 'desktop')
   - **grava** `store_activity_events` (metadata = `{device_type, page_path}` apenas)
   - upsert `daily_store_metrics` (por store+data) e, se houver vídeo, `daily_video_metrics`
   - se `video_view`: upsert `usage_counters.views_count` (mês corrente)

**Leitura (quebrada por GRANT):**

5. Dashboard (`PerformancePage` → `src/services/metrics-service.ts`: `videos:84`, `daily_video_metrics:96`, `daily_store_metrics:106,114`, `video_likes:125`, `comments:134`, `conversions:144`, `benchmarks:278`) e `overview-tab.tsx:197-216` — **falham silenciosamente** em `daily_*`/`benchmarks` por falta de grant para `authenticated` (erro capturado → lista vazia → zeros na UI).
6. `DashboardPage.tsx:128-133` lê `usage_counters` (ok) e `store_activity_events` (tem grant SELECT p/ authenticated → feed funciona).
7. `src/lib/analytics.ts` (`daily_store_metrics:86`, `daily_video_metrics:119`, `conversions:165`, `video_likes:203`, `comments:237`) — mesmo bloqueio nas `daily_*`.

**Retenção:** cron `daily-analytics-purge` (03:00 UTC) → `purge_old_activity_events(90)`.

**Gap de tipos:** `play`, `like`, `unlike`, `comment`, `story_open` nunca chegaram ao banco (0 ocorrências em 57 eventos) — ou a edge deployada não os aceita, ou o widget não os envia nesse fluxo; `cta_click` está na whitelist mas **nenhum código o envia** (o widget envia `website_click`/`whatsapp_click` no lugar; `cta_clicks_count` das métricas diárias só é incrementado porque a RPC trata os três como CTA).

## 4.2 Billing / Asaas — do plano escolhido ao status da loja

1. **Escolha do plano** — `PlansPage.tsx:114` → `supabase.functions.invoke('create-asaas-subscription', { plan_id, store_id, billing_type })`.
2. **Edge `create-asaas-subscription`**:
   - JWT obrigatório (`:19,33`); carrega plano (`plans`) e dados fiscais (`billing_info`→`profiles`)
   - cria/reaproveita customer Asaas (`stores.asaas_customer_id`)
   - cria subscription no Asaas (**ambiente sandbox** por padrão no código)
   - insere em `subscriptions`: `status='pending'`, `is_current=false`, `asaas_subscription_id` (`:247`) → ⚠️ o trigger `trg_sync_store_plan_id` **não** promove `stores.plan_id` (exige `is_current=true`), e nada no código promove depois
   - devolve `invoice_url` (PIX/boleto)
3. **Cliente paga no Asaas → Asaas chama o webhook** `…/functions/v1/asaas-webhook` com header `asaac-access-token`:
   - ⚠️ **PASSO QUEBRADO**: a edge insere o evento em `public.asaas_webhook_events` para idempotência (`index.ts:118`) — a **tabela não existe** → erro `42P01` ≠ código de duplicata `23505` → `catch` → **HTTP 500 "Falha ao registrar evento de webhook"** → **nenhum webhook é processado** (nem fatura, nem assinatura)
   - *(se funcionasse, o código seguinte faria:)* upsert de `invoices` por `asaas_payment_id`; `PAYMENT_CONFIRMED/RECEIVED` → `subscriptions.status='active'` + período +30d; `OVERDUE/REFUNDED/CHARGEBACK/DELETED` → `past_due`
4. **Status da loja** — ⚠️ **ninguém nunca escreve** `stores.subscription_status` / `stores.past_due_since` após o pagamento (grep em todo `src/` e `supabase/` confirma: apenas leituras). Consequências:
   - loja paga permanece `trialing` → quando `trial_ends_at` vence, `track_widget_event` passa a retornar FALSE → **widget do cliente pagante para de rastrear** (caso real: loja `050a…`, assinatura `active`, trial expira **23/08/2026**)
   - a única loja com `subscription_status='active'` (`eccb…`) foi ativada por fora do código (manual/SQL)
5. **Dashboard de cobrança** — `BillingPage.tsx`: `stores:84,106` (storage/plano/status), `subscriptions:135`, `invoices:154`, `billing_info:163,207` (upsert de dados fiscais).

## 4.3 Likes e comentários

**Widget público (loja do cliente) — funcionando:**
- **Like/unlike:** `widget.js:2069` → POST `rpc/toggle_video_like_safe` (`:2078`) com `{p_store_id, p_video_id, p_user_fingerprint}` → RPC faz rate limit 20/min, alterna INSERT/DELETE em `video_likes` e devolve `{likes_count, viewer_liked}`. Eventos `like`/`unlike` também são despachados ao `track-event` (mas não constam no banco — ver gap 4.1).
- **Comentário:** `widget.js:1980` → POST `rpc/create_comment_safe` → rate 5/min, valida conteúdo 1–1000 chars, define `status` por `store_settings.auto_approve_comments`, insere em `comments`.
- **Leitura pública:** widget lê a view `comments_public` (`widget.js:937`, só aprovados) e likes via SELECT público em `video_likes`.
- **Moderação (dashboard):** `CommentsPage.tsx:383,501` atualiza `status`/`reply_content` (policy "Membro gerencia").

**Preview interno (dashboard) — quebrado:**
- `StoriesWidgetPage.tsx:2` importa `fetchLikes`/`toggleLike` de `src/lib/likesService.ts`, que consulta **`story_likes`** (`:39,77,84`) — tabela **inexistente**. `fetchLikes` cai no `catch` e usa cache local (silencioso); `toggleLike` lança erro e alimenta a fila offline (`StoriesWidgetPage.tsx:1079-1321`) que nunca persiste.

---

# 5. BUGS CONHECIDOS AINDA ATIVOS

`AI_RULES.md` **não lista bugs** (contém apenas stack/convenções). Os "docs anteriores" são `docs/auditoria-sistema-metricas.md` (18/08/2026, itens A1–A14) e `docs/CLIENTE_DOCS.md`/`docs/onboarding-vidlytics.md`. Verificação item a item contra o código de hoje:

## 5.1 Bugs da auditoria anterior (docs/auditoria-sistema-metricas.md)

| Item antigo | Status hoje | Evidência atual |
|---|---|---|
| A1. Tabela `metrics` com INSERT público cross-tenant | ✅ **Corrigido por remoção** — `to_regclass('public.metrics') = NULL` | Tabela eliminada; dashboards migraram para `daily_*` |
| A2. SELECT público em `comments` (vazamento de pendentes) | ✅ **Corrigido** — policy pública removida; widget lê `comments_public` (só `approved`) | `pg_policies` de `comments` só tem "Membro gerencia"; `widget.js:937` usa a view ⚠️ mas ver bug N8 (view updatable) |
| A3. `conversions` forjável sem autenticação | ⚠️ **Parcialmente corrigido** — policies agora exigem authenticated/membro, **mas** a edge `yampi-conversion` segue sem auth e grava via service_role; `track-conversion` idem | `yampi-conversion/index.ts` (0 checks); anon ainda tem grant `ALL` na tabela |
| A4. INSERT irrestrito em `metrics` | ✅ Corrigido (tabela removida) | — |
| A5. `yampi-conversion` sem autenticação/origin/token | ❌ **AINDA ATIVO** — e agravado: o novo `public/vidlytics-tracking.js` envia `?token=` (SECURITY_TOKEN) que a edge **ignora** | `yampi-conversion/index.ts` não lê query params de token |
| A6. Like ok / **un-like bloqueado por RLS** (DELETE público) | ✅ **Corrigido** — RPC `toggle_video_like_safe` (SECURITY DEFINER) faz o DELETE internamente | `widget.js:2078`; fingerprint client-side continua resetável (limitação conhecida) |
| A7. `track-event` aceita `localhost` como origem | ❌ **Ainda ativo (repo)** | `track-event/index.ts:96` — branch localhost mantida |
| A8. RPCs órfãs quebradas (`toggle_video_like`, `get_video_real_metrics`) | ✅ **Corrigido** — funções removidas do banco | Novas órfãs existem (seção 2.1) mas são inofensivas |
| A9. `track-event` sem assinatura/HMAC | ❌ Inalterado (informativo) | Payload continua falsificável por quem conhece a anon key |
| A10. Schema criado fora das migrations | ❌ **Agravado** — ver seção 6 | — |
| A11. Sem retenção para `video_likes`/`comments`/`conversions` | ❌ Inalterado — cron só purga `store_activity_events` (90d) e `analytics_rate_limits` (60min) | Corpo de `purge_old_activity_events` |
| A12. Dashboards zerados (liam `metrics` legado) | ⚠️ **Parcialmente corrigido** — leitura migrada para `daily_*`, **mas** o novo bloqueio é GRANT (bug N5): `authenticated` não tem SELECT em `daily_store_metrics`/`daily_video_metrics`/`benchmarks` → UI continua zerada. `usage_counters.views_count` agora é incrementado pela RPC atual (porém hoje = 0, pois não houve `video_view` após a última atualização da RPC). `estimated_revenue` segue sem writer (sempre 0) | `information_schema.role_table_grants`; seção 4.1 |
| A13. Rate limit por client_hash sofre NAT (IPs compartilhados) | ❌ Inalterado | `track_widget_event` (60/min por sha256(IP+UA+store)) |
| A14. CORS `Access-Control-Allow-Origin: *` em todas as edges | ❌ Inalterado | headers de todas as 14 edges |

## 5.2 Bugs novos encontrados nesta auditoria (não constavam nos docs)

| # | Bug | Severidade | Evidência |
|---|---|---|---|
| N1 | **`asaas-webhook` grava em `asaas_webhook_events` inexistente** → todo webhook 500 antes de processar | 🔴 Crítica | `asaas-webhook/index.ts:118` + `to_regclass = NULL`; as 2 invoices `paid` existentes não podem ter vindo do código atual |
| N2 | **`stores.subscription_status`/`past_due_since` sem writer** → loja pagante vira `trialing` expirado e o widget é bloqueado pela RPC | 🔴 Crítica | Loja `050a…`: assinatura `active`, store `trialing`, trial expira 23/08/2026; grep sem nenhum writer |
| N3 | **GRANT ausente p/ `authenticated`** em `daily_store_metrics`, `daily_video_metrics` (e `benchmarks`) → dashboards zerados | 🔴 Crítica | Seção 4.1 |
| N4 | **`story_likes` inexistente** → likes do preview (`StoriesWidgetPage`) quebrados | 🟠 Alta | `likesService.ts:39,77,84` |
| N5 | **Views `stores_public`/`comments_public` updatable sem `security_invoker`** + grants `ALL` (anon na stores_public) + sem `FORCE RLS` → escrita via view burla RLS da tabela base | 🔴 Crítica (config) | `information_schema.views`; `relforcerowsecurity=false` |
| N6 | **Policies públicas de INSERT/UPDATE/DELETE em `videos`** (`true`) + grant `ALL` p/ anon | 🔴 Crítica | `pg_policies` "Permitir atualizacao/exclusao/insercao de videos", "Insert publico" |
| N7 | **Policy de `profiles` com `OR true`** → CPF/telefone de todos os usuários legíveis por qualquer um | 🟠 Alta | Policy "Usuários podem ver seu próprio profile" |
| N8 | **Policy `true` em `store_integrations`** → `access_token`/`refresh_token` de todas as lojas acessíveis a qualquer autenticado | 🔴 Crítica | Policy "Lojistas gerenciam suas próprias conexões" |
| N9 | **Policy `true` em `sizing_models`** (ALL p/ authenticated) | 🟡 Média | Policy "Autenticado full" |
| N10 | **`track-conversion` morto**: prova `metadata.visitor_id` nunca gravada (0/57) → sempre 403; sem chamadores | 🟠 Alta | Seção 2.2 |
| N11 | **`yampi-conversion` sem dedup de `order_id`** (dedup só client-side) e sem unique index em `conversions` | 🟡 Média | Corpo da edge; índices da tabela |
| N12 | **Edge `widget-selector` não versionada** (deploy-only); `widget_selectors`/`selector_sessions` dependem dela | 🟡 Média | `widget.js:4956`, `StoryDetailsPage.tsx:449` |
| N13 | **`track-event` do repo desatualizado** (5 eventos) vs deployada (~10) → re-deploy do repo regrediria métricas | 🟡 Média | Seção 2.2 + tipos presentes no banco |
| N14 | **Trigger triplo de storage em `videos`** → próximo upload inflar `storage_used_bytes` ~3× | 🟡 Média | Seção 3 |
| N15 | **`proxy-xml` sem autenticação** → proxy aberto (SSRF/abuso de egress) | 🟡 Média | `proxy-xml/index.ts` |
| N16 | **`fetch-thumbnail` sem verificação de usuário** (service_role direto) | 🟡 Média | `fetch-thumbnail/index.ts:28` |
| N17 | `security_token`/`public_live_key` expostos pelo SELECT público de `store_settings` | 🟡 Média | Policy "Select publico" da tabela |
| N18 | Código morto Next.js com `SUPABASE_SERVICE_ROLE_KEY` em `src/lib/server/supabaseAdmin.ts` (hoje sem env, não executa; risco de bundling futuro) | 🟢 Baixa | Seção 2.2 final |

---

# 6. DRIFT DE SCHEMA — `supabase/migrations/` vs banco real

## 6.1 O que as migrations criam

Grep de `CREATE TABLE` nas 9 migrations: apenas **6 tabelas** em `0001_saas_multi_tenant_base.sql` (`stores`, `profiles`, `store_members`, `subscriptions`, `usage_counters`) e `0004_metrics_analytics_rls.sql` (`metrics`), mais `widget_appearances` em `0008_widget_appearances_columns.sql`. `0001` também adiciona `store_id` a tabelas pré-existentes (`videos`, `stories`, `products`, `comments`, `metrics`, `appearances`, `display_locations`, `page_rules`, `story_products`, `story_videos`, `sizing_models`). `0009` apenas documenta o drop manual da tabela `events` (já removida em 19/08/2026).

## 6.2 Diferenças — migrations ⇒ banco real

| Objeto | Situação |
|---|---|
| `metrics` (criada em 0004) | ❌ **Não existe mais** no banco (drop não versionado) |
| `widget_appearances` (criada em 0008) | ❌ **Não existe** no banco (drop/renome não versionado) |
| `general_settings` (alterada em 0003:15) | ❌ **Não existe** no banco — a migration referencia tabela inexistente |
| `20260814000000_storage_usage_trigger.sql` | ❌ **Arquivo vazio (0 bytes)** — nenhum SQL, apesar do nome |
| Policies das migrations 0005–0007 (nomes `*_dashboard_*`, `*_public_*`) | ❌ **Não existem** — o banco foi re-RLS-ado fora das migrations (nomes atuais: "Membro gerencia", "Select publico", "Owner full access", etc.) |

## 6.3 Diferenças — banco real ⇒ ausentes nas migrations

**~30 objetos criados fora das migrations:**

- **Tabelas de billing/catálogo:** `plans`, `invoices`, `billing_info`, `conversions`
- **Tabelas de analytics (sistema atual):** `store_activity_events`, `daily_store_metrics`, `daily_video_metrics`, `analytics_rate_limits`, `video_likes`
- **Config/entidades:** `store_settings`, `app_settings`, `sectors`, `benchmarks`, `insights`, `selector_sessions`, `widget_selectors`, `video_placements`, `store_integrations`
- **Backups legados:** `appearances_backup`, `appearances_backup_pre_cleanup`
- **Views:** `stores_public`, `comments_public`
- **Colunas sem migration:** todo o bloco Asaas/Stripe de `stores` (`asaas_customer_id`, `subscription_status`, `trial_ends_at`, `past_due_since`, `plan_tier`, `current_period_end`, `stripe_*`), colunas de faturamento duplicadas em `subscriptions`/`invoices`/`billing_info`, `qr_code_url`/`file_size`/`thumbnail_file_size` em `videos`, colunas públicas de `store_settings`, `document_number`/`phone`/`user_id` em `profiles`, etc.
- **Funções:** as 25 listadas na seção 2.1 não constam em nenhuma migration
- **Triggers:** nenhum dos 20 triggers está nas migrations
- **Cron:** job `daily-analytics-purge` criado fora das migrations
- **Grants:** o padrão `GRANT ALL` para anon/authenticated/service_role não está nas migrations (que seguem o padrão least-privilege) — é a origem do bug N6/N3

## 6.4 Drift de código deployado vs repo

- `track-event`: repo (5 eventos) ≠ deploy (~10 eventos aceitos — evidência no banco)
- `widget-selector`: **deployada, ausente do repo**
- Dados anômalos consistentes com hotfix manual: loja `eccb…` com `subscription_status='active'` sem writer no código; 2 invoices `paid` que o webhook atual não conseguiria gravar

---

## Conclusão

O núcleo SaaS/RLS (tenant, membros, aparências, stories) está íntegro e as correções da auditoria de 18/08 foram em grande parte aplicadas (migração para `daily_*`, RPCs seguras de like/comentário, remoção de `metrics`). O que permanece quebrado concentra-se em **três frentes**: (1) o pipeline de billing nunca fecha o ciclo (webhook 500 + status da loja sem writer), (2) o pipeline de leitura de métricas é bloqueado por grants ausentes, e (3) a exposição pública deliberada para o widget (`videos` writável, views updatable, `store_settings` com token legível) nunca foi substituída por um caminho autenticado.

*Documento gerado por inspeção direta do banco (`wznvecurmisgoaijykbt`) e do código-fonte em 20/08/2026.*
