# Sistema de Analytics/Métricas do Widget — Documento de Arquitetura e Auditoria

**Data da análise:** 18/08/2026
**Escopo:** pipeline de métricas do widget ( Vidlytics ), ações de visitante, funções de banco, edge functions, tabelas de destino e leitura no dashboard.
**Método:** leitura estática do código-fonte (widget.js, src/, supabase/functions/), inspeção das migrations versionadas, inspeção ao vivo do banco (schemas, políticas RLS, grants, funções, cron) e amostragem dos dados reais das tabelas.
**Finalidade:** base para revisão de auditoria de segurança. Não altera nenhum código.

---

## 1. Resumo executivo

O sistema de métricas evoluiu em **duas gerações que coexistem hoje**:

- **Geração 1 (legada, "Sistema A")** — o widget gravava eventos **diretamente na tabela `public.metrics`** via API REST (PostgREST) do Supabase, usando a chave `anon` embutida no script. Funcionava sem backend próprio.
- **Geração 2 (atual, "Sistema B")** — o widget passou a enviar eventos para uma **edge function (`track-event`)**, que valida origem/domínio, gera hash do visitante, aplica rate limit e grava via RPC `track_widget_event` nas tabelas `store_activity_events` (evento bruto), `daily_store_metrics` (agregado por loja/dia) e `daily_video_metrics` (agregado por vídeo/dia).

**A migração foi parcial.** As evidências (dados e código) mostram que:

1. O widget atual **só consegue gravar 5 tipos de evento** no Sistema B (`video_view`, `cta_click`, `product_view`, `story_complete`, `product_click`). Todos os demais eventos que o widget ainda envia (`play`, `like`, `unlike`, `share`, `comment`, `next_video`, `story_open`) são **rejeitados pela whitelist da edge function e descartados silenciosamente**.
2. Os **dashboards continuam lendo a tabela legada `metrics`**, que **parou de receber dados** por volta de 16/08/2026 (último registro: 16/08 20:06 UTC), quando a versão nova do widget substituiu a antiga nos sites.
3. Existem **funções de banco órfãs e quebradas** (`toggle_video_like`, `get_video_real_metrics`) que referenciam uma coluna `visitor_id` que não existe na tabela `video_likes` — evidência de refatoração incompleta.
4. As tabelas sociais (`video_likes`, `comments`) e a tabela legada `metrics` possuem **políticas RLS públicas permissivas** (leitura e/ou escrita irrestrita para qualquer loja), o que constitui os principais achados de segurança deste documento (Seção 8).

---

## 2. Mapa geral da arquitetura

```
SITE DA LOJA (visitante, não autenticado)
│
├─ public/widget.js  (script embutido no tema; contém URL Supabase + chave anon)
│   │
│   ├─ Leitura de configuração/exibição (PostgREST, anon):
│   │    stories, story_videos, videos, products, story_products,
│   │    appearances, page_rules, display_locations, comments(aprovados),
│   │    video_likes, store_settings, sizing_models
│   │
│   ├─ [Sistema B] sendAnalyticsEvent() ──► POST /functions/v1/track-event
│   │        │  (edge function: valida origem, whitelist 5 eventos,
│   │        │   valida domínio da loja, hash SHA-256(IP+UA+store))
│   │        └─► RPC track_widget_event (SECURITY DEFINER, service_role)
│   │                 ├─ analytics_rate_limits   (janelas de rate limit 60/min)
│   │                 ├─ store_activity_events   (evento bruto)
│   │                 ├─ daily_store_metrics     (agregado loja/dia)
│   │                 └─ daily_video_metrics     (agregado vídeo/dia)
│   │
│   ├─ [Social] toggleLike() ──► PostgREST direto em video_likes (INSERT/DELETE)
│   ├─ [Social] createComment() ──► PostgREST direto em comments (INSERT)
│   │
│   └─ [Conversão] yampi-tracking.js ──► POST /functions/v1/yampi-conversion
│            └─► service_role ──► conversions (upsert por order_id)
│
DASHBOARD DO DONO (autenticado)
│
├─ DashboardPage ......... metrics (legado, via src/lib/analytics.ts)
│                          + store_activity_events (feed, Sistema B)
│                          + usage_counters (views_count — nunca incrementado)
├─ PerformancePage ....... metrics (legado) + video_likes + comments + conversions
├─ VideoPerformancePage .. metrics (legado) + video_likes + comments + conversions
└─ CommentsPage .......... comments (moderação: status, resposta da loja)
```

