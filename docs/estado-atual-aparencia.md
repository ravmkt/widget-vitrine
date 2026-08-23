# Documento Técnico — Estado Atual do Vidlytics: Fluxo de Persistência da Aparência

> **Contexto do bug investigado:** configurações salvas no painel de Aparência (ex.: largura do Carrossel Dinâmico) "salvam sem erro", mas ao reabrir o modal o valor volta ao anterior — nada persiste no Supabase.
>
> **Causa raiz (resumo):** o campo `dynamic_carousel_config` **não está na whitelist** `TABLE_ALLOWED_FIELDS.appearances` em `src/lib/db.ts` (L.687–722). A função de sanitização `sanitizeTablePayload` (L.858) **descarta silenciosamente** a chave do payload antes do UPDATE/INSERT no Supabase. O save retorna sucesso porque todos os demais campos são gravados normalmente. Detalhes completos na Seção 6.

---

## 1. Estrutura do Painel de Aparência

### 1.1 Localização

| Item | Valor |
|---|---|
| Arquivo do painel | `src/pages/AppearancePage.tsx` (componente `AppearancePage`, default export) |
| Rota | `/aparencia` — `src/App.tsx` L.154: `<Route path="/aparencia" element={<ProtectedRoute><AppLayout><AppearancePage /></AppLayout></ProtectedRoute>} />` |
| Variações encontradas | Não há `AppearanceSettings`/`TabAppearance` — o painel completo (lista + modal de edição) vive **todo** em `AppearancePage.tsx` (~3.600 linhas). O preview de stories usa helpers de `src/lib/storyAppearanceHelpers.ts` (não persiste). |
| Tipo de aba | `type ModalTab = 'basic' | 'floating' | 'carousel' | 'dynamic_carousel' | 'grid' | 'modal'` (L.65–72) |

### 1.2 Abas do modal de edição (botões em L.2971–2977)

| id da aba | Label na UI | Ícone |
|---|---|---|
| `basic` | Básico | `Settings2` |
| `floating` | Flutuante | `PlaySquare` |
| `carousel` | Carrossel | `Rows3` |
| `dynamic_carousel` | Carrossel Dinâmico | `Rows3` |
| `grid` | Grade | `LayoutGrid` |
| `modal` | Player | `PlaySquare` |

### 1.3 Campos editáveis por aba

Cada aba (exceto Básico e Player) tem um seletor **Desktop/Mobile** independente (`floatingDevice`, `carouselDevice`, `dynamicCarouselDevice`, `gridDevice`). Se o toggle global `useGlobalAppearance` estiver ativo, o seletor é travado em Desktop e o objeto mobile é espelhado do desktop.

**Básico** (`formData`, nível raiz)
- `name` (nome do estilo) — obrigatório
- `is_default` (definir como padrão da loja)
- `useGlobalAppearance` / `use_global_appearance` (usar aparência em todos os dispositivos)

**Flutuante** (`floating_config.desktop|mobile`, tipo `FloatingConfig`)
- `shape`: `circle | square | portrait | landscape`
- `width` (Tamanho Base px) e `height` (derivada automaticamente pela proporção do shape)
- `position`: `fixed_bottom_right | fixed_bottom_left | fixed_top_right | fixed_top_left` (+ `floating_position` espelhada: `bottom-right` etc.)
- `bottom_spacing`, `top_spacing`, `left_spacing`, `right_spacing`
- `border_color`, `border_style` (largura da borda px), `border_radius`
- `object_fit`: `cover | contain | fill`
- `z_index`
- Toggles: `show_title`, `autoplay_videos`, `show_play_icon`, `draggable`, `allow_close`

**Carrossel** (`carousel_config.desktop|mobile`, tipo `CarouselConfig`)
- `shape`, `width` (Largura Card px), `visible_items`, `spacing`, `margin_top`, `margin_bottom`
- `border_color`, `border_style` (largura), `border_radius`, `object_fit`
- Toggles: `show_title`, `autoplay_videos`, `show_play_icon`, `show_product`, `auto_center`
- Card de produto (visível se `show_product`): `product_card_bg`, `product_card_border_color`, `product_card_border_width`, `product_card_border_radius`, `product_card_name_size`, `product_card_name_color`, `product_card_price_size`, `product_card_price_color` (+ `product_card_price_bold` via default)
- `auto_highlight` (existe no tipo; UI de toggle está na aba Carrossel Dinâmico)
- `view_mode` (herdado de defaults, sem input direto nesta aba)

**Carrossel Dinâmico** (`dynamic_carousel_config.desktop|mobile`, tipo `DynamicCarouselConfig` = `CarouselConfig &` extras)
- Herda todos os campos do Carrossel: `shape`, `width`, `spacing`, `margin_top`, `margin_bottom`, `border_color`, `border_style`, `border_radius`, `object_fit`, toggles `show_title`/`autoplay_videos`/`show_play_icon`/`show_product`, card de produto completo
- `auto_highlight` (destaque automático central, avanço a cada 5s)
- `highlight_shadow` (sombra no vídeo em destaque)
- `highlight_scale_up` (ampliar vídeo em destaque)
- `highlight_scale_down_others` (reduzir vídeos inativos)
- ⚠️ `enabled` **não é editável**: forçado `true` em `updateDynamicCarouselConfig` (L.2453) e no save (L.2653–2654)

**Grade** (`grid_config.desktop|mobile`, tipo `GridConfig`)
- `shape`, `width` (Largura Card), `visible_items` (colunas por linha, clamp 1–10), `spacing`
- `border_color`, `border_style`, `border_radius`, `object_fit`
- Toggles: `show_title`, `autoplay_videos`, `sequential_playback` (1 vídeo por vez, 5s cada)
- `rows` existe no tipo/default (clamp ≥1), sem input direto nesta aba

**Player / Modal** (`modal_config`, objeto plano — sem desktop/mobile)
- `border_color`, `border_width`, `border_radius`
- Toggles: `show_title`, `show_play_button`, `show_like_button`, `show_comment_button`, `show_share_button`, `show_product`
- Card de produto: `product_card_bg`, `product_card_border_color`, `product_card_border_width`, `product_card_border_radius`, `product_card_name_size`, `product_card_name_color`, `product_card_price_size`, `product_card_price_color`, `product_card_button_bg`, `product_card_button_color`

### 1.4 Estrutura dos objetos responsivos

