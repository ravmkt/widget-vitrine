# Vidlytics Stories 🎬

Vidlytics Stories é um painel administrativo e widget público de stories em vídeo para lojas virtuais. Aumente a conversão da sua loja exibindo vídeos curtos e imersivos no estilo Instagram/TikTok.

## 🚀 Funcionalidades

- **Dashboard Completo**: Métricas de visualizações, cliques, CTR e simulador de celular interativo em tempo real.
- **Gerenciador de Stories**: CRUD completo de stories com ordenação personalizada e ativação instantânea.
- **Configurações do Widget**: Personalização de cor do tema, posição na tela e modo de exibição.
- **Widget Público de Alta Performance**: Script em JavaScript puro (`widget.js`) que usa Shadow DOM para evitar conflitos de CSS com o tema da loja.

---

## ⚡ Como Configurar o Supabase

Para conectar o Vidlytics Stories ao seu banco de dados Supabase, siga os passos abaixo:

### 1. Criar as Tabelas no Supabase

Execute o seguinte script SQL no **SQL Editor** do seu painel Supabase para criar as tabelas necessárias:

```sql
-- Tabela de Lojas (Stores)
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Configurações do Widget
CREATE TABLE widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  position TEXT DEFAULT 'bottom-center',
  theme_color TEXT DEFAULT '#8B5CF6',
  display_mode TEXT DEFAULT 'carousel',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir Loja Padrão (Useanny)
INSERT INTO stores (id, name, domain, active)
VALUES ('11111111-1111-1111-1111-111111111111', 'Useanny', 'useanny.com.br', true)
ON CONFLICT (domain) DO NOTHING;

-- Inserir Configurações Padrão
INSERT INTO widget_settings (store_id, position, theme_color, display_mode, active)
VALUES ('11111111-1111-1111-1111-111111111111', 'bottom-center', '#8B5CF6', 'carousel', true);
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

---

## 💻 Como Rodar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra o navegador em `http://localhost:8080`.

---

## 📦 Como Fazer Deploy (Vercel / Netlify)

O projeto está totalmente preparado para deploy em plataformas como Vercel ou Netlify.

### Deploy na Vercel:
1. Conecte seu repositório GitHub à Vercel.
2. Adicione as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas configurações do projeto na Vercel.
3. Clique em **Deploy**.

---

## 🛒 Como Instalar o Script na Loja Yampi

Para exibir o widget de stories na sua loja virtual Useanny hospedada na Yampi:

1. Acesse o painel da sua loja na **Yampi**.
2. Vá em **Configurações** > **Scripts**.
3. Clique em **Adicionar Script**.
4. Cole o código abaixo no campo de script do **Cabeçalho (Head)** ou **Rodapé (Body)**:

```html
<!-- Vidlytics Stories Widget -->
<script src="https://seu-dominio-do-deploy.vercel.app/widget.js" async></script>
```

5. Salve as alterações. O widget identificará automaticamente o domínio da sua loja e renderizará os stories ativos!