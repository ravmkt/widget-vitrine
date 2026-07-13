import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  Layers3,
  MapPin,
  PlayCircle,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';

const IntegrationPage = () => {
  const { storeId } = useTenant();
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_WIDGET_PUBLIC_URL || '';

    if (envUrl) {
      return String(envUrl).replace(/\/$/, '');
    }

    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/$/, '');
    }

    return '';
  }, []);

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(
    /\/$/,
    ''
  );

  const supabaseAnonKey = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  );

  const isLocal =
    publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1');

  const hasStoreId = Boolean(storeId);
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
  const canInstall = hasStoreId && hasSupabaseConfig && Boolean(publicUrl);

  const scriptCode = useMemo(() => {
    return `<script>
window.VIDLYTICS_CONFIG = {
  storeId: "${storeId || ''}",
  platform: "yampi",
  supabaseUrl: "${supabaseUrl}",
  supabaseAnonKey: "${supabaseAnonKey}",
  widgets: {
    floatingVideo: true,
    carousel: true,
    gallery: true
  }
};

(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/widget.js';
  script.type = 'text/javascript';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;
  }, [storeId, supabaseUrl, supabaseAnonKey, publicUrl]);

  const handleCopyScript = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(scriptCode);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = scriptCode;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (error) {
      console.error('Erro ao copiar script:', error);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            <Store className="h-4 w-4" />
            Integração Yampi
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            Instalação do Video Commerce
          </h1>

          <p className="mt-2 max-w-3xl text-base font-medium text-slate-500">
            Instale o widget na sua loja Yampi para exibir vídeos/stories como
            vídeo flutuante, carrossel e galeria em páginas específicas da loja.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Plataforma selecionada
          </div>

          <p className="mt-1 text-sm font-semibold text-emerald-900">Yampi</p>
        </div>
      </div>

      {!hasStoreId && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div className="text-sm text-red-800">
            <p className="font-bold">Loja não identificada</p>

            <p className="mt-1 opacity-80">
              O <strong>storeId</strong> não foi encontrado no contexto da loja.
              Sem ele, o widget não saberá quais vídeos carregar.
            </p>
          </div>
        </div>
      )}

      {!hasSupabaseConfig && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div className="text-sm text-red-800">
            <p className="font-bold">Configuração do Supabase ausente</p>

            <p className="mt-1 opacity-80">
              Verifique se as variáveis{' '}
              <strong>VITE_SUPABASE_URL</strong> e{' '}
              <strong>VITE_SUPABASE_ANON_KEY</strong> estão configuradas no
              ambiente.
            </p>
          </div>
        </div>
      )}

      {isLocal && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div className="text-sm text-amber-800">
            <p className="font-bold">URL pública ausente</p>

            <p className="mt-1 opacity-80">
              O widget está usando uma URL local. Para funcionar dentro da loja
              Yampi, configure uma URL pública de produção, por exemplo a URL da
              Vercel, na variável <strong>VITE_WIDGET_PUBLIC_URL</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <PlayCircle className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Vídeo flutuante
          </h2>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            Exiba vídeos fixos no canto da tela, ideal para destaque,
            lançamento, oferta ou apresentação rápida de produto.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Film className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Carrossel de stories
          </h2>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            Mostre vários vídeos em formato horizontal, parecido com stories,
            em vitrines, home, páginas de categoria ou produto.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Layers3 className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Galeria de vídeos
          </h2>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            Crie uma seção completa com vídeos compráveis para destacar looks,
            depoimentos, demonstrações e campanhas.
          </p>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Script de instalação
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              Copie o código abaixo e cole no cabeçalho da sua loja Yampi. Esse
              script carrega os vídeos configurados no painel e exibe o widget
              na loja.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyScript}
            disabled={!canInstall}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Script copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar script
              </>
            )}
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>

            <span className="text-xs font-bold text-slate-400">
              widget.js
            </span>
          </div>

          <pre className="overflow-x-auto whitespace-pre-wrap p-6 text-xs font-medium leading-relaxed text-emerald-400 md:text-sm">
            {scriptCode}
          </pre>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <MapPin className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Onde os vídeos aparecem?
              </h2>

              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                O widget pode ser exibido na página e no local configurado no
                painel. Para carrossel e galeria, use seletores CSS do tema da
                Yampi para escolher exatamente onde o bloco será inserido.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">
                Exemplos de páginas
              </p>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Home, produto, categoria, carrinho, página específica ou todas
                as páginas.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">
                Exemplos de seletor CSS
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <code className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">
                  main
                </code>

                <code className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">
                  .main-content
                </code>

                <code className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">
                  #banner-principal
                </code>

                <code className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">
                  .product-description
                </code>

                <code className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-700">
                  .vitrine
                </code>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">
                Posições disponíveis
              </p>

              <ul className="mt-2 space-y-1 text-sm font-medium text-slate-500">
                <li>Antes do elemento</li>
                <li>Dentro do elemento, no começo</li>
                <li>Dentro do elemento, no final</li>
                <li>Depois do elemento</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Produtos da Yampi
              </h2>

              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                A integração também precisa importar os produtos da Yampi para
                que eles possam ser vinculados aos vídeos. Assim, quando o
                cliente clicar no vídeo, o player pode mostrar o produto e levar
                para a página de compra.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm font-black text-slate-900">
              Próxima etapa da integração
            </p>

            <ul className="mt-3 space-y-2 text-sm font-medium leading-relaxed text-slate-500">
              <li>Conectar loja Yampi usando Alias, Token e Secret Key.</li>
              <li>Sincronizar produtos da loja com o painel.</li>
              <li>Salvar imagem, nome, preço e URL do produto.</li>
              <li>Permitir vincular produtos aos vídeos.</li>
              <li>Exibir botão “Ver produto” dentro do player.</li>
            </ul>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-black text-amber-900">
                  Importante
                </p>

                <p className="mt-1 text-sm font-medium leading-relaxed text-amber-800">
                  Os dados de API da Yampi não devem ficar no script público.
                  Eles precisam ser salvos apenas no backend/banco de dados da
                  aplicação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <h2 className="text-xl font-black text-slate-900">
          Como instalar na Yampi
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm">
              <span className="text-sm font-black">1</span>
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Acesse o painel da Yampi
            </h3>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              Entre no painel administrativo da sua loja e localize a área de
              tema, scripts, HTML personalizado ou cabeçalho.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm">
              <span className="text-sm font-black">2</span>
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Cole o script
            </h3>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              Cole o código de instalação no cabeçalho da loja, preferencialmente
              antes do fechamento da tag head.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm">
              <span className="text-sm font-black">3</span>
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Configure os vídeos
            </h3>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              Volte ao painel, cadastre seus vídeos, escolha onde eles aparecem
              e vincule os produtos da Yampi.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">
              Precisa configurar o local exato do carrossel?
            </p>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Use a aba de aparência/configuração do widget para informar o
              seletor CSS da página.
            </p>
          </div>

          <a
            href="https://www.yampi.com.br/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Abrir Yampi
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;
