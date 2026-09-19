# DOCUMENTAÇÃO TÉCNICA E FUNCIONAL DO SISTEMA ATUAL

> **Documento de diagnóstico — base para a reorganização futura em Sistema Loja Criativa (SLC), Vidlytics e Live Commerce.**
> Nenhuma alteração de código, banco de dados, rotas ou dados foi realizada durante a produção deste documento.
>
> Legenda usada em todo o documento:
> - **[C]** = Confirmado no código/banco analisado
> - **[I]** = Inferido a partir de evidências (não 100% verificável estaticamente)
> - **[R]** = Recomendação futura (não implementado)

---

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [Estado atual do projeto](#2-estado-atual-do-projeto)
3. [Tecnologias](#3-tecnologias)
4. [Estrutura de arquivos](#4-estrutura-de-arquivos)
5. [Rotas](#5-rotas)
6. [Telas](#6-telas)
7. [Funcionalidades](#7-funcionalidades)
8. [Banco de dados](#8-banco-de-dados)
9. [Autenticação](#9-autenticação)
10. [Permissões](#10-permissões)
11. [Análise específica do Vidlytics](#11-análise-específica-do-vidlytics)
12. [Análise específica do Live Commerce](#12-análise-específica-do-live-commerce)
13. [Recursos compartilhados](#13-recursos-compartilhados)
14. [Dependências entre os aplicativos](#14-dependências-entre-os-aplicativos)
15. [Problemas encontrados](#15-problemas-encontrados)
16. [Riscos](#16-riscos)
17. [Proposta de arquitetura futura](#17-proposta-de-arquitetura-futura)
18. [Plano preliminar de migração](#18-plano-preliminar-de-migração)
19. [Tabelas de inventário](#19-tabelas-de-inventário)
20. [Pontos que exigem aprovação](#20-pontos-que-exigem-aprovação)
21. [Conclusão](#21-conclusão)

---

## 1. Resumo executivo

**[C]** O projeto atual é uma plataforma SaaS de **Video Commerce & Live Shopping** identificada no produto como **Vidlytics** (o `package.json` usa o nome genérico `vite_react_shadcn_ts`; o `supabase/config.toml` usa `project_id = "Vitrine_Video"`). Trata-se de um **monolito único** (um só app React + um só projeto Supabase) que contém, misturados no mesmo código e no mesmo banco:

1. **Núcleo de plataforma** (autenticação, lojas, membros, planos, billing Asaas, afiliados, master admin) — candidato natural ao futuro **Sistema Loja Criativa (SLC)**;
2. **Módulo Vidlytics** (stories/videos interativos, aparências, produtos, comentários, métricas de vídeo);
3. **Módulo Live Commerce** (lives de YouTube com chat em tempo real, produtos em destaque, cupons, spotlight, captura de leads) — atualmente **embutido dentro do app Vidlytics** (rota `/live-commerce`, menu "Live Shopping", tabelas `live_*` e lógica dentro de `public/widget.js`).

Números aproximados **[C]**:

| Item | Quantidade |
|---|---|
| Rotas declaradas em `src/App.tsx` | 33 (incl. redirects e fallback) |
| Páginas em `src/pages/` | 31 arquivos ativos + 2 órfãos + 7 arquivos `.bak` |
| Componentes próprios (fora `ui/`) | 17 (incl. 5 de Live Commerce e 4 de Performance) |
| Componentes shadcn/ui (`src/components/ui/`) | 45 |
| Hooks próprios | 3 (1 corrompido — ver §15) |
| Contextos | 2 (`AuthContext`, `TenantContext`) |
| Serviços (`src/services/`) | 5 |
| Módulos de biblioteca (`src/lib/`) | 15 |
| Tabelas no Supabase | 52 tabelas + 4 views |
| Funções Postgres | 33 |
| Policies RLS | ~90 (várias duplicadas) |
| Edge Functions | 17 existentes (+1 invocada e inexistente) |
| Migrações SQL | 31 arquivos em `supabase/migrations/` |

**Achados críticos imediatos [C]** (detalhados na §15): hook `useLiveSpotlight` corrompido (quebra o painel de administração de lives em runtime), consultas a 3 tabelas inexistentes (`tracking_events`, `orders`, `pages`) e 1 Edge Function invocada mas não criada (`calculate-insights`).

---

## 2. Estado atual do projeto

### 2.1 Identificação

| Item | Valor | Status |
|---|---|---|
| Nome do produto | **Vidlytics** (logos em `public/assets/vidlytics-*.png`, domínio `app.vidlytics.com.br` referenciado no código) | [C] |
| Nome no `package.json` | `vite_react_shadcn_ts` (genérico do template) | [C] |
| `project_id` Supabase local | `Vitrine_Video` | [C] |
| Aplicações existentes | **1 aplicação única** contendo Vidlytics + Live Commerce + núcleo SaaS | [C] |
| Aplicação futura mencionada | Sistema Loja Criativa — SLC (já existe um asset `public/assets/sll-logotipo.png` sem uso no código) | [C] |

### 2.2 Execução, build e deploy

| Aspecto | Como é feito | Status |
|---|---|---|
| Execução local | `npm run dev` (Vite, host `::`, porta **8080**) | [C] |
| Build produção | `npm run build` (`vite build`); `npm run build:dev` para modo development | [C] |
| Deploy | **Vercel** — `vercel.json` com rewrites SPA + headers `no-cache` para `/widget.js` e `/vidlytics-tracking.js` | [C] |
| Domínio de produção | `app.vidlytics.com.br` (lógico de subdomínio no `HomeGuard` do `App.tsx` e fallback em `src/pages/embed/[token].ts`) | [C] |
| Repositório GitHub | **Não identificado no código analisado** (não há pasta `.git` no workspace) | [C] |
| Outros arquivos de configuração da Vercel | `vercel.json.bak-catchall` (backup legado) | [C] |

### 2.3 Variáveis de ambiente (nomes apenas — nenhum valor exposto)

**Frontend (Vite) [C]:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WIDGET_PUBLIC_URL` (usada em `IntegrationPage.tsx`)
- `VITE_PUBLIC_APP_URL` (usada em `src/pages/embed/[token].ts`)

**Segredos configurados no Supabase (Edge Functions) [C] — apenas nomes:**
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ENVIRONMENT`, `RESEND_API_KEY`, `ASAAS_ACCESS_TOKEN`, `ASAAS_WEBHOOK_TOKEN`.

### 2.4 Integrações e serviços externos [C]

| Serviço | Uso | Onde |
|---|---|---|
| Supabase (Auth, Postgres, Storage, Realtime, Edge Functions) | Backend completo | Todo o app |
| Google OAuth | Login social | `src/lib/auth.ts` (`signInWithGoogle`) + `/auth/callback` |
| YouTube | Lives incorporadas + consulta de status | `services/youtube.ts` → Edge `fetch-youtube-live`; tabela `lives` |
| Instagram (OAuth + Basic Display) | Import de vídeos | `services/instagram.ts`, Edge `instagram-auth`, `import-instagram-video` |
| TikTok (OAuth + Content Display) | Import de vídeos | `services/tiktok.ts`, Edges `tiktok-oauth-callback`, `get-tiktok-media`, `import-tiktok-video` |
| Pinterest | Import de vídeos (scrape via edge) | Edge `import-pinterest-video` |
| Asaas | Billing (cobrança/assinaturas/webhook) | Edges `create-asaas-subscription`, `asaas-webhook` |
| Resend | Envio de e-mail | Edge `send-email` (usada no MasterAdmin) |
| WhatsApp | CTAs e suporte (deep links) | `store_settings.whatsapp_*`, botões flutuantes |
| GTM / Script tag | Instalação do widget nas lojas | `widget.js`, `IntegrationPage` |
| XML de produtos (feeds tipo Google Shopping) | Import de catálogo | Edges `import-products-xml`, `proxy-xml` |
| Yampi | Conversões (valor default `source='yampi'` na tabela `conversions`) | [C] default no banco |

---

## 3. Tecnologias

| Camada | Tecnologia | Versão declarada | Status |
|---|---|---|---|
| UI | React | 19.2.3 | [C] |
| Linguagem | TypeScript | ~5.5 | [C] |
| Bundler | Vite | 8.x | [C] |
| Roteamento | react-router-dom | 6.30.4 | [C] |
| Estilo | Tailwind CSS (+ `tailwindcss-animate`, `@tailwindcss/typography`) | 3.4 | [C] |
| Componentes | shadcn/ui + Radix UI (suite completa) | — | [C] |
| Ícones | lucide-react | 0.462 | [C] |
| Gráficos | recharts | 2.12 | [C] |
| BaaS | @supabase/supabase-js | 2.45 | [C] |
| Formulários | react-hook-form + zod + @hookform/resolvers | — | [C] |
| Toasts | sonner | 1.5 | [C] |
| Datas | date-fns | 3.6 | [C] |
| Estado servidor | @tanstack/react-query | 5.56 — **instalado e com Provider montado em `main.tsx`, porém sem queries em uso** | [C] |
| Gerenciador de pacotes | npm (scripts padrão; sem lockfile alternativo visível) | — | [I] |
| Backend | Supabase Edge Functions (Deno) | — | [C] |
| Widget público | JavaScript puro (Shadow DOM) — `public/widget.js` (340 KB) | — | [C] |

---

## 4. Estrutura de arquivos

### 4.1 Visão geral de diretórios [C]

```
/
├── public/                  # widget.js (340KB), vidlytics-tracking.js, assets de logo, favicon, robots
├── docs/                    # auditorias e docs auxiliares (auditoria-sistema-metricas, CLIENTE_DOCS, onboarding, estado-atual-aparencia)
├── src/
│   ├── main.tsx             # bootstrap React (QueryClientProvider + AuthProvider)
│   ├── App.tsx              # TODAS as rotas + guards (ProtectedRoute/GuestRoute/HomeGuard)
│   ├── App.css / globals.css
│   ├── components/          # AppLayout, AppSidebar, MasterAdminRoute, dialogs, WhatsApp*, WidgetPreview, VideoThumbnail
│   │   ├── live/            # ★ Live Commerce: LiveFormDialog, LiveAppearanceModal(94KB), LiveMetricsModal, ShareLiveModal, LiveAppearanceTab
│   │   ├── performance/     # ★ Vidlytics: overview-tab, retention-tab, videos-tab, insights-tab
│   │   └── ui/              # 45 componentes shadcn/ui (não editar)
│   ├── context/             # AuthContext, TenantContext
│   ├── hooks/               # use-mobile, useLiveChat (★ LC), useLiveSpotlight (★ LC — CORROMPIDO)
│   ├── lib/                 # db.ts(52KB), supabase.ts, auth.ts, plans.ts, analytics.ts, video*, likesService, offlineQueue, activityLog, platforms, storyAppearanceHelpers(22KB), utils
│   ├── pages/               # 31 páginas ativas + .bak's + embed/[token].ts (órfão)
│   ├── services/            # instagram, tiktok, youtube, integrations, metrics-service
│   └── utils/toast.ts
├── supabase/
│   ├── config.toml          # config local (project_id "Vitrine_Video")
│   ├── functions/           # 17 Edge Functions (Deno)
│   └── migrations/          # 31 migrações SQL (histórico do schema)
└── (raiz)                   # vercel.json, configs TS/ESLint/Tailwind, DOCUMENTACAO.md, auditorias, scripts .ps1, arquivos temporários .txt
```

### 4.2 Arquivos de entrada e configuração [C]

| Arquivo | Finalidade |
|---|---|
| `index.html` | Shell SPA |
| `src/main.tsx` | Bootstrap React + providers |
| `src/App.tsx` | Rotas e guards (arquivo central de navegação) |
| `vite.config.ts` | Alias `@` → `src`, porta 8080, plugin Dyad tagger |
| `vercel.json` | Rewrites/headers de produção |
| `tsconfig*.json`, `eslint.config.js`, `postcss.config.js`, `tailwind.config.ts`, `components.json` | Configs padrão |
| `supabase/config.toml` | Config local do CLI Supabase |

### 4.3 Mapeamento dos arquivos relevantes (finalidade / classificação)

Classificações: **SLC** (Sistema Loja Criativa), **VID** (Vidlytics), **LC** (Live Commerce), **COM** (Compartilhado), **IND** (Indefinido/avaliar).

#### Núcleo / infraestrutura

| Arquivo | Finalidade | Principais funções | Classificação |
|---|---|---|---|
| `src/main.tsx` | Bootstrap | createRoot, providers | COM |
| `src/App.tsx` | Rotas + guards | `ProtectedRoute`, `GuestRoute`, `HomeGuard`, `ScrollToTop`, mapa de rotas | COM |
| `src/context/AuthContext.tsx` | Sessão + super admin | `useAuth`, `checkSuperAdminStatus`, `logout`, listener `onAuthStateChange` | SLC |
| `src/context/TenantContext.tsx` | Loja ativa (multi-tenant no cliente) | `useTenant`, seleção de loja (membro → owner → fallback `stores[0]`), persistência em localStorage `vidlytics_selected_store_id` | SLC |
| `src/lib/supabase.ts` | Cliente Supabase (env VITE_*) | `supabase`, `isSupabaseConfigured` | SLC |
| `src/lib/auth.ts` | Auth + provisionamento de tenant | `signIn`, `signInWithGoogle`, `signUp`, `ensureUserTenantAtomics` (RPC `create_or_get_user_tenant` + fallback), `getActiveReferralCode`, `createInitialTenantForUser`, `getTenantForUser`, `resolveCurrentStoreId` | SLC |
| `src/lib/plans.ts` | Definição de planos **hardcoded no front** | `PLANS` (starter/pro/scale), `PLAN_LIMITS` (+fallbacks legados iniciante/avançado/enterprise) | SLC (⚠ duplicado com tabela `plans`) |
| `src/components/AppLayout.tsx` | Layout autenticado (header/sidebar) | — | COM |
| `src/components/AppSidebar.tsx` | Menu principal (grupos MÉTRICAS/OPERAÇÃO/AJUSTES) — inclui item **"Live Shopping"** | carrega loja/plano/super-admin | COM (⚠ menu mistura VID+LC) |
| `src/components/MasterAdminRoute.tsx` | Guard de super admin | checa `profiles.is_super_admin` | SLC |

#### Bibliotecas (`src/lib`)

| Arquivo | Finalidade | Classificação |
|---|---|---|
| `db.ts` (52 KB) | Camada de dados central (interfaces + CRUD + cache localStorage) para stores, videos, stories, appearances, comments, metrics, usageCounters, generalSettings, storeMembers… | COM (⚠ arquivo-concentrador; mistura VID e SLC) |
| `analytics.ts` | Leituras de `daily_store_metrics`, `daily_video_metrics`, `conversions`, `video_likes`, `comments` | VID (conversions é COM) |
| `activityLog.ts` | Escrita em `activity_logs` | COM |
| `likesService.ts` | Likes via RPC `toggle_video_like_safe` | VID |
| `offlineQueue.ts` | Fila offline de eventos (retry) | VID |
| `video.ts`, `videoEmbeds.ts`, `videoMetrics.ts` | Utilidades de vídeo/embeds/métricas | VID |
| `storyAppearanceHelpers.ts` (22 KB) | Helpers de aparência de stories | VID |
| `platforms.ts` | Catálogo de plataformas de e-commerce | COM |

#### Serviços (`src/services`) — todos com classificação VID (import de vídeos) exceto integrations (COM)

| Arquivo | Finalidade | Classificação |
|---|---|---|
| `instagram.ts` | Integração IG (`store_integrations`) | VID |
| `tiktok.ts` | Mídia TikTok via edge `get-tiktok-media` | VID |
| `youtube.ts` | Status de live YouTube via edge `fetch-youtube-live` | **LC** (usado no contexto de lives) |
| `integrations.ts` | Gestão de integrações da loja | COM |
| `metrics-service.ts` | Agregações de métricas (stores, benchmarks) | VID |

#### Hooks

| Arquivo | Finalidade | Classificação | Status |
|---|---|---|---|
| `use-mobile.tsx` | Detecção mobile (shadcn) | COM | OK |
| `useLiveChat.ts` | Chat da live (Realtime + insert em `live_chat_messages`) | LC | OK |
| `useLiveSpotlight.ts` | **CORROMPIDO**: contém cópia integral de `LiveAdminPage.tsx` (676 linhas), com **export inexistente** `useLiveSpotlight` e import circular de si mesmo | LC | **QUEBRADO** [C] |

#### Páginas — classificação por aplicativo

| Página | Finalidade | Classificação |
|---|---|---|
| `LandingPage.tsx` | Landing pública de vendas | SLC |
| `LoginPage.tsx` / `RegisterPage.tsx` | Login/cadastro (com código de indicação) | SLC |
| `AuthCallbackPage.tsx` / `auth/InstagramCallback.tsx` | Callbacks OAuth (Google / Instagram) | SLC / VID |
| `MasterLoginPage.tsx` / `MasterAdminPage.tsx` | God-mode (dashboard global, gestão de lojas/planos/auditoria/impersonação, e-mail) | SLC |
| `DashboardPage.tsx` (52 KB) | Dashboard principal (mistura métricas VID + conversões + afiliados) | COM |
| `PerformancePage.tsx` + `components/performance/*` | Resultados de vídeos (overview/retention/videos/insights) | VID |
| `VideoPerformancePage.tsx` | Métricas por vídeo | VID |
| `StoriesPage.tsx` / `StoryDetailsPage.tsx` / `StoriesWidgetPage.tsx` / `StoryPreviewPage.tsx` | CRUD e preview de stories | VID |
| `VideoEditPage.tsx` / `StoragePage.tsx` (88 KB) | Biblioteca de vídeos/uploads (buckets `videos`/`store-assets`) | VID |
| `VideoGalleryPage.tsx` | **Órfã** — não roteada (`/gallery` redireciona para `/armazenamento`) | VID (morto) |
| `ProductsPage.tsx` (89 KB) | Catálogo de produtos (CRUD + import XML) | **COM** (usado por VID e LC) |
| `MedidasPage.tsx` | Modelos de medidas (`sizing_models`) | VID |
| `AppearancePage.tsx` (**208 KB**) | Aparências dos widgets | VID |
| `CommentsPage.tsx` | Moderação de comentários | VID |
| `IntegrationPage.tsx` | Instalação do widget (script/GTM) | COM (script serve VID+LC) |
| `SettingsPage.tsx` (43 KB) | Configurações da loja | SLC (inclui colunas live_* → LC embutido) |
| `BillingPage.tsx` / `PlansPage.tsx` | Assinatura/planos + checkout Asaas | SLC |
| `IndicaGanhaPage.tsx` | Programa de afiliados (RPC `get_my_affiliate_data`, saques) | SLC |
| `SupportPage.tsx` / `HelpArticlesPage.tsx` | Suporte/artigos | SLC |
| `LiveCommercePage.tsx` | **Listagem/CRUD de lives** (gating por `plans.allows_live`) | LC |
| `LiveAdminPage.tsx` (32 KB) | **Painel de administração da live** (chat, spotlight, métricas) | LC |
| `NotFound.tsx` | 404 | COM |
| `embed/[token].ts` | **Órfão** — gerador de script de embed (não roteado; usa `Request`, típico de edge/server) | IND |

#### Componentes específicos

| Componente | Classificação |
|---|---|
| `components/live/*` (LiveFormDialog 63 KB, LiveAppearanceModal 94 KB, LiveMetricsModal, ShareLiveModal, LiveAppearanceTab) | LC |
| `components/performance/*` (overview, retention, videos, insights) | VID |
| `WidgetPreview.tsx`, `VideoThumbnail.tsx` | VID |
| `WhatsAppFloatingButton`, `WhatsAppIcon`, `FloatingHelpButton`, `FloatingSupportButton`, `ConfirmDeleteDialog`, `CustomDialog`, `SuccessDialog` | COM |
| `ui/*` (45 shadcn) | COM |

#### Arquivos aparentemente abandonados / lixo / duplicados [C]

- **Backups**: `public/widget.js.bak*` (×12), `widget.js.limpo`, `AppearancePage.tsx.bak*` (×4), `StoriesPage.tsx.bak`, `vercel.json.bak-catchall`, `public/widget.backup.20260918_150035.js`.
- **Temporários de análise**: `temp_*.txt` (×6), `dynamic_carousel_*.txt` (×2), `trecho-*.txt` (×2), `widget_*.txt` (×5), `arquivos_src.txt`.
- **Scripts pontuais**: `*.ps1` (×7), `_check.cjs`, `_check.js`, `balance-check.*`, e um arquivo com nome inválido literal `node _check2.cjs`.
- **Órfãos**: `VideoGalleryPage.tsx`, `embed/[token].ts`.
- **Documentação redundante na raiz**: `DOCUMENTACAO.md` (45 KB, pré-existente), `auditoria-completa-vidlytics.md`.

#### Arquivos que concentram responsabilidades demais [C]

`AppearancePage.tsx` (208 KB), `ProductsPage.tsx` (89 KB), `StoragePage.tsx` (88 KB), `LiveAppearanceModal.tsx` (94 KB), `db.ts` (52 KB), `DashboardPage.tsx` (52 KB), `MasterAdminPage.tsx` (50 KB), `widget.js` (340 KB — stories + live no mesmo arquivo).

---

## 5. Rotas

Mapa completo declarado em `src/App.tsx` **[C]**. Todas as rotas autenticadas usam apenas `ProtectedRoute` (verifica login); nenhuma rota de aplicativo valida permissão além de `/master` (super admin).

### 5.1 Rotas candidatas ao Sistema Loja Criativa

| Rota | Tela | Arquivo | Auth | Observações |
|---|---|---|---|---|
| `/login` | Login | `LoginPage.tsx` | Pública (GuestRoute) | E-mail/senha + Google |
| `/register` | Cadastro | `RegisterPage.tsx` | Pública (GuestRoute) | Cria loja + código de indicação |
| `/auth/callback` | Callback OAuth Google | `AuthCallbackPage.tsx` | Pública | Provisiona tenant |
| `/master/login` | Login Master | `MasterLoginPage.tsx` | Pública | — |
| `/master` (e `/admin` → redirect) | Painel God | `MasterAdminPage.tsx` | **Super admin** | RPCs admin_* + audit_logs |
| `/settings` | Configurações da loja | `SettingsPage.tsx` | Auth | ⚠ inclui config de live (`live_widget_config`) |
| `/billing` | Assinatura | `BillingPage.tsx` | Auth | ⚠ consulta tabela inexistente `pages` |
| `/plans` | Planos/checkout | `PlansPage.tsx` | Auth | Edge `create-asaas-subscription` |
| `/indica-e-ganha` | Afiliados | `IndicaGanhaPage.tsx` | Auth | RPC `get_my_affiliate_data` |
| `/suporte`, `/suporte/artigos` | Suporte | `SupportPage.tsx`, `HelpArticlesPage.tsx` | Auth | — |
| `/` | Home guard | `HomeGuard` (App.tsx) | Condicional | Landing em domínio não-app; senão → login/settings/dashboard |

### 5.2 Rotas específicas do Vidlytics

| Rota | Tela | Arquivo | Auth |
|---|---|---|---|
| `/stories` | Lista de stories | `StoriesPage.tsx` | Sim |
| `/stories/:id` | Detalhe/edição do story | `StoryDetailsPage.tsx` | Sim |
| `/stories/widget` | Config do widget de stories | `StoriesWidgetPage.tsx` | Sim |
| `/stories/preview/:id` | Preview do story | `StoryPreviewPage.tsx` | Sim |
| `/videos/new`, `/videos/:id/edit` | Criar/editar vídeo | `VideoEditPage.tsx` | Sim |
| `/videos/performance` | Resultados | `PerformancePage.tsx` | Sim |
| `/videos/:videoId/performance` | Resultados por vídeo | `VideoPerformancePage.tsx` | Sim |
| `/armazenamento` (e `/storage`, `/gallery` → redirects) | Biblioteca | `StoragePage.tsx` | Sim |
| `/produtos` | Produtos | `ProductsPage.tsx` | Sim |
| `/medidas` | Medidas | `MedidasPage.tsx` | Sim |
| `/aparencia` | Aparências | `AppearancePage.tsx` | Sim |
| `/comentarios` | Comentários | `CommentsPage.tsx` | Sim |
| `/dashboard` | Dashboard | `DashboardPage.tsx` | Sim (classificado COM — mistura VID+afiliados+conversões) |

### 5.3 Rotas específicas do Live Commerce

| Rota | Tela | Arquivo | Auth | Observações |
|---|---|---|---|---|
| `/live-commerce` | Lista/CRUD de lives | `LiveCommercePage.tsx` | Sim | Gating `plans.allows_live`; item "Live Shopping" no menu do Vidlytics |
| `/live-commerce/:liveId/administrar` | Painel ao vivo (chat/spotlight) | `LiveAdminPage.tsx` | Sim | **QUEBRADA em runtime** (hook `useLiveSpotlight` corrompido) [C] |
| (público, sem rota SPA) | Player público da live | `public/widget.js` (script na loja) | Anon | Lê `lives`, `live_settings`/view pública, `products`, `live_chat_messages`, `live_events`, `live_coupons`, `live_advantages`, `live_subscribers` |

### 5.4 Rotas compartilhadas / indefinidas

| Rota | Classificação | Motivo |
|---|---|---|
| `/integration` | COM | Instala o **script único** que serve Stories (VID) e Live (LC) |
| `/api/auth/instagram/callback` e `/auth/instagram/callback` | VID (dupla) | Duas variantes para o mesmo callback — inconsistência de nomenclatura |
| `*` → `/` | COM | Fallback |
| Rota de embed (`embed/[token].ts`) | IND | Arquivo não roteado |

### 5.5 Conflitos de nomenclatura pós-separação [I]

- `/live-commerce/**` já é um prefixo limpo — bom candidato a app próprio (ou subdomínio).
- `/dashboard`, `/produtos`, `/settings`, `/billing`, `/integration` existiriam nos **três** apps pós-separação (SLC central + VID + LC) — exigirá decisão de URLs (subdomínios vs. prefixos).
- `/storage` + `/armazenamento` + `/gallery` (três caminhos para a mesma tela) devem ser unificados antes da separação.

---

## 6. Telas

(Ver §5 — cada rota mapeia 1:1 a uma tela. Telas públicas adicionais: landing pública em domínio raiz via `HomeGuard`; player público de live renderizado por `widget.js` no site da loja, fora do SPA.)

Principais fluxos de usuário confirmados **[C]**:
1. **Onboarding**: `/register` → cria auth user → RPC `create_or_get_user_tenant` (perfil + loja + owner member + store_settings + usage_counters) → `/settings` (HomeGuard força se `store_name` vazio) → `/dashboard`.
2. **Publicação de story**: `/armazenamento` (upload/import) → `/stories` → `/stories/:id` (vídeos/produtos/regras) → `/aparencia` → `/integration` (script/GTM).
3. **Live**: `/live-commerce` → Nova Live (`LiveFormDialog`: YouTube URL/ID, teaser, produtos, cupons, vantagens, agenda) → iniciar → `/live-commerce/:id/administrar` (chat/spotlight) → finalizar → métricas (`LiveMetricsModal`).
4. **Assinatura**: `/plans` → Edge `create-asaas-subscription` → Asaas → webhook (`asaas-webhook`) atualiza `subscriptions`/`invoices`/`stores` + `referral_rewards`.
5. **Master**: `/master/login` → `/master` (stats, lista de lojas, set plan/lifetime/extend, audit_logs, e-mail via `send-email`).

---

## 7. Funcionalidades

Status: ✅ funcional (implementação confirmada) · 🟡 parcial/dependente · ❌ quebrada.

### 7.1 Autenticação e conta

| Funcionalidade | Descrição | Tabelas | Status | Classificação |
|---|---|---|---|---|
| Login e-mail/senha | Supabase Auth | `auth.users`, `profiles` | ✅ | SLC |
| Login Google (OAuth) | `signInWithGoogle` + callback | idem | ✅ | SLC |
| Cadastro com criação de loja | RPC `create_or_get_user_tenant` (+ fallback JS) | `profiles`, `stores`, `store_members`, `store_settings`, `usage_counters` | ✅ | SLC |
| Logout | signOut + limpeza de storage | — | ✅ | SLC |
| Recuperação de senha | **Não identificada no código analisado** (nenhuma chamada `resetPasswordForEmail`/tela de recovery) | — | ❌ ausente | SLC |
| Perfil do usuário | Sem tela dedicada; `profiles` atualizável via RLS própria | `profiles` | 🟡 | SLC |
| Super admin (God mode) | `profiles.is_super_admin` + trigger `auto_assign_super_admin` (e-mails hardcoded) | `profiles`, `audit_logs` | ✅ | SLC |

### 7.2 Lojas, membros e configurações

| Funcionalidade | Tabelas | Status | Classificação |
|---|---|---|---|
| Multi-tenant por loja (1 usuário → N lojas via membership) | `stores`, `store_members` | ✅ | SLC |
| Troca/seleção de loja ativa (cliente) | localStorage + `TenantContext` | ✅ | SLC |
| Membros/convites | **Não há tela de gestão de membros** — apenas infraestrutura (`store_members`, policies). Necessita validação manual se existir outro fluxo | 🟡 | SLC |
| Configurações da loja (dados, WhatsApp, setor, logo, chaves públicas) | `store_settings`, `stores`, `sectors` | ✅ | SLC (⚠ contém config LC) |
| Organizações (acima de lojas) | **Não identificada no código analisado** — o tenant é a loja | — | SLC (futuro) |

### 7.3 Vidlytics — conteúdo

| Funcionalidade | Tabelas/Edges | Status | Classificação |
|---|---|---|---|
| Biblioteca de vídeos (upload p/ buckets `videos`/`store-assets`, URL externa) | `videos`, Storage | ✅ | VID |
| Import TikTok / Instagram / Pinterest | edges `import-*-video` | ✅ | VID |
| Import por URL com thumbnail automática | edge `fetch-thumbnail` | ✅ | VID |
| Stories (CRUD, formatos carousel/floating/grid/inline, CTA, ordenação) | `stories`, `story_videos`, `story_products` | ✅ | VID |
| Aparências (cores, fontes, config responsiva por dispositivo, carrossel dinâmico) | `appearances`, `store_settings.default_appearance_id` | ✅ | VID |
| Regras de exibição por página/seletor | `display_locations`, `page_rules`, `selector_sessions` + edge `widget-selector` | ✅ | VID |
| Produtos (CRUD manual + import XML) | `products`, edges `import-products-xml`, `proxy-xml` | ✅ | **COM** |
| Modelos de medida | `sizing_models` | ✅ | VID |
| Comentários (moderação, resposta, aprovação automática) | `comments`, view `comments_public`, RPC `create_comment_safe` | ✅ | VID |
| Likes | `video_likes`, RPC `toggle_video_like_safe` | ✅ | VID |
| Widget público de stories (`widget.js`, Shadow DOM) | leitura pública `stories`/`videos`/`appearances` | ✅ | VID |
| Instalação via script/GTM | `IntegrationPage` | ✅ | COM |

### 7.4 Vidlytics — métricas

| Funcionalidade | Tabelas | Status | Classificação |
|---|---|---|---|
| Tracking de eventos do widget (views, cliques, watch time) | edge `track-event` → RPC `track_widget_event` → `store_activity_events`, `usage_counters` | ✅ | VID (LC usa p/ lives? ver §12) |
| Conversões/rastreamento de vendas | `vidlytics-tracking.js` + edge `universal-conversion` → `conversions` (tem `live_id`) | ✅ | **COM** |
| Dashboard geral | `usage_counters`, `conversions`, `referral_rewards`, `activity_logs`, counts | ✅ | COM |
| Resultados (overview) | `tracking_events` (**tabela inexistente**) + `conversions` + `referral_rewards` | ❌ parcial | VID |
| Retenção | `videos`, `store_activity_events` | ✅ | VID |
| Insights de IA | `ai_insights` + edge `calculate-insights` (**inexistente**) | ❌ parcial | VID |
| Benchmarks por setor | `sector_benchmarks`, `benchmarks`, `sectors`; função `sync_sector_benchmarks` referencia `tracking_events` (inexistente) | 🟡 | VID |
| Métricas diárias agregadas | `daily_store_metrics`, `daily_video_metrics` — **sem job de agregação identificado no código** (necessita validação manual; possível dado desatualizado/vazio) | 🟡 | VID |
| Limpeza de eventos (retenção 90d) | função `purge_old_activity_events` — **sem agendamento (pg_cron) identificado** | 🟡 | VID |

### 7.5 Live Commerce

| Funcionalidade | Tabelas/Recursos | Status | Classificação |
|---|---|---|---|
| CRUD de lives (YouTube URL/ID, teaser upload, agenda, badge) | `lives`, bucket `videos` | ✅ | LC |
| Produtos em destaque na live | `lives.featured_product_ids` (JSONB) + `products` | ✅ | LC |
| Cupons e vantagens | `lives.coupons`/`advantages` (JSONB) **e** tabelas `live_coupons`, `live_advantages` (⚠ duplicidade de modelagem) | 🟡 | LC |
| Gating por plano | `plans.allows_live` | ✅ | LC/SLC |
| Aparência da live (widget divulgação / ao vivo / player, por dispositivo) | `live_settings` (+ `store_settings.live_widget_config/live_player_config` legado) | ✅ | LC |
| Divulgação (share) | `ShareLiveModal` | ✅ | LC |
| Chat em tempo real | `live_chat_messages` + Supabase Realtime + trigger anti-spam `check_chat_rate_limit` | ✅ | LC |
| Painel de administração ao vivo | `LiveAdminPage` | ❌ **quebrado** (hook corrompido) | LC |
| Spotlight (produto/cupom/vantagem em destaque, polling 4s) | `lives.spotlight_*` — widget público lê direto | ✅ | LC |
| Métricas da live | `live_events` (views/viewers/pico/cliques) | ✅ | LC |
| Receita da live | `LiveMetricsModal` consulta tabela `orders` (**inexistente**) e `conversions.live_id` | ❌ parcial | LC |
| Captura de leads (inscritos) | `live_subscribers` (insert público) | ✅ | LC |
| Notificação de leads (WhatsApp/e-mail) | flag `lives.notify_leads_enabled` — implementação de envio **não identificada no código analisado** | 🟡 | LC |
| Player público na loja | `widget.js` (seção live: badge, countdown, teaser, player YouTube, produtos, chat público) | ✅ | LC |

### 7.6 Billing / planos / afiliados (SLC)

| Funcionalidade | Tabelas/Edges | Status |
|---|---|---|
| Catálogo de planos (dinâmico no banco) | `plans` | ✅ |
| Assinatura vigente + histórico | `subscriptions` (is_current) + trigger `sync_store_plan_id` → `stores.plan_id` | ✅ |
| Checkout Asaas (PIX/cartão) | edge `create-asaas-subscription`, `billing_info` | ✅ |
| Webhook de pagamentos | edge `asaas-webhook` → `asaas_webhook_events`, `subscriptions`, `invoices`, `stores`, `referral_rewards` | ✅ |
| Faturas | `invoices` | ✅ |
| Trial 7 dias | trigger `set_trial_defaults` / `set_store_trial_defaults` (plan UUID hardcoded) | ✅ |
| Afiliados "Indica & Ganha" (10%) | `stores.referral_code/referred_by_store_id`, `referral_rewards`, RPC `get_my_affiliate_data` | ✅ |
| Saques de afiliado | `affiliate_withdrawals` (request) — processamento manual via Master | ✅ |
| Administração manual de planos | RPCs `admin_set_store_plan`, `admin_set_store_lifetime`, `admin_extend_subscription` | ✅ |

### 7.7 Integrações externas

Instagram OAuth (`instagram-auth`, `store_integrations`), TikTok OAuth (`tiktok-oauth-callback`), YouTube live status (`fetch-youtube-live`), XML produtos (`import-products-xml`/`proxy-xml`), proxies CORS (`proxy-preview`, `proxy-xml`), e-mail transacional (`send-email`/Resend). Todas ✅ conforme presença de código; funcionamento em produção **necessita validação manual** (dependem de secrets/contas externas).

### 7.8 Não implementado / não encontrado

- Categorias de produtos como entidade própria (**não identificada** — apenas `products.category` texto livre).
- Mídias centrais (biblioteca de imagens) como módulo — apenas buckets de storage.
- Notificações in-app (apenas toasts locais).
- Recuperação de senha.
- Organizações acima de lojas.
- Permissões por módulo (ver §10).

---

## 8. Banco de dados

Projeto Supabase: `wznvecurmisgoaijykbt` **[C]**. 52 tabelas + 4 views. RLS habilitado em todas as tabelas consultadas com `rls_enabled: true` (as views não têm RLS próprio — dependem das tabelas-base) **[C]**.

### 8.1 Tabelas por grupo funcional

**Núcleo SaaS (candidatas SLC):** `profiles`, `stores`, `store_members`, `store_settings`, `store_integrations`, `plans`, `subscriptions`, `invoices`, `billing_info`, `asaas_webhook_events`, `referral_rewards`, `affiliate_withdrawals`, `usage_counters`, `activity_logs`, `audit_logs`, `sectors`, `selector_sessions`.

**Vidlytics:** `videos`, `stories`, `story_videos`, `story_products`, `appearances`, `display_locations`, `page_rules`, `comments`, `video_likes`, `video_placements`, `sizing_models`, `store_activity_events`, `analytics_rate_limits`, `daily_store_metrics`, `daily_video_metrics`, `insights`, `ai_insights`, `insight_rules`, `insight_rule_conditions`, `benchmarks`, `sector_benchmarks`, `widget_selectors`.

**Live Commerce:** `lives`, `live_events`, `live_chat_messages`, `live_subscribers`, `live_coupons`, `live_advantages`, `live_settings`.

**Compartilhadas:** `products` (stories + lives), `conversions` (vídeos + lives via `live_id`), `stores`/`plans` (gating `allows_live`).

**Views:** `stores_public` (dados mínimos da loja p/ widget), `store_settings_public` (config pública do widget, **inclui `live_widget_config`/`live_player_config`** — dependência LC dentro de view "VID"), `comments_public`, `public_live_settings` (config pública de live).

### 8.2 Detalhamento das tabelas principais

| Tabela | Colunas-chave (resumo) | PK | FKs (inferidas/conteúdo) | Observações |
|---|---|---|---|---|
| `profiles` | id (uuid, = auth.users.id), **user_id** (duplicado de id), email, name, avatar_url, role ('user'), document_number, phone, is_super_admin | id | auth.users | ⚠ dupla identidade id/user_id [C] |
| `stores` | id, name, url, platform (default 'yampi'), logo_url, owner_user_id, sector/sector_id/slug(sync trigger), storage_used/limit_bytes, plan_id, asaas_customer_id, subscription_status (default 'trialing'), trial_ends_at, plan_tier (legado 'starter'), stripe_* (legado), referral_code (trigger VID-XXXXXX), referred_by_store_id, active, pix_key*, owner_contact_email, contact_name, settings jsonb | id | auth.users (owner), plans | Concentra billing + afiliados + storage [C] |
| `store_members` | id, store_id, user_id, role ('member' default; valores usados: owner/admin/member) | id | stores, auth.users | Base de permissões |
| `store_settings` | ~40 colunas: dados da loja, whatsapp_*, flags de widget (stories/carousel/floating), autoplay, timezone, language, default_appearance_id, security_token, public_installation_key, **public_live_key, live_widget_config, live_player_config**, auto_approve_comments, logo_file_size, platform, owner_contact_email | id | stores | ⚠ mistura SLC + VID + LC [C] |
| `plans` | slug, name, price_cents, billing_cycle, views/videos/pages_limit, storage_limit_bytes, features jsonb, is_popular, is_active, **allows_live** | id | — | Fonte de verdade de planos (duplicada no front `plans.ts`) |
| `subscriptions` | store_id, plan_id, status (active/trialing/past_due/canceled/lifetime), current_period_*, is_current, gateway_* (asaas/stripe legado), asaas_*, payment_method (PIX default) | id | stores, plans | Trigger sincroniza `stores.plan_id` |
| `invoices` | store_id, subscription_id, amount_cents, status, due_date, gateway/asaas ids, urls | id | stores, subscriptions | — |
| `billing_info` | dados fiscais completos **em dois conjuntos duplicados** (novos `document_*` e legados `cnpj_cpf/cep/...`) | id | stores | ⚠ colunas legadas [C] |
| `videos` | store_id, title, video_source_type (url/upload/...), video_url/file_path, thumbnail_*, product_id, sizing_model_id/model_id (⚠ dupla referência), status+active (⚠ duplicado), file_size, thumbnail_file_size | id | stores, products, sizing_models | Triggers de storage e log |
| `stories` | store_id, title, format, appearance_id, model_id, display_selector/position, page_rule_*, cta_*, click_count, view_count, active+is_active (⚠ duplicado) | id | stores, appearances | — |
| `story_videos` / `story_products` | story_id, video_id/product_id, position, is_cover | id | stories, videos, products | — |
| `appearances` | store_id, name, is_default, cores, fontes, floating/carousel/grid/modal_config jsonb, **dynamic_carousel_config** (default enorme) | id | stores | Trigger sanitiza cores |
| `display_locations` / `page_rules` | story_id, location/selector/position; condition_type/value | id | stores, stories | Regras de exibição |
| `comments` | video_id, store_id, user_name/email, content, status (pending/approved), parent_id, reply_* | id | videos, stores | RPC pública `create_comment_safe` |
| `video_likes` | video_id, store_id, user_fingerprint | id | videos | RPC com rate limit |
| `products` | store_id, external_id, name, category (texto), price/sale_price, images jsonb, product_url, image_url, sku, origin/import_source/xml_id, active+is_active (⚠ duplicado) | id | stores | **COM** (stories + lives + import XML) |
| `sizing_models` | store_id, name, measures jsonb, size_name | id | stores | — |
| `store_activity_events` | store_id, event_type, video_id, product_id, session_id, watch_second, metadata | id | stores | Eventos brutos do widget |
| `usage_counters` | store_id, month (YYYY-MM), videos/views/users_count | id | stores | Único por (store, month) |
| `daily_store_metrics` / `daily_video_metrics` | contadores diários (views, cliques, likes, comments, receita estimada) | id | stores(+videos) | **Sem job de agregação identificado** [C] |
| `conversions` | store_id, video_id, product_id, **live_id**, visitor_id, order_id, order_value, status, source (default 'yampi') | id | stores(+live) | **COM** VID+LC |
| `analytics_rate_limits` | client_hash, store_id, window_minute, request_count | composta | — | Suporte às RPCs |
| `insights` / `ai_insights` / `insight_rules` / `insight_rule_conditions` | motor de insights (regras + gerados) | id | stores(+videos) | Edge `calculate-insights` ausente |
| `benchmarks` / `sector_benchmarks` / `sectors` | benchmarks por setor | id | sectors | Função sync usa `tracking_events` (inexistente) |
| `lives` | store_id, title, youtube_url/video_id, status (scheduled/live/ended; trigger is_active), badge_*, featured_product_ids jsonb, teaser_*, show_countdown, pinned/spotlight_product_id, spotlight_coupon_code, spotlight_advantage_idx, promo_* (janela de divulgação), whatsapp_group_url, product_cta_texts, coupons jsonb, advantages jsonb, appearance_template_id ('preset_padrao'), live_widget_config, live_player_config, notify_leads_enabled, youtube_thumbnail_url | id | stores | Tabela central do LC |
| `live_events` | live_id, event_type, metadata | id | lives | INSERT público (sem rate limit) |
| `live_chat_messages` | live_id, store_id, author_name, message, is_from_store, session_id | id | lives | Realtime + trigger anti-spam (5 msg/10s) |
| `live_subscribers` | live_id, store_id, name/phone/email | id | lives | Leads capturados; INSERT público |
| `live_coupons` / `live_advantages` | live_id, store_id, code/discount/title/position | id | lives | ⚠ também modelados como JSONB em `lives` |
| `live_settings` | store_id (único por loja), widget_divulgacao, widget_aovivo, player_settings (jsonb por dispositivo) | id | stores | Aparência global do LC |
| `store_integrations` | store_id, platform, account_id/username, access_token, refresh_token, token_expires_at | id | stores | ⚠ tokens OAuth em tabela com policy de membro |
| `activity_logs` / `audit_logs` | logs de atividade (trigger) / auditoria master | id | stores | — |
| `referral_rewards` | referrer/referred_store_id, amount, status, commission_rate (10), asaas_payment_id | id | stores | Afiliados |
| `affiliate_withdrawals` | store_id, amount, pix_key*, status, proof_url, admin_notes | id | stores | Saques |
| `asaas_webhook_events` | event_id/type, payment/subscription_id, payload | id | — | Idempotência do webhook |
| `selector_sessions` | token, selector, story_id, store_id | id | — | Selector visual; policies permissivas |
| `widget_selectors` | token, selector, story_id (text) | bigint/seq | — | **Sem uso no frontend** [C] |
| `video_placements` | store_id, video_id, page, position, content_type | id | videos | **Sem uso no frontend** [C] |
| `app_settings` | store_id, settings jsonb, platform | id | stores | **Sem uso no frontend** [C] |

### 8.3 Funções (33) e triggers — resumo

**Auth/tenant:** `handle_new_user` (trigger → cria `profiles`), `create_or_get_user_tenant`, `auto_assign_super_admin` (trigger, e-mails hardcoded), `is_super_admin`.
**Acesso:** `is_store_owner`, `is_store_owner_or_admin`, `is_store_owner_or_member`, `is_store_member`, `is_store_admin`, `user_has_store_access`, `store_exists`.
**Billing/admin:** `set_trial_defaults`, `set_store_trial_defaults`, `sync_store_plan_id`, `admin_set_store_plan`, `admin_set_store_lifetime`, `admin_extend_subscription`, `get_master_dashboard_stats`, `get_master_overview_stats`, `get_master_stores_list`.
**Tracking/analytics:** `track_widget_event`, `_check_rate_limit`, `toggle_video_like_safe`, `create_comment_safe`, `purge_old_activity_events`, `sync_sector_benchmarks` (⚠ usa tabela inexistente), `check_chat_rate_limit`.
**Afiliados:** `get_my_affiliate_data`, `fn_generate_store_referral_code`.
**Storage:** `recalculate_store_storage_bytes`, `trigger_sync_store_storage_bytes`, `update_store_storage`, `update_store_storage_usage` (⚠ múltiplas versões sobrepostas de lógica de storage).
**Utilitários:** `set_updated_at`/`trigger_set_updated_at`/`update_appearances_updated_at` (⚠ três implementações do mesmo gatilho), `sync_store_sector_slug`, `sync_lives_is_active`, `sanitize_appearance_colors`, `log_activity_trigger`.

**Triggers ativos (amostra confirmada):** updated_at em ~15 tabelas; trial defaults em `stores`; sync plan_id em `subscriptions`; referral code em `stores`; setor slug em `stores`; storage bytes em `videos`; log de atividade em `stories/videos/products/store_settings/appearances/display_locations`; sanitize cores em `appearances`; `sync_lives_is_active` em `lives`; rate limit de chat em `live_chat_messages`; auto super admin em `profiles`.

### 8.4 Storage buckets

- `videos` **[C]** — uploads de vídeos (StoragePage) e teasers de lives (LiveFormDialog).
- `store-assets` **[C]** — imagens (logos/thumbs).
- Políticas de bucket: **necessita validação manual** (não inspecionadas nesta análise).

### 8.5 Realtime

Canal `live_chat_${liveId}` em `live_chat_messages` (INSERT) **[C]** — dependência do Supabase Realtime pelo Live Commerce.

---

## 9. Autenticação

- **Mecanismo**: Supabase Auth (e-mail/senha e Google OAuth) **[C]**.
- **Perfil**: `profiles` (criado por trigger `handle_new_user`); dupla chave `id` (auth id) e `user_id` **[C]**.
- **Relação usuário ↔ loja**: `stores.owner_user_id` (dono) + `store_members` (owner/admin/member) **[C]**.
- **Organização**: não existe entidade organização; o tenant é a **loja** **[C]**.
- **Fluxo de provisionamento**: cadastro → RPC `create_or_get_user_tenant` (SECURITY DEFINER) cria perfil/loja/membro/settings/usage **[C]**.
- **Sessão no cliente**: `AuthContext` (`onAuthStateChange`) + `TenantContext` (loja ativa em localStorage) **[C]**.
- **Master admin**: `profiles.is_super_admin`; rota `/master` protegida por `MasterAdminRoute` + RLS `is_super_admin()`; e-mails promovidos automaticamente por trigger **[C]**.
- **Impersonação**: migração `0014_master_admin_and_impersonation.sql` menciona impersonação; telas/uso atual **necessita validação manual**.

---

## 10. Permissões

- **Roles existentes**: `store_members.role` ∈ {owner, admin, member} (funções SQL: `is_store_owner`, `is_store_owner_or_admin`, `is_store_owner_or_member`, `is_store_member`) + `profiles.is_super_admin` **[C]**.
- **Verificação**: primariamente via **RLS no banco**; no front, apenas `ProtectedRoute` (logado) e `MasterAdminRoute` (super admin). Não há guard de permissão por rota/tela para owner vs member **[C]**.
- **Permissões por módulo (VID vs LC)**: **não existem** — o acesso ao Live Commerce é controlado apenas por **plano** (`plans.allows_live`), verificado no cliente (`LiveCommercePage`) **[C]**.
- **Permissões por plano**: limites (`views/videos/pages/storage/allows_live`) lidos de `plans`/`PLAN_LIMITS`; enforcement de storage no banco (`storage_limit_bytes`), demais limites majoritariamente no cliente **[I]**.
- **Pontos de atenção** (ver §15): policies públicas amplas (`USING(true)`) em SELECT de `videos`, `products`, `stories`, `appearances`, `page_rules`, `story_products`, `story_videos`, `sizing_models`, `store_settings`, `comments` via view; INSERT público em `insights`, `live_events`, `live_subscribers`, `selector_sessions` (INSERT anônimo); `selector_sessions` SELECT/UPDATE `authenticated USING(true)` (cross-tenant); `stores` INSERT autenticado com `WITH CHECK (true)`.
- **Ponto em que o LC depende da estrutura do VID**: permissões e tenant são resolvidos pelas mesmas funções/tabelas do Vidlytics; o menu, layout, login e a loja são do app único **[C]**.

---

## 11. Análise específica do Vidlytics

### 11.1 O que pertence exclusivamente ao Vidlytics (deve permanecer)

- **Rotas/telas**: `/stories/**`, `/videos/**`, `/armazenamento`, `/produtos` (se decidido que catálogo fica no SLC, ver §20), `/medidas`, `/aparencia`, `/comentarios`, `/videos/performance`.
- **Componentes**: `performance/*`, `WidgetPreview`, `VideoThumbnail`.
- **Hooks/libs**: `analytics`, `likesService`, `offlineQueue`, `video`, `videoEmbeds`, `videoMetrics`, `storyAppearanceHelpers`.
- **Tabelas**: `videos`, `stories`, `story_videos`, `story_products`, `appearances`, `display_locations`, `page_rules`, `comments`, `video_likes`, `sizing_models`, `store_activity_events`, `analytics_rate_limits`, `daily_*_metrics`, `insights*`, `benchmarks*`.
- **Edges**: `fetch-thumbnail`, `import-instagram-video`, `import-pinterest-video`, `import-tiktok-video`, `get-tiktok-media`, `proxy-preview`, `widget-selector`, `calculate-insights` (a criar).
- **Dependências misturadas encontradas dentro do VID**:
  - `widget.js` contém o runtime de Live Commerce junto ao de stories **[C]**;
  - `store_settings` carrega colunas de live (`public_live_key`, `live_widget_config`, `live_player_config`) **[C]**;
  - `conversions` tem `live_id` (compartilhada) **[C]**;
  - `DashboardPage` exibe receita/conversões que incluem lives **[C]**;
  - `db.ts` centraliza tipos de tudo (incl. lives não — lives são acessadas direto via supabase nos componentes LC) **[C]**.

### 11.2 Deve permanecer no Vidlytics após a separação [R]

Todo o módulo de stories/vídeos shoppable, sua aparência (exceto se o SLC assumir identidade visual global), suas métricas de conteúdo e o subconjunto do widget.js referente a stories (extraído).

---

## 12. Análise específica do Live Commerce

Tudo abaixo está **atualmente dentro do app Vidlytics** **[C]**.

| Item | Localização atual | Relação com VID | Separação futura | Risco |
|---|---|---|---|---|
| Rota `/live-commerce` | `App.tsx` + `LiveCommercePage.tsx` | Usa `TenantContext`, `AppLayout`, `products`, `plans` | Mover app próprio | Médio |
| Rota `/live-commerce/:id/administrar` | `LiveAdminPage.tsx` | idem + **hook corrompido** | Corrigir hook ANTES de migrar | **Alto** |
| Componentes `components/live/*` (5) | dentro de `src/components/live` | usam `products`, `useTenant` | Extrair para app LC | Médio |
| Hooks `useLiveChat`, `useLiveSpotlight` | `src/hooks` | `useLiveSpotlight.ts` é cópia corrompida da página | Reescrever hook | **Alto** |
| Tabelas `lives`, `live_*` (7) | mesmo banco | FK `store_id` → `stores`; leem `products` | Podem ficar no mesmo DB (fase 1) ou schema próprio | Médio |
| View `public_live_settings` | mesmo banco | depende de `live_settings` | Mover com LC | Baixo |
| Colunas live em `store_settings` | `store_settings` | colunas `public_live_key`, `live_widget_config`, `live_player_config` + view `store_settings_public` | Migrar p/ `live_settings` e remover colunas | **Alto** (widget público lê a view) |
| Runtime público da live | `public/widget.js` (mesmo script do VID) | arquivo único 340 KB | Separar em script próprio ou módulos | **Alto** |
| Gating de plano | `plans.allows_live` + checagem client | tabela `plans` é SLC | SLC deve expor entitlement (ex.: `app_enabled: live`) | Médio |
| Conversões de live | `conversions.live_id` | tabela compartilhada com VID | Compartilhar via SLC ou replicar | Médio |
| Leads | `live_subscribers` | isolada | Mover com LC | Baixo |
| Chat/spotlight em tempo real | Realtime + polling em `lives` | — | Mover com LC | Baixo |
| Youtube integration | `services/youtube.ts` + edge `fetch-youtube-live` | só usada por LC | Mover | Baixo |
| Upload de teaser | bucket `videos` (compartilhado) | bucket único | Compartilhar bucket ou criar `live-assets` | Baixo |

**Dependências atuais do Vidlytics que o LC usa**: autenticação (`AuthContext`), tenant (`TenantContext`), layout/menu (`AppLayout`/`AppSidebar`), catálogo (`products`), planos (`plans`), storage (`videos`), banco/RLS com funções de acesso da loja, script de instalação (`IntegrationPage`/`widget.js`), tracking de conversão (`universal-conversion`) **[C]**.

**Entidades compartilhadas**: `stores`, `store_members`, `plans`, `products`, `conversions`, `store_settings`(parcial), buckets **[C]**.

**Risco de quebra ao separar**: principalmente (1) `widget.js` monolítico; (2) view `store_settings_public` que publica config de live; (3) gating `allows_live` verificado no cliente; (4) hook corrompido já quebra o admin da live hoje **[C]**.

---

## 13. Recursos compartilhados (candidatos ao SLC)

| Recurso | Onde está hoje | Tabelas | Rotas | Módulos que usam | Centralizado? | Duplicado? | Migração p/ SLC | Risco |
|---|---|---|---|---|---|---|---|---|
| Autenticação | `AuthContext`, `lib/auth.ts` | `auth.users`, `profiles` | /login,/register,/auth/callback | TODOS | Sim | Não | Sim | Médio (sessão compartilhada entre apps exige SSO/cookies) |
| Usuários/perfis | `profiles` | profiles | — | TODOS | Sim | ⚠ id+user_id | Sim | Baixo |
| Lojas (tenant) | `stores`, `TenantContext` | stores | /settings | TODOS | Sim | Não | Sim | **Alto** (FKs de todos os módulos) |
| Membros | `store_members` | store_members | (sem tela) | TODOS | Sim | Não | Sim | Baixo |
| Produtos (catálogo) | `ProductsPage` + `products` | products | /produtos | VID (stories) + LC (lives) | Parcial | Não | **Decisão** (§20) | Médio |
| Categorias | não existe entidade (texto em `products.category`) | — | — | — | — | — | Criar no SLC se desejado | — |
| Imagens/mídias | buckets `store-assets`, `videos` | storage | /armazenamento | VID + LC(teaser) | Sim | Não | Compartilhar | Baixo |
| Configurações da loja | `store_settings` | store_settings | /settings | TODOS | Sim | ⚠ contém live_* | Sim (limpar live_*) | Médio |
| Planos | `plans` + **`lib/plans.ts` hardcoded** | plans | /plans | VID+LC (allows_live) | Parcial | **Sim (front vs banco)** | Sim | Médio |
| Assinaturas/billing | `BillingPage`, edges Asaas | subscriptions, invoices, billing_info, asaas_webhook_events | /billing | TODOS | Sim | ⚠ policies duplicadas | Sim | Médio |
| Permissões | RLS + roles store_members | — | — | TODOS | Sim | Não | Sim + criar per-app | Médio |
| Layout/menu/dashboard | `AppLayout`, `AppSidebar`, `DashboardPage` | — | /dashboard | TODOS | Sim (único) | Não | SLC vira shell; dashboards por app | **Alto** |
| Integrações OAuth | `store_integrations`, edges | store_integrations | /integration (parcial) | VID (IG/TikTok) | Sim | Não | Avaliar por integração | Médio (tokens no banco) |
| Afiliados | `IndicaGanhaPage`, RPC | referral_* | /indica-e-ganha | Plataforma | Sim | Não | Sim | Baixo |
| Logs/auditoria | `activity_logs`, `audit_logs` + triggers | — | — | TODOS | Sim | Não | Sim | Baixo |
| Uso/limites | `usage_counters`, storage bytes | usage_counters | — | TODOS (billing) | Sim | Não | Sim | Baixo |
| Notificações/e-mail | edge `send-email` | — | — | Master | Sim | Não | Sim | Baixo |
| Webhooks | `asaas-webhook` | asaas_webhook_events | — | Billing | Sim | Não | Sim | Baixo |
| Suporte | /suporte | — | /suporte | TODOS | Sim | Não | Sim | Baixo |
| Script de instalação | `widget.js` + `/integration` | — | /integration | VID+LC | **Não** (mono-arquivo) | — | Dividir por app | **Alto** |

---

## 14. Dependências entre os aplicativos

Matriz (Origem → Destino):

| Origem | Destino | Tipo | Descrição | Risco |
|---|---|---|---|---|
| LC (`LiveCommercePage`) | VID/SLC (`TenantContext`) | Contexto | Loja ativa resolvida pelo contexto do Vidlytics | Alto |
| LC (`Live*`) | SLC (`products`) | Tabela | Produtos em destaque vêm do catálogo único | Médio |
| LC | SLC (`plans`) | Tabela/Regra | `allows_live` define acesso ao módulo | Médio |
| LC (`LiveFormDialog`) | Storage bucket `videos` | Storage | Upload de teaser no bucket de vídeos | Baixo |
| LC (`LiveAdminPage`) | `hooks/useLiveChat`+`useLiveSpotlight` | Código | Hook spotlight corrompido (cópia da página) | **Crítico** |
| LC (widget público) | `store_settings_public` (view) | View | Player lê config de live publicada na view de settings do VID | Alto |
| LC (widget público) | `lives`, `live_*`, `products` | Tabela/anon | Leitura pública direta via REST anon | Médio |
| VID (widget `widget.js`) | LC | Código | Mesmo arquivo implementa runtime de lives | **Crítico** p/ separação |
| VID (`conversions`) | LC (`live_id`) | Tabela | Atribuição de vendas a lives | Médio |
| VID (`DashboardPage`) | SLC (billing/afiliados) + LC (conversões) | Tela | Dashboard único mistura os três domínios | Alto |
| VID (`db.ts`) | SLC (stores/settings) | Código | Camada de dados única p/ tudo | Médio |
| SLC (`AuthContext`) | TODOS | Contexto | Sessão compartilhada | Alto (SSO na separação) |
| SLC (RLS `is_store_*`) | VID+LC | Banco | Funções de acesso usadas pelas policies dos dois módulos | Médio |
| VID (`IntegrationPage`) | VID+LC | Tela | Instalação única dos dois widgets | Alto |
| VID (`performance/overview-tab`) | `tracking_events` (inexistente) | Tabela | Consulta quebrada | **Crítico** |
| LC (`LiveMetricsModal`) | `orders` (inexistente) | Tabela | Consulta de receita quebrada | **Crítico** |
| SLC (`BillingPage`) | `pages` (inexistente) | Tabela | Consulta de páginas instaladas quebrada | Alto |
| VID (insights-tab) | edge `calculate-insights` (inexistente) | Edge | Botão recalcular quebrado | Alto |
| VID (função `sync_sector_benchmarks`) | `tracking_events` (inexistente) | Banco | Falha em runtime ao executar | Médio |

---

## 15. Problemas encontrados

### Crítico
1. **`src/hooks/useLiveSpotlight.ts` corrompido** — é uma cópia byte-a-byte de `LiveAdminPage.tsx` (676 linhas), não exporta `useLiveSpotlight` e importa a si mesmo → `/live-commerce/:liveId/administrar` quebra em runtime **[C]**.
2. **Consultas a tabelas inexistentes**: `tracking_events` (`performance/overview-tab.tsx` ×4 e função `sync_sector_benchmarks`), `orders` (`LiveMetricsModal.tsx`), `pages` (`BillingPage.tsx`) → erro Postgres `42P01` em runtime **[C]**.
3. **Edge Function `calculate-insights` invocada em `insights-tab.tsx` mas não existe em `supabase/functions/`** **[C]**.

### Alto
4. **Trigger `auto_assign_super_admin` com e-mails hardcoded** (promoção automática a God mode) **[C]**.
5. **Policies permissivas demais** **[C]**:
   - `selector_sessions`: SELECT/UPDATE para `authenticated` com `USING(true)` (qualquer usuário autenticado lê/escreve sessões de qualquer loja);
   - `insights`: INSERT público (`WITH CHECK true`);
   - `live_events`: INSERT público **sem rate limit** (spam/ilimitado);
   - SELECT público total em `videos`, `products`, `stories`, `appearances`, `page_rules`, `story_products`, `story_videos`, `sizing_models`, `store_settings` (expõe metadados/config de todas as lojas);
   - `stores` INSERT autenticado com `WITH CHECK(true)` (permite criar loja com `owner_user_id` arbitrário — usado pelo signup, mas sem validação).
6. **`widget.js` monolítico (340 KB)** misturando VID + LC, com 12 backups versionados na pasta pública **[C]**.
7. **Duplicidade de modelagem em LC**: cupons/vantagens existem como JSONB em `lives` **e** como tabelas `live_coupons`/`live_advantages` **[C]**.

### Médio
8. **Arquivos gigantes** (AppearancePage 208 KB; ProductsPage 89 KB; StoragePage 88 KB; LiveAppearanceModal 94 KB; db.ts 52 KB; Dashboard 52 KB; MasterAdmin 50 KB) **[C]**.
9. **Lixo/repositorio sujo**: ~35 arquivos `.bak/.txt/.ps1/_check*` na raiz e em `public/`, incluindo arquivo com nome inválido (`node _check2.cjs`) **[C]**.
10. **Dupla identidade em `profiles`** (`id` + `user_id`); **campos duplicados legados** em `billing_info`; **flags duplicadas** (`active`+`is_active` em stories/products; `status`+`active` em videos) **[C]**.
11. **Policies duplicadas** (billing_info ×3, invoices ×2, subscriptions ×2, store_settings ×3, videos ×3, stories ×3, insights ×3) **[C]**.
12. **Planos duplicados**: `lib/plans.ts` (hardcoded) vs tabela `plans` **[C]**.
13. **Três triggers/funções de updated_at** (`set_updated_at`, `trigger_set_updated_at`, `update_appearances_updated_at`) e **quatro funções de storage** sobrepostas **[C]**.
14. **`daily_store_metrics`/`daily_video_metrics` sem agregador identificado** — dados podem estar vazios/desatualizados; `purge_old_activity_events` sem agendamento (pg_cron) identificado **[C]** (necessita validação manual).
15. **Tabelas sem uso aparente no frontend**: `app_settings`, `widget_selectors`, `video_placements` **[C]**.
16. **`TenantContext` fallback `stores[0]`**: se RLS falhar/permitir, pode selecionar loja de outro usuário (defesa em profundidade fraca) **[C]**.
17. **`set_trial_defaults` com UUID de plano hardcoded** **[C]**.
18. **Rotas duplicadas/inconsistentes**: `/storage` vs `/armazenamento`; `/gallery` redirect; callback Instagram em 2 caminhos **[C]**.

### Baixo
19. `VideoGalleryPage.tsx` e `embed/[token].ts` órfãos **[C]**.
20. `@tanstack/react-query` instalado com Provider, mas sem uso **[C]**.
21. Stripe columns legadas em `stores`/`subscriptions` sem uso (Asaas é o gateway) **[C]**.
22. `package.json` com nome genérico (`vite_react_shadcn_ts`) e versão `0.0.0` **[C]**.

### Apenas melhoria [R]
Limpeza de backups; extração de `db.ts` por domínio; unificação de policies; type-safety no `AuthContext` (`user: any`); substituição de `confirm()` nativo por `AlertDialog`; responsividade auditável em telas grandes.

---

## 16. Riscos

1. **Perda de dados na migração** — `stores` é o hub de FKs de todos os módulos; qualquer split de schema exige backup + restore testável **[R]**.
2. **Quebra do widget público** — lojas instalaram `widget.js` via GTM; separar o arquivo sem manter a URL `https://app.vidlytics.com.br/widget.js` (vercel.json força no-cache) quebra todas as lojas ao vivo **[I/R]**.
3. **SSO entre apps** — sessão Supabase hoje é única; apps separados precisarão de estratégia de sessão compartilhada (mesmo domínio/auth) **[I]**.
4. **RLS replicada** — as funções `is_store_*` e ~90 policies teriam de ser versionadas por app ou centralizadas no SLC **[I]**.
5. **Entitlement de plano** — `allows_live` checado no cliente; separação exige enforcement server-side para não vazar acesso **[C]** (checagem client-side confirmada).
6. **Funcionalidades já quebradas** migrarem quebradas (hook LC, tabelas inexistentes, edge ausente) **[C]**.
7. **Dados históricos** — `conversions` com `live_id` mistura VID/LC; relatórios históricos precisarão de visão unificada pós-split **[I]**.

---

## 17. Proposta de arquitetura futura

> **[R]** — proposta inicial, sem nenhuma alteração realizada.

### 17.1 Sistema Loja Criativa (núcleo central)
Autenticação e SSO; usuários/perfis; organizações (futuro) e lojas; membros e papéis; catálogo de produtos (decisão §20); categorias (criar); mídias/buckets; configurações da loja; planos (fonte única: tabela `plans`); assinaturas/billing Asaas; faturas; permissões e **controle de acesso por aplicativo** (entitlements: `apps: [vidlytics, live_commerce]`); layout/navegação central (launcher); dashboard central (visão agregada); integrações compartilhadas (OAuth connectors); afiliados/indicações; logs/auditoria; suporte; notificações/e-mail; webhooks de pagamento.

### 17.2 Vidlytics (app)
Stories e formatos; biblioteca de vídeos e imports (IG/TikTok/Pinterest); aparências do widget VID; regras de exibição/seletor; comentários e likes; métricas de conteúdo (overview corrigida, retenção, insights com edge `calculate-insights` criada); benchmarks de setor; medidas; subconjunto do widget público de stories.

### 17.3 Live Commerce (app)
CRUD de lives; player público e widgets de divulgação/ao-vivo; painel de administração (com hook reescrito); chat em tempo real; spotlight; cupons/vantagens (unificar JSONB vs tabelas); leads (`live_subscribers`); eventos e métricas de live; conversões com `live_id`; teaser upload; integração YouTube; aparência da live (`live_settings`).

### 17.4 Pontos que exigem decisão (dono: você)
Ver §20.

---

## 18. Plano preliminar de migração (NÃO EXECUTADO)

> **[R]** — sequência proposta; cada etapa com teste e rollback.

**Fase 0 — Estabilização (antes de qualquer split):**
1. Corrigir `useLiveSpotlight.ts` (reescrever hook; remover cópia da página).
2. Corrigir consultas a `tracking_events`/`orders`/`pages` (substituir por `store_activity_events`/`conversions`/contagem real de `display_locations` ou criar tabelas faltantes — decisão sua).
3. Criar edge `calculate-insights` ou remover o botão.
4. Limpeza de backups/temporários (em branch; não afeta dados).
5. Snapshot/backup completo do banco (Supabase → Point-in-Time + dump).

**Fase 1 — Fundação SLC (sem quebrar nada):**
6. Criar tabela de **apps/entitlements** (`store_apps` ou `plans.features`) com `live_commerce`, `vidlytics`.
7. Introduzir seletor de aplicativo no menu (launcher) mantendo URLs atuais.
8. Mover colunas live de `store_settings` para `live_settings` (dual-write durante transição; deprecar colunas só após widget público migrado).

**Fase 2 — Separação do Live Commerce:**
9. Extrair `src/components/live`, hooks, páginas LC e `services/youtube` para app próprio (ou rota/prefixo dedicado no mesmo SPA como passo intermediário).
10. Dividir `widget.js` em `widget-stories.js` e `widget-live.js`, **mantendo** a URL antiga respondendo (compat) durante 90 dias.
11. Unificar cupons/vantagens (escolher JSONB **ou** tabelas) com migração de dados e validação de contagem.
12. Reescrever painel admin da live (chat/spotlight) sobre o hook corrigido.

**Fase 3 — SLC como plataforma:**
13. Centralizar billing/planos/permissões no SLC; apps consultam entitlement via API/RPC.
14. Dashboard central no SLC; dashboards de produto em cada app.
15. Migrations de saída: schemas separados (`slc`, `vidlytics`, `live`) ou projetos Supabase separados com replicação de `stores/members/plans` (decisão §20).

**Tabelas**: compartilháveis via SLC — `stores`, `store_members`, `profiles`, `plans`, `subscriptions`, `invoices`, `billing_info`, `products`(decisão), `usage_counters`, `activity_logs`, `audit_logs`. Específicas a criar — `store_apps`/entitlements, `categories` (se desejado). Adaptar — `store_settings` (remover live_*), `conversions` (manter `live_id` como FK lógica), `plans` (coluna `apps`). Rotas a reorganizar — `/dashboard`, `/settings`, `/billing`, `/produtos`, `/integration`. Componentes a extrair — `live/*`, `AppSidebar` (launcher), `DashboardPage` (split). Serviços — `db.ts` particionado; `youtube.ts` → LC. Permissões — roles por app (`app_roles`), enforcement server-side. Planos/assinaturas — revisar `allows_live` → entitlement; revisar trials legados. Dados a migrar — cupons/vantagens JSONB→tabela (ou inverso); live settings de `store_settings`→`live_settings`. Riscos — §16. Rollback — cada fase em branch + migration reversível + backup PITR; widget antigo mantido publicado. Testes — por etapa: cadastro→onboarding; publicar story; criar live→admin→métricas; checkout PIX sandbox; webhook Asaas; instalação GTM em loja de teste.

---

## 19. Tabelas de inventário

### 19.1 Inventário de funcionalidades

| Funcionalidade | Local atual | Aplicativo | Tabelas | Rotas | Status | Compartilhada? | Risco separação |
|---|---|---|---|---|---|---|---|
| Login/Logout | AuthContext, LoginPage | SLC | auth.users, profiles | /login | ✅ | Sim | Alto (SSO) |
| Cadastro+tenant | RegisterPage, RPC | SLC | profiles, stores, store_members, store_settings | /register | ✅ | Sim | Alto |
| Login Google | lib/auth | SLC | — | /auth/callback | ✅ | Sim | Médio |
| Recuperação de senha | — | SLC | — | — | ❌ ausente | — | — |
| Configurações loja | SettingsPage | SLC(+LC cols) | store_settings, stores, sectors | /settings | ✅ | Sim | Médio |
| Membros/equipe | (sem tela) | SLC | store_members | — | 🟡 infra only | Sim | Baixo |
| Produtos | ProductsPage | COM | products | /produtos | ✅ | Sim | Médio |
| Import XML produtos | edge import-products-xml | COM | products | /produtos | ✅ | Sim | Baixo |
| Biblioteca vídeos | StoragePage | VID | videos + buckets | /armazenamento | ✅ | Não | Baixo |
| Import IG/TikTok/Pinterest | services + edges | VID | videos, store_integrations | /armazenamento | ✅ | Não | Baixo |
| Stories CRUD | StoriesPage/Details | VID | stories, story_videos, story_products | /stories/** | ✅ | Não | Baixo |
| Aparência | AppearancePage | VID | appearances, store_settings | /aparencia | ✅ | Não | Baixo |
| Regras de exibição | StoriesWidgetPage + edge | VID | display_locations, page_rules, selector_sessions | /stories/widget | ✅ | Não | Médio (policies) |
| Comentários | CommentsPage | VID | comments | /comentarios | ✅ | Não | Baixo |
| Likes | widget + RPC | VID | video_likes | — | ✅ | Não | Baixo |
| Widget público stories | widget.js | VID | leituras públicas | script | ✅ | Não | **Alto** (arquivo único) |
| Tracking widget | track-event + RPC | VID | store_activity_events, usage_counters | — | ✅ | Parcial | Médio |
| Conversões | vidlytics-tracking + edge | COM | conversions | — | ✅ | Sim | Médio |
| Dashboard | DashboardPage | COM | várias | /dashboard | ✅ | Sim | **Alto** |
| Resultados overview | performance/overview | VID | tracking_events ❌, conversions | /videos/performance | ❌ parcial | Não | Médio |
| Retenção | performance/retention | VID | store_activity_events | /videos/performance | ✅ | Não | Baixo |
| Insights IA | insights-tab | VID | ai_insights + edge ausente | /videos/performance | ❌ parcial | Não | Médio |
| Benchmarks setor | metrics-service | VID | benchmarks, sector_benchmarks | /videos/performance | 🟡 | Não | Baixo |
| Lives CRUD | LiveCommercePage | LC | lives | /live-commerce | ✅ | Não | Médio |
| Formulário live | LiveFormDialog | LC | lives, bucket videos | — | ✅ | Não | Médio |
| Aparência live | LiveAppearanceModal | LC | live_settings | /live-commerce | ✅ | Não | Médio |
| Divulgação live | ShareLiveModal | LC | — | — | ✅ | Não | Baixo |
| Painel admin live | LiveAdminPage | LC | lives, live_chat_messages, live_events | /live-commerce/:id/administrar | ❌ hook | Não | **Alto** |
| Chat ao vivo | useLiveChat | LC | live_chat_messages + Realtime | — | ✅ | Não | Baixo |
| Spotlight | widget + lives | LC | lives.spotlight_* | — | ✅ | Não | Baixo |
| Métricas live | LiveMetricsModal | LC | live_events, orders ❌ | — | 🟡 | Não | Médio |
| Leads live | widget | LC | live_subscribers | — | ✅ | Não | Baixo |
| Player público live | widget.js | LC | lives, views públicas | script | ✅ | Não | **Alto** |
| Planos | PlansPage | SLC | plans | /plans | ✅ | Sim | Médio |
| Checkout Asaas | edge | SLC | subscriptions, billing_info | /plans | ✅ | Sim | Médio |
| Webhook pagamentos | edge asaas-webhook | SLC | asaas_webhook_events, invoices, stores | — | ✅ | Sim | Baixo |
| Faturas | BillingPage | SLC | invoices, pages ❌ | /billing | 🟡 | Sim | Baixo |
| Afiliados | IndicaGanhaPage | SLC | referral_rewards, affiliate_withdrawals | /indica-e-ganha | ✅ | Sim | Baixo |
| Master admin | MasterAdminPage | SLC | RPCs, audit_logs | /master | ✅ | Sim | Médio |
| Instalação/GTM | IntegrationPage | COM | store_settings | /integration | ✅ | Sim | **Alto** |
| Suporte | Support/Help | SLC | — | /suporte | ✅ | Sim | Baixo |

### 19.2 Inventário de tabelas

| Tabela | Finalidade | App atual | App futuro sugerido | Usada por | RLS | Relações | Ação futura |
|---|---|---|---|---|---|---|---|
| profiles | Perfil usuário | SLC | SLC | TODOS | Sim | auth.users | Centralizar no SLC (unificar id/user_id) |
| stores | Loja/tenant | SLC | SLC | TODOS | Sim | auth.users, plans | Centralizar no SLC |
| store_members | Membros/roles | SLC | SLC | TODOS | Sim | stores | Centralizar no SLC |
| store_settings | Config loja | COM | SLC (limpar live_*) | TODOS | Sim | stores | Centralizar + migrar live_* |
| store_integrations | Tokens OAuth | COM | SLC | VID | Sim | stores | Avaliar (tokens sensíveis) |
| plans | Catálogo planos | SLC | SLC | TODOS | Sim | — | Centralizar (+coluna apps) |
| subscriptions | Assinaturas | SLC | SLC | Billing | Sim | stores, plans | Centralizar |
| invoices | Faturas | SLC | SLC | Billing | Sim | stores, subscriptions | Centralizar |
| billing_info | Dados fiscais | SLC | SLC | Billing | Sim | stores | Centralizar (limpar colunas legadas) |
| asaas_webhook_events | Idempotência webhook | SLC | SLC | Edge | Sim | — | Centralizar |
| referral_rewards | Comissões afiliado | SLC | SLC | Afiliados | Sim | stores | Centralizar |
| affiliate_withdrawals | Saques | SLC | SLC | Afiliados | Sim | stores | Centralizar |
| usage_counters | Uso mensal | SLC | SLC | Billing/Widget | Sim | stores | Centralizar |
| activity_logs | Log de atividade | COM | SLC | Triggers | Sim | stores | Centralizar |
| audit_logs | Auditoria master | SLC | SLC | Master | Sim | — | Centralizar |
| sectors | Setores | COM | SLC | Stores/Perf | Sim | — | Centralizar |
| selector_sessions | Seletor visual | VID | VID | Edge widget-selector | Sim | stores/stories | Manter no Vidlytics (corrigir policies) |
| widget_selectors | Legado seletor | IND | — | **sem uso** | Sim | — | Descontinuar somente após validação |
| videos | Biblioteca vídeos | VID | VID | Stories/Bib | Sim | stores, products | Manter no Vidlytics |
| stories | Stories | VID | VID | Widget | Sim | stores, appearances | Manter no Vidlytics |
| story_videos | Vídeos do story | VID | VID | Stories | Sim | stories, videos | Manter no Vidlytics |
| story_products | Produtos do story | VID/COM | VID | Stories | Sim | stories, products | Manter (products no SLC) |
| appearances | Aparências | VID | VID | Widget | Sim | stores | Manter no Vidlytics |
| display_locations | Locais de exibição | VID | VID | Widget/Edge | Sim | stories | Manter no Vidlytics |
| page_rules | Regras de página | VID | VID | Widget | Sim | stories | Manter no Vidlytics |
| comments | Comentários | VID | VID | Widget/Moderação | Sim | videos | Manter no Vidlytics |
| video_likes | Likes | VID | VID | Widget | Sim | videos | Manter no Vidlytics |
| video_placements | Colocações de vídeo | IND | — | **sem uso** | Sim | videos | Descontinuar somente após validação |
| sizing_models | Medidas | VID | VID | Medidas | Sim | stores | Manter no Vidlytics |
| products | Catálogo | **COM** | **Decisão (SLC?)** | VID+LC | Sim | stores | Avaliar (§20) |
| conversions | Vendas atribuídas | COM | SLC (hub) ou compartilhada | VID+LC | Sim | stores, live_id | Compartilhar entre módulos |
| store_activity_events | Eventos brutos | VID | VID | Tracking | Sim | stores | Manter no Vidlytics |
| analytics_rate_limits | Rate limit | VID | VID | RPCs | Sim | — | Manter no Vidlytics |
| daily_store_metrics | Métricas diárias loja | VID | VID | Analytics | Sim | stores | Manter (criar agregador) |
| daily_video_metrics | Métricas diárias vídeo | VID | VID | Analytics | Sim | videos | Manter (criar agregador) |
| insights | Insights | VID | VID | Performance | Sim | stores | Manter no Vidlytics |
| ai_insights | Insights IA | VID | VID | Performance | Sim | stores | Manter no Vidlytics |
| insight_rules | Regras insight | VID | VID | — | Sim | — | Manter no Vidlytics |
| insight_rule_conditions | Condições regra | VID | VID | — | Sim | insight_rules | Manter no Vidlytics |
| benchmarks | Benchmarks | VID | VID | metrics-service | Sim | sectors | Manter no Vidlytics |
| sector_benchmarks | Benchmarks setor | VID | VID | Performance | Sim | — | Manter (corrigir sync) |
| app_settings | Config legada | IND | — | **sem uso** | Sim | stores | Descontinuar somente após validação |
| lives | Lives | LC | LC | LC | Sim | stores | Manter no Live Commerce |
| live_events | Eventos da live | LC | LC | LC | Sim | lives | Manter no LC (+rate limit) |
| live_chat_messages | Chat | LC | LC | LC | Sim | lives | Manter no LC |
| live_subscribers | Leads | LC | LC | LC | Sim | lives, stores | Manter no LC |
| live_coupons | Cupons | LC | LC | LC | Sim | lives | Unificar com JSONB lives |
| live_advantages | Vantagens | LC | LC | LC | Sim | lives | Unificar com JSONB lives |
| live_settings | Aparência global live | LC | LC | LC | Sim | stores | Manter no LC (absorver live_* de store_settings) |
| (view) stores_public | Dados públicos loja | COM | SLC | Widget | view | stores | Manter no SLC |
| (view) store_settings_public | Config pública widget | COM | SLC+LC | Widget VID+LC | view | store_settings | Dividir por app |
| (view) comments_public | Comentários aprovados | VID | VID | Widget | view | comments | Manter no Vidlytics |
| (view) public_live_settings | Config pública live | LC | LC | Widget LC | view | live_settings | Manter no LC |

### 19.3 Inventário de rotas

| Rota | Tela | Arquivo | App atual | App futuro | Auth | Permissão | Observações |
|---|---|---|---|---|---|---|---|
| /login | Login | LoginPage.tsx | SLC | SLC | Não | — | GuestRoute |
| /register | Cadastro | RegisterPage.tsx | SLC | SLC | Não | — | Cria loja+referral |
| /auth/callback | OAuth Google | AuthCallbackPage.tsx | SLC | SLC | Não | — | — |
| /api/auth/instagram/callback | OAuth IG | InstagramCallback.tsx | VID | VID | Não | — | Duplicada |
| /auth/instagram/callback | OAuth IG | InstagramCallback.tsx | VID | VID | Não | — | Duplicada |
| /master/login | Login master | MasterLoginPage.tsx | SLC | SLC | Não | — | — |
| / | Home guard | App.tsx (HomeGuard) | COM | SLC | Condicional | — | Landing vs app |
| /dashboard | Dashboard | DashboardPage.tsx | COM | SLC (central) + por app | Sim | — | Mistura domínios |
| /indica-e-ganha | Afiliados | IndicaGanhaPage.tsx | SLC | SLC | Sim | — | — |
| /stories/widget | Widget config | StoriesWidgetPage.tsx | VID | VID | Sim | — | — |
| /stories/preview/:id | Preview | StoryPreviewPage.tsx | VID | VID | Sim | — | — |
| /stories/:id | Detalhe story | StoryDetailsPage.tsx | VID | VID | Sim | — | — |
| /stories | Lista stories | StoriesPage.tsx | VID | VID | Sim | — | — |
| /live-commerce | Lives | LiveCommercePage.tsx | LC | LC | Sim | plano allows_live | Gating client-side |
| /live-commerce/:liveId/administrar | Admin live | LiveAdminPage.tsx | LC | LC | Sim | — | **Quebrada (hook)** |
| /videos/performance | Resultados | PerformancePage.tsx | VID | VID | Sim | — | overview com tabela inexistente |
| /videos/:videoId/performance | Resultado vídeo | VideoPerformancePage.tsx | VID | VID | Sim | — | — |
| /videos/new | Novo vídeo | VideoEditPage.tsx | VID | VID | Sim | — | — |
| /videos/:id/edit | Editar vídeo | VideoEditPage.tsx | VID | VID | Sim | — | — |
| /gallery | Redirect | — | VID | — | — | — | → /armazenamento |
| /produtos | Produtos | ProductsPage.tsx | COM | SLC (sugerido) | Sim | — | Usado por VID+LC |
| /medidas | Medidas | MedidasPage.tsx | VID | VID | Sim | — | — |
| /aparencia | Aparência | AppearancePage.tsx | VID | VID | Sim | — | 208 KB |
| /comentarios | Comentários | CommentsPage.tsx | VID | VID | Sim | — | — |
| /storage | Biblioteca | StoragePage.tsx | VID | VID | Sim | — | Duplicada de /armazenamento |
| /armazenamento | Biblioteca | StoragePage.tsx | VID | VID | Sim | — | — |
| /settings | Configurações | SettingsPage.tsx | SLC(+LC) | SLC | Sim | — | Contém live config |
| /integration | Instalação | IntegrationPage.tsx | COM | SLC/por app | Sim | — | Script único |
| /billing | Assinatura | BillingPage.tsx | SLC | SLC | Sim | — | Consulta `pages` inexistente |
| /plans | Planos | PlansPage.tsx | SLC | SLC | Sim | — | Checkout Asaas |
| /suporte/artigos | Artigos | HelpArticlesPage.tsx | SLC | SLC | Sim | — | — |
| /suporte | Suporte | SupportPage.tsx | SLC | SLC | Sim | — | — |
| /master | God mode | MasterAdminPage.tsx | SLC | SLC | Sim | **super_admin** | /admin → redirect |
| * | Fallback | — | COM | — | — | — | → / |

### 19.4 Inventário de componentes (principais)

| Componente | Caminho | Finalidade | App atual | App futuro | Compartilhado? | Dependências |
|---|---|---|---|---|---|---|
| AppLayout | components/AppLayout.tsx | Layout autenticado | COM | SLC | Sim | supabase, router |
| AppSidebar | components/AppSidebar.tsx | Menu | COM | SLC (launcher) | Sim | supabase |
| MasterAdminRoute | components/MasterAdminRoute.tsx | Guard god | SLC | SLC | Não | supabase |
| ConfirmDeleteDialog / CustomDialog / SuccessDialog | components/ | Diálogos genéricos | COM | SLC | Sim | ui |
| FloatingHelp/Support, WhatsApp* | components/ | Suporte flutuante | COM | SLC | Sim | — |
| WidgetPreview | components/WidgetPreview.tsx | Preview widget | VID | VID | Não | appearances |
| VideoThumbnail | components/VideoThumbnail.tsx | Thumb | VID | VID | Não | — |
| LiveFormDialog | components/live/ | Criar/editar live | LC | LC | Não | lives, bucket videos, products |
| LiveAppearanceModal | components/live/ | Aparência live | LC | LC | Não | live_settings |
| LiveMetricsModal | components/live/ | Métricas live | LC | LC | Não | live_events (+orders ❌) |
| ShareLiveModal | components/live/ | Divulgar | LC | LC | Não | — |
| LiveAppearanceTab | components/live/ | Tab aparência | LC | LC | Não | — |
| overview-tab / retention-tab / videos-tab / insights-tab | components/performance/ | Tabs resultados | VID | VID | Não | supabase |
| useLiveChat | hooks/ | Chat realtime | LC | LC | Não | Realtime |
| useLiveSpotlight | hooks/ | **CORROMPIDO** | LC | LC | Não | — |
| use-mobile | hooks/ | Mobile detect | COM | COM | Sim | — |

### 19.5 Inventário de APIs e integrações

| API/Integração | Local | Finalidade | App | Dados | Segredos necessários | Risco |
|---|---|---|---|---|---|---|
| Supabase Auth | lib/auth, context | Login/OAuth | SLC | users, session | VITE_SUPABASE_* | Baixo |
| Supabase DB/RLS | todo o app | Dados | TODOS | todas as tabelas | anon key | Médio (policies amplas) |
| Supabase Realtime | useLiveChat | Chat live | LC | live_chat_messages | anon key | Baixo |
| Supabase Storage | StoragePage, LiveFormDialog | Uploads | VID+LC | buckets videos, store-assets | anon key | Médio (policies bucket não auditadas) |
| Asaas | edges create-asaas-subscription, asaas-webhook | Billing | SLC | customers, subscriptions, payments | ASAAS_API_KEY/ACCESS_TOKEN/WEBHOOK_TOKEN | Alto (financeiro) |
| Resend | edge send-email | E-mail | SLC | destinatários | RESEND_API_KEY | Baixo |
| YouTube | services/youtube + edge fetch-youtube-live | Status live | LC | lives | (edge interno) | Baixo |
| Instagram OAuth/Display | pages/auth, services/instagram, edges | Import vídeos | VID | store_integrations tokens | IG app creds (edge) | Médio (tokens em banco) |
| TikTok OAuth/Display | services/tiktok, edges | Import vídeos | VID | store_integrations | TIKTOK_CLIENT_* | Médio |
| Pinterest scrape | edge import-pinterest-video | Import vídeos | VID | — | — | Médio (sem API oficial) |
| XML feeds | edges import-products-xml, proxy-xml | Catálogo | COM | products | — | Baixo |
| GTM/script tag | widget.js + IntegrationPage | Instalação | VID+LC | leitura pública | anon key | Alto (superfície pública) |

---

## 20. Pontos que exigem aprovação

1. **Catálogo de produtos**: fica no SLC (compartilhado entre apps) ou duplicado por app com sincronização? (Hoje é compartilhado.)
2. **`conversions`**: centralizada no SLC como hub de atribuição, ou replicada por app com visão agregada?
3. **Banco na separação**: um projeto Supabase com schemas separados (`slc`, `vidlytics`, `live`) ou projetos Supabase distintos com sincronização de lojas/membros/planos?
4. **Domínios/URLs**: subdomínios (`app.lojacriativa.com`, `vidlytics....`, `live. ...`) vs. rotas prefixadas no mesmo SPA? Impacto direto no SSO e no `widget.js` publicado.
5. **Widget público**: dividir em dois scripts (stories/live) mantendo URL antiga como umbrella, ou manter um script modular?
6. **Cupons/vantagens do LC**: manter JSONB em `lives` ou migrar para as tabelas `live_coupons`/`live_advantages`?
7. **Correção das consultas quebradas** (`tracking_events`, `orders`, `pages`): criar as tabelas ou reescrever as consultas para as tabelas existentes?
8. **Edge `calculate-insights`**: implementar ou remover a UI de insights?
9. **Tabelas sem uso** (`app_settings`, `widget_selectors`, `video_placements`): descontinuar (após validação) ou mantê-las?
10. **Trigger `auto_assign_super_admin`** (e-mails hardcoded): remover e gerenciar super admins manualmente?
11. **`profiles.id` vs `user_id`**: unificação de chave exige migração de dados — aprovar?
12. **Planos**: eliminar o `lib/plans.ts` hardcoded em favor exclusivo da tabela `plans`?
13. **Billing legado**: remover colunas Stripe de `stores`/`subscriptions`?
14. **Permissões por app**: criar matriz `store_apps`/entitlements (sugerida) — formato e enforcement (client+server)?
15. **Recuperação de senha**: deve ser implementada no SLC (hoje ausente)?

---

## 21. Conclusão

O sistema atual é um **SaaS monolítico maduro** (Vidlytics) com três domínios lógicos fortemente acoplados por: (a) um único SPA com menu/layout compartilhados; (b) uma camada de dados central (`db.ts`) e um Supabase único com RLS baseada em `stores`; (c) um script público monolítico (`widget.js`) que serve stories e lives; e (d) tabelas-ponte (`products`, `conversions`, `store_settings`) usadas pelos dois produtos.

A separação para o modelo **Sistema Loja Criativa + Vidlytics + Live Commerce é viável**, desde que precedida de: correção dos defeitos críticos já existentes (hook do LC, tabelas inexistentes, edge ausente), definição das decisões do §20 (principalmente catálogo, atribuição de conversões, estratégia de banco e URLs), backup integral e estratégia de compatibilidade do widget público instalado nas lojas clientes.

**Nada foi alterado.** Este documento é o retrato fiel do sistema na data da análise, distinguindo o que foi confirmado no código **[C]**, o que foi inferido **[I]** e o que é recomendação **[R]**.
