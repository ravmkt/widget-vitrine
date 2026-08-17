import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
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
  const [copiedTracking, setCopiedTracking] = useState(false);

  const publicUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_WIDGET_PUBLIC_URL || '';

    if (envUrl) {
      return String(envUrl).replace(/\/$/, '').trim();
    }

    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/$/, '').trim();
    }

    return '';
  }, []);

  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '')
    .replace(/\/$/, '')
    .trim();

  const supabaseAnonKey = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();

  const isLocal =
    publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1');

  const hasStoreId = Boolean(storeId);
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
  const canInstall = hasStoreId && hasSupabaseConfig && Boolean(publicUrl);

const widgetVersion = '2026.08.11-00';

  const scriptCode = useMemo(() => {
    return `<script>
window.VIDLYTICS_CONFIG = {
  storeId: "${storeId || ''}",
  platform: "custom",
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
  script.src = '${publicUrl}/widget.js?v=${widgetVersion}';
  script.type = 'text/javascript';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;
  }, [storeId, supabaseUrl, supabaseAnonKey, publicUrl, widgetVersion]);

  const trackingScriptCode = useMemo(() => {
    return `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/custom-tracking.js';
  script.type = 'text/javascript';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;
  }, [publicUrl]);

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

  const handleCopyTrackingScript = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(trackingScriptCode);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = trackingScriptCode;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopiedTracking(true);

      window.setTimeout(() => {
        setCopiedTracking(false);
      }, 2500);
    } catch (error) {
      console.error('Erro ao copiar script de rastreamento:', error);
    }
  };