```typescript
// src/pages/AppearancePage.tsx L.115–119
type ResponsiveConfig<T> = {
  same_for_all: boolean;
  desktop: T;
  mobile: T;
};
```

---

## 2. Fluxo de SAVE (o mais crítico)

### 2.1 Visão geral da cadeia (clique em "Salvar" → linha no Supabase)

```
[Botão Salvar] (footer do modal, AppearancePage.tsx ~L.3568)
      │
      ▼
handleSaveStyle()                    AppearancePage.tsx L.2619
      │  monta stylePayload com { ..., dynamic_carousel_config, ... }  ✔ AQUI O CAMPO EXISTE
      ▼
db.appearances.save(stylePayload)    AppearancePage.tsx L.2726
      │  db.appearances = createSupabaseCrudFunctions<Appearance>('appearances', …)  db.ts L.1642
      ▼
save()                               db.ts L.1377 (createSupabaseCrudFunctions)
      │  preparePayloadForSave('appearances', item)   db.ts L.924
      │        ├─ removeUndefinedValues
      │        ├─ sanitizeTablePayload                 db.ts L.858
      │        │      └─ filtra por TABLE_ALLOWED_FIELDS['appearances']  db.ts L.687
      │        │         ❌ 'dynamic_carousel_config' NÃO está na lista → CHAVE DESCARTADA AQUI
      │        └─ normalizeUuidPayload (valida/gera UUIDs)
      ▼
ensureSupabaseStoreExists(store_id)  db.ts (upsert garante a loja)
      ▼
SELECT id FROM appearances WHERE id=… (.maybeSingle)
      ├── existe → supabase.from('appearances').update(payload).eq('id', …).select().single()
      └── não existe → supabase.from('appearances').insert(payload).select().single()
      ▼
UPDATE gravado SEM dynamic_carousel_config → ✅ sucesso (nenhum erro; a coluna nem é citada no SQL)
      ▼
(fluxo paralelo) supabase.from('store_settings').upsert({ default_appearance_id, … })  AppearancePage.tsx L.2729–2741
```

### 2.2 Montagem do objeto no clique — `handleSaveStyle` (L.2619–2760)

```tsx
// src/pages/AppearancePage.tsx — L.2619 (trecho essencial; código completo na Seção 5.1)
const handleSaveStyle = async () => {
  if (saving) return;
  const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
  if (!finalStoreId) { showError('Não foi possível identificar a loja atual.'); return; }
  if (!formData.name.trim()) { showError('Nome do estilo é obrigatório.'); setActiveTab('basic'); return; }

  try {
    setSaving(true);
    const now = new Date().toISOString();
    const id = editingStyle?.id || formData.id || generateUuid();

    // … floatingConfig / carouselConfig normalizados … (L.2630–2650)

    // L.2651–2656 — objeto do Carrossel Dinâmico:
    const dynamicCarouselConfig: ResponsiveConfig<DynamicCarouselConfig> = {
      ...formData.dynamic_carousel_config,
      desktop: { ...normalizeCarouselConfigShape(formData.dynamic_carousel_config.desktop), enabled: true } as DynamicCarouselConfig,
      mobile: { ...normalizeCarouselConfigShape(formData.dynamic_carousel_config.mobile), enabled: true } as DynamicCarouselConfig,
      same_for_all: formData.useGlobalAppearance,
    };

    // … gridConfig, espelhamento mobile=desktop quando useGlobalAppearance … (L.2658–2678)

    const stylePayload = {                                   // L.2684
      id,
      store_id: finalStoreId,
      name: formData.name.trim(),
      is_default: shouldBeDefault,

      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      text_color: formData.text_color,
      background_color: formData.background_color,
      button_color: formData.button_color,
      font_family: formData.font_family,
      font_size: String(formData.font_size || '14'),

      floating_config: floatingConfig,          // JSONB
      carousel_config: carouselConfig,          // JSONB
      dynamic_carousel_config: dynamicCarouselConfig, // JSONB ← A CHAVE CRÍTICA
      grid_config: gridConfig,                  // JSONB
      modal_config: modalConfig,                // JSONB

      use_global_appearance: formData.useGlobalAppearance,
      url: formData.url || null,

      created_at: formData.created_at || editingStyle?.created_at || now,
      updated_at: now,
    };

    // (se for default, salva os outros estilos com is_default=false — L.2706–2719)

    await db.appearances.save(stylePayload as unknown as Appearance);   // L.2726

    if (supabase) {                                            // L.2728–2741
      const { error: storeSettingsError } = await supabase
        .from('store_settings')
        .upsert({ store_id: finalStoreId, default_appearance_id: shouldBeDefault ? id : null, updated_at: now },
                 { onConflict: 'store_id' });
      if (storeSettingsError) console.error('Erro ao sincronizar store_settings:', storeSettingsError);
    }

    if (stylePayload.is_default) await syncDefaultAppearanceId(finalStoreId, id);
    window.dispatchEvent(new Event('storage'));
    showSuccess(editingStyle ? 'Estilo atualizado com sucesso!' : 'Estilo criado com sucesso!');
    setShowModal(false); setEditingStyle(null);
    await loadData();
  } catch (error) {
    console.error('Erro ao salvar estilo:', error);
    showError('Erro ao salvar estilo.');
  } finally { setSaving(false); }
};
```

**Chaves do `dynamic_carousel_config` enviado:**

```
dynamic_carousel_config: {
  same_for_all: boolean,            // = useGlobalAppearance do painel
  desktop: { enabled:true, shape, width, spacing, view_mode, margin_top, margin_bottom,
             visible_items, show_product, show_play_icon, show_title, autoplay_videos,
             auto_center, auto_highlight, width/border_color, border_style, border_radius,
             object_fit, highlight_shadow, highlight_scale_up, highlight_scale_down_others,
             product_card_* (8 campos) },
  mobile: { …mesmas chaves… }
}
```

### 2.3 Serialização e função de gravação

- **Não há `JSON.stringify` manual**: o objeto vai como objeto JS no payload e o `@supabase/supabase-js` serializa para JSON no request; o PostgREST grava nas colunas **JSONB** (`floating_config`, `carousel_config`, `grid_config`, `modal_config`, `dynamic_carousel_config`).
- **Não é usado `upsert` para appearances**: `createSupabaseCrudFunctions.save()` (db.ts L.1377) faz *select id → update ou insert* manual (ver Seção 5.5).
- Não há edge function no fluxo de save da aparência (as edge functions `widget-selector`, `track-event` etc. não participam da persistência do painel).

