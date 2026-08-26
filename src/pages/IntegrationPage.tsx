import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Store,
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

// ── ÍCONES EXCLUSIVOS CUSTOMIZADOS (LEVES, SEM FUNDO E PIXEL-PERFECT) ──

// Ícone: Flutuante (Retângulo vertical + Linhas de clique + Mão apontando)
const FlutuanteIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Retângulo vertical do celular/card */}
    <rect x="3.5" y="3" width="7.5" height="14" rx="1.5" />
    
    {/* Linhas de clique */}
    <path d="M7.5 13.5l-1.5-.8" />
    <path d="M7.5 16l-2 .5" />
    <path d="M9 11.5l-.5-1.5" />

    {/* Mão de clique importada e rotacionada perfeitamente para tocar o card */}
    <g transform="translate(10, 15) rotate(-30) scale(0.48)">
      <path
        d="M12 15V11a1.5 1.5 0 0 1 3 0v4m-3-1.5V8a1.5 1.5 0 0 1 3 0v7m-3-3V6a1.5 1.5 0 0 1 3 0v9m-6 1.5a3 3 0 0 1 3-3V3.5a1.5 1.5 0 0 1 3 0V15.5c0 3-2.5 5.5-5.5 5.5S6 18.5 6 15.5"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

// Ícone: Carrossel (3 retângulos verticais lado a lado)
const CarrosselIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="5" width="5.5" height="14" rx="1.5" />
    <rect x="9.25" y="5" width="5.5" height="14" rx="1.5" />
    <rect x="16.5" y="5" width="5.5" height="14" rx="1.5" />
  </svg>
);

// Ícone: Carrossel Dinâmico (Card do meio maior em destaque + Brilhos)
const CarrosselDinamicoIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Retângulos estilo carrossel */}
    <rect x="2" y="6.5" width="5.5" height="11" rx="1.5" />
    <rect x="9.25" y="3.5" width="5.5" height="14" rx="1.5" />
    <rect x="16.5" y="6.5" width="5.5" height="11" rx="1.5" />

    {/* Brilhos estilizados com preenchimento limpo */}
    <path d="M15 1 Q15 3.5 17.5 3.5 Q15 3.5 15 6 Q15 3.5 12.5 3.5 Q15 3.5 15 1 Z" fill="currentColor" stroke="none" />
    <path d="M19 3.5 Q19 5 20.5 5 Q19 5 19 6.5 Q19 5 17.5 5 Q19 5 19 3.5 Z" fill="currentColor" stroke="none" />
    <path d="M11.5 7.5 Q11.5 8.5 12.5 8.5 Q11.5 8.5 11.5 9.5 Q11.5 8.5 10.5 8.5 Q11.5 8.5 11.5 7.5 Z" fill="currentColor" stroke="none" />
    <path d="M16 8.5 Q16 9.5 17 9.5 Q16 9.5 16 10.5 Q16 9.5 15 9.5 Q16 9.5 16 8.5 Z" fill="currentColor" stroke="none" />
  </svg>
);

// Ícone: Grade (4 quadrados arredondados 2x2 perfeitos)
const GradeIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2.5" y="2.5" width="8" height="8" rx="2" />
    <rect x="13.5" y="2.5" width="8" height="8" rx="2" />
    <rect x="2.5" y="13.5" width="8" height="8" rx="2" />
    <rect x="13.5" y="13.5" width="8" height="8" rx="2" />
  </svg>
);