Retenção (pg_cron `daily-analytics-purge`, diário 03:00 UTC → `purge_old_activity_events(90)`):
- `store_activity_events`: eventos brutos com mais de **90 dias** são apagados.
- `analytics_rate_limits`: janelas com mais de 60 minutos são apagadas.
- `metrics` (legado), `video_likes`, `comments`, `conversions` e agregados `daily_*`: **sem purga**.

---

## 3. Ações do usuário rastreadas HOJE (inventário completo)

### 3.1 Eventos aceitos no Sistema B (edge function `track-event` → RPC `track_widget_event`)

| # | Evento | Gatilho exato no widget | Grava em | Observações |
|---|--------|------------------------|----------|-------------|
| 1 | `video_view` | O `<video>` do story dispara o evento de mídia `play` (toda reprodução, inclusive replay); e também no clique em um card de vídeo do carrossel | `store_activity_events` + `daily_store_metrics.views_count` + `daily_video_metrics.views_count` | Não há deduplicação por sessão; o rate limit (60/min por hash IP+UA+loja) é a única contenção |
| 2 | `story_complete` | O `<video>` dispara `ended` (vídeo assistido até o fim) | `store_activity_events` + contadores `cta_clicks` zerados nos agregados do dia | |
| 3 | `cta_click` | Clique no botão **"Ver no site"** do card de produto; e clique no botão **"Comprar pelo WhatsApp"** | `store_activity_events` + `daily_store_metrics.cta_clicks_count` + `daily_video_metrics.cta_clicks_count` | **Os dois botões disparam o MESMO evento genérico** — não há como distinguir clique em WhatsApp vs. clique no site (ver Seção 4) |
| 4 | `product_click` | Clique no card de produto dentro do carrossel de vídeos | `store_activity_events` + `daily_store_metrics.product_clicks_count` | Abre a URL do produto em nova aba |
| 5 | `product_view` | Renderização do card de produto no carrossel (por impressão, não é clique) | `store_activity_events` | Não incrementa nenhum agregado diário |

O que a RPC `track_widget_event` faz com cada evento aceito (defesa em profundidade, executada como `SECURITY DEFINER` via `service_role`):
1. Revalida a whitelist dos 5 tipos de evento (rejeita qualquer outro).
2. Valida assinatura da loja: `subscription_status = 'active'` ou `trialing` com trial não expirado → **lojas inadimplentes param de gerar métricas**.
3. Rate limit: upsert em `analytics_rate_limits` por (`client_hash`, `store_id`, minuto); acima de **60 eventos/min** retorna `false` → edge function responde **429**.
4. Valida que `video_id` pertence à loja (senão zera o campo).
5. Sanitiza `page_path` (remove query string, trunca 255) e `device_type` (whitelist mobile/tablet/desktop); descarta demais campos do cliente — o `metadata` gravado contém apenas `device_type` e `page_path`.
6. Insere o bruto em `store_activity_events` e faz upsert incremental nos agregados diários.

### 3.2 Ações sociais gravadas por caminho próprio (fora da pipeline de eventos)