### 2.4 Onde o campo morre — whitelist de sanitização

```typescript
// src/lib/db.ts L.687–722 — TABLE_ALLOWED_FIELDS.appearances (lista COMPLETA)
appearances: [
  'id', 'store_id', 'created_at', 'updated_at',
  // 🟦 Básico
  'name', 'is_default', 'use_global_appearance',
  // 🟨 Identidade Visual
  'primary_color', 'secondary_color', 'text_color', 'background_color',
  'button_color', 'font_family', 'font_size', 'border_radius', 'shadow_enabled',
  // 🔴 Flutuante
  'widget_shape', 'widget_size', 'widget_animation',
  // 🟢 Carrossel — JSONB + CAMPOS PLANOS
  'carousel_config',
  'carousel_shape', 'carousel_size', 'carousel_card_shape',
  'carousel_visible_items', 'carousel_spacing', 'carousel_gap',
  'carousel_border_color', 'carousel_border_width', 'carousel_border_radius',
  'carousel_object_fit', 'carousel_margin_top', 'carousel_margin_bottom',
  'carousel_show_title', 'carousel_show_product', 'carousel_show_play_button',
  'carousel_auto_center', 'carousel_view_mode',
  // 🟣 Grade — JSONB + CAMPOS PLANOS
  'grid_config',
  'grid_shape', 'grid_columns', 'grid_rows', 'grid_spacing', 'grid_size',
  'grid_border_color', 'grid_border_width', 'grid_border_radius',
  'grid_object_fit', 'grid_show_title', 'grid_margin_top', 'grid_margin_bottom',
  // 🔵 Modal — JSONB + CAMPOS PLANOS
  'modal_config',
  'modal_show_title', 'modal_show_play_button', 'modal_show_product',
  'modal_show_like_button', 'modal_show_comment_button', 'modal_show_share_button',
  'modal_show_whatsapp_button', 'modal_show_product_button',
  'modal_hide_stories', 'modal_shadow_enabled',
  'modal_border_color', 'modal_border_width', 'modal_border_radius',
  // 👁️ Visibilidade dos botões (legado)
  'show_title', 'show_play_button', 'show_product', 'show_like_button',
  'show_comment_button', 'show_share_button', 'show_whatsapp_button', 'show_product_button',
  // 📦 JSONB Configs
  'floating_config',
  // 🔗 Outros
  'url',
],
```

❌ **`dynamic_carousel_config` não consta na lista.** Resultado do filtro em `sanitizeTablePayload` (db.ts L.858–873):

```typescript
// src/lib/db.ts L.858–873
const sanitizeTablePayload = <T extends Record<string, any>>(tableName: string, item: T): T => {
  const normalizedItem = normalizeTablePayloadBeforeSave(tableName, item);
  const allowedFields = TABLE_ALLOWED_FIELDS[tableName];
  if (!allowedFields) return normalizedItem;
  const clean: Record<string, any> = {};
  Object.entries(normalizedItem).forEach(([key, value]) => {
    if (allowedFields.includes(key)) clean[key] = value;   // ← dynamic_carousel_config é descartado aqui
  });
  return clean as T;
};
```

> Curiosidade adicional: a lista contém dezenas de campos "flattened" (`carousel_shape`, `grid_columns`, etc.) que **nem existem como colunas** na tabela real do banco (ver Seção 3.1). Como o `stylePayload` do painel não envia esses campos, isso não gera erro — mas confirma que a whitelist está dessincronizada do schema real.

### 2.5 Fluxo secundário do save

1. Se o estilo salvo é default, os demais estilos são re-gravados com `is_default=false` (L.2706–2719, via `db.appearances.save`).
2. `store_settings.default_appearance_id` é sincronizado por upsert direto no Supabase (L.2728–2741).
3. `syncDefaultAppearanceId()` (L.1186–1213) regrava as `generalSettings` locais/Supabase via `db.generalSettings.save`.
4. `window.dispatchEvent(new Event('storage'))` + `loadData()` recarregam a listagem (do Supabase) e fecham o modal com toast de sucesso — **é por isso que o usuário vê "salvo com sucesso" mesmo com o campo descartado**.

---

## 3. Persistência / Tabela no Supabase

### 3.1 Tabela: `public.appearances` (schema REAL consultado ao vivo)

**Não existe `CREATE TABLE appearances` em nenhuma migration** (a tabela pré-existia ao sistema de migrations; `0001_saas_multi_tenant_base.sql` L.73–74 apenas adiciona `store_id`). DDL reconstruído do banco live:

```sql
CREATE TABLE public.appearances (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                uuid NOT NULL,
  name                    text NOT NULL DEFAULT 'Default',
  is_default              boolean DEFAULT false,
  use_global_appearance   boolean DEFAULT true,
  primary_color           text DEFAULT '#000000',
  secondary_color         text DEFAULT '#000000',
  text_color              text DEFAULT '#0F172A',
  background_color        text DEFAULT '#FFFFFF',
  button_color            text DEFAULT '#0094EB',
  font_family             text DEFAULT 'Inter, sans-serif',
  font_size               text DEFAULT '14',
  floating_config         jsonb,          -- JSONB responsivo (desktop/mobile)
  carousel_config         jsonb,          -- JSONB responsivo
  grid_config             jsonb,          -- JSONB responsivo
  modal_config            jsonb,          -- JSONB responsivo
  dynamic_carousel_config jsonb NOT NULL DEFAULT '{ …default verboso… }'::jsonb,
  url                     text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
-- RLS: ENABLED
```

**O default real de `dynamic_carousel_config`** (JSONB, `NOT NULL`) contém `mobile` + `desktop` completos com `enabled: false`, `same_for_all: true`, `width: "80"`, `visible_items: 4 (desktop) / 2 (mobile)`, `spacing: 16`, `border_radius: "12"/"10"` e todos os `product_card_*`. Ou seja: **como o UPDATE nunca envia a coluna, ela permanece eternamente nesse default** (ou no último valor gravado antes do bug/por SQL manual).

⚠️ Essa coluna **não foi criada por nenhuma migration versionada** — foi adicionada direto no banco (console/SQL), fora do controle de versão.

### 3.2 Existe "flatten" para colunas?

