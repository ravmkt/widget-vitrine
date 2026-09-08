# 📹 Vidlytics — Documentação Completa do Aplicativo

> **Vidlytics** é uma plataforma SaaS de **Video Commerce & Live Shopping** para e-commerces brasileiros. Permite que lojistas publiquem stories interativos com vídeos (importados de TikTok, Reels/Instagram, Pinterest ou upload próprio) diretamente na loja virtual, rastreiem métricas de conversão e realizem transmissões de Live Shopping via YouTube — tudo instalável em qualquer plataforma via Google Tag Manager (GTM).

---

## Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Pastas do Projeto](#3-estrutura-de-pastas-do-projeto)
4. [Arquitetura da Aplicação](#4-arquitetura-da-aplicação)
5. [Rotas e Navegação](#5-rotas-e-navegação)
6. [Funcionalidades Detalhadas por Módulo](#6-funcionalidades-detalhadas-por-módulo)
7. [Camada de Dados (db.ts)](#7-camada-de-dados-dbts)
8. [Banco de Dados (Supabase)](#8-banco-de-dados-supabase)
9. [Autenticação e Multi-Tenant](#9-autenticação-e-multi-tenant)
10. [Edge Functions (Backend Serverless)](#10-edge-functions-backend-serverless)
11. [Widget Público e Instalação via GTM](#11-widget-público-e-instalação-via-gtm)
12. [Analytics e Métricas](#12-analytics-e-métricas)
13. [Planos, Billing e Asaas](#13-planos-billing-e-asaas)
14. [Integrações Externas](#14-integrações-externas)
15. [Componentes de UI Reutilizáveis](#15-componentes-de-ui-reutilizáveis)
16. [Bibliotecas e Utilitários (src/lib)](#16-bibliotecas-e-utilitários-srclib)
17. [Serviços (src/services)](#17-serviços-srcservices)
18. [Segurança](#18-segurança)
19. [Variáveis de Ambiente](#19-variáveis-de-ambiente)
20. [Scripts e Comandos](#20-scripts-e-comandos)

---

## 1. Visão Geral do Produto

### O que o Vidlytics faz

| Pilares | Descrição |
|---|---|
| **Stories Interativos** | Widgets flutuantes, carrosséis e grades de vídeos shoppable embutidos na loja virtual |
| **Live Shopping** | Transmissões ao vivo via YouTube incorporadas no domínio da loja, com produtos fixados, cupons e captura de leads |
| **Analytics & Atribuição** | Rastreamento de views, cliques em CTA, cliques em produtos, likes, comentários, conversões e receita estimada |
| **Instalação Universal** | Script único injetável via Google Tag Manager — compatível com Shopify, Nuvemshop, WooCommerce, Tray, VTEX, Yampi, CartPanda, etc. |
| **Indicação (Indica & Ganha)** | Programa de afiliados com código de referência e comissões recorrentes |

### Público-alvo
Lojas virtuais de moda, acessórios, cosméticos e afins que desejam aumentar a conversão com vídeo social e live commerce, com cobrança em Reais (via Asaas) e suporte local.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework UI | React | 19.x |
| Linguagem | TypeScript | 5.5+ |
| Bundler | Vite | 8.x |
| Roteamento | react-router-dom | 6.x |
| Estilização | Tailwind CSS | 3.4 (+ tailwindcss-animate, @tailwindcss/typography) |
| Componentes UI | shadcn/ui + Radix UI | Suite completa instalada |
| Ícones | lucide-react | 0.462 |
| Gráficos | recharts | 2.12 |
| Backend/BaaS | Supabase (Postgres, Auth, Storage, Edge Functions/Deno) | supabase-js 2.45 |
| Formulários | react-hook-form + zod | — |
| Notificações | sonner (toasts) | 1.5 |
| Datas | date-fns | 3.6 |
| Estado servidor | @tanstack/react-query | 5.56 (disponível) |

---

## 3. Estrutura de Pastas do Projeto

```
vidlytics/
├── DOCUMENTACAO.md                  # Este documento
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── src/
│   ├── main.tsx                     # Bootstrap React (ReactDOM.createRoot)
│   ├── App.tsx                      # Definição de TODAS as rotas + guards
│   ├── App.css
│   ├── globals.css                  # Tokens de tema Tailwind (claro/escuro)
│   ├── vite-env.d.ts
│   │
│   ├── pages/                       # ── PÁGINAS (rotas) ──────────────────
│   │   ├── LandingPage.tsx          # Landing page pública de vendas
│   │   ├── LoginPage.tsx            # Login do lojista
│   │   ├── RegisterPage.tsx         # Cadastro (trial 7 dias)
│   │   ├── MasterLoginPage.tsx      # Login do Super Admin (god mode)
│   │   ├── MasterAdminPage.tsx      # Painel Master Admin (impersonação)
│   │   ├── AuthCallbackPage.tsx     # Callback OAuth genérico
│   │   ├── auth/
│   │   │   └── InstagramCallback.tsx
│   │   ├── DashboardPage.tsx        # Visão geral de métricas
│   │   ├── PerformancePage.tsx      # Resultados/Analytics dos vídeos
│   │   ├── IndicaGanhaPage.tsx      # Programa de afiliados
│   │   ├── StoriesPage.tsx          # Lista de stories
│   │   ├── StoriesWidgetPage.tsx    # Configuração do widget
│   │   ├── StoryDetailsPage.tsx     # Detalhes/edição de um story
│   │   ├── StoryPreviewPage.tsx     # Preview fullscreen do story
│   │   ├── LiveCommercePage.tsx     # Módulo Live Shopping (YouTube)
│   │   ├── VideoGalleryPage.tsx     # Galeria de vídeos (legado)
│   │   ├── VideoEditPage.tsx        # Criar/editar vídeo (/videos/new, /videos/:id/edit)
│   │   ├── VideoPerformancePage.tsx # Performance individual do vídeo
│   │   ├── ProductsPage.tsx         # Catálogo de produtos
│   │   ├── MedidasPage.tsx          # Modelos de medidas (provador)
│   │   ├── AppearancePage.tsx       # Editor de aparência dos widgets
│   │   ├── CommentsPage.tsx         # Moderação de comentários
│   │   ├── StoragePage.tsx          # Armazenamento (biblioteca)
│   │   ├── SettingsPage.tsx         # Configurações gerais da loja
│   │   ├── IntegrationPage.tsx      # Instalação via GTM/script
│   │   ├── BillingPage.tsx          # Assinatura e faturas (Asaas)
│   │   ├── PlansPage.tsx            # Comparação de planos
│   │   ├── SupportPage.tsx          # Suporte (WhatsApp)
│   │   ├── HelpArticlesPage.tsx     # Base de artigos de ajuda
│   │   ├── NotFound.tsx
│   │   └── embed/
│   │       └── [token].ts           # Gerador do script público do widget
│   │
│   ├── components/                  # ── COMPONENTES DE APLICAÇÃO ────────
│   │   ├── AppLayout.tsx            # Shell do app (sidebar + navbar + outlet)
│   │   ├── AppSidebar.tsx           # Sidebar de navegação (3 grupos)
│   │   ├── Navbar.tsx               # Topbar do app
│   │   ├── ProtectedRoute.tsx       # Guard de rota autenticada
│   │   ├── MasterAdminRoute.tsx     # Guard de Super Admin
│   │   ├── SessionGate.tsx          # Gate de sessão
│   │   ├── WidgetPreview.tsx        # Preview ao vivo do widget configurado
│   │   ├── VideoThumbnail.tsx       # Thumb de vídeo com fallback
│   │   ├── ConfirmDeleteDialog.tsx
│   │   ├── CustomDialog.tsx
│   │   ├── SuccessDialog.tsx
│   │   ├── FloatingHelpButton.tsx   # Botão flutuante de ajuda
│   │   ├── FloatingSupportButton.tsx
│   │   ├── WhatsAppFloatingButton.tsx
│   │   ├── WhatsAppIcon.tsx
│   │   ├── made-with-dyad.tsx
│   │   ├── live/
│   │   │   └── ShareLiveModal.tsx   # Compartilhamento da live
│   │   ├── performance/
│   │   │   ├── overview-tab.tsx     # Aba visão geral
│   │   │   ├── videos-tab.tsx       # Aba por vídeo
│   │   │   ├── retention-tab.tsx    # Aba retenção/drop-off
│   │   │   └── insights-tab.tsx     # Aba insights automáticos
│   │   └── ui/                      # ── shadcn/ui (40+ componentes) ────
│   │       ├── accordion, alert-dialog, alert, aspect-ratio, avatar,
│   │       ├── badge, breadcrumb, button, calendar, card, carousel,
│   │       ├── chart, checkbox, collapsible, command, context-menu,
│   │       ├── dialog, drawer, dropdown-menu, form, hover-card,
│   │       ├── input-otp, input, label, LayoutIcons, menubar,
│   │       ├── navigation-menu, pagination, popover, progress,
│   │       ├── radio-group, resizable, scroll-area, select, separator,
│   │       ├── sheet, sidebar, skeleton, slider, switch, table, tabs,
│   │       ├── textarea, toast, toggle-group, toggle, tooltip, use-toast
│   │       └── ...
│   │
│   ├── context/                     # ── CONTEXTOS GLOBAIS ───────────────
│   │   ├── AuthContext.tsx          # Sessão Supabase + isSuperAdmin
│   │   └── TenantContext.tsx        # Loja ativa (multi-tenant)
│   │
│   ├── lib/                         # ── NÚCLEO / UTILITÁRIOS ────────────
│   │   ├── db.ts                    # Camada de dados CRUD (Supabase + fallback localStorage)
│   │   ├── supabase.ts              # Cliente Supabase (env vars)
│   │   ├── auth.ts                  # Helpers de auth
│   │   ├── analytics.ts             # Métricas do dashboard (Sistema B)
│   │   ├── plans.ts                 # Definição de planos e limites
│   │   ├── platforms.ts             # Plataformas de e-commerce suportadas
│   │   ├── video.ts                 # Utilidades de vídeo
│   │   ├── videoEmbeds.ts           # Detecção embed YouTube × HTML5 <video>
│   │   ├── videoMetrics.ts          # Cálculo de métricas por vídeo
│   │   ├── likesService.ts          # Likes (visitante → loja)
│   │   ├── comments/likes via db
│   │   ├── offlineQueue.ts          # Fila offline c/ retry (localStorage)
│   │   ├── activityLog.ts           # Log de atividades
│   │   ├── storyAppearanceHelpers.ts
│   │   ├── toast.ts / utils.ts (cn)
│   │   └── types/performance.ts     # Tipos de performance
│   │
│   ├── services/                    # ── SERVIÇOS DE INTEGRAÇÃO ──────────
│   │   ├── instagram.ts             # Importação de vídeos do Instagram
│   │   ├── tiktok.ts                # Importação de vídeos do TikTok
│   │   ├── integrations.ts          # OAuth Instagram/TikTok/YouTube/Pinterest
│   │   └── metrics-service.ts       # Ingestão de eventos do widget
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx           # Detecção mobile (breakpoint)
│   │   └── useInsights.ts           # Insights automáticos de performance
│   │
│   └── utils/toast.ts
│
└── supabase/
    ├── config.toml
    ├── functions/                   # ── EDGE FUNCTIONS (Deno) ───────────
    │   ├── track-event/             # Ingestão de eventos do widget (público)
    │   ├── widget-selector/         # Resolve dados públicos p/ o widget
    │   ├── universal-conversion/    # Conversão universal (checkout das lojas)
    │   ├── create-asaas-subscription/ # Cria cobrança Asaas
    │   ├── asaas-webhook/           # Webhook de pagamento Asaas
    │   ├── import-tiktok-video/     # Baixa vídeo do TikTok
    │   ├── get-tiktok-media/        # Metadata de mídia TikTok
    │   ├── tiktok-oauth-callback/   # Callback OAuth TikTok
    │   ├── import-instagram-video/  # Baixa vídeo do Instagram
    │   ├── instagram-auth/          # Troca de código OAuth Instagram
    │   ├── import-pinterest-video/  # Baixa vídeo do Pinterest
    │   ├── import-products-xml/     # Importa produtos de XML (Google Shopping)
    │   ├── proxy-xml/               # Proxy CORS p/ XMLs externos
    │   ├── fetch-thumbnail/         # Gera thumbnail de vídeo
    │   ├── proxy-preview/           # Proxy de preview
    │   └── send-email/              # Envio de e-mails (Resend)
    │
    └── migrations/                  # ── MIGRAÇÕES SQL (18 arquivos) ─────
        ├── 0001_saas_multi_tenant_base.sql
        ├── 0002_saas_auth_support.sql
        ├── 0003_pre_rls_tenant_integrity.sql
        ├── 0004_metrics_analytics_rls.sql
        ├── 0005–0007 (correções RLS widget público/dashboard)
        ├── 0008_widget_appearances_columns.sql
        ├── 0009_drop_orphan_events_table.sql
        ├── 0011_create_store_settings_public_view.sql
        ├── 0012_add_thumbnail_file_size_to_videos.sql
        ├── 0013_unify_db_schema_and_tracking.sql
        ├── 0014_master_admin_and_impersonation.sql
        ├── 0015_fix_master_admin_rpcs.sql
        ├── 20260814000000_storage_usage_trigger.sql
        ├── 20260904… (fixes track_widget_event)
        └── 20260908000000_plans_and_live_commerce.sql
```

---

## 4. Arquitetura da Aplicação

```
┌────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (Lojista)                          │
│   React SPA (app.vidlytics.com.br)                                  │
│   App.tsx → Guards (Guest/Protected/Master) → AppLayout → Páginas   │
│   Contexts: AuthContext (sessão) + TenantContext (loja ativa)       │
└───────────────┬────────────────────────────────────┬───────────────┘
                │ supabase-js (anon key + JWT user)  │
                ▼                                    ▼
┌──────────────────────────────┐   ┌─────────────────────────────────┐
│        SUPABASE              │   │   EDGE FUNCTIONS (Deno)         │
│ • Auth (e-mail/senha)        │   │ • track-event (widget público)  │
│ • Postgres + RLS multi-tenant│   │ • widget-selector               │
│ • Storage (vídeos/thumbs)    │   │ • import-tiktok/instagram/…     │
│ • Views e RPCs               │   │ • create-asaas-subscription     │
│                              │   │ • asaas-webhook, send-email, …  │
└──────┬───────────────────────┘   └────────┬────────────────────────┘
       │                                    │
       ▼                                    ▼
┌──────────────────────────────┐   ┌─────────────────────────────────┐
│  SITE DA LOJA (qualquer      │   │  SERVIÇOS EXTERNOS              │
│  plataforma, via GTM)        │   │ • Asaas (billing BRL)           │
│  <script src="embed/[token]">│   │ • TikTok / Instagram / Pinterest│
│  → Shadow DOM widget         │   │ • YouTube (lives)               │
│  → eventos → track-event     │   │ • Resend (e-mail)               │
└──────────────────────────────┘   └─────────────────────────────────┘
```

**Padrões-chave:**

- **Camada de dados híbrida** (`db.ts`): todas as operações CRUD passam por `createSupabaseCrudFunctions`, que usa o Supabase quando configurado e faz **fallback automático para localStorage** (chaves `vidlytics_*`) quando não — permitindo desenvolvimento/demo offline.
- **Sanitização por whitelist**: cada tabela tem `TABLE_ALLOWED_FIELDS`; campos fora da lista são descartados antes de gravar.
- **Validação de UUIDs**: `TABLE_UUID_FIELDS` exige/gera UUIDs válidos; FKs opcionais inválidas são convertidas em `null` (nunca quebram o INSERT).
- **Normalização camelCase ⇄ snake_case**: aliases legados (`isDefault`/`is_default`, `useGlobalAppearance`…) são normalizados em runtime na leitura e antes de salvar.

---

## 5. Rotas e Navegação

Todas as rotas são definidas em **`src/App.tsx`** com `BrowserRouter`.

### 5.1 Rotas públicas

| Rota | Componente | Guard | Descrição |
|---|---|---|---|
| `/` | `HomeGuard` | — | **Lógica de domínio:** se o hostname NÃO é `app.*` (ex.: `vidlytics.com.br`), exibe a **LandingPage**. Se for `app.*`: redireciona para `/login` (sem sessão), `/settings` (sem onboarding) ou `/dashboard` |
| `/login` | `LoginPage` | `GuestRoute` | Login (redireciona p/ dashboard se já logado) |
| `/register` | `RegisterPage` | `GuestRoute` | Cadastro com trial de 7 dias |
| `/master/login` | `MasterLoginPage` | — | Login exclusivo do Super Admin |
| `/auth/callback` | `AuthCallbackPage` | — | Callback OAuth genérico |
| `/auth/instagram/callback` | `InstagramCallback` | — | Callback OAuth Instagram |
| `/api/auth/instagram/callback` | `InstagramCallback` | — | Alias (compatibilidade Meta) |

### 5.2 Rotas protegidas (exigem login — `ProtectedRoute` + `AppLayout`)

| Rota | Página | Grupo sidebar | Função |
|---|---|---|---|
| `/dashboard` | DashboardPage | MÉTRICAS | KPIs gerais, gráficos de views/cliques/receita |
| `/videos/performance` | PerformancePage | MÉTRICAS | Abas: Visão Geral, Vídeos, Retenção, Insights |
| `/videos/:videoId/performance` | VideoPerformancePage | MÉTRICAS | Performance de um vídeo específico |
| `/indica-e-ganha` | IndicaGanhaPage | MÉTRICAS | Programa de afiliados (código, comissões) |
| `/stories` | StoriesPage | OPERAÇÃO | Lista/CRUD de stories |
| `/stories/widget` | StoriesWidgetPage | OPERAÇÃO | Configuração do widget na loja |
| `/stories/:id` | StoryDetailsPage | OPERAÇÃO | Editar story (vídeos, produtos, CTA, regras) |
| `/stories/preview/:id` | StoryPreviewPage | OPERAÇÃO | Preview fullscreen (sem layout) |
| `/live-commerce` | LiveCommercePage | OPERAÇÃO | Criar/gerenciar lives (YouTube) |
| `/armazenamento` (alias `/storage`, `/gallery`) | StoragePage | OPERAÇÃO | Biblioteca de vídeos, uso de storage |
| `/videos/new` · `/videos/:id/edit` | VideoEditPage | OPERAÇÃO | Upload/importação de vídeos |
| `/produtos` | ProductsPage | OPERAÇÃO | Catálogo (manual, XML, integração) |
| `/comentarios` | CommentsPage | OPERAÇÃO | Moderação (aprovar/rejeitar/responder) |
| `/medidas` | MedidasPage | AJUSTES | Modelos de medidas (tamanhos) |
| `/aparencia` | AppearancePage | AJUSTES | Editor visual de widgets |
| `/integration` | IntegrationPage | AJUSTES | Script de instalação + GTM |
| `/billing` | BillingPage | AJUSTES | Assinatura Asaas, faturas |
| `/plans` | PlansPage | AJUSTES | Comparação/upgrade de planos |
| `/settings` | SettingsPage | AJUSTES | Dados da loja, WhatsApp, preferências |
| `/suporte` | SupportPage | AJUSTES | Suporte via WhatsApp |
| `/suporte/artigos` | HelpArticlesPage | AJUSTES | Central de artigos |

### 5.3 Rotas administrativas

| Rota | Componente | Descrição |
|---|---|---|
| `/master` | `MasterAdminRoute` → `MasterAdminPage` | Painel God Mode: visão de todas as lojas, métricas globais, **impersonação** de lojistas |
| `/admin` | redirect | Redireciona para `/master` |
| `*` | redirect | Fallback → `/` |

### 5.4 Comportamentos auxiliares

- **`ScrollToTop`**: reseta a rolagem a cada mudança de rota.
- **Ordem das rotas**: rotas específicas (`/stories/widget`, `/videos/new`) são declaradas **antes** das genéricas (`/stories/:id`, `/videos/:id/edit`) para evitar conflito de match.

---

## 6. Funcionalidades Detalhadas por Módulo

### 6.1 Landing Page (`/` — `LandingPage.tsx`)

Página pública de captação com:
- **Navbar sticky** com âncoras (Analytics, Live Shopping, Comparativo, GTM, Planos) e CTAs `Entrar` / `Testar 7 Dias Grátis`;
- **Hero** com simulador visual em abas: *"Stories na Loja Virtual"* × *"Painel de BI & Atribuição"* (estado interno `activeTab`);
- **Seção de Métricas** (atribuição de vendas, drop-off segundo a segundo, API/webhooks);
- **Seção Live Shopping** com mock de player 9:16, badge AO VIVO, espectadores e produto fixado com botão comprar;
- **Compatibilidade GTM** com chips de plataformas (Shopify, Nuvemshop, WooCommerce, Tray, VTEX, Yampi, Loja Integrada, Magento);
- **Tabela comparativa** vs. concorrentes (Widde/iShorts, Tolstoy/Vidjet);
- **Planos** (Iniciante R$67 · Profissional R$147 · Escala R$297 — valores de vitrine);
- **FAQ acordeão** (estado `openFaq`);
- **CTA final + footer**.

> Todos os CTAs navegam para `/register` (trial) ou `/login`.

### 6.2 Onboarding & Configurações (`/settings`)

Primeiro acesso pós-cadastro (o `HomeGuard` redireciona aqui enquanto `store_settings.store_name` não existir). Gerencia:
- Nome/URL da loja, logo, e-mail de contato;
- **Plataforma** da loja (`platforms.ts` — 12 opções + "Outras");
- WhatsApp (número, mensagem padrão com placeholder `{{story_title}}`);
- Preferências do player: autoplay, mudo por padrão, controles, abrir produto em nova aba, pausar quando invisível/ao sair da página;
- Chaves públicas: `public_installation_key`, `store_public_id`, `public_live_key` (usadas pelo widget);
- Flags de ativação: `app_enabled`, `stories_enabled`, `carousel_enabled`, `floating_widget_enabled`.

### 6.3 Stories (`/stories`)

- CRUD de stories com **formatos**: `floating_widget` | `carousel` | `dynamic_carousel` | `grid`;
- Direção de rolagem (horizontal/vertical), ordenação (position), ativar/desativar;
- **CTA configurável**: produto vinculado, link personalizado, WhatsApp ou nenhum — com texto e URL;
- Vínculo **N vídeos** (ordem + capa) e **N produtos** por story (`story_videos`, `story_products`);
- **Regras de exibição** (`page_rules`): `home`, `all_pages`, `url_contains`, `url_equals`, `url_not_equals`;
- **Locais de exibição** (`display_locations`): seletor CSS + posição (`beforebegin`/`afterend`/`afterbegin`/`beforeend`);
- Preview (`/stories/preview/:id`) e configuração do widget (`/stories/widget`).

### 6.4 Vídeos & Biblioteca (`/armazenamento`, `/videos/*`)

- **Fontes** (`source_type`): `upload` (Supabase Storage), `instagram`, `tiktok`, `external_url`, `mobile_upload`, `gallery`;
- Importadores com OAuth oficial (Instagram/TikTok) e estrutura pronta p/ YouTube/Pinterest;
- **Upload direto** (arquivo), **URL externa** e **import por link**;
- Metadados: título, descrição, thumbnail (gerada via `fetch-thumbnail`), duração, tamanho de arquivo, produto vinculado, modelo de medidas;
- `videoEmbeds.ts` decide reprodução via `<video>` HTML5 (uploads/Supabase Storage/arquivos diretos) vs `<iframe>` YouTube;
- Storage com **limite por plano** e trigger automático de uso (`20260814000000_storage_usage_trigger.sql`).

### 6.5 Produtos (`/produtos`)

- CRUD manual (nome, imagem, URL, preço, SKU, descrição curta);
- **Importação via XML** (Google Shopping) através das edge functions `proxy-xml` + `import-products-xml`;
- Origem rastreada (`origin`: `manual` | `integration`);
- Vinculação produto × story e produto × vídeo (exibido no player como botão de compra).

### 6.6 Aparência (`/aparencia`)

Editor visual completo com **configuração responsiva** (desktop × mobile) por JSONB + campos planos:
- **Identidade**: cores (primária/secundária/texto/fundo/botão), fonte, tamanho, border-radius, sombra;
- **Widget Flutuante**: forma, tamanho, animação (pulse etc.), posição, arrastável, fechável;
- **Carrossel**: nº de itens visíveis, espaçamento, formato dos cards, bordas, margens, exibição de título/produto/play;
- **Grade**: colunas, linhas, espaçamento;
- **Modal do player**: quais botões exibir (like, comentário, compartilhar, WhatsApp, produto), sombra, bordas;
- Múltiplas **aparências nomeadas** por loja, com marcação de padrão (`is_default`) e herança global (`use_global_appearance`);
- **Preview ao vivo** (`WidgetPreview.tsx`) enquanto edita.

### 6.7 Live Commerce (`/live-commerce`)

Sessões de live (`live_sessions`) com:
- **Transmissão via YouTube** (`youtube_video_id`/`youtube_url`) — a loja não paga servidor de vídeo;
- **Status**: `scheduled` → `live` → `finished`;
- **Produtos destacados** (`featured_product_ids`) e **produto fixado** (`pinned_product_id`) com botão de compra durante a transmissão;
- **Agendamento** com contagem regressiva (`scheduled_at`, `show_countdown`) e **vídeo teaser**;
- **Cupom exclusivo** (`coupon_code`, `coupon_discount`);
- **Captura de leads** (`notify_leads_enabled`) — inscritos (nome/telefone/e-mail) notificados via WhatsApp/e-mail;
- **Compartilhamento** (`ShareLiveModal`).

### 6.8 Comentários (`/comentarios`)

- Moderação com status: `pending` | `approved` | `rejected` | `spam`;
- **Resposta da loja** (`reply_content` — exibida no widget como resposta oficial);
- Normalização de campos no db.ts (`author_name`⇄`user_name`, `content`⇄`text`).

### 6.9 Medidas / Provador (`/medidas`)

- **Modelos de medidas** (`sizing_models`): nome, foto, lista de medidas (nome + valor + unidade cm/m) e tamanho de referência;
- Vínculo de modelo a vídeos/stories (campo `model_id`) para "provador virtual".

### 6.10 Performance & Analytics (`/videos/performance`)

Quatro abas (`src/components/performance/`):
- **Overview**: KPIs do período (hoje/7d/30d/personalizado), gráficos de evolução diária;
- **Vídeos**: ranking por views, CTR, cliques em produto, receita;
- **Retenção**: curva de retenção/drop-off por segundo do vídeo;
- **Insights** (`useInsights.ts`): recomendações automáticas (ex.: "vídeos com CTA acima da média").

### 6.11 Indica & Ganha (`/indica-e-ganha`)

- Código de afiliado único + link de indicação copiável;
- RPC `get_my_affiliate_data` retorna: total de indicações, assinantes ativos, ganhos recorrentes/mês, ganhos acumulados e lista detalhada (loja, plano, valor, comissão mensal, status);
- Filtros de período (7d/30d/90d/1y/tudo).

### 6.12 Assinatura & Planos (`/billing`, `/plans`)

- Verbose em [seção 13](#13-planos-billing-e-asaas).

### 6.13 Suporte (`/suporte`, `/suporte/artigos`)

- Atendimento via WhatsApp (botão flutuante global `WhatsAppFloatingButton`);
- Central de artigos de ajuda.

### 6.14 Master Admin (`/master`)

- Acesso exclusivo via `MasterLoginPage` + `profiles.is_super_admin`;
- Visão consolidada de **todas as lojas** (MRR, assinaturas, uso);
- **Impersonação**: o super admin "entra" como um lojista para suporte (migrations 0014/0015).

---

## 7. Camada de Dados (`db.ts`)

Arquivo central que abstrai todo o acesso a dados.

### 7.1 Entidades exportadas (interfaces)

| Interface | Tabela | Descrição |
|---|---|---|
| `Store` | `stores` | Loja (nome, url, plano, status assinatura, storage) |
| `GeneralSettings` | `store_settings` | Configurações gerais da loja |
| `Appearance` | `appearances` | Aparência dos widgets (desktop/mobile JSONB) |
| `Video` | `videos` | Vídeo (fonte, URLs, thumbnail, produto, modelo) |
| `Story` | `stories` | Story (formato, CTA, ordenação) |
| `StoryVideo` | `story_videos` | Vínculo story ⇄ vídeo (ordem, capa) |
| `Product` | `products` | Produto do catálogo |
| `StoryProduct` | `story_products` | Vínculo story ⇄ produto |
| `DisplayLocation` | `display_locations` | Seletor CSS + posição de inserção |
| `PageRule` | `page_rules` | Regra de exibição por URL |
| `Comment` | `comments` | Comentário com moderação/resposta |
| `SizingModel` | `sizing_models` | Modelo de medidas |
| (+ perfis, membros, assinaturas, contadores) | `profiles`, `store_members`, `subscriptions`, `usage_counters` | Infra SaaS |

### 7.2 API do objeto `db`

```ts
db.stores.getAll(storeId?) / getById(id) / save(item) / delete(id)
db.generalSettings.*            // store_settings
db.getSettings(storeId?)        // helper: settings da loja atual
db.appearances.*
db.videos.* / db.stories.* / db.storyVideos.*
db.products.* / db.storyProducts.*
db.displayLocations.* / db.pageRules.*
db.comments.* / db.sizingModels.*
db.profiles.* / db.storeMembers.* / db.subscriptions.* / db.usageCounters.*
db.resolveStoreId(storeId?)     // resolve a loja ativa (fallback: primeira válida)
db.withStoreId(item, storeId?)  // injeta store_id válido no payload
db.replaceStoryRelations(table, storeId, storyId, relations) // regrava story_videos/story_products
```

### 7.3 Fluxo de gravação (`save`)

```
item → preparePayloadForSave:
  1. removeUndefinedValues
  2. normalizeTablePayloadBeforeSave  (aliases camelCase→snake_case)
  3. sanitizeTablePayload             (whitelist TABLE_ALLOWED_FIELDS)
  4. normalizeUuidPayload             (valida/gera UUIDs por tabela)
→ ensureSupabaseStoreExists          (garante FK da loja + owner)
→ normalizeSupabaseRelationsBeforeSave (verifica FKs: model_id, appearance_id, product_id)
→ SELECT p/ checar existência → UPDATE ou INSERT (upsert lógico)
→ normalizeTableItemForClient        (normaliza resposta p/ o front)
```

### 7.4 Fallback offline

Se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` não estiverem definidos, o mesmo CRUD opera sobre `localStorage` com chaves `vidlytics_<tabela>` (inicializadas com dados demo — loja "Loja Exemplo" e aparência "Estilo Vitrine Azul").

---

## 8. Banco de Dados (Supabase)

### 8.1 Tabelas principais (Postgres — schema `public`)

| Tabela | Papel |
|---|---|
| `stores` | Lojas multi-tenant (owner, plano, `subscription_status`, `trial_ends_at`, storage, `asaas_customer_id`) |
| `store_settings` | Configurações por loja (+ **view pública** p/ widget — migration 0011) |
| `appearances` | Aparências dos widgets (colunas planas + JSONB `floating_config`, `carousel_config`, `grid_config`, `modal_config`, `dynamic_carousel_config`) |
| `videos` | Vídeos (URLs, fonte, thumbnail, `thumbnail_file_size`) |
| `stories` | Stories (formato, CTA, contadores `view_count`/`click_count`) |
| `story_videos` / `story_products` | Relações N:N ordenadas |
| `products` | Catálogo (inclui campos de importação: `import_source`, `external_id`, `xml_id`, `category`) |
| `display_locations` / `page_rules` | Segmentação de exibição |
| `comments` | Comentários + respostas da loja |
| `metrics` | Eventos brutos do widget (legado, congelado) |
| `daily_store_metrics` | **Sistema B** de analytics — agregados diários por loja (views, cta_clicks, product_clicks, estimated_revenue) |
| `sizing_models` | Modelos de medidas |
| `profiles` | Perfil do usuário (`is_super_admin`) |
| `store_members` | Membros da loja (`owner`/`admin`/`member`) |
| `subscriptions` | Assinaturas (trialing/active/past_due/canceled) |
| `usage_counters` | Uso mensal (vídeos, views, usuários) |
| `plans` | Catálogo de planos (link com `stores.plan_id`) |
| `live_sessions` (+ leads/inscritos) | Live Commerce |

### 8.2 Segurança (RLS)

- **RLS habilitado em todas as tabelas** (migrations 0003–0007 e 0013);
- Padrão **tenant isolation**: usuários só acessam linhas das lojas onde são `owner` ou membro (`store_members`) — via `auth.uid()`;
- **Exceções públicas controladas**: view de `store_settings` e políticas anônimas específicas apenas para o que o widget público precisa (resolução de story/aparência por chave pública);
- RPCs do Master Admin protegidas (migrations 0014/0015);
- Trigger de uso de storage recalcula `storage_used_bytes` automaticamente.

---

## 9. Autenticação e Multi-Tenant

### 9.1 AuthContext (`src/context/AuthContext.tsx`)

- Expõe: `{ user, isSuperAdmin, loading, logout, refreshSuperAdmin }`;
- Bootstrap com `getCurrentUser()` + listener `onAuthStateChange` (mantém sessão viva);
- `isSuperAdmin` = `profiles.is_super_admin === true` para o `user_id`;
- `logout`: `supabase.auth.signOut()` + limpeza de `localStorage`/`sessionStorage` (preserva tema) + redirect `/login`.

### 9.2 TenantContext (`src/context/TenantContext.tsx`)

Resolve a **loja ativa** na ordem:
1. Loja salva em `localStorage.vidlytics_selected_store_id` **se** o usuário for membro dela;
2. Primeira loja em que é membro (`store_members`);
3. Loja em que é proprietário (`owner_user_id`);
4. Primeira loja disponível.

Expõe `{ currentStore, storeId, loading }` — usado por páginas e pela camada `db`.

### 9.3 Guards de rota

| Guard | Comportamento |
|---|---|
| `ProtectedRoute` | `loading` → spinner; sem user → `/login`; com user → children |
| `GuestRoute` | com user → `/dashboard` |
| `MasterAdminRoute` | exige `isSuperAdmin` (senão → `/master/login`) |
| `HomeGuard` | lógica de domínio/onboarding descrita na seção 5.1 |

---

## 10. Edge Functions (Backend Serverless)

Todas em `supabase/functions/`, runtime Deno, CORS liberado p/ o domínio do app, segredos gerenciados pelo Supabase.

| Função | Método | Autenticação | Função |
|---|---|---|---|
| `track-event` | POST | Pública (rate-limited) | Ingestão de eventos do widget. Whitelist: `video_view`, `cta_click`, `product_view`, `product_click`, `story_complete`, `share`, `next_video`, `video_close`, `whatsapp_click`, `website_click`, `like`, `unlike`, `comment`. Valida existência/assinatura/trial da loja antes de gravar |
| `widget-selector` | GET/POST | Pública (chave pública) | Retorna story+aparência+vídeos p/ o widget renderizar na loja |
| `universal-conversion` | POST | Pública | Rastreia conversões no checkout da loja (atribuição de vendas) |
| `create-asaas-subscription` | POST | JWT usuário | Cria cliente + assinatura no Asaas |
| `asaas-webhook` | POST | Assinada Asaas | Recebe pagamentos e atualiza `subscription_status` |
| `import-tiktok-video` | POST | JWT | Baixa o arquivo de vídeo do TikTok |
| `get-tiktok-media` | GET | JWT | Metadata de mídia do TikTok |
| `tiktok-oauth-callback` | GET | — | Callback OAuth TikTok |
| `import-instagram-video` | POST | JWT | Baixa vídeo do Instagram (oEmbed/Graph) |
| `instagram-auth` | POST | — | Troca code → token OAuth Instagram |
| `import-pinterest-video` | POST | JWT | Baixa vídeo do Pinterest |
| `import-products-xml` | POST | JWT | Parser de XML de produtos |
| `proxy-xml` | GET | — | Proxy CORS para XMLs externos |
| `fetch-thumbnail` | POST | JWT | Gera thumbnail a partir do vídeo |
| `proxy-preview` | GET | — | Proxy p/ previews |
| `send-email` | POST | — | Envio transacional (Resend) |

---

## 11. Widget Público e Instalação via GTM

1. **Geração do script** — `src/pages/embed/[token].ts` produz um IIFE JavaScript que:
   - Lê `data-block-id`, `data-selector`, `data-position`, `data-story-id`, `data-rules` da própria tag `<script>` (com fallback injetado do banco);
   - Resolve a posição no DOM (`beforebegin`/`afterend`/`afterbegin`/`beforeend`);
   - Avalia as `page_rules` contra a URL atual;
   - Injeta o widget em **Shadow DOM** (isolamento total de CSS — zero conflito com o tema da loja).

2. **Instalação** (`/integration` — `IntegrationPage.tsx`):
   - O lojista copia o `<script>` único;
   - Cola como **tag HTML personalizada no Google Tag Manager** (disparo em todas as páginas);
   - Compatível com qualquer plataforma: Bagy, CartPanda, Irroba, Loja Integrada, Nuvemshop, Shopify, Tray, VTEX, Wbuy, WooCommerce, Yampi, outras.

3. **Telemetria** — o widget envia eventos via `track-event` (seção 10); em offline, `offlineQueue.ts` enfileira em `localStorage` e reenvia quando a conexão volta (máx. 5 retries).

---

## 12. Analytics e Métricas

### 12.1 Fontes de dados

| Sistema | Tabela | Status |
|---|---|---|
| A (legado) | `metrics` | Congelado — mantido p/ histórico |
| **B (atual)** | `daily_store_metrics` | Agregados diários por loja usados pelo dashboard |

### 12.2 `DashboardMetrics` (`src/lib/analytics.ts`)

```ts
views, plays, pauses, clicks, ctaClicks, productClicks, whatsappClicks,
likes, shares, comments, closes, conversions, ctr, revenue
```
*(campos marcados como "sempre 0" no código são compatibilidade de exibição; os ativos hoje: views, ctaClicks, productClicks, likes, comments, conversions, ctr, revenue)*

### 12.3 Intervalos suportados
`today` · `7` · `30` · `custom` (com `date-fns` para limites de dia).

### 12.4 Atribuição de receita
- `universal-conversion` registra pedidos do checkout da loja;
- `estimated_revenue` agregado em `daily_store_metrics`;
- Performance por vídeo cruza eventos de visualização × conversões.

---

## 13. Planos, Billing e Asaas

### 13.1 Definição (`src/lib/plans.ts`)

| Plano | Mensal | Anual (20% off) | Vídeos | Views/mês | Páginas | Storage | Live |
|---|---|---|---|---|---|---|---|
| **Starter** | R$ 67 | R$ 643,20 (R$ 53,60/mês) | 10 | 5.000 | 2 | 5 GB | ❌ |
| **Pro** ⭐ | R$ 127 | R$ 1.219,20 (R$ 101,60/mês) | 30 | 20.000 | 10 | 15 GB | ✅ |
| **Scale** | R$ 247 | R$ 2.371,20 (R$ 197,60/mês) | 100 | 60.000 | Ilimitadas | 50 GB | ✅ |

- `PLAN_LIMITS` inclui fallbacks p/ slugs antigos (`iniciante`, `avançado`, `enterprise`);
- Todos com **trial de 7 dias** (`trial_ends_at` gravado no ato do cadastro da loja).

### 13.2 Fluxo de cobrança

```
RegisterPage → loja criada (status=trialing, +7 dias)
   ↓ upgrade em /plans ou /billing
create-asaas-subscription (Edge) → cliente + assinatura no Asaas (R$/Boleto/Pix/Cartão)
   ↓ pagamentos
asaas-webhook (Edge) → atualiza stores.subscription_status (active/past_due/canceled)
   ↓
track-event bloqueia eventos de lojas canceladas/inadimplentes (verificação de trial/past_due)
```

- `stores.asaas_customer_id` vincula loja ⇄ cliente Asaas;
- `usage_counters` acompanha consumo mensal vs. limites.

---

## 14. Integrações Externas

| Serviço | Uso | Config |
|---|---|---|
| **Instagram/Meta** | OAuth + importação de Reels | App ID dedicado, redirect `app.vidlytics.com.br/api/auth/instagram/callback` |
| **TikTok** | OAuth + importação de vídeos | Client Key, redirect p/ edge `tiktok-oauth-callback` |
| **YouTube** | Player das lives | Structure pronta p/ OAuth (readonly) |
| **Pinterest** | Importação de Pins de vídeo | Estrutura pronta |
| **Asaas** | Billing em Reais | Customer + Subscription + Webhook |
| **Resend** | E-mails transacionais | Edge `send-email` |
| **Google Tag Manager** | Instalação universal do widget | Tag HTML personalizada |
| **XML/Google Shopping** | Importação de catálogo de produtos | `proxy-xml` + `import-products-xml` |

---

## 15. Componentes de UI Reutilizáveis

### shadcn/ui (`src/components/ui/`)
Biblioteca completa instalada (não editar): accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, **sidebar** (usada pelo AppSidebar), skeleton, slider, switch, table, tabs, textarea, toast, toggle(-group), tooltip, use-toast.

### Componentes de aplicação (`src/components/`)

| Componente | Uso |
|---|---|
| `AppLayout` | Shell autenticado: Sidebar + Navbar + conteúdo |
| `AppSidebar` | Menu em 3 grupos (MÉTRICAS / OPERAÇÃO / AJUSTES), logo+nome da loja, plano atual, colapsável, detecta Super Admin |
| `Navbar` | Topbar com ações do usuário |
| `WidgetPreview` | Renderização de prévia do widget com a aparência editada |
| `VideoThumbnail` | Thumbnail com fallback de carregamento |
| `performance/*` | As 4 abas da página de resultados |
| `ShareLiveModal` | Compartilhamento de live |
| Diálogos | `ConfirmDeleteDialog`, `CustomDialog`, `SuccessDialog` |
| Botões flutuantes | `FloatingHelpButton`, `FloatingSupportButton`, `WhatsAppFloatingButton` |

---

## 16. Bibliotecas e Utilitários (`src/lib`)

| Arquivo | Responsabilidade |
|---|---|
| `db.ts` | Camada de dados completa (seção 7) |
| `supabase.ts` | Cliente Supabase a partir de env vars (+ flag `isSupabaseConfigured`) |
| `auth.ts` | `getCurrentUser()` e helpers de sessão |
| `analytics.ts` | Consultas de métricas do dashboard (Sistema B), intervalos de data, `DashboardMetrics` |
| `plans.ts` | `PLANS` + `PLAN_LIMITS` |
| `platforms.ts` | Catálogo de plataformas de e-commerce + `getPlatformLabel/Url` |
| `video.ts` | Utilidades de vídeo (duração, formatação) |
| `videoEmbeds.ts` | `getVideoUrl`, `isDirectVideoUrl`, decisão HTML5 × iframe YouTube |
| `videoMetrics.ts` | Agregação de métricas por vídeo |
| `likesService.ts` | Likes de visitantes no widget |
| `offlineQueue.ts` | Fila offline com retry (max 5) em `localStorage.story_offline_queue` |
| `activityLog.ts` | Registro de atividades da conta |
| `storyAppearanceHelpers.ts` | Fusão aparência global × específica do story |
| `toast.ts` / `utils.ts` | Helpers de toast e `cn()` (tailwind-merge) |
| `types/performance.ts` | Tipos compartilhados de performance |

## 17. Serviços (`src/services`)

| Arquivo | Responsabilidade |
|---|---|
| `integrations.ts` | Constantes OAuth (Instagram/TikTok/YouTube/Pinterest) + disparo dos fluxos de conexão |
| `instagram.ts` | Importação de vídeos do Instagram (via edge functions) |
| `tiktok.ts` | Importação de vídeos do TikTok |
| `metrics-service.ts` | Envio de eventos do lado da aplicação (compatibilidade) |

---

## 18. Segurança

- **RLS em 100% das tabelas** com isolamento por tenant (`auth.uid()` + `store_members`);
- **Guards de rota** em camada de UI (Protected/Guest/Master) e validação de sessão server-side nas edges com JWT;
- **Whitelists**: campos por tabela (`TABLE_ALLOWED_FIELDS`) e eventos por tipo (`ALLOWED_EVENTS` no `track-event`) — evita injeção de colunas/eventes arbitrários;
- **Sanitização de entrada**: URLs truncadas (2048 chars), device type normalizado;
- **UUID enforcement**: IDs inválidos são regenerados ou rejeitados; FKs inexistentes viram `null` (sem vazamento de dados cross-tenant);
- **Chaves públicas segregadas**: o widget usa `public_installation_key`/view pública — nunca expõe a anon key no site da loja;
- **Logout agressivo**: limpa storage local/sessão preservando apenas preferência de tema;
- **Impersonação auditada** (migrations do Master Admin).

---

## 19. Variáveis de Ambiente

Definidas no ambiente de build (Vite):

| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) |
| `VITE_PUBLIC_APP_URL` | URL pública do app (usada no embed do widget) |

Edge Functions (gerenciadas no Supabase): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` + chaves de parceiros (Asaas, Resend, Meta, TikTok).

> **Nota:** sem `VITE_SUPABASE_*`, o app roda em **modo demo** com dados em `localStorage` (chaves `vidlytics_*`).

---

## 20. Scripts e Comandos

```bash
npm run dev         # Servidor de desenvolvimento (Vite)
npm run build       # Build de produção
npm run build:dev   # Build em modo development
npm run preview     # Serve o build localmente
npm run lint        # ESLint
```

Comandos de plataforma (UI): **Rebuild** (reinstala dependências e sobe o servidor), **Restart**, **Refresh** (recarrega o preview).

---

## Apêndice A — Fluxo do Visitante na Loja (runtime do widget)

```
Página da loja carrega (GTM injeta o script)
  → IIFE lê data-attrs / usa config do banco
  → valida page_rules contra location.href
  → localiza o seletor CSS + posição
  → cria Shadow DOM
  → widget-selector (edge) retorna story + vídeos + aparência
  → renderiza (flutuante/carrossel/grade)
  → usuário interage → track-event (edge) registra evento
  → offline? → offlineQueue reenvia depois
  → dashboard do lojista lê daily_store_metrics (Sistema B)
```

## Apêndice B — Jornada do Lojista

```
Landing (/) → Cadastro (/register) → Onboarding (/settings)
  → cria vídeos (/videos/new | importações)
  → cadastra produtos (/produtos)
  → monta story (/stories → /stories/:id)
  → customiza aparência (/aparencia)
  → instala via GTM (/integration)
  → acompanha (/dashboard | /videos/performance)
  → faz lives (/live-commerce)
  → assina (/plans → /billing via Asaas)
  → indica amigos (/indica-e-ganha)
```

---

*Documentação gerada em 2026 com base na análise estática do código-fonte do projeto.*