| # | Ação | Implementação | Tabela | Detalhes |
|---|------|---------------|--------|----------|
| 6 | **Curtir vídeo** | `toggleLike()` no widget.js → `INSERT` direto via PostgREST (anon) | `video_likes` | Identidade = `user_fingerprint` gerado no navegador (`fp_<timestamp>_<random>` persistido em localStorage). Campos gravados: `video_id`, `user_fingerprint`, `store_id`, `story_id`, `page_url`, `created_at` |
| 7 | **Descurtir vídeo** | `toggleLike()` → `DELETE` via PostgREST por `video_id` + `user_fingerprint` | `video_likes` | **BUG:** não existe política RLS de DELETE para `anon`/public em `video_likes` → o DELETE é bloqueado e o erro é engolido (`.catch(()=>{})`). O un-like NÃO persiste no servidor; ao recarregar, o like "volta" |
| 8 | **Comentar vídeo** | `createComment()` no widget.js → `INSERT` direto via PostgREST (anon) | `comments` | Ver Seção 6 (implementação detalhada) |
| 9 | **Conversão (venda Yampi)** | `yampi-tracking.js` na página de obrigado → `POST /functions/v1/yampi-conversion` | `conversions` | Upsert por `order_id` (atualiza `pending → paid` e `order_value`). Leitura no dashboard filtra `status = 'paid'` |

### 3.3 Eventos que o widget ENVIA hoje mas são DESCARTADOS (nunca gravados)

O widget atual chama `trackMetric({event_type: ...})` que repassa para `sendAnalyticsEvent` → `track-event`. A edge function **rejeita com HTTP 400** tudo que não está na whitelist dos 5 tipos. O widget ignora a falha (`fetch(...).catch(()=>{})`). São eles:

| Evento enviado | Gatilho | Destino real |
|----------------|---------|--------------|
| `play` (4 pontos de disparo) | Inicialização do player (vídeo hospedado, YouTube, Instagram, TikTok) | **Nenhum — descartado** |
| `like` / `unlike` | Toggle do botão de coração (junto com a gravação real em `video_likes`) | **Nenhum — descartado** (a curtida real existe apenas em `video_likes`) |
| `share` | Confirmação de compartilhamento no painel de share | **Nenhum — descartado** |
| `comment` | Envio bem-sucedido de comentário | **Nenhum — descartado** (o comentário real existe apenas em `comments`) |
| `next_video` | Avanço para o próximo vídeo | **Nenhum — descartado** |
| `story_open` | Abertura do story | **Nenhum — descartado** |

**Consequência:** desde a ativação do Sistema B, plays, shares, next_video e story_open não são registrados em lugar nenhum. Likes e comentários continuam existindo, mas apenas nas tabelas sociais.

### 3.4 Sistema legado (tabela `metrics`) — dados históricos

A tabela `public.metrics` contém **865 registros**, todos com `event_name = NULL`, último insert em **16/08/2026 20:06 UTC**. Distribuição por `event_type` (prova de quem escrevia):

| event_type | Registros | | event_type | Registros |
|------------|-----------|-|------------|-----------|
| play | 495 | | whatsapp_click | 12 |
| story_open | 164 | | like | 6 |
| widget_init | 114 | | comment_open | 4 |
| next_video | 39 | | product_click | 3 |
| share | 13 | | unlike | 2 |
| comment | 13 | | view / pause / click / close / conversion | 0 |

Observações:
- O enum original da migration 0004 (`view, play, pause, click, cta_click, product_click, whatsapp_click, like, share, comment, close, conversion`) **não corresponde** ao que o widget antigo realmente gravava (`story_open`, `widget_init`, `next_video`, `unlike`, `comment_open` estão fora da lista). O CHECK constraint foi **removido fora das migrations** — hoje a tabela só tem a PK.
- Nenhum código atual escreve em `metrics`. O escritor era a **versão anterior do widget.js**, que inseria diretamente via PostgREST com a chave anon (daí as políticas de INSERT público). Os registros continuaram chegando até 16/08 porque os sites das lojas rodavam a versão antiga em cache.
- A coluna `event_name` foi adicionada em algum momento (fora das migrations) e os leitores do PerformancePage passaram a agrupar por ela — mas **nenhum escritor jamais populou `event_name`** (100% NULL). Resultado: os gráficos diários do overview e o serviço `metrics-service.ts` retornam zeros mesmo com 865 registros na tabela.