- **No SQL: NÃO.** Não há trigger que espalhe `dynamic_carousel_config.mobile.width` em colunas de topo. Não existem colunas flattened reais na tabela (os `carousel_*`/`grid_*`/`modal_*` planos da whitelist só existem no fallback localStorage do `db.ts` e no `DEFAULT_APPEARANCES` em memória).
- **No widget: SIM (parcial e com bug).** `normalizeAppearanceItem` → `flattenAppearanceInto` (widget.js L.430–458) achata objetos aninhados no nível raiz, **exceto** os listados em `JSONB_KEYS = ['floating_config', 'carousel_config', 'grid_config', 'modal_config']` (L.442). `dynamic_carousel_config` **não está nessa lista** → seu conteúdo é achatado no topo e o wrapper destruído (detalhes na Seção 4.3).

### 3.3 RLS — políticas reais na tabela `appearances` (consultadas ao vivo)

| Política | Comando | Papel | Condição |
|---|---|---|---|
| `Select publico` | SELECT | (anon, pública) | `using (true)` ← é assim que o widget lê com anon key |
| `Membro ve` | SELECT | authenticated | `is_store_owner_or_member(store_id)` |
| `Owner insere` | INSERT | authenticated | `with check (is_store_owner(store_id))` |
| `Owner atualiza` | UPDATE | authenticated | `using/check (is_store_owner(store_id))` |
| `Owner deleta` | DELETE | authenticated | `using (is_store_owner(store_id))` |

```sql
CREATE FUNCTION public.is_store_owner(check_store_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE id = check_store_id AND owner_user_id = auth.uid());
$$;

CREATE FUNCTION public.is_store_owner_or_member(check_store_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = check_store_id AND owner_user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM public.store_members WHERE store_id = check_store_id AND user_id = auth.uid()
  );
$$;
```

⚠️ **Nota de RLS:** UPDATE/INSERT exigem **owner** (não basta ser membro). Se um usuário membro (não owner) salvar, o `.update().select().single()` retornaria 0 linhas → erro `PGRST116` → toast "Erro ao salvar estilo". Como o sintoma relatado é **salvar sem erro**, o cenário é o do owner — que passa pelo RLS e cai na causa raiz da whitelist (Seção 6).

### 3.4 Trigger na tabela

```sql
-- Trigger real (BEFORE INSERT/UPDATE):
CREATE TRIGGER trg_sanitize_appearances
  BEFORE INSERT OR UPDATE ON public.appearances
  FOR EACH ROW EXECUTE FUNCTION sanitize_appearance_colors();

CREATE FUNCTION public.sanitize_appearance_colors() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Remove caracteres perigosos de qualquer campo de cor
  NEW.primary_color   := regexp_replace(NEW.primary_color,   '[<>"''`&;{}()\\]', '', 'g');
  NEW.secondary_color := regexp_replace(NEW.secondary_color, '[<>"''`&;{}()\\]', '', 'g');
  NEW.text_color      := regexp_replace(NEW.text_color,      '[<>"''`&;{}()\\]', '', 'g');
  NEW.background_color:= regexp_replace(NEW.background_color,'[<>"''`&;{}()\\]', '', 'g');
  NEW.button_color    := regexp_replace(NEW.button_color,    '[<>"''`&;{}()\\]', '', 'g');
  NEW.font_family     := regexp_replace(NEW.font_family,     '[<>`&;{}()\\]', '', 'g');
  RETURN NEW;
END; $$;
```

O trigger **não bloqueia** UPDATEs e **não toca** nos JSONBs — não é o vilão.

### 3.5 Leitura que abastece o painel (READ)

```
loadData() (L.2065) → getAppearancesSafe(finalStoreId) (L.1165)
  → db.appearances.getAll(storeId)                     db.ts L.1318
      → supabase.from('appearances').select('*').eq('store_id', storeId)
            .order('created_at', { ascending: false })
      → map(normalizeTableItemForClient('appearances', item))   db.ts L.794
          ├─ aliases camelCase↔snake_case (use_global_appearance / is_default)
          └─ parse defensivo de JSONBs: ['floating_config','carousel_config','grid_config','modal_config']
              ⚠️ dynamic_carousel_config NÃO está nessa lista (inofensivo na prática:
                 PostgREST já devolve jsonb como objeto)
```

Ao clicar em **Editar** (`handleEditStyle`, L.2608) → `normalizeAppearance(style)` (L.~920) reconstrói o `formData`:
- `normalizeResponsiveConfig({ rawValue: anyItem.dynamic_carousel_config, … })` (L.1004–1010) faz merge `defaults ← parsed.desktop/mobile`. Como o banco devolve o **default antigo** (nunca atualizado), o formulário volta com o valor antigo — fechando o ciclo do sintoma.

### 3.6 Tabela `widget_appearances` (migration 0008) — ⚠️ NÃO EXISTE no banco

`supabase/migrations/0008_widget_appearances_columns.sql` cria `public.widget_appearances` (colunas flattened `floating_*`, `store_id` PK, leitura pública, escrita por admin/owner). Consulta ao vivo: `to_regclass('public.widget_appearances')` → **`null`** (a migration nunca foi aplicada ou a tabela foi dropada). **Nenhum código do painel de Aparência usa essa tabela**; ela é um legado desconectado do fluxo atual.

---

## 4. Construção do appearance que o WIDGET recebe (`public/widget.js`)

### 4.1 Origem e merge

O widget monta a aparência em `readAppearance()` (widget.js L.574–583), sempre em **4 camadas com precedência crescente** (DB vence):

```javascript
// public/widget.js L.574–583
function readAppearance() {
  var configAppearance  = normalizeAppearanceItem(getConfigAppearance());   // 1º: config inline do script
  var storageAppearance = normalizeAppearanceItem(getStorageAppearance());  // 2º: localStorage (vidlytics_appearance…)
  return fetchDbAppearance().then(function (dbAppearance) {                 // 4º: banco (VENCE)
    var finalAppearance = {};
    mergeObject(finalAppearance, DEFAULT_APPEARANCE);   // 0º: defaults hardcoded do widget
    mergeObject(finalAppearance, configAppearance);
    mergeObject(finalAppearance, storageAppearance);
    mergeObject(finalAppearance, dbAppearance);
    return finalAppearance;
  });
}
```

A leitura do banco é via **REST direto com anon key** (aproveitando a policy pública `Select publico`):

```javascript
// public/widget.js L.541–558
function fetchDbAppearance() {
  if (!storeId || !hasSupabase) return Promise.resolve({});
  return supabaseFetch(
    'appearances?select=*&store_id=eq.' + encodeURIComponent(storeId) + '&limit=1',
    { method: 'GET' }
  )
    .then(function (response) { if (!response.ok) return null; return response.json(); })
    .then(function (data) {
      if (Array.isArray(data) && data.length > 0) return normalizeAppearanceItem(data[0]);
      return {};
    })
    .catch(function () { return {}; });
}
```

⚠️ **Pegadinha 1:** `limit=1` **sem `order` e sem filtro `is_default`** — se a loja tiver vários estilos, o widget pega uma linha arbitrária (ordem não determinística do PostgREST), não necessariamente o estilo padrão definido no painel.

⚠️ **Pegadinha 2:** o merge só sobrescreve chaves com valor não-vazio (`mergeObject` L.560–566), então defaults do widget sobrevivem para campos ausentes.

### 4.2 `normalizeAppearanceItem` / `flattenAppearanceInto` — o flatten do widget

```javascript
// public/widget.js L.430–458
function normalizeAppearanceItem(item) {
  var merged = {};
  flattenAppearanceInto(merged, item || {}, 0);
  delete merged.storageAppearance; delete merged.configAppearance; delete merged.dbAppearance;
  delete merged.widgetsAppearance; delete merged.widgetsAparencia;
  return merged;
}
var JSONB_KEYS = ['floating_config', 'carousel_config', 'grid_config', 'modal_config'];