const IntegrationPage = () => {
  const { storeId } = useTenant();

  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [installTab, setInstallTab] = useState<'platform' | 'gtm'>('platform');
  const [securityToken, setSecurityToken] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(true);

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

  const widgetVersion = '2026.08.23-08';

  // Busca o token de segurança da loja
  useEffect(() => {
    let active = true;

    async function fetchToken() {
      if (!supabase || !storeId) {
        setTokenLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('store_settings')
        .select('security_token')
        .eq('store_id', storeId)
        .maybeSingle();

      if (!active) return;

      if (!error && data?.security_token) {
        setSecurityToken(data.security_token);
      }

      setTokenLoading(false);
    }

    fetchToken();

    return () => {
      active = false;
    };
  }, [storeId]);

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
  script.src = '${publicUrl}/vidlytics-tracking.js'
    + '?store=${encodeURIComponent(storeId || '')}'
    + '&token=${encodeURIComponent(securityToken)}';
  script.type = 'text/javascript';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;
  }, [publicUrl, storeId, securityToken]);

  const hasSecurityToken = Boolean(securityToken);
  const trackingReady = canInstall && hasSecurityToken && !tokenLoading;

  const copyToClipboard = async (text: string, onDone: () => void) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      onDone();
    } catch (error) {
      console.error('Erro ao copiar script:', error);
    }
  };

  const handleCopyScript = () => {
    copyToClipboard(scriptCode, () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyTrackingScript = () => {
    copyToClipboard(trackingScriptCode, () => {
      setCopiedTracking(true);
      window.setTimeout(() => setCopiedTracking(false), 2500);
    });
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
            Instalação do Vidlytics
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card: Flutuante */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <FlutuanteIcon className="text-white" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Flutuante
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Exiba vídeos fixos no canto da tela, ideal para destaques, lançamentos, ofertas e apresentações rápidas de produto.
            </p>
          </div>
        </div>

        {/* Card: Carrossel */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <CarrosselIcon className="text-white" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Carrossel
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Mostre múltiplos vídeos em formato horizontal na Home, páginas de categorias ou diretamente na vitrine de produtos.
            </p>
          </div>
        </div>

        {/* Card: Carrossel Dinâmico */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <CarrosselDinamicoIcon className="text-white" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Carrossel Dinâmico
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Exibição inteligente baseada no comportamento do usuário, produtos navegados e coleções automáticas de alta conversão.
            </p>
          </div>
        </div>

        {/* Card: Galeria */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.45)] mb-4">
              <GradeIcon className="text-white" />
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Galeria
            </h2>

            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
              Crie seções em grade completas com vídeos compráveis para destacar looks, depoimentos, provadores e campanhas.
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTÕES / TABS DE SELEÇÃO DE INSTALAÇÃO ── */}
      <div className="flex justify-center pt-2">
        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1220] p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setInstallTab('platform')}
            className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              installTab === 'platform'
                ? 'bg-white dark:bg-[#1a1f35] text-[#0094EB] dark:text-[#ff7a29] shadow-md border border-slate-100 dark:border-orange-500/10'
                : 'text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Via Plataforma
          </button>
          <button
            type="button"
            onClick={() => setInstallTab('gtm')}
            className={`rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              installTab === 'gtm'
                ? 'bg-white dark:bg-[#1a1f35] text-[#0094EB] dark:text-[#ff7a29] shadow-md border border-slate-100 dark:border-orange-500/10'
                : 'text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Via Google Tag Manager
          </button>
        </div>
      </div>

      {/* ── SEÇÃO: COMO INSTALAR NA SUA LOJA ── */}
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-white/5 pb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Como instalar na sua loja
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[#8a90a0]">
            Três passos simples para ativar a experiência de vídeo commerce no seu e-commerce.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {installTab === 'platform' ? (
            <>
              {/* Passo 1 - Plataforma */}
              <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    1
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Acesse o painel da loja
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Abra as configurações do tema da sua plataforma (Yampi, Shopify, Nuvemshop, WBuy, Bagy, Tray, etc.) e localize a área de scripts ou HTML personalizado.
                  </p>
                </div>
              </div>

              {/* Passo 2 - Plataforma */}
              <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    2
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Cole os scripts
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Cole o <strong>Script Principal (Passo 1)</strong> no cabeçalho (&lt;head&gt;) e o <strong>Script de Rastreamento (Passo 2)</strong> na página de conclusão de compra (Obrigado / Confirmação de pedido) da sua plataforma.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Passo 1 - GTM */}
              <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    1
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Acesse o Google Tag Manager
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Abra o contêiner do GTM instalado no seu site e vá para a seção de Tags para adicionar uma nova configuração.
                  </p>
                </div>
              </div>

              {/* Passo 2 - GTM */}
              <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                    2
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Configure as Tags HTML
                  </h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Crie tags do tipo <strong>HTML Personalizado</strong> para o Script Principal e outra para o Script de Rastreamento. No acionamento, use <strong>All Pages</strong> para o principal e gatilhos de conversão para o rastreamento.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Passo 3 - Comum a ambos */}
          <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-6 flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-xs shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                3
              </div>

              <h3 className="mt-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Publique seus vídeos
              </h3>

              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                Faça upload dos vídeos no Vidlytics, configure suas coleções de stories e os vídeos aparecerão automaticamente para seus clientes de acordo com as regras de exibição.
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

      <div className="space-y-6">
        {/* ── PASSO 1: SCRIPT PRINCIPAL (DUAL-THEME) ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-sm shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.4)]">
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shrink-0"
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

        {/* ── PASSO 2: SCRIPT DE RASTREAMENTO DE VENDAS (DUAL-THEME) ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0094EB] dark:bg-[#ff7a29] text-white font-black text-sm shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.4)]">
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

                {installTab === 'platform' ? (
                  <p className="mt-1.5 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    Compatível com <strong>Yampi, Shopify, Nuvemshop, WBuy, Bagy e Tray</strong>. Cole o código abaixo na área de <strong>Scripts / HTML personalizado</strong> da sua plataforma, na página de <strong>Obrigado / Confirmação de Pedido</strong>.
                  </p>
                ) : (
                  <div className="mt-1.5 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-[#c0c5d4]">
                    <p>No Google Tag Manager:</p>
                    <ol className="list-decimal list-inside space-y-0.5 mt-1">
                      <li>Crie uma nova tag do tipo <strong>HTML Personalizado</strong></li>
                      <li>Cole o código de rastreamento abaixo dentro dela</li>
                      <li>No gatilho, selecione o evento de compra / transação de sucesso</li>
                      <li>Publique o contêiner do GTM</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyTrackingScript}
              disabled={!trackingReady}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shrink-0"
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
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-[#8a90a0]">vidlytics-tracking.js</span>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-6 font-mono text-xs font-semibold leading-relaxed text-[#22c55e] md:text-sm [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10">
              {trackingScriptCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;