---

## 4. Ações planejadas e NÃO implementadas

| Ação planejada | Estado atual | Evidência |
|----------------|--------------|-----------|
| **Compartilhamento (share)** | Botão e painel de share existem no widget (`openSharePanel`), o evento `share` é disparado, mas é **rejeitado** pela whitelist da edge function. O tipo `share` também não existe no Sistema B (nem na RPC, nem nos agregados diários). O histórico existe apenas na tabela legada `metrics` (13 registros). | widget.js linha ~2137; ALLOWED_EVENTS em track-event |
| **Pular vídeo (skip / next_video)** | O evento `next_video` é disparado pelo widget e **descartado**. Sem tabela/coluna de destino no Sistema B. | widget.js linha ~3206 |
| **Fechar vídeo/modal (close)** | Nunca foi implementado no widget atual. O tipo existia apenas no enum teórico da migration 0004 (0 registros no banco). O fechamento do modal não rastreia nada. | migration 0004; ausência de handler |
| **Diferenciar clique WhatsApp vs. clique no site** | Os dois botões ("Ver no site" e "Comprar pelo WhatsApp") disparam o **mesmo `cta_click`**, sem metadado que distinga qual CTA. O tipo `whatsapp_click` existia no Sistema A (12 registros históricos) e é tratado pelos leitores do dashboard (`analytics.ts`, `overview-tab`, `metrics-service`), mas **não está na whitelist do Sistema B** — ou seja, a diferenciação deixou de existir na prática. | widget.js linhas ~3141 e ~3169 |
| **Pause** | Previsto no enum legado (0 registros). Sem implementação no widget atual. | migration 0004 |
| **View (impressão do modal)** | Previsto no enum legado (0 registros). O RPC órfão `get_video_real_metrics` conta views por `event_type='view'` — sempre retornará 0. | migration 0004 |
| **Contador de views do plano (`usage_counters.views_count`)** | Criado com 0 no cadastro da loja, lido pelo DashboardPage como "views usadas" do plano, mas **nunca incrementado** por nenhum código. Sempre 0. | src/lib/auth.ts; DashboardPage |
| **Receita estimada diária (`daily_store_metrics.estimated_revenue`)** | Coluna existe, sempre 0. Nenhum escritor. | schema da tabela |

---

## 5. Por que existem dois sistemas de métricas?

**Veredito: é resultado de refatoração incompleta, não de design intencional.** Linha do tempo reconstruída:

1. **Fase 1 — MVP direto ao banco (Sistema A).** A migration `0004_metrics_analytics_rls.sql` criou `metrics` com CHECK de 12 tipos e RLS razoável (select para membros, insert validando existência da loja). O widget gravava direto via PostgREST com a chave anon.
2. **Fase 2 — abertura para o widget público.** As migrations `0005`, `0006` e `0007` (três tentativas de correção em sequência — indício de dificuldade com RLS) reescreveram as políticas. Ao longo do caminho foram criadas **políticas redundantes e totalmente permissivas** (`Insert widget`, `Allow anon insert metrics`, `Allow insert for anon`, `anon_can_insert_metrics`, todas com `with check (true)`) e uma **`anon_can_select_metrics` de SELECT irrestrito** — necessárias para o widget antigo funcionar, mas expostas demais. O CHECK de tipos foi removido fora das migrations para acomodar os eventos reais (`widget_init`, `story_open` etc.).
3. **Fase 3 — pipeline nova (Sistema B).** Sem registro em migration (criada via SQL direto), surgiu a stack atual: edge function `track-event` + RPC `track_widget_event` + `store_activity_events`/`daily_store_metrics`/`daily_video_metrics` + `analytics_rate_limits` + cron de purga. Essa stack tem controles que o Sistema A não tem: validação de origem/domínio, rate limit, sanitização, checagem de assinatura e retenção de 90 dias.
4. **Fase 4 — troca do widget, migração pela metade.** O widget.js foi reescrito para usar a nova pipeline (`sendAnalyticsEvent`), mas: (a) a whitelist do Sistema B ficou com apenas 5 tipos, deixando de fora play/like/share/comment/etc. que o widget continua enviando; (b) os **dashboards não foram migrados** — continuam lendo `metrics` (Sistema A), que congelou em 16/08/2026; (c) funções RPC da geração intermediária (`toggle_video_like`, `get_video_real_metrics`) ficaram órfãs e quebradas (referenciam `visitor_id`, coluna que não existe em `video_likes`, que usa `user_fingerprint`).