function flattenAppearanceInto(target, source, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 12 || !source) return target;
  if (typeof source === 'string') source = parseJsonIfNeeded(source);
  if (!isPlainObject(source)) return target;
  Object.keys(source).forEach(function (key) {
    var value = source[key];
    if (value === undefined || value === null || value === '') return;
    if (JSONB_KEYS.indexOf(key) !== -1) { target[key] = value; return; }   // preserva o JSONB inteiro
    if (isPlainObject(value)) { flattenAppearanceInto(target, value, depth + 1); return; } // achata
    if (typeof value === 'string') {
      var parsed = parseJsonIfNeeded(value);
      if (isPlainObject(parsed) && Object.keys(parsed).length) { flattenAppearanceInto(target, parsed, depth + 1); return; }
    }
    target[key] = value;
  });
  return target;
}
```

**Consequência crítica:** `dynamic_carousel_config` **não está em `JSONB_KEYS`** → o wrapper é achatado: `same_for_all` sobe para o topo, e os campos de `desktop`/`mobile` são hoisted para a raiz (com `mobile` sobrescrevendo `desktop` nas chaves não-vazias, dependendo da ordem das keys). Ou seja, quando `getDynamicCarouselConfig(appearance)` executa, `appearance.dynamic_carousel_config` em geral **já não existe mais** — a leitura cai no fallback "flat" de `readConfigValue`.

### 4.3 Estrutura real que chega em `getDynamicCarouselConfig(appearance)`

Objeto **plano** (pós-flatten/merge): defaults do widget + campos achados no topo (inclusive os hoisted do dynamic carousel: `enabled`, `width`, `spacing`, `shape`, `border_radius`, `highlight_shadow`, …) + os 4 JSONBs preservados (`floating_config`, `carousel_config`, `grid_config`, `modal_config` como objetos `{same_for_all, desktop, mobile}`).

```javascript
// public/widget.js L.3629–3683 — como o widget lê o Carrossel Dinâmico
function getDynamicCarouselConfig(appearance) {
  appearance = normalizeAppearanceItem(appearance || {});

  // Dupla leitura (padrão do carousel/grid): jsonb dynamic_carousel_config + campos flattened
  function rcv(jsonbField, fallback) {
    return readConfigValue(appearance, 'dynamic_carousel_config', jsonbField, jsonbField, fallback);
  }

  // enabled vem de "enabled" no jsonb OU do flattened no topo
  var enabled = toBoolean(rcv('enabled', false), false);
  if (!enabled) {
    var rawDc = appearance.dynamic_carousel_config;
    if (typeof rawDc === 'string') { try { rawDc = JSON.parse(rawDc); } catch(e) { rawDc = null; } }
    if (rawDc && typeof rawDc === 'object') {
      var device = window.innerWidth < 768 ? 'mobile' : 'desktop';
      var layer = (rawDc[device] && typeof rawDc[device] === 'object') ? rawDc[device] : rawDc;
      if (layer && typeof layer === 'object' && (layer['enabled'] === true || layer['enabled'] === 'true')) enabled = true;
    }
  }

  var clampNum = function(n, min, max) { n = Number(n); if (!isFinite(n)) return min; return Math.min(max, Math.max(min, n)); };
  var shape = String(rcv('shape', 'portrait')).trim().toLowerCase();
  if (['square', 'landscape', 'circle'].indexOf(shape) === -1) shape = 'portrait';

  return {
    enabled: enabled,
    width: toNumber(rcv('width', '160'), 160),
    spacing: toNumber(rcv('spacing', '14'), 14),
    shape: shape,
    borderRadius: toNumber(rcv('border_radius', '14'), 14),
    bgColor: rcv('bg_color', '#000000') || '#000000',
    highlightMode: String(rcv('highlight_mode', 'ring')).trim().toLowerCase(),
    highlightShadow: toBoolean(rcv('highlight_shadow', false), false),
    highlightBorderColor: rcv('border_color', '#0094EB') || '#0094EB',
    highlightBorderWidth: toNumber(rcv('highlight_border_width', '0'), 0),
    highlightBorderRadius: toNumber(rcv('highlight_border_radius', '14'), 14),
    dimInactive: toBoolean(rcv('highlight_dim_inactive', true), true),
    inactiveScale: clampNum(rcv('inactive_scale', '0.85'), 0.5, 1),
    inactiveOpacity: clampNum(rcv('inactive_opacity', '0.5'), 0.1, 1),
    enlargeActive: toBoolean(rcv('highlight_enlarge_active', false), false),
    activeScale: clampNum(rcv('active_scale', '1.15'), 1, 1.5),
    transitionMs: clampNum(rcv('highlight_transition', '300'), 100, 1000),
    autoplayDelay: clampNum(rcv('autoplay_delay', '5000'), 1500, 20000),
  };
}
```

Onde `readConfigValue` (L.290) faz: 1º tenta `dynamic_carousel_config[device|.same_for_all → desktop/mobile][campo]` via `readJsonbConfigValue` (L.263, respeita `same_for_all` e o device por `window.innerWidth < 768`); 2º tenta o campo no topo (`readDeviceValue` L.241 — usa `same_appearance_all_devices`, **outra chave**, distinta do `use_global_appearance` gravado pelo painel); 3º fallback.

`renderDynamicCarouselWidget(options, stories, appearance)` (L.3685) chama esse config; se `!cfg.enabled` retorna, e exige **≥ 3 vídeos**. `getWidgetDisplayMode(appearance)` (L.3830) também inspeciona `appearance.dynamic_carousel_config` para decidir o modo `dynamic_carousel`.

### 4.4 Divergências widget × painel (mapa rápido para debug)

| Aspecto | Painel (`AppearancePage`) | Widget (`widget.js`) |
|---|---|---|
| Largura default | `80` | `160` |
| Spacing default | `16` | `14` |
| border_radius default | `12`/`10` | `14` |
| Chave "mesmo p/ todos" | `use_global_appearance` (coluna) + `same_for_all` dentro de cada JSONB | `same_for_all` dentro do JSONB ✔, mas flatten de topo usa `same_appearance_all_devices` ✖ |
| Campos de destaque | `highlight_shadow`, `highlight_scale_up`, `highlight_scale_down_others`, `auto_highlight` | lê `highlight_shadow` ✔; ignora `highlight_scale_up`/`scale_down_others` (usa `highlight_enlarge_active`, `inactive_scale`, `active_scale`…) |
| `enabled` | forçado `true` no save | default do **banco** é `false` |
| Qual aparência usar | lista + `is_default` + `store_settings.default_appearance_id` | 1ª linha de `appearances` sem ordenação/filtro |

---

## 5. Código relevante (trechos completos, com caminho e linha)

### 5.1 `src/pages/AppearancePage.tsx` — `handleSaveStyle` (L.2619–2760)

```tsx
const handleSaveStyle = async () => {
    if (saving) return;
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
    if (!finalStoreId) {
      showError('Não foi possível identificar a loja atual.');
      return;
    }
    if (!formData.name.trim()) {
      showError('Nome do estilo é obrigatório.');
      setActiveTab('basic');
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const id = editingStyle?.id || formData.id || generateUuid();

      const floatingConfig: ResponsiveConfig<FloatingConfig> = {
        ...formData.floating_config,
        desktop: normalizeFloatingShapeValues(formData.floating_config.desktop),
        mobile: normalizeFloatingShapeValues(formData.floating_config.mobile),
        same_for_all: formData.useGlobalAppearance,
      };

      const carouselConfig: ResponsiveConfig<CarouselConfig> = {
        ...formData.carousel_config,
        desktop: normalizeCarouselConfigShape(formData.carousel_config.desktop),
        mobile: normalizeCarouselConfigShape(formData.carousel_config.mobile),
        same_for_all: formData.useGlobalAppearance,
      };

      const dynamicCarouselConfig: ResponsiveConfig<DynamicCarouselConfig> = {
        ...formData.dynamic_carousel_config,
        desktop: { ...normalizeCarouselConfigShape(formData.dynamic_carousel_config.desktop), enabled: true } as DynamicCarouselConfig,
        mobile: { ...normalizeCarouselConfigShape(formData.dynamic_carousel_config.mobile), enabled: true } as DynamicCarouselConfig,
        same_for_all: formData.useGlobalAppearance,
      };

      const gridConfig: ResponsiveConfig<GridConfig> = {
        ...formData.grid_config,
        desktop: normalizeGridConfigShape(formData.grid_config.desktop),
        mobile: normalizeGridConfigShape(formData.grid_config.mobile),
        same_for_all: formData.useGlobalAppearance,
      };

      gridConfig.desktop = { ...gridConfig.desktop, visible_items: limitNumber(gridConfig.desktop.visible_items, 10, 1, 10) };
      gridConfig.mobile = { ...gridConfig.mobile, visible_items: limitNumber(gridConfig.mobile.visible_items, 2, 1, 10) };

      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
        carouselConfig.mobile = carouselConfig.desktop;
        dynamicCarouselConfig.mobile = dynamicCarouselConfig.desktop;
        gridConfig.mobile = gridConfig.desktop;
      }

      floatingConfig.desktop = normalizeFloatingConfigForSave(floatingConfig.desktop);
      floatingConfig.mobile = normalizeFloatingConfigForSave(floatingConfig.mobile);
      if (formData.useGlobalAppearance) {
        floatingConfig.mobile = floatingConfig.desktop;
      }

      const modalConfig = formData.modal_config;
      const shouldBeDefault = formData.is_default || appearances.length === 0;

      const stylePayload = {
        id,
        store_id: finalStoreId,
        name: formData.name.trim(),
        is_default: shouldBeDefault,

        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        text_color: formData.text_color,
        background_color: formData.background_color,
        button_color: formData.button_color,
        font_family: formData.font_family,
        font_size: String(formData.font_size || '14'),

        floating_config: floatingConfig,
        carousel_config: carouselConfig,
        dynamic_carousel_config: dynamicCarouselConfig,
        grid_config: gridConfig,
        modal_config: modalConfig,

        use_global_appearance: formData.useGlobalAppearance,
        url: formData.url || null,

        created_at: formData.created_at || editingStyle?.created_at || now,
        updated_at: now,
      };

      if (stylePayload.is_default) {
        await Promise.all(
          appearances
            .filter(style => style.id !== id)
            .map(style =>
              db.appearances.save({
                ...style,
                store_id: finalStoreId,
                is_default: false,
                updated_at: now,
              } as Appearance),
            ),
        );
      }

      await db.appearances.save(stylePayload as unknown as Appearance);

      if (supabase) {
        const { error: storeSettingsError } = await supabase
          .from('store_settings')
          .upsert(
            {
              store_id: finalStoreId,
              default_appearance_id: shouldBeDefault ? id : null,
              updated_at: now,
            },
            { onConflict: 'store_id' },
          );
        if (storeSettingsError) {
          console.error('Erro ao sincronizar store_settings:', storeSettingsError);
        }
      }

      if (stylePayload.is_default) {
        await syncDefaultAppearanceId(finalStoreId, id);
      }

      window.dispatchEvent(new Event('storage'));
      showSuccess(editingStyle ? 'Estilo atualizado com sucesso!' : 'Estilo criado com sucesso!');
      setShowModal(false);
      setEditingStyle(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar estilo:', error);
      showError('Erro ao salvar estilo.');
    } finally {
      setSaving(false);
    }
  };
