# Documentação do Aplicativo Vidlytics / Instory

## 1. Visão geral

Este aplicativo é um sistema de vídeos/stories para lojas, com painel administrativo e widget público para exibição na loja.

Ele permite:
- cadastrar e editar stories
- vincular vídeos aos stories
- definir aparência e layout
- escolher formato de exibição: carrossel, grade ou flutuante
- definir onde o widget aparece na loja
- controlar em quais páginas ele deve ser exibido
- acompanhar comentários, produtos vinculados e métricas

O sistema é composto por duas partes principais:
1. **Painel administrativo** – usado para configurar tudo
2. **Widget público** – carregado na loja via GTM para exibir os stories

---

## 2. O que o aplicativo faz

### No painel administrativo
O cliente pode:
- criar novos stories
- editar títulos, ordem, status e formato
- vincular vídeos ao story
- definir aparência visual
- escolher o local de exibição
- criar regras de página
- ver o preview interno do story
- associar produtos, medidas e comentários

### Na loja
O widget:
- carrega a configuração do cliente
- consulta o Supabase
- verifica quais stories devem aparecer na página atual
- respeita a configuração visual do painel
- renderiza o story em um dos formatos:
  - carrossel
  - grade
  - flutuante
- insere o conteúdo no seletor configurado na página

---

## 3. Como funciona o fluxo geral

1. O cliente configura o story no painel.
2. O painel salva os dados no Supabase.
3. O site da loja carrega o script público do widget.
4. O widget lê `window.VIDLYTICS_CONFIG`.
5. O widget consulta o Supabase usando o `storeId`.
6. O widget filtra os stories válidos para a página atual.
7. O widget identifica o formato configurado no story.
8. O widget escolhe o ponto de inserção no DOM da loja.
9. O widget renderiza o conteúdo no Shadow DOM.
10. O cliente vê o widget funcionando na loja.

---

## 4. Configurações disponíveis no painel

### 4.1 Stories
Cada story pode conter:
- título
- vídeos vinculados
- formato
- status ativo/inativo
- posição/ordem
- aparência vinculada
- regras de exibição
- dados relacionados a produto e modelo

### 4.2 Aparência
A aparência controla o visual do widget, por exemplo:
- cor principal
- cor secundária
- cor do texto
- fonte
- sombra
- raio dos cards
- espaçamento
- largura/altura
- botões visíveis
- comportamento do player

### 4.3 Local de exibição
O sistema permite escolher onde o widget aparece na loja usando:
- seletor CSS
- ID de elemento
- posição relativa ao elemento alvo

### 4.4 Regras de página
O widget também pode ser configurado para aparecer apenas em páginas específicas, usando regras como:
- URL contém
- URL exata
- começa com
- termina com
- regex
- página inicial
- páginas de produto
- páginas de categoria
- todas as páginas

---

## 5. Como o cliente instala o widget na loja

A instalação é feita por um script externo, normalmente via **Google Tag Manager (GTM)**.

### Passo a passo da instalação via GTM

#### Passo 1 – Criar uma tag HTML personalizada
No GTM:
- criar uma nova tag
- escolher **HTML personalizado**
- colar o script de instalação do widget

#### Passo 2 – Configurar a variável global
O script precisa definir `window.VIDLYTICS_CONFIG` com:
- `storeId`
- `platform`
- `supabaseUrl`
- `supabaseAnonKey`
- `widgets`

Exemplo conceitual:

```html
<script>
window.VIDLYTICS_CONFIG = {
  storeId: "ID_DA_LOJA",
  platform: "yampi",
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA_CHAVE_PUBLICA",
  widgets: {
    floatingVideo: true,
    carousel: true,
    gallery: true
  }
};
</script>
```

#### Passo 3 – Carregar o script público
Depois da configuração, o GTM carrega o arquivo público do widget.

#### Passo 4 – Definir o acionamento
Normalmente o acionamento é:
- **All Pages**

#### Passo 5 – Publicar no GTM
Depois de testar, publicar a tag.

---

## 6. Explicação do fluxo técnico do widget

### 6.1 Inicialização
Quando o script público roda, ele:
- lê a configuração global
- verifica se o Supabase está disponível
- evita carregar duas vezes a mesma versão

### 6.2 Leitura do banco
O widget consulta dados como:
- stories
- vídeos
- aparências
- regras de página
- locais de exibição
- comentários
- produtos
- likes

### 6.3 Filtro de exibição
Depois ele verifica:
- se o story está ativo
- se o story pertence à loja correta
- se a página atual bate com as regras
- se existe um seletor configurado para inserir o widget

### 6.4 Escolha do formato
O layout é determinado pelos campos do story, principalmente:
- `format`
- `display_format`
- `visual_style`

Formatos principais:
- `carousel` → carrossel
- `grid` → grade
- `floating_widget` → flutuante