**Evidências do congelamento:** último registro de `metrics` em 16/08/2026 20:06 UTC; primeiro (e únicos) registros de `store_activity_events` a partir de 18/08/2026. Entre 17 e 18/08 o site de demonstração parou de gerar dados visíveis ao dono no Performance/Dashboard (que leem o legado).

**Coexistência atual, por tabela:**

| Tabela | Papel hoje | Escritor ativo | Leitor ativo |
|--------|-----------|----------------|--------------|
| `metrics` | Legado, congelada | Nenhum (código atual não grava) | DashboardPage, PerformancePage (overview/videos), VideoPerformancePage, `metrics-service.ts` |
| `store_activity_events` | Sistema B, bruto | RPC `track_widget_event` (via edge) | DashboardPage (feed últimas 6 atividades) |
| `daily_store_metrics` / `daily_video_metrics` | Sistema B, agregados prontos | RPC `track_widget_event` | **Nenhum** (write-only; prontos para uso futuro) |
| `analytics_rate_limits` | Sistema B, rate limit | RPC `track_widget_event` + cron de limpeza | RPC interna |
| `video_likes` | Social | widget.js (PostgREST anon) | widget.js; analytics.ts; dashboards |
| `comments` | Social + moderação | widget.js (PostgREST anon); CommentsPage (update) | widget.js; analytics.ts; CommentsPage |
| `conversions` | Conversões Yampi | edge `yampi-conversion` (service_role) | analytics.ts; overview-tab |
| `usage_counters` | Cota de plano | Só criação (0) | DashboardPage |
| `insights` | Checklist/sugestões | Dashboard (update dismissed/completed) | insights-tab, useInsights |
| `events` | Desconhecida/órfã | Nenhum | Nenhum (tabela existente com RLS, sem uso no código) |

---

## 6. Implementação da criação de comentário

**Onde fica:** inteiramente no **front-end**, dentro do script do widget (`public/widget.js`, função `createComment`, ~linha 1951). **Não há RPC nem edge function** para comentários — a gravação é um `INSERT` PostgREST direto do navegador do visitante para a tabela `comments`, autorizado pela política RLS `"Insert publico"` (roles `{public}`, `with check (true)`).

**Passo a passo do fluxo:**

1. O visitante abre o painel de comentários do vídeo no widget e envia nome (+ e-mail opcional) e texto.
2. `createComment` valida no cliente: nome e conteúdo obrigatórios (trim).
3. Busca `store_settings.auto_approve_comments` (já carregada pelo widget):
   - `true` → `status = 'approved'` (comentário aparece imediatamente no widget);
   - `false`/ausente → `status = 'pending'` (aguarda moderação).
4. Monta o payload: `store_id`, `video_id`, `user_name`, `user_email`, `content`, `status`, `created_at` (timestamp do cliente).
5. `POST /rest/v1/comments` com header `Prefer: return=representation` (anon key). Trata erros com mensagens amigáveis (401 chave inválida; 42501 RLS bloqueada).
6. Feedback ao visitante: "aguardando aprovação" ou exibição imediata.
7. O evento analítico `comment` disparado na sequência é **descartado** pela edge function (Seção 3.3).