```

### 5.2 `src/pages/AppearancePage.tsx` — `updateDynamicCarouselConfig` (L.2447–2476, edição em tempo real do form)

```tsx
const updateDynamicCarouselConfig = (patch: Partial<DynamicCarouselConfig>) => {
  setFormData(prev => {
    const device = prev.useGlobalAppearance ? 'desktop' : dynamicCarouselDevice;
    const current = prev.dynamic_carousel_config[device];

    let updatedDeviceConfig: DynamicCarouselConfig = {
      ...current,
      ...patch,
      enabled: true, // sempre ativo
      spacing: safeNumber(patch.spacing ?? current.spacing, current.spacing || 0, 0),
      visible_items: safeNumber(
        patch.visible_items ?? current.visible_items,
        current.visible_items || 1,
        1,
      ),
    };

    if (patch.shape !== undefined) {
      const newShape = normalizeWidgetShape(patch.shape, 'portrait');
      const width = formatNumberLikeCurrent(patch.width ?? current.width ?? '80', '80');
      updatedDeviceConfig = { ...updatedDeviceConfig, shape: newShape, width };
    }

    updatedDeviceConfig = normalizeCarouselConfigShape(updatedDeviceConfig) as DynamicCarouselConfig;

    const nextConfig: ResponsiveConfig<DynamicCarouselConfig> = prev.useGlobalAppearance
      ? { same_for_all: true, desktop: updatedDeviceConfig, mobile: updatedDeviceConfig }
      : { ...prev.dynamic_carousel_config, same_for_all: false, [device]: updatedDeviceConfig };

    return { ...prev, dynamic_carousel_config: nextConfig };
  });
};
```

### 5.3 `src/lib/db.ts` — `preparePayloadForSave` + sanitização (L.858–952)

```typescript
const sanitizeTablePayload = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const normalizedItem = normalizeTablePayloadBeforeSave(tableName, item);
  const allowedFields = TABLE_ALLOWED_FIELDS[tableName];

  if (!allowedFields) return normalizedItem;

  const clean: Record<string, any> = {};

  Object.entries(normalizedItem).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      clean[key] = value;
    }
  });

  return clean as T;
};