### 6.5 Inserção no DOM
O widget procura um ponto de ancoragem na página, nesta ordem:
1. seletor CSS configurado no painel
2. `#vidlytics-carousel-root`
3. `#instory-root`
4. `main`
5. `#MainContent`
6. `[role="main"]`
7. fallback final criando um container próprio

### 6.6 Renderização
O widget usa Shadow DOM para:
- isolar estilos
- evitar conflito com o tema da loja
- garantir que o layout configurado no painel seja aplicado corretamente

---

## 7. O que cada formato faz

### 7.1 Carrossel
- exibe os cards lado a lado
- permite rolagem horizontal
- usa espaçamento configurado no painel
- aplica snap horizontal
- respeita quantidade de itens visíveis

### 7.2 Grade
- exibe os cards em colunas
- usa número de colunas configurável
- respeita espaçamento configurado
- adapta para desktop e mobile

### 7.3 Flutuante
- renderiza um widget sobreposto
- pode ser posicionado em diferentes cantos
- usa largura, altura e raio configuráveis

---

## 8. Mapa de arquivos do projeto

### Arquivos principais do frontend

#### `src/App.tsx`
Define as rotas do aplicativo React.

#### `src/pages/DashboardPage.tsx`
Página principal do painel.

#### `src/pages/StoriesPage.tsx`
Lista de stories cadastrados.

#### `src/pages/StoryDetailsPage.tsx`
Criação e edição de stories.

#### `src/pages/StoryPreviewPage.tsx`
Preview interno do story no painel.

#### `src/pages/AppearancePage.tsx`
Configurações visuais da aparência.

#### `src/pages/CommentsPage.tsx`
Gerenciamento de comentários.

#### `src/pages/ProductsPage.tsx`
Gerenciamento de produtos.

#### `src/pages/VideoGalleryPage.tsx`
Biblioteca de vídeos.

#### `src/pages/SettingsPage.tsx`
Configurações gerais da aplicação.

#### `src/pages/IntegrationPage.tsx`
Configuração de integração e instalação.

#### `src/components/`
Componentes compartilhados do painel.

### Arquivos principais do widget público

#### `public/widget.js`
Script público que roda na loja. É o coração da exibição pública.

Esse arquivo:
- lê a configuração global
- consulta o Supabase
- filtra stories por página
- decide o layout
- insere o widget no DOM da loja
- monta o CSS dinâmico dentro do Shadow DOM

### Integrações e banco

#### `src/integrations/supabase/client.ts`
Cliente Supabase usado pelo frontend.

#### `src/lib/db.ts`
Camada de acesso ao banco e mapeamento das tabelas.

#### `src/lib/utils.ts`
Funções utilitárias gerais.

---

## 9. Estrutura lógica das tabelas mais importantes

### `stories`
Guarda os stories criados.

Campos típicos:
- `id`
- `store_id`
- `title`
- `format`
- `display_format`
- `visual_style`
- `active`
- `appearance_id`
- `position`

### `story_videos`
Relaciona stories e vídeos.

Campos típicos:
- `story_id`
- `video_id`
- `position`

### `appearances`
Guarda configurações visuais.

Campos típicos:
- cores
- fonte
- sombra
- configuração de card
- configuração de botão
- posicionamento

### `page_rules`
Define em quais páginas o story aparece.

### `display_locations`
Define onde o widget é inserido no DOM da loja.

---

## 10. Problemas comuns e comportamento esperado

### O widget aparece flutuante quando deveria ser carrossel
Causas comuns:
- formato salvo incorretamente no story
- configuração do GTM incompleta
- seletor de página incorreto
- cache do navegador
- o widget não encontrou o alvo no DOM

### O widget aparece acima do cabeçalho
Causas comuns:
- seletor de posicionamento não encontrado
- fallback de inserção acionado
- tema da loja carregando o cabeçalho depois do widget

### O carrossel não fica lado a lado
Causas comuns:
- CSS dinâmico não aplicado corretamente
- container alvo errado
- Shadow DOM criado em elemento incorreto

---

## 11. Boas práticas para o cliente

- sempre revisar o formato do story antes de publicar
- confirmar o seletor CSS da loja
- testar em página de produto e página de categoria
- publicar o GTM somente depois de validar no preview
- manter a configuração Supabase consistente com o painel

---

## 12. Resumo final

Esse aplicativo é um sistema completo de stories para lojas, com painel de gestão, exibição pública e integração via GTM.

Ele funciona assim:
- o painel configura
- o Supabase armazena
- o widget público consulta
- o DOM da loja recebe
- o usuário final vê os stories no formato certo

O arquivo mais importante para a loja é `public/widget.js`.
O arquivo mais importante para configuração no painel é `src/pages/StoryDetailsPage.tsx`.
O preview interno fica em `src/pages/StoryPreviewPage.tsx`.

Se quiser, eu também posso gerar uma **versão em PDF-ready**, mais limpa e formatada como manual para o cliente final ou como documentação interna da equipe.