return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 dark:border-[#ff7a29]/25 bg-blue-50 dark:bg-[#ff7a29]/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#0094EB] dark:text-[#ff7a29] shadow-xs">
            <Store className="h-3.5 w-3.5" />
            Integração
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Instalação do Video Commerce
          </h1>

          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-[#c0c5d4]">
            Instale o widget na sua loja para exibir vídeos e stories interativos como vídeo flutuante, carrossel e galeria em páginas estratégicas.
          </p>
        </div>
      </div>

      {/* ── ALERTAS DE AMBIENTE ── */}
      {!hasStoreId && (
        <div className="flex items-start gap-3 rounded-[2rem] border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs text-rose-800 dark:text-rose-300">
            <p className="font-black text-sm uppercase tracking-tight">Loja não identificada</p>
            <p className="mt-0.5 opacity-90 font-medium">
              O <strong>storeId</strong> não foi localizado no contexto da loja. Sem ele, o widget não saberá quais vídeos carregar.
            </p>
          </div>
        </div>
      )}

      {!hasSupabaseConfig && (
        <div className="flex items-start gap-3 rounded-[2rem] border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-xs text-rose-800 dark:text-rose-300">
            <p className="font-black text-sm uppercase tracking-tight">Configuração do Supabase ausente</p>
            <p className="mt-0.5 opacity-90 font-medium">
              Verifique se as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> estão configuradas no ambiente.
            </p>
          </div>
        </div>
      )}

      {isLocal && (
        <div className="flex items-start gap-3 rounded-[2rem] border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-black text-sm uppercase tracking-tight">URL pública ausente</p>
            <p className="mt-0.5 opacity-90 font-medium">
              O widget está usando uma URL local. Para funcionar na loja real, configure a variável <strong>VITE_WIDGET_PUBLIC_URL</strong> com o domínio público da aplicação.
            </p>
          </div>
        </div>
      )}

{/* ── MÓDULOS SUPERIORES: FORMATOS DE VÍDEO (DUAL-THEME) ── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card: Vídeo Flutuante */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <PlayCircle size={20} className="!text-white stroke-[2.5]" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Vídeo flutuante
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Exiba vídeos fixos no canto da tela, ideal para destaques, lançamentos, ofertas e apresentações rápidas de produto.
            </p>
          </div>
        </div>

        {/* Card: Carrossel de Stories */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <Film size={20} className="!text-white stroke-[2.5]" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Carrossel de stories
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Mostre múltiplos vídeos em formato horizontal na Home, páginas de categorias ou diretamente na vitrine de produtos.
            </p>
          </div>
        </div>

        {/* Card: Galeria de Vídeos */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <Layers3 size={20} className="!text-white stroke-[2.5]" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Galeria de vídeos
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Crie seções em grade completas com vídeos compráveis para destacar looks, depoimentos, provadores e campanhas.
            </p>
          </div>
        </div>
      </div>
      
<div className="space-y-6">
        {/* ── PASSO 1: SCRIPT PRINCIPAL ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white font-black text-sm shadow-[0_0_15px_rgba(255,122,41,0.4)]"
              >
                1
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Script Principal (Widget)
                </h2>
                <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                  Este script carrega o player de vídeo, os stories e os widgets no seu tema. Cole este código dentro da tag <strong>&lt;head&gt;</strong> da sua loja.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyScript}
              disabled={!canInstall}
              style={{ backgroundColor: '#ff7a29' }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl !bg-[#ff7a29] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/30 hover:opacity-95 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} className="!text-white" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} className="!text-white" />
                  Copiar Script
                </>
              )}
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-[#0f1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#14182b] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#8a90a0]">widget.js</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-xs font-semibold leading-relaxed text-[#22c55e] md:text-sm [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10">
              {scriptCode}
            </pre>
          </div>
        </div>

        {/* ── PASSO 2: SCRIPT DE RASTREAMENTO DE VENDAS ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white font-black text-sm shadow-[0_0_15px_rgba(255,122,41,0.4)]"
              >
                2
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Script de Rastreamento (Vendas)
                  </h2>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Recomendado
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                  Para medir o faturamento gerado pelos vídeos, instale este script na página de <strong>Obrigado / Confirmação de Pedido</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyTrackingScript}
              style={{ backgroundColor: '#ff7a29' }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl !bg-[#ff7a29] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/30 hover:opacity-95 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
            >
              {copiedTracking ? (
                <>
                  <CheckCircle2 size={16} className="!text-white" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} className="!text-white" />
                  Copiar Script
                </>
              )}
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-[#0f1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-[#14182b] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#8a90a0]">custom-tracking.js</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-xs font-semibold leading-relaxed text-[#0094EB] dark:text-[#38bdf8] md:text-sm [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10">
              {trackingScriptCode}
            </pre>
          </div>
        </div>
      </div>

{/* ── MÓDULOS INFERIORES: ONDE APARECEM & PRODUTOS ── */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        {/* Card: Onde os vídeos aparecem? */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-start gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_0_15px_rgba(255,122,41,0.4)]"
              >
                <MapPin size={20} className="!text-white stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Onde os vídeos aparecem?
                </h2>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                  O widget pode ser exibido automaticamente ou injetado via seletores CSS em qualquer bloco do tema da loja.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3.5">
              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-4">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Exemplos de páginas
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-[#c0c5d4]">
                  Home, página de produto, categorias, carrinho, landing pages ou em todas as páginas.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-4">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Exemplos de seletores CSS
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <code className="rounded-lg bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-2.5 py-1 font-mono text-[11px] font-black text-[#0094EB] dark:text-[#ff7a29]">
                    main
                  </code>
                  <code className="rounded-lg bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-2.5 py-1 font-mono text-[11px] font-black text-[#0094EB] dark:text-[#ff7a29]">
                    .main-content
                  </code>
                  <code className="rounded-lg bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-2.5 py-1 font-mono text-[11px] font-black text-[#0094EB] dark:text-[#ff7a29]">
                    #banner-principal
                  </code>
                  <code className="rounded-lg bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-2.5 py-1 font-mono text-[11px] font-black text-[#0094EB] dark:text-[#ff7a29]">
                    .product-description
                  </code>
                  <code className="rounded-lg bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 px-2.5 py-1 font-mono text-[11px] font-black text-[#0094EB] dark:text-[#ff7a29]">
                    .vitrine
                  </code>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-4">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Posições de injeção
                </p>
                <ul className="mt-1.5 space-y-1 text-xs font-medium text-slate-500 dark:text-[#c0c5d4] list-disc list-inside">
                  <li>Antes do elemento</li>
                  <li>Dentro do elemento (no início)</li>
                  <li>Dentro do elemento (no final)</li>
                  <li>Depois do elemento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Produtos & Aviso Importante */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-start gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_0_15px_rgba(255,122,41,0.4)]"
              >
                <ShoppingBag size={20} className="!text-white stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Produtos
                </h2>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                  Vincule os produtos do seu catálogo diretamente aos vídeos para permitir a compra em 1 clique durante a reprodução.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0f1220]/70 p-5">
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Importação e Catálogo
              </p>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                Você pode importar produtos via XML (Google Merchant / Feed XML) ou planilha CSV na página de <strong>Produtos</strong>.
              </p>
            </div>

            {/* Módulo de Aviso Refinado */}
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/30 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">
                    Importante
                  </p>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-400/90">
                    As credenciais secretas da sua conta nunca são expostas no script público. Toda a comunicação pública utiliza tokens com proteção de domínio e isolamento RLS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO: COMO INSTALAR NA SUA LOJA ── */}
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-white/5 pb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <span>🚀</span> Como instalar na sua loja
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[#8a90a0]">
            Três passos simples para ativar a experiência de vídeo commerce no seu e-commerce.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Passo 1 */}
          <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
            <div>
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-black text-xs shadow-xs shadow-orange-500/30"
              >
                1
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Acesse o painel da loja
              </h3>

              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                Abra as configurações do tema da sua plataforma (Shopify, Nuvemshop, Tray, Vtex, etc.) e localize a área de scripts/HTML personalizado.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
            <div>
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-black text-xs shadow-xs shadow-orange-500/30"
              >
                2
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Cole os scripts
              </h3>

              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                Cole o <strong>Script Principal (Passo 1)</strong> no cabeçalho e o <strong>Script de Rastreamento (Passo 2)</strong> na página de conclusão de compra.
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
            <div>
              <div 
                style={{ backgroundColor: '#ff7a29' }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-black text-xs shadow-xs shadow-orange-500/30"
              >
                3
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Publique seus vídeos
              </h3>

              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                Faça upload dos vídeos no Vidlytics, configure suas coleções de stories e os vídeos aparecerão automaticamente para seus clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Precisa customizar o posicionamento ou estilo?
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[#c0c5d4]">
              Utilize o menu <strong>Aparência</strong> para ajustar bordas, cores, formatos de card e seletores CSS sem precisar programar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;