**Moderação (dashboard, autenticado):** `src/pages/CommentsPage.tsx` — altera `status` (`pending`/`approved`/`rejected`) e grava a resposta da loja (`reply_content` + `reply_status='replied'`). O widget lê de volta apenas `status=approved` (incluindo a resposta da loja). Trigger `set_updated_at` mantém `updated_at`.

**Leitura pública:** o widget lista comentários via `GET /rest/v1/comments?...&status=eq.approved` — funcionalmente filtra aprovados, mas a política de SELECT é irrestrita (ver Seção 8, achado A2): qualquer pessoa pode consultar **todos** os comentários de **todas** as lojas, em **qualquer status**, incluindo `user_email` de comentários pendentes/rejeitados.

---

## 7. Fluxo completo: do visitante ao dashboard do dono

1. **Instalação.** O dono instala no tema da loja um `<script>` que carrega `widget.js` com `store-id`, URL do Supabase e chave `anon` (pública por natureza).
2. **Carregamento na página do visitante.** O widget lê via PostgREST (anon) a configuração da loja (stories, vídeos, produtos, aparência, regras de página, comentários aprovados, likes) e renderiza o carrossel/stories conforme `page_rules` e `display_locations`.
3. **Interação e gravação:**
   - Visualizações/cliques rastreados (`video_view`, `story_complete`, `cta_click`, `product_click`, `product_view`) → `POST /functions/v1/track-event` → validações (origem presente; whitelist; loja ativa; domínio do `Origin/Referer` igual ao domínio cadastrado da loja, subdomínios aceitos, `localhost`/`127.0.0.1` aceitos como exceção de teste) → hash `SHA-256(IP + User-Agent + store_id)` truncado a 32 chars → RPC `track_widget_event` → bruto + agregados diários (+ rate limit por hash/loja/minuto).
   - Like → `video_likes` direto (fingerprint localStorage). Un-like → DELETE bloqueado por RLS (falha silenciosa).
   - Comentário → `comments` direto (`pending` ou `approved` conforme configuração).
   - Compra via Yampi → página de obrigado executa `yampi-tracking.js` → `POST /functions/v1/yampi-conversion` → upsert em `conversions` por `order_id`.
4. **Processamento assíncrono.** Cron diário (03:00 UTC) apaga eventos brutos com mais de 90 dias e janelas antigas de rate limit. Agregados diários são mantidos.
5. **Consumo pelo dono (dashboard, sessão autenticada):**
   - **DashboardPage:** lê `metrics` (legado — dados congelados desde 16/08) via `src/lib/analytics.ts` para os cards de performance; lê `store_activity_events` (Sistema B) para o feed "atividades recentes"; lê `usage_counters` (views do plano — sempre 0).
   - **PerformancePage (overview):** cards via `analytics.ts` (tabela `metrics` por `event_type` + contagens reais de `video_likes`, `comments` aprovados e `conversions` pagas) — likes/comentários/conversões são reais e atuais; views/cliques congelam. Gráficos diários agrupam `metrics` por `event_name` (sempre NULL) → **sempre zerados**.
   - **VideoPerformancePage / videos-tab:** mesmo padrão (`analytics.ts`), com ranking por vídeo.
   - **metrics-service.ts (PerformancePage, aba período 7/15/30d):** consulta `metrics` por `event_name` → conjunto vazio → cards zerados.
   - **CommentsPage:** moderação e respostas.
6. **Resumo da experiência atual do dono:** likes, comentários e conversões (Yampi) refletem o presente; visualizações, CTR, engajamento e cliques exibem dados históricos que congelam em 16/08/2026; gráficos diários exibem zero.

---

## 8. Achados de segurança (para a auditoria)

### Críticos