const removeUndefinedValues = <T extends Record<string, any>>(item: T): T => {
  const clean: Record<string, any> = {};
  Object.entries(item).forEach(([key, value]) => {
    if (value !== undefined) {
      clean[key] = value;
    }
  });
  return clean as T;
};

const preparePayloadForSave = <T extends Record<string, any>>(
  tableName: string,
  item: T,
): T => {
  const normalizedPayload: Record<string, any> = { ...item };

  // (normalização inversa apenas para 'comments' — irrelevante p/ appearances)

  return normalizeUuidPayload(
    tableName,
    sanitizeTablePayload(tableName, removeUndefinedValues(normalizedPayload)),
  ) as T;
};
```

### 5.4 `src/lib/db.ts` — `createSupabaseCrudFunctions.save` (L.1377–1456, o UPDATE real)

```typescript
async save(item: T): Promise<T> {
  if (!isSupabaseConfigured) {
    return localFallback.save(item);          // fallback localStorage (modo demo)
  }

  const now = new Date().toISOString();
  const originalId = item.id;
  const originalIdIsValid = isValidUuid(originalId);

  let payload = preparePayloadForSave(tableName, {
    ...item,
    created_at: item.created_at || now,
    updated_at: now,
  } as any);

  if (tableName !== 'stores' && payload.store_id) {
    await ensureSupabaseStoreExists(payload.store_id);
  }

  payload = await normalizeSupabaseRelationsBeforeSave(tableName, payload);

  if (originalIdIsValid) {
    const { data: existingItem, error: selectError } = await supabase
      .from(tableName as any)
      .select('id')
      .eq('id', payload.id)
      .maybeSingle();

    if (selectError) {
      console.error(`Erro ao verificar ${tableName}:`, selectError);
      throw selectError;
    }

    if (existingItem) {
      const { data, error: updateError } = await supabase
        .from(tableName as any)
        .update(payload as any)          // ← payload JÁ SEM dynamic_carousel_config
        .eq('id', payload.id)
        .select()
        .single();

      if (updateError) {
        console.error(`Erro ao atualizar ${tableName}:`, updateError);
        throw updateError;
      }

      return normalizeTableItemForClient(tableName, data as any) as T;
    }
  }

  const { data, error: insertError } = await supabase
    .from(tableName as any)
    .insert(payload as any)
    .select()
    .single();

  if (insertError) {
    console.error(`Erro ao inserir ${tableName}:`, insertError);
    throw insertError;
  }

  return normalizeTableItemForClient(tableName, data as any) as T;
},
```

### 5.5 `src/lib/db.ts` — leitor (`getAll`, L.1318–1345) + `normalizeTableItemForClient` p/ appearances (L.829–853)

```typescript
// getAll (dentro de createSupabaseCrudFunctions)
async getAll(storeId?: string): Promise<T[]> {
  if (!isSupabaseConfigured) return localFallback.getAll(storeId);

  let query = supabase.from(tableName as any).select('*');
  if (storeId) {
    if (!isValidUuid(storeId)) return [];
    query = query.eq('store_id', storeId);
  }
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error(`Erro ao buscar dados da tabela ${tableName}:`, error);
    return [];
  }
  if (!data || data.length === 0) {
    return storeId ? [] : localFallback.getAll(storeId);
  }
  return ((data || []) as T[]).map(item =>
    normalizeTableItemForClient(tableName, item as any),
  ) as T[];
},

// normalizeTableItemForClient — trecho específico de appearances (L.829–853)
if (tableName !== 'appearances') {
  return normalized as T;
}

const appearance: Record<string, any> = normalized;

// Aliases camelCase → snake_case bidirecionais
if (appearance.useGlobalAppearance !== undefined && appearance.use_global_appearance === undefined) {
  appearance.use_global_appearance = appearance.useGlobalAppearance;
}
if (appearance.use_global_appearance !== undefined && appearance.useGlobalAppearance === undefined) {
  appearance.useGlobalAppearance = appearance.use_global_appearance;
}
if (appearance.isDefault !== undefined && appearance.is_default === undefined) {
  appearance.is_default = appearance.isDefault;
}
if (appearance.is_default !== undefined && appearance.isDefault === undefined) {
  appearance.isDefault = appearance.is_default;
}

