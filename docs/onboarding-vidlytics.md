# Vidlytics — Guia Completo de Onboarding para Desenvolvedores

**Versão do documento:** 18/08/2026
**Objetivo:** fazer um novo programador entender 100% do produto, da arquitetura, do banco, dos fluxos e das pegadinhas antes de escrever a primeira linha de código.

---

## Índice

1. [O que é o Vidlytics](#1-o-que-é-o-vidlytics)
2. [Stack técnica](#2-stack-técnica)
3. [Arquitetura geral](#3-arquitetura-geral)
4. [Como rodar o projeto](#4-como-rodar-o-projeto)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Rotas e páginas do painel](#6-rotas-e-páginas-do-painel)
7. [Autenticação e provisionamento](#7-autenticação-e-provisionamento)
8. [Multi-tenancy](#8-multi-tenancy)
9. [Camada de dados (db.ts)](#9-camada-de-dados-dbts)
10. [Banco de dados — mapa de tabelas](#10-banco-de-dados--mapa-de-tabelas)
11. [Funções e triggers do banco](#11-funções-e-triggers-do-banco)
12. [Edge Functions](#12-edge-functions)
13. [O widget público (widget.js)](#13-o-widget-público-widgetjs)
14. [Analytics e métricas](#14-analytics-e-métricas)
15. [Comentários e likes](#15-comentários-e-likes)
16. [Billing: planos, Asaas e trial](#16-billing-planos-asaas-e-trial)
17. [Storage e limites](#17-storage-e-limites)
18. [Integrações](#18-integrações)
19. [Convenções do projeto](#19-convenções-do-projeto)
20. [Pegadinhas e bugs conhecidos ⚠️](#20-pegadinhas-e-bugs-conhecidos-️)
21. [Guia rápido: "quero mexer em X"](#21-guia-rápido-quero-mexer-em-x)

---

## 1. O que é o Vidlytics

**Vidlytics Stories** é um SaaS multi-tenant que permite lojas virtuais (e-commerce) exibirem **stories em vídeo** (estilo Instagram/TikTok) no próprio site, via um widget JavaScript embutido. O produto tem duas faces:

1. **Painel administrativo** (`app.vidlytics.com.br`) — onde o lojista cadastra vídeos, monta stories, vincula produtos, personaliza a aparência, modera comentários, acompanha métricas e gerencia a assinatura.
2. **Widget público** (`widget.js`) — script vanilla JS embutido no site da loja que renderiza os stories (carrossel, grade ou flutuante), coleta eventos de analytics e permite interação social (curtir, comentar, compartilhar, CTA de produto/WhatsApp).

Monetização por assinatura (gateway **Asaas**) com trial de 7 dias e 4 planos. Gating de funcionalidades por: views, storage e status da assinatura.

**Domínio de produção:** `https://app.vidlytics.com.br` (deploy na Vercel).
**Projeto Supabase:** `wznvecurmisgoaijykbt` → `https://wznvecurmisgoaijykbt.supabase.co`

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Front-end | React 19 + TypeScript, Vite 8 (dev server porta **8080**) |
| Rotas | React Router DOM 6 (todas em `src/App.tsx`) |
| UI | TailwindCSS 3 + shadcn/ui (Radix UI) + lucide-react + recharts + sonner (toasts) |
| Estado | Context API (`AuthContext`, `TenantContext`) — **não** usa Redux; TanStack Query instalado |
| Formulários | react-hook-form + zod |
| Backend | Supabase: Postgres + RLS + Auth (email/senha + Google OAuth) + Storage + Edge Functions (Deno) |
| Pagamentos | Asaas (sandbox por padrão — `ASAAS_BASE_URL`) |
| Deploy | Vercel (SPA com rewrite para `index.html`; `widget.js` e `yampi-tracking.js` servidos com `no-cache`) |
| Estilo de código | Definido em `AI_RULES.md` (repositório) e `eslint.config.js` |

**Bibliotecas utilitárias relevantes:** `date-fns` (datas), `embla-carousel-react` (carrosséis).

---

## 3. Arquitetura geral

```
┌─────────────────────────────────────────────────────────────────┐
│  NAVEGADOR DO LOJISTA (autenticado)                              │
│  app.vidlytics.com.br — SPA React                                │
│  ├─ AuthContext (sessão Supabase Auth)                           │
│  ├─ TenantContext (loja atual via store_members)                 │
│  └─ db.ts (camada híbrida: Supabase + fallback localStorage)     │
└───────────────┬─────────────────────────────────────────────────┘
                │ supabase-js (chave anon + JWT do usuário; RLS protege)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                        │
│  ├─ Postgres (39 tabelas public.*, RLS na maioria)               │
│  ├─ Auth (auth.users → trigger cria public.profiles)             │
│  ├─ Storage (buckets: videos, thumbnails, images, store-assets)  │
│  ├─ RPCs SECURITY DEFINER (track_widget_event, create_or_get_    │
│  │   user_tenant, helpers is_store_owner_or_member...)           │
│  ├─ pg_cron (daily-analytics-purge 03:00 UTC)                    │
│  └─ Edge Functions (Deno) — ver seção 12                         │
└───────────────▲─────────────────────────────▲───────────────────┘
                │                             │
   ┌────────────┴───────────┐     ┌───────────┴──────────────────┐
   │ NAVEGADOR DO VISITANTE │     │ SERVIÇOS EXTERNOS            │
   │ DA LOJA (anônimo)      │     │ ├─ Asaas (webhooks de pago)  │
   │ ├─ widget.js           │     │ ├─ TikTok/Instagram/Pinterest│
   │ │  (lê config via      │     │ │   (OAuth + APIs de mídia)  │
   │ │  PostgREST anon;     │     │ └─ Yampi (tracking de venda)│
   │ │  envia eventos p/    │     └──────────────────────────────┘
   │ │  edge track-event;   │
   │ │  grava likes/coment. │
   │ │  direto via anon)    │
   │ └─ yampi-tracking.js   │
└──────────────────────────┘
```

**Princípios-chave:**
- O painel **nunca** usa a service role key no browser — tudo passa por RLS com o JWT do usuário.
- O widget público roda **sem autenticação** (chave anon embutida) — o que é público é controlado por políticas RLS `to anon` e por validações nas edge functions.
- Operações privilegiadas (importar vídeo da rede social, criar assinatura, receber webhook) acontecem em **Edge Functions** com `SUPABASE_SERVICE_ROLE_KEY`.

---

## 4. Como rodar o projeto

```bash
npm install
npm run dev        # Vite em http://localhost:8080
npm run build      # build de produção
npm run lint       # ESLint
```

**Variáveis de ambiente (prefixo VITE_ — embutidas no bundle):**

| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (exigida; sem ela o app roda em modo localStorage — ver seção 9) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anon |
| `VITE_WIDGET_PUBLIC_URL` | URL base do widget usada no snippet da página Integração |
| `VITE_PUBLIC_APP_URL` | URL base do app usada no embed `[token].ts` |

**Segredos das Edge Functions (já configurados no Supabase):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `TIKTOK_CLIENT_KEY/SECRET`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`, `ASAAS_BASE_URL`.

**Deploy:** push para a Vercel (SPA rewrite já configurado em `vercel.json`). Edge Functions são deployadas automaticamente ao editar `supabase/functions/*/index.ts` — **não** usar CLI manual. Migrations SQL ficam em `supabase/migrations/` (gerenciadas por sistema externo — **não criar/editar arquivos lá**; DDL ad-hoc é aplicado via SQL direto no console, o que já gerou drift — ver seção 20).

---

## 5. Estrutura de pastas

```
.
├── public/
│   ├── widget.js            # ★ Widget público (~5.000 linhas, JS puro, Shadow DOM)
│   ├── yampi-tracking.js    # Script de rastreamento de conversão Yampi (página de obrigado)
│   ├── documentacao-vidlytics.html   # Doc HTML legada (desatualizada em partes)
│   └── assets/              # logos
├── docs/
│   ├── auditoria-sistema-metricas.md   # ★ Auditoria detalhada do sistema de analytics
│   └── onboarding-vidlytics.md         # Este documento
├── supabase/
│   ├── functions/           # Edge Functions (Deno) — uma pasta por função
│   └── migrations/          # 9 migrations SQL (não editar manualmente)
├── src/
│   ├── main.tsx / App.tsx   # Bootstrap e TODAS as rotas
│   ├── api/                 # proxy-xml client (fetch com apikey)
│   ├── components/          # AppLayout, AppSidebar, dialogs, performance/*, ui/* (shadcn)
│   ├── context/             # AuthContext.tsx, TenantContext.tsx
│   ├── hooks/               # use-mobile, useInsights
│   ├── lib/                 # ★ Núcleo: db.ts, supabase.ts, auth.ts, analytics.ts,
│   │                        #   video.ts, videoEmbeds.ts, plans.ts, platforms.ts,
│   │                        #   likesService.ts, videoMetrics.ts, storyAppearanceHelpers.ts
│   ├── pages/               # Todas as telas (ver seção 6)
│   │   └── embed/[token].ts # Gerador do script de embed por token
│   └── services/            # instagram.ts, tiktok.ts, integrations.ts, metrics-service.ts
└── AI_RULES.md              # Convenções do projeto (ler!)
```

---

## 6. Rotas e páginas do painel

Rotas definidas em `src/App.tsx`. Wrapper `AppLayout` = sidebar + topo. `ProtectedRoute` exige login; `GuestRoute` redireciona logados.

| Rota | Página | O que faz |
|---|---|---|
| `/login`, `/register` | LoginPage, RegisterPage | Auth e-mail/senha + Google; registro cria tenant |
| `/auth/callback` | AuthCallbackPage | Retorno do OAuth Google |
| `/api/auth/instagram/callback`, `/auth/instagram/callback` | InstagramCallback | Retorno OAuth Instagram |
| `/` | HomeGuard | Redireciona: sem login → `/login`; sem `store_settings` → `/settings`; senão → `/dashboard` |
| `/dashboard` | DashboardPage | Visão geral: métricas, trial, quotas, checklist, feed de atividades |
| `/stories` | StoriesPage | Lista de coleções de stories |
| `/stories/:id` | StoryDetailsPage | Editor do story (vídeos, produtos, CTA, publicação via widget-selector) |
| `/stories/widget` | StoriesWidgetPage | Preview do widget + configuração de exibição |
| `/stories/preview/:id` | StoryPreviewPage | Preview standalone |
| `/videos` (StoragePage), `/armazenamento`, `/gallery`→redirect | StoragePage | **Centro de mídia**: upload, importação TikTok/Instagram/Pinterest/URL, lista de vídeos |
| `/videos/new`, `/videos/:id/edit` | VideoEditPage | Editor do vídeo (produto vinculado, thumbnail, CTA) |
| `/videos/performance` | PerformancePage | Analytics por período (overview/vídeos/insights/retenção) |
| `/videos/:videoId/performance` | VideoPerformancePage | Analytics de um vídeo |
| `/produtos` | ProductsPage | CRUD produtos + importação por XML do parceiro |
| `/medidas` | MedidasPage | Tabelas de medidas (sizing models) |
| `/aparencia` | AppearancePage | Personalização visual do widget (cores, botões, por dispositivo) |
| `/comentarios` | CommentsPage | Moderação de comentários + resposta da loja |
| `/settings` | SettingsPage | Dados da loja, WhatsApp, token de segurança, flags de módulos |
| `/integration` | IntegrationPage | Snippet de instalação + status de segurança da integração |
| `/billing` | BillingPage | Assinatura atual, consumo, faturas |
| `/plans` | PlansPage | Comparativo e contratação de planos (Asaas) |

---

## 7. Autenticação e provisionamento

**Login (`src/lib/auth.ts`):**
- `signIn` — e-mail/senha (`signInWithPassword`).
- `signInWithGoogle` — OAuth com `redirectTo: /auth/callback`, `access_type=offline`.
- `AuthContext` monitora `onAuthStateChange`; `logout` faz `signOut` + limpa todo `localStorage`/`sessionStorage` (preserva só o tema) e redireciona ao login.

**Cadastro (fluxo importante):**
1. `signUp` cria o usuário no Supabase Auth com `options.data = { name, store_name }`.
2. Trigger no banco `on_auth_user_created` → `handle_new_user()` cria a linha em `public.profiles` (id = user id).
3. O front chama a RPC **`create_or_get_user_tenant`** (`SECURITY DEFINER`), que de forma atômica e à prova de race condition:
   - verifica que `p_user_id = auth.uid()`;
   - retorna a loja existente se o usuário já tiver uma (`is_new: false`);
   - senão cria: `stores` (com URL slugificada), `store_members` (role `owner`), `store_settings` (defaults: módulos habilitados, WhatsApp vazio, `America/Sao_Paulo`, `pt-BR`), `usage_counters` (mês corrente zerado).
4. Trigger `set_store_trial_defaults` no INSERT de `stores` aplica: `subscription_status = 'trialing'`, `trial_ends_at = now()+7d`, `plan_tier = 'starter'`.
5. O `storeId` é guardado em `localStorage` (`vidlytics_current_store_id` etc.) pelo front.

> Existe também `createInitialTenantForUser` em `auth.ts` (provisionamento legado feito pelo front) — mantido como fallback histórico; o caminho oficial é a RPC.

---

## 8. Multi-tenancy

- **Modelo:** 1 usuário → N lojas via `store_members` (`owner` | `admin` | `member`); `stores.owner_user_id` é o dono.
- **`TenantContext`** resolve a loja corrente: prioridade = loja salva em `localStorage` (`vidlytics_selected_store_id`) se o usuário for membro → primeira loja de membership → loja própria → primeira loja. Expõe `useTenant() → { currentStore, storeId, loading }`. **Quase toda página lê `storeId` daqui.**
- **Isolamento no banco via RLS** usando funções auxiliares `SECURITY DEFINER`:
  - `is_store_owner_or_member(store_id)` — dono OU qualquer membro;
  - `is_store_owner_or_admin(store_id)` — para ações administrativas;
  - `store_exists`, `user_has_store_access` — utilitários.
- As políticas das tabelas de conteúdo (videos, stories, products...) seguem o padrão: dashboard CRUD para membros + SELECT público `to anon` para o widget ler o que está ativo.
- **Regra de ouro:** qualquer tabela nova que o painel acessa precisa de: `GRANT` para `authenticated`/`service_role`, RLS habilitada e políticas usando os helpers acima. (Guia completo de grants/RLS nas instruções do projeto.)

---

## 9. Camada de dados (db.ts)

`src/lib/db.ts` (~1.750 linhas) é o **coração do front-end**. É uma camada de repositório híbrida:

- Se `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` estão setados → usa PostgREST (`supabase.from(tabela)`), com RLS aplicando segurança.
- Senão → **fallback local** (`localStorage` com chaves `vidlytics_<tabela>`, e defaults em memória). Isso permite rodar o app "offline" para demo — mas em produção o Supabase sempre está configurado.

**Repositórios exportados em `db`:** `stores`, `generalSettings` (+ `getSettings`), `appearances`, `videos`, `stories`, `storyVideos`, `products`, `storyProducts`, `displayLocations`, `pageRules`, `comments`, `metrics`, `sizingModels`, `profiles`, `storeMembers`, `subscriptions`, `usageCounters` + helpers `resolveStoreId`, `withStoreId`, `replaceStoryRelations`.

**Convenções internas importantes:**
- `createSupabaseCrudFunctions<T>(tabela, fallback)` gera `getAll(storeId?) / getById / save / delete` com normalização de campos (snake_case ⇄ camelCase) e sincronização do cache local.
- `isValidUuid` valida todo ID antes de ir ao banco (evita erro 406 do PostgREST com IDs sujos do localStorage).
- `withStoreId(item)` injeta o `store_id` resolvido — **sempre** use ao salvar.
- `replaceStoryRelations('story_videos' | 'story_products', ...)` regrava em bloco as relações de um story (delete + insert) — usado ao salvar a ordem de vídeos/produtos do story.
- `ensureSupabaseStoreExists` / `ensureSupabaseAppearanceExists` fazem upsert guardião antes de salvar filhos.

Muitas páginas, porém, falam com o Supabase **direto** (`supabase.from('...')`) para leituras otimizadas — o `db.ts` não é a única porta de entrada. Ao procurar onde um dado é lido/gravado, faça `grep from('tabela')` no projeto inteiro.

---

## 10. Banco de dados — mapa de tabelas

39 tabelas em `public`. Agrupadas por domínio:

### Tenant & usuários
| Tabela | Papel |
|---|---|
| `profiles` | Espelho de `auth.users` (criada por trigger no signup) |
| `stores` | A loja: nome, url/domínio, `owner_user_id`, `sector_id`, `plan_id`, `subscription_status`, `trial_ends_at`, `storage_used_bytes`, `storage_limit_bytes`, `asaas_customer_id` |
| `store_members` | Vínculo usuário⇄loja com role (`owner/admin/member`) |
| `store_settings` | Config da loja lida **pelo widget**: WhatsApp (número/mensagens/template), flags (`app_enabled`, `stories_enabled`, `carousel_enabled`, `floating_widget_enabled`, `widget_enabled`, `whatsapp_button_enabled`), `auto_approve_comments`, `security_token`, `public_installation_key`/`public_live_key`, `store_public_id`, logo |
| `store_integrations` | Tokens OAuth das redes (platform, account_id, access_token, refresh_token, expiração) |

### Conteúdo
| Tabela | Papel |
|---|---|
| `videos` | Vídeo/imagem: `video_source_type` (`upload`/`image`/embeds), `video_url`, `thumbnail_url`, `file_size`, `thumbnail_file_size`, `status` (active/inactive), `product_id` |
| `stories` | Coleção de story: título, `format` (`floating_widget`/`carousel`/`grid`), CTA, posição |
| `story_videos` | Relação story⇄vídeos (ordem) |
| `products` | Produto: preço, URL, `whatsapp_number` opcional, imagem |
| `story_products` | Relação story⇄produtos |
| `sizing_models` | Tabela de medidas (usada pelo botão "Medidas" do widget) |
| `appearances` | Config de aparência por loja (cores, fontes, botões sociais, modal, por dispositivo) |

### Exibição / instalação
| Tabela | Papel |
|---|---|
| `display_locations` | Onde o widget aparece (páginas) |
| `page_rules` | Regras de exibição por página (o widget filtra no cliente) |
| `widget_selectors` | Mapeia token → seletor CSS + story_id (instalação assistida) |
| `selector_sessions` | Sessões temporárias do fluxo "escolher seletor no site" |

### Social & analytics
| Tabela | Papel |
|---|---|
| `comments` | Comentários de visitantes (`pending/approved/rejected`, `reply_content` da loja) |
| `video_likes` | Curtidas por `user_fingerprint` (anon, localStorage do visitante) |
| `metrics` | **Legada** — eventos crus do widget antigo (congelada desde 16/08/2026) |
| `store_activity_events` | Eventos crus da pipeline atual (retenção 90 dias) |
| `daily_store_metrics` / `daily_video_metrics` | Agregados prontos por dia (write-only hoje) |
| `analytics_rate_limits` | Janelas de rate limit do tracking (60/min por hash) |
| `conversions` | Vendas reportadas pelo Yampi (status `paid` = receita no dashboard) |
| `insights` | Sugestões/checklist exibidos no PerformancePage |
| `events` | **Órfã** — existe no banco, sem uso no código |
| `benchmarks`, `sectors` | Benchmarks por setor (consulta opcional do PerformancePage) |
| `usage_counters` | Contadores mensais por loja (`views_count` **nunca é incrementado** — ver 20) |

### Billing
| Tabela | Papel |
|---|---|
| `plans` | Planos: slug, price_cents, views_limit, storage_limit_bytes, pages_limit, features (jsonb) |
| `subscriptions` | Assinaturas: status, ciclo, `asaas_subscription_id`, `is_current`, gateway ids |
| `invoices` | Faturas espelho do Asaas (upsert por `asaas_payment_id`) |
| `billing_info` | Dados fiscais do lojista (CPF/CNPJ, endereço — obrigatórios p/ assinar) |
| `asaas_webhook_events` | Log de idempotência dos webhooks |

### Sistema / legado
`app_settings`, `appearances_backup`, `appearances_backup_pre_cleanup` (backups manuais — não usar).

---

## 11. Funções e triggers do banco

### RPCs chamadas pelo front
| Função | Chamador | O que faz |
|---|---|---|
| `create_or_get_user_tenant(user_id, name, email, store_name)` | `auth.ts` no signup | Provisiona loja atomicamente (seção 7) |
| `track_widget_event(store_id, event_type, video_id, product_id, story_id, device, path, client_hash)` | Edge `track-event` (service_role) | Pipeline de analytics: valida evento (5 tipos), assinatura ativa, rate limit 60/min, sanitiza, grava bruto + agregados diários |
| `purge_old_activity_events(90)` | pg_cron diário 03:00 UTC | Apaga eventos brutos >90d e janelas de rate limit >60min |

### Triggers relevantes
| Trigger | Tabela | Efeito |
|---|---|---|
| `on_auth_user_created` → `handle_new_user` | auth.users | Cria `profiles` |
| `trg_set_trial_defaults` → `set_store_trial_defaults` | stores (INSERT) | Trial 7 dias + plan_tier starter |
| `trg_sync_store_plan_id` → `sync_store_plan_id` | subscriptions | Espelha `plan_id` da assinatura `is_current` para `stores.plan_id` |
| `trg_sync_storage_bytes` / `trg_update_storage` / `trg_update_store_storage_usage` | videos | **Três triggers sobrepostos** de contagem de storage — ver seção 20 (bug confirmado) |
| `set_updated_at` (várias tabelas) | várias | Mantém `updated_at` |
| `sanitize_appearance_colors` | appearances | Remove caracteres perigosos de cores/fontes |

### Funções órfãs/quebradas (não chamar)
- `toggle_video_like(p_store_id, p_video_id, p_visitor_id)` — referencia coluna `visitor_id` que **não existe** em `video_likes` (a tabela usa `user_fingerprint`). Quebraria em runtime.
- `get_video_real_metrics(...)` — mesmo problema + conta views por `event_type='view'` (tipo sem registros). Ambas são resquícios de uma refatoração interrompida.

---

## 12. Edge Functions

Todas em `supabase/functions/<nome>/index.ts` (Deno). Deploy automático ao editar. CORS liberado (`*`) com handler OPTIONS. `verify_jwt = false` por padrão → cada uma faz sua própria autenticação quando precisa.

| Função | Autenticação | O que faz |
|---|---|---|
| `track-event` | Header Origin/Referer obrigatório + domínio deve bater com `stores.url` (aceita subdomínios e localhost) | Recebe eventos do widget (whitelist: `video_view`, `cta_click`, `product_view`, `story_complete`, `product_click`), gera hash SHA-256(IP+UA+store) e chama `track_widget_event`. Responde 429 no rate limit |
| `yampi-conversion` | ⚠️ **Nenhuma** | Recebe conversão do `yampi-tracking.js` (página de obrigado) e faz upsert em `conversions` por `order_id`. Flagrado na auditoria como forjável |
| `asaas-webhook` | Header `asaas-access-token` (compara com secret) | Webhook de pagamento: idempotente via `asaas_webhook_events`, upsert de `invoices`, muda `subscriptions.status` (`active`/`past_due`) e período +30d |
| `create-asaas-subscription` | JWT do usuário (`auth.getUser`) | Valida `billing_info` preenchido, cria/obtém customer no Asaas (salva `asaas_customer_id` na store), cria subscription no Asaas, insere `subscriptions` local (`status=pending`, `is_current=false`), retorna `invoice_url` |
| `widget-selector` | Token de sessão | Backend do fluxo "instalar widget escolhendo o seletor no site" (grava `widget_selectors`/`selector_sessions`). **⚠️ Não está no repositório** — existe só deployada. Ver seção 20 |
| `import-tiktok-video` | — (service_role) | Recebe URL do TikTok, resolve .mp4 via tikwm.com, verifica limite de storage do plano, baixa e re-hospeda no bucket `videos`, insere em `videos` |
| `import-instagram-video` | — | Baixa mídia do Instagram (URL passada pelo front) e re-hospeda |
| `import-pinterest-video` | — | Scraping de Pin → .mp4 → storage (com fallback de API) |
| `fetch-thumbnail` | — | Busca thumbnail via oEmbed/scraping e sobe no bucket |
| `instagram-auth` | — | Troca `code` OAuth por token long-lived do Instagram; upsert em `store_integrations` |
| `tiktok-oauth-callback` | — | Callback OAuth TikTok: troca code por token, salva em `store_integrations` |
| `get-tiktok-media` | — | Lista vídeos da conta TikTok conectada (API oficial) |
| `import-products-xml` | JWT do usuário | Importação em massa de produtos via XML do parceiro (upsert em `products`) |
| `proxy-xml` | — | Proxy CORS para o front ler XMLs externos (valida esquema http/https) |

**Convenção de logging:** todo `console.*` nas funções deve começar com `[nome-da-funcao]`.

---

## 13. O widget público (widget.js)

`public/widget.js` — ~5.000 linhas de **JavaScript puro** (sem build, sem framework), renderizado dentro de **Shadow DOM** (prefixo `vl-` nos elementos) para não conflitar com o CSS do site da loja. Servido pela Vercel com `Cache-Control: no-cache`.

**Bootstrap:** o lojista cola um `<script>` no tema com atributos (`data-store-id`, URL Supabase e chave anon embutidos no snippet gerado pelo painel).

**Ciclo de vida:**
1. Lê configuração via PostgREST **anon**: `stories`/`story_videos`/`videos` (ativos), `products`, `story_products`, `appearances`, `page_rules`, `display_locations`, `store_settings` (WhatsApp, auto-aprovação), `comments` (aprovados), `video_likes`, `sizing_models`.
2. Renderiza conforme formato do story: `floating_widget` (bolha flutuante + modal), `carousel` (faixa de cards) ou `grid`. Player suporta mp4 hospedado, YouTube, Instagram e TikTok (embeds) e imagens.
3. Interações → ver seção 14 (analytics) e 15 (social).
4. Botões de CTA: "Ver no site" (URL do produto) e "Comprar pelo WhatsApp" (`wa.me` com template de mensagem configurável, placeholders `{{product_name}}`, `{{product_url}}`).

**Instalação assistida (widget-selector):** no `StoryDetailsPage`, o lojista clica em publicar → é gerado um token `sel_...` → o painel abre o site da loja com `?widgetSelectToken=<token>` → um script injetado destaca o elemento clicado → o seletor escolhido é salvo (via edge `widget-selector`) em `widget_selectors`/`selector_sessions` → o embed final usa esse seletor.

**Embed por token (`src/pages/embed/[token].ts`):** rota que, dado o token, monta um `<script>` customizado com `blockId`/`selector`/`position`/`storyId`/`rules` vindos do banco e injeta o widget na posição certa do tema. Contém fallback hardcoded para `https://app.vidlytics.com.br`.

> ⚠️ O snippet exibido na página **Integração** referencia `/custom-tracking.js`, arquivo que **não existe** no repo (os scripts reais são `/widget.js` e `/yampi-tracking.js`). Ver seção 20.

---

## 14. Analytics e métricas

**Existem DOIS sistemas coexistindo — leitura obrigatória: [`docs/auditoria-sistema-metricas.md`](./auditoria-sistema-metricas.md).** Resumo operacional:

| | Sistema legado | Sistema atual |
|---|---|---|
| Escrita | Widget antigo gravava direto na tabela `metrics` via anon | Widget novo → edge `track-event` → RPC `track_widget_event` → `store_activity_events` + `daily_store_metrics` + `daily_video_metrics` |
| Status | **Congelada desde 16/08/2026** (widget antigo em cache parou de rodar) | Ativa, mas só 5 tipos de evento passam (play/like/share/comment/next_video/story_open são descartados pela whitelist) |
| Leitura | Dashboards (Dashboard/Performance/VideoPerformance) ainda leem daqui → **números congelados** | Só o feed "ativivades recentes" do DashboardPage lê `store_activity_events` |
| Tabelas sociais/financeiras reais | — | `video_likes`, `comments`, `conversions` (estes SIM estão vivos e aparecem nos dashboards) |

**Se for mexer em métricas:** primeiro leia a auditoria (ela mapeia evento→função→tabela, os 14 achados de segurança e as pendências conhecidas: share/pular/fechar vídeo não implementados, WhatsApp vs. site indistinguíveis em `cta_click`).

---

## 15. Comentários e likes

**Like (`video_likes`):** o widget gera um `user_fingerprint` (`fp_<timestamp>_<random>`) no `localStorage` do visitante. Curtir = INSERT direto via PostgREST anon (`store_id`, `video_id`, `user_fingerprint`, `story_id`, `page_url`). Descurtir = DELETE... **que falha silenciosamente** (não há política DELETE para anon — bug conhecido, ver seção 20 e auditoria A6). Contagem exibida = soma das linhas da loja.

**Comentário (`comments`):** INSERT direto via PostgREST anon com `status` definido por `store_settings.auto_approve_comments` (`approved` vs `pending`). Validação (nome/texto obrigatórios) é client-side. Moderação no `CommentsPage`: troca de status e resposta da loja (`reply_content`/`reply_status`, autenticado). O widget lista somente `status=approved` (com a resposta da loja).

---

## 16. Billing: planos, Asaas e trial

**Planos (`plans`, dados reais):**

| Slug | Nome | Preço | Views | Storage | Páginas |
|---|---|---|---|---|---|
| nivel_1 | Iniciante | R$ 59/mês | 5.000 | 1 GB | 50 |
| nivel_2 | Pro | R$ 97/mês | 20.000 | 5 GB | 200 |
| nivel_3 | Avançado | R$ 249/mês | 50.000 | 20 GB | 500 |
| nivel_4 | Enterprise | R$ 549/mês | 100.000 | 100 GB | 1000 |

> `src/lib/plans.ts` (Essencial/Profissional/Premium) está **desatualizado** em relação ao banco — os preços/limites reais vêm da tabela `plans`.

**Fluxo de assinatura:**
1. Lojista preenche `billing_info` (obrigatório) → escolhe plano no `/plans` → front chama edge `create-asaas-subscription` (JWT).
2. Edge cria customer + subscription no Asaas, salva `subscriptions` local com `status='pending'`, `is_current=false`, e retorna o `invoice_url` (boleto/pix/cartão).
3. Pagando, o **Asaas chama `asaas-webhook`** (header token validado): registra evento (idempotência), faz upsert da `invoices`, e atualiza `subscriptions` para `active` (+30 dias de período) ou `past_due`.
4. Trigger `sync_store_plan_id` espelha `plan_id` para a loja quando a assinatura é `is_current`.

**Trial & gating:**
- Trial de 7 dias aplicado por trigger no INSERT da loja.
- O **tracking de analytics para** (`track_widget_event` retorna false) se `stores.subscription_status` não for `active` ou trial válido — ou seja, loja inadimplente/cancelada pára de coletar métricas.
- Importações de vídeo verificam o limite de storage do plano antes de baixar (edge functions).

> ⚠️ **Cadeia com furos conhecida** (ver seção 20): `stores.subscription_status` não é atualizada automaticamente pelo webhook (só a tabela `subscriptions` é), e a assinatura nova nasce `is_current=false` enquanto o webhook só atualiza linhas `is_current=true`. Investigue antes de mexer no fluxo de ativação.

---

## 17. Storage e limites

**Buckets (todos públicos para leitura):**

| Bucket | Limite/arquivo | MIME |
|---|---|---|
| `videos` | 500 MB | mp4, webm, quicktime, avi, mkv |
| `thumbnails` | 50 MB | jpeg, png, webp, gif |
| `images` | 50 MB | jpeg, png, webp, gif |
| `store-assets` | 500 MB | qualquer |

**Fluxo de upload (StoragePage):** arquivo → `videos` ou `store-assets` (se imagem) → thumbnail extraída client-side (`video.ts` gera frame do vídeo via canvas) ou via edge `fetch-thumbnail` → INSERT em `videos` com `file_size`/`thumbnail_file_size` → triggers atualizam `stores.storage_used_bytes`.

**Contador de storage:** `stores.storage_used_bytes` é mantido por **três triggers** na tabela `videos` (um recalculo total + dois incrementais). **Há um bug confirmado de tripla contagem no INSERT** — detalhes e comportamento de autocorreção na seção 20.

---

## 18. Integrações

Configuração central em `src/services/integrations.ts` (`INTEGRATION_CONFIGS`) + páginas Storage (import) e Integration (conexões):

| Plataforma | Status | Fluxo |
|---|---|---|
| **TikTok** | ✅ Ativo | OAuth (client key embutido, redirect para edge `tiktok-oauth-callback`) → token salvo em `store_integrations` → `get-tiktok-media` lista vídeos → `import-tiktok-video` re-hospeda |
| **Instagram** | ✅ Ativo | OAuth (redirect `/api/auth/instagram/callback` → `InstagramCallback` → edge `instagram-auth` troca code por token long-lived) → import por URL ou mídia da conta |
| **Pinterest** | ✅ Import por URL | `import-pinterest-video` faz scraping do Pin (sem OAuth — estrutura para OAuth existe mas sem client) |
| **YouTube** | ⬜ Estrutura pronta | Sem client configurado; embeds de YouTube funcionam no player |
| **Yampi** | ✅ Conversões | `yampi-tracking.js` na página de obrigado → edge `yampi-conversion` → tabela `conversions` (receita no dashboard; status `paid`) |
| **XML de produtos** | ✅ Ativo | ProductsPage → `proxy-xml` (CORS) → `import-products-xml` (upsert em lote) |

---

## 19. Convenções do projeto

Fonte: `AI_RULES.md` (leia no repo). Resumo operacional:

- **Sempre TypeScript**; código-fonte em `src/`; páginas em `src/pages/`, componentes em `src/components/`.
- **Rotas somente em `src/App.tsx`** — nova página = criar arquivo + registrar rota.
- **TailwindCSS para todo estilo**; usar **shadcn/ui** (já instalado em `src/components/ui/` — não editar esses arquivos; se precisar diferente, criar componente novo). Ícones: `lucide-react`.
- Nova UI de página deve ser incluída na página principal/rotas, senão o usuário não vê.
- Padrão visual do produto: azul `#0094EB` (light) / laranja `#ff7a29` (dark), fonte bold/black com `tracking-widest` em labels.
- **Migrations:** nunca criar/editar arquivos em `supabase/migrations/` (gerenciadas externamente). DDL vai via SQL direto (ferramenta do ambiente).
- **Edge Functions:** pasta própria com `index.ts`; CORS headers + handler OPTIONS; log com prefixo `[nome-funcao]`; nunca importar código do app; secrets já disponíveis; invocação do front via URL completa `https://<projeto>.supabase.co/functions/v1/<nome>`.
- **Segurança de tabelas novas:** RLS obrigatória + grants explícitos (`service_role` full; `authenticated` conforme necessidade; `anon` só leitura pública deliberada) + políticas com `is_store_owner_or_member` etc.

---

## 20. Pegadinhas e bugs conhecidos ⚠️

**Leia isto antes de qualquer mudança — itens confirmados por inspeção/teste em 18/08/2026:**

1. **⚔️ Storage triplo-contado no INSERT de vídeo (confirmado por teste).** A tabela `videos` tem TRÊS triggers de storage que disparam na ordem alfabética: `trg_sync_storage_bytes` (recalcula o total correto) → `trg_update_storage` (adiciona `file_size` de novo) → `trg_update_store_storage_usage` (adiciona `file_size+thumbnail` de novo). Teste real: insert com 1.100 bytes → contador ficou **3.200**. Um `UPDATE` que toque `file_size`/`thumbnail_file_size`/`status`/`store_id` dispara o recálculo e **autocorrige** (por isso as lojas existentes hoje batem com a soma real). Se for mexer em storage, resolva os triggers redundantes primeiro (mantenha só o recalc total).

2. **⚔️ Analytics dual-system com dashboards lendo tabela congelada.** Dashboards leem `metrics` (legada, parou de receber dados em 16/08/2026). A pipeline nova grava em `store_activity_events`/`daily_*` mas quase nada lê de lá. Likes/comentários/conversões são reais; views/CTR/engajamento estão congelados. Detalhes e plano de riscos em `docs/auditoria-sistema-metricas.md`.

3. **Webhook Asaas não propaga status para `stores.subscription_status`** (que é o campo usado pelo gating do widget e pelo BillingPage): o webhook atualiza apenas `subscriptions`. E a assinatura criada nasce `is_current=false`, enquanto o webhook atualiza somente linhas `is_current=true`. Se uma loja paga e o widget continua bloqueado, a causa está aqui.

4. **Edge `widget-selector` deployada mas ausente do repositório** — o código-fonte não está versionado. Se precisar alterá-la, reescreva a partir do comportamento observado (tabelas `widget_selectors`/`selector_sessions`).

5. **`toggle_video_like` e `get_video_real_metrics` estão quebradas** (coluna `visitor_id` inexistente). Não chamar; corrigir ou remover.

6. **Un-like do visitante não persiste** (DELETE de `video_likes` bloqueado por RLS para anon; erro engolido). Curtida "volta" ao recarregar.

7. **`custom-tracking.js` referenciado na página Integração não existe** no repo (os scripts reais são `widget.js` e `yampi-tracking.js`). O snippet copiado de lá não funciona até corrigir.

8. **`src/lib/plans.ts` desatualizado** frente à tabela `plans` (preços/limites). Referência de verdade = banco.

9. **`usage_counters.views_count` nunca é incrementado** — o card de "views usadas" do plano sempre mostra 0 (ou o valor inicial). O gating real de views ainda não está ligado a dado real.

10. **Eventos do widget descartados silenciosamente:** `play`, `like`, `share`, `comment`, `next_video`, `story_open` são enviados pela edge `track-event` e rejeitados (400) pela whitelist; o widget ignora a falha. Não "corrija" o widget antes de alinhar com a whitelist/proposta da auditoria.

11. **Drift de schema fora das migrations:** parte do schema atual (pipeline de analytics, colunas `event_name`, remoção de CHECK) foi criada via SQL direto. As migrations NÃO refletem 100% o banco. Desconfie e confira o schema real antes de confiar nos arquivos.

12. **RLS permissiva em tabelas públicas** (`metrics`, `comments`, `video_likes`, `conversions` com SELECT/INSERT `true` para anon) — risco cross-tenant mapeado na auditoria (achados A1–A6). Antes de expor qualquer endpoint/tabela nova, siga a seção 19.

13. **Tabelas/colunas legadas espalhadas:** `events` (órfã), `appearances_backup*`, colunas duplicadas em `billing_info` (`document_number` vs `cnpj_cpf`, dois conjuntos de endereço) e `invoices` (`gateway_invoice_id` vs `asaas_payment_id`) — herança de refatorações. Não use as duplicadas sem checar quais o código atual lê/escreve.

14. **`metric.event_name` sempre NULL** → gráficos diários do PerformancePage (overview) agrupam por essa coluna e exibem zeros mesmo com dados na tabela. (Subsídio do item 2.)

---

## 21. Guia rápido: "quero mexer em X"

| Quero... | Arquivos principais |
|---|---|
| Adicionar página/rota | `src/pages/Nova.tsx` + `src/App.tsx` + `src/components/AppSidebar.tsx` (menu) |
| Mudar o que o widget exibe/comporta | `public/widget.js` (+ políticas RLS das tabelas que ele lê; serve no-cache, mudança é imediata) |
| Mudar aparência do widget | `src/pages/AppearancePage.tsx` (editor) + tabela `appearances` + leitura no `widget.js` |
| Adicionar tipo de evento de analytics | Edge `track-event` (ALLOWED_EVENTS) + RPC `track_widget_event` (whitelist + agregados) + `widget.js` (disparo) + leitores (`src/lib/analytics.ts`, `overview-tab.tsx`) — **leia a auditoria antes** |
| Mexer no fluxo de likes/comentários | `widget.js` (toggleLike/createComment) + RLS de `video_likes`/`comments` + `CommentsPage.tsx` |
| Adicionar/alterar plano | Tabela `plans` (SQL) + `PlansPage.tsx`/`BillingPage.tsx`; **não** usar `src/lib/plans.ts` |
| Mexer no billing/assinatura | Edges `create-asaas-subscription` + `asaas-webhook`, triggers `sync_store_plan_id`/`set_store_trial_defaults`, `billing_info` |
| Upload/import de vídeos | `src/pages/StoragePage.tsx` + edges `import-*-video` + buckets `videos`/`store-assets` (**atenção aos triggers de storage**) |
| Nova integração social | `src/services/integrations.ts` + nova edge `supabase/functions/<nome>/` + `store_integrations` |
| Instalação/embed do widget | `StoryDetailsPage.tsx` (widget-selector) + `src/pages/embed/[token].ts` + `widget_selectors`/`selector_sessions` |
| Provisionamento de tenant | RPC `create_or_get_user_tenant` + `src/lib/auth.ts` |
| Permissões de acesso | Funções `is_store_*` + políticas RLS da tabela alvo |
| Dashboard/métricas | `DashboardPage.tsx`, `PerformancePage.tsx`, `src/lib/analytics.ts`, `src/services/metrics-service.ts` (**atenção: sistema dual**) |

---

*Documento gerado por análise completa do código, das migrations, das edge functions e do banco em 18/08/2026, incluindo testes controlados (trigger de storage). Complemente com: `AI_RULES.md` (convenções), `docs/auditoria-sistema-metricas.md` (analytics em profundidade) e `README.md` (visão geral inicial do produto).*