**A1. Leitura cross-tenant de analytics — `metrics`.**
Política `anon_can_select_metrics` (roles `{public}`, `using true`) + grant SELECT para `anon`. Qualquer pessoa com a chave anon (embutida no widget de todas as lojas) pode ler **todas as linhas de `metrics` de todas as lojas**: URLs de páginas visitadas, user agents, referrers, session_id/visitor_id (quando presentes). Violação de isolamento multitenant. *Correção sugerida: remover a política pública de SELECT e, se o dashboard legado precisar, restringir a `authenticated` dono/membro (já existem funções `is_store_owner_or_member` prontas).*

**A2. Leitura cross-tenant de comentários — `comments`.**
Política `Select publico` (`using true`). Expõe, de todas as lojas, comentários em qualquer status — incluindo `pending`/`rejected` — com `user_email` dos visitantes (PII). O widget só precisa ler aprovados; a política deveria restringir a `status='approved'` e, idealmente, por loja. Combinada com A1, permite reconstruir perfis de visitantes.

**A3. Leitura e forja de conversões — `conversions`.**
Políticas públicas de SELECT (`true`) e INSERT (`true`) + grants amplos. Qualquer um pode ler valores de pedidos (`order_value`, `status`) de todas as lojas e **inserir conversões falsas** para loja arbitrária (inflando receita exibida ao dono). A edge `yampi-conversion` não valida origem nem assinatura (ver A5), então nem seria preciso atacar o banco diretamente.

### Altos

**A4. Inserção irrestrita em `metrics`.** Quatro políticas redundantes de INSERT com `with check (true)` (roles anon/public) — qualquer um pode inflar/poluírt métricas de qualquer loja com tipos arbitrários (o CHECK de tipos foi removido). Hoje nenhum código legítimo grava na tabela — as políticas são superfície de ataque pura. *Sugestão: remover todas as políticas de INSERT/SELECT público de `metrics` (a tabela está sem escritor ativo).*

**A5. `yampi-conversion` sem autenticação/validação de origem.** `verify_jwt=false` (padrão), CORS `*`, exige apenas `store_id` e `visitor_id` no body (ambos adivinháveis/forgeáveis). Permite atribuir receita falsa a qualquer loja/vídeo. *Sugestão: validar origem contra o domínio da loja (como o track-event faz) e/ou exigir segredo compartilhado/assinatura HMAC do webhook.*

**A6. Integridade de likes.** (a) Sem política DELETE para anon em `video_likes` → un-likes nunca persistem (contagem só cresce); (b) `user_fingerprint` é gerado no cliente e resetável — likes são fraudáveis em massa; (c) **não há rate limit** nos inserts diretos de `video_likes`/`comments` (o rate limit do Sistema B não protege as tabelas sociais). *Sugestão: adotar RPC no estilo `track_widget_event` para likes/comentários com rate limit e sanitização; corrigir o fluxo de un-like.*

### Médios

**A7. `localhost`/`127.0.0.1` aceitos como origem válida em produção (`track-event`).** Facilita teste local, mas permite a qualquer desenvolvedor local disparar eventos válidos para lojas de terceiros (com IP próprio sujeito ao rate limit, porém com métricas infladas de `video_view`/`cta_click`). *Sugestão: restringir por variável de ambiente/flag de ambiente.*

**A8. RPCs órfãs e quebradas.** `toggle_video_like(p_store_id, p_video_id, p_visitor_id)` e `get_video_real_metrics(...)` não são chamadas por nenhum código e **falhariam em runtime** (coluna `visitor_id` não existe em `video_likes`). São `SECURITY DEFINER` e expostas à execução por qualquer cliente autenticado/anon conforme grants da API. Além do risco de drift, `get_video_real_metrics` vaza apenas contagens (baixo impacto), mas a existência de funções quebradas indica ausência de governança de schema. *Sugestão: remover ou corrigir.*