// Garante que os JSONBs sejam objetos (defensivo)
['floating_config', 'carousel_config', 'grid_config', 'modal_config'].forEach(key => {
  if (appearance[key] && typeof appearance[key] === 'string') {
    try { appearance[key] = JSON.parse(appearance[key]); } catch { /* mantém string */ }
  }
  if (!appearance[key] || typeof appearance[key] !== 'object') {
    appearance[key] = { desktop: {}, mobile: {} };
  }
});

return appearance as T;
```

### 5.6 Migração que cria a tabela — `supabase/migrations/0001_saas_multi_tenant_base.sql` (L.73–74)

> Não há `CREATE TABLE appearances` versionado. A única referência à tabela nas migrations é:

```sql
if to_regclass('public.appearances') is not null then
  alter table public.appearances add column if not exists store_id uuid;
```

A coluna `dynamic_carousel_config` **não aparece em nenhuma migration** (criada direto no banco). Ver DDL real na Seção 3.1.

### 5.7 Leitura no painel — `src/pages/AppearancePage.tsx` (L.1165–1175 e L.1004–1010)

```typescript
// L.1165 — leitor usado por loadData()
const getAppearancesSafe = async (storeId: string): Promise<Appearance[]> => {
  try {
    return await db.appearances.getAll(storeId);
  } catch {
    try {
      return await db.appearances.getAll();
    } catch {
      return [];
    }
  }
};

// L.1004 — dentro de normalizeAppearance(): reconstrução do dynamic_carousel_config no form
const dynamicCarouselConfig = normalizeResponsiveConfig<DynamicCarouselConfig>({
  rawValue: anyItem.dynamic_carousel_config,        // ← valor ANTIGO vindo do banco
  desktopDefault: createDefaultDynamicCarouselDesktopConfig(),
  mobileDefault: createDefaultDynamicCarouselMobileConfig(),
  sameForAll: globalAppearance,
});
```

---

## 6. Diagnóstico do bug relatado — passo a passo

**Sintoma:** alterar largura do Carrossel Dinâmico → Salvar → toast de sucesso → reabrir → valor antigo.

**Reprodução do fluxo com o defeito:**

1. Usuário digita a largura → `updateDynamicCarouselConfig({ width: '120' })` atualiza `formData.dynamic_carousel_config.desktop.width` ✔ (estado React correto; o preview lateral mostra o novo valor).
2. `handleSaveStyle` monta `stylePayload.dynamic_carousel_config` corretamente ✔.
3. `db.appearances.save(stylePayload)` → `preparePayloadForSave` → `sanitizeTablePayload` → **whitelist não contém `dynamic_carousel_config`** → chave removida ❌.
4. `supabase.from('appearances').update(payload_sem_dc).eq('id', …)` → SQL gerado não menciona a coluna → **nenhum erro** (update das outras colunas funciona: `updated_at`, cores, etc.).
5. Toast "Estilo atualizado com sucesso!" (o catch nunca dispara).
6. `loadData()` → `getAll` → `select('*')` devolve `dynamic_carousel_config` = **default antigo do banco**.
7. `handleEditStyle` → `normalizeAppearance` → `normalizeResponsiveConfig(rawValue: antigo)` → formulário preenchido com o valor antigo. ✔ sintoma confirmado.

**Evidências decisivas:**
- `TABLE_ALLOWED_FIELDS.appearances` (db.ts L.687–722) lista `floating_config`, `carousel_config`, `grid_config`, `modal_config` — mas **não** `dynamic_carousel_config`.
- A coluna JSONB `dynamic_carousel_config` **existe** na tabela (schema live) e o painel a envia no payload — o descarte é exclusivamente no filtro client-side.
- RLS/trigger não bloqueiam (save sem erro; owner logado).

**Correção mínima:**

```typescript
// src/lib/db.ts — TABLE_ALLOWED_FIELDS.appearances
    // 📦 JSONB Configs
    'floating_config',
    'dynamic_carousel_config',   // ← ADICIONAR
    // 🔗 Outros
    'url',
```

**Correções complementares recomendadas (mesmo fluxo):**
1. `normalizeTableItemForClient` (db.ts L.842): incluir `'dynamic_carousel_config'` na lista de parse defensivo de JSONBs.
2. `widget.js` L.442: incluir `'dynamic_carousel_config'` em `JSONB_KEYS` para o wrapper não ser destruído pelo flatten (hoje os campos sobem "solto" pro topo, com `mobile` sobrescrevendo `desktop`).
3. `fetchDbAppearance` (widget.js): adicionar `&is_default=eq.true` (ou ordenação determinística) para respeitar o estilo padrão da loja.
4. Alinhar defaults widget × painel (width 80×160, spacing 16×14) e os nomes dos campos de destaque (`highlight_scale_up` vs `highlight_enlarge_active`).
5. Versionar no repositório o SQL que criou a coluna `dynamic_carousel_config` (hoje só existe no banco).

---

## 7. Adendum (23/08/2026) — Correções aplicadas e dívida técnica registrada

### 7.1 Status das correções da Seção 6
- ✅ `dynamic_carousel_config` adicionado à whitelist `TABLE_ALLOWED_FIELDS.appearances` (db.ts).
- ✅ `dynamic_carousel_config` incluído em `JSONB_KEYS` do widget.js (flatten preserva o wrapper).
- ✅ `fetchDbAppearance` (widget.js) agora usa `order=is_default.desc,updated_at.desc&limit=1` — 1 requisição, estilo padrão primeiro.

### 7.2 Dívida técnica: `border_style` guarda LARGURA (px), não estilo
No painel e no banco, o campo `border_style` dentro de `floating_config` / `carousel_config` / `dynamic_carousel_config` / `grid_config` armazena a **largura da borda em px** (ex.: `"5"`), apesar do nome sugerir `solid/dashed`. O widget já lê ambos (`border_width` com fallback `border_style`). **Migração futura recomendada:** renomear para `border_width` no painel + normalização no save, mantendo leitura de compatibilidade por um ciclo.

### 7.3 Lição aprendida: limpeza de logs quebrou o widget (23/08 ~13:19)
A "limpeza" que removeu `console.log`s multilinha deixou 3 corpos órfãos (`Unexpected token ':'` — widget inteiro morto em produção). **Regra daqui em diante:** qualquer edição em `public/widget.js` DEVE passar por validação de sintaxe (parser com suporte a regex literais) antes do deploy — o arquivo não passa por build/CI.

---

*Documento gerado por análise estática do código + inspeção ao vivo do schema/policies do Supabase (projeto `wznvecurmisgoaijykbt`). Referências de linha baseadas no estado atual dos arquivos.*