**A9. `track-event` sem verificação de assinatura do payload.** A validação de domínio (Origin/Referer) é razoável contra terceiros, mas o `Origin` pode ser spoofado por requisições não-navegador apenas se o header for enviado; a exigência do header já bloqueia scripts simples. O hash IP+UA dá rate limit razoável. Risco residual: inflação de métricas por bot que envie Origin correto — mitigável com challenge/assinatura de curto prazo. *(Informativo — design atual é um compromisso aceitável, documentado aqui para a auditoria.)*

### Baixos / informativos

**A10. Alterações de schema fora das migrations.** Remoção do CHECK de `metrics`, criação da coluna `event_name`, criação do Sistema B (tabelas/RPCs/cron) — tudo fora de `supabase/migrations/`. Lacuna de trilha de auditoria de schema. *Sugestão: padronizar todo DDL via migrations.*

**A11. Sem retenção para tabelas legadas/sociais.** `metrics`, `video_likes`, `comments`, `conversions` crescem sem purga (a purga cobre apenas `store_activity_events` e `analytics_rate_limits`).

**A12. Qualidade de dados nos dashboards (não é falha de segurança, mas afeta confiança).** (a) Gráficos diários agrupam por `event_name` (sempre NULL) → zerados; (b) `metrics-service.ts` consulta por `event_name` → sempre vazio; (c) dashboards leem tabela congelada desde 16/08/2026; (d) `usage_counters.views_count` sempre 0; (e) botões WhatsApp e "Ver no site" indistinguíveis em `cta_click`.

**A13. Rate limit por hash IP+UA.** Usuários atrás de NAT/proxy compartilhado podem colidir (limite coletivo de 60/min). Aceitável; documentar.

**A14. CORS `*` nas edge functions de analytics.** Padrão do projeto; combinado com A5 amplia a superfície. Se A5 for corrigido, o risco aqui diminui.

---

## 9. Anexo — Inventário de funções de banco relacionadas a analytics

| Função | Tipo | Status | Observação |
|--------|------|--------|------------|
| `track_widget_event` | plpgsql, SECURITY DEFINER | **Ativa** | Única porta de entrada do Sistema B; chamada pela edge `track-event` com service_role |
| `purge_old_activity_events` | plpgsql, SECURITY DEFINER | **Ativa** | Executada pelo cron `daily-analytics-purge` (03:00 UTC) |
| `toggle_video_like` | plpgsql, SECURITY DEFINER | **Órfã/quebrada** | Referencia `visitor_id` inexistente; sem chamadores |
| `get_video_real_metrics` | sql, SECURITY DEFINER | **Órfã/quebrada** | Mesmo problema de coluna; contaria `view` (tipo sem registros) |
| `is_store_owner_or_member` / `is_store_owner_or_admin` / `is_store_owner` / `is_store_member` | sql, SECURITY DEFINER | Ativas | Auxiliares de RLS (dashboards e políticas) |
| `store_exists`, `user_has_store_access` | sql | Ativas | Auxiliares |
| `handle_new_user`, `set_trial_defaults`, `create_or_get_user_tenant`, storage/plano (triggers) | plpgsql/sql | Ativas | Fora do escopo de analytics |

## 10. Anexo — Edge functions relacionadas

| Função | Status | Autenticação | Observação de segurança |
|--------|--------|--------------|-------------------------|
| `track-event` | Ativa | Nenhuma (by design); valida Origin/Referer + domínio da loja + rate limit por RPC | Whitelist de 5 eventos; aceita localhost |
| `yampi-conversion` | Ativa | **Nenhuma** | Grava `conversions` com service_role a partir de body não autenticado (A5) |
| `widget-selector` | Ativa | — | Gestão de sessões de seletor de tema (fora do escopo de métricas) |

---

*Documento gerado por análise estática e inspeção ao vivo do banco em 18/08/2026. Números de linha referem-se aos arquivos na versão atual do repositório.*
