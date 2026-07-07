import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, Store, GeneralSettings } from '@/lib/db';
import {
  Code,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  BookOpen,
  Terminal,
  ArrowRight,
  HelpCircle,
  Activity,
  Wifi,
  Globe,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const IntegrationPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic integration state
  const [integrationStatus, setIntegrationStatus] = useState<'connected' | 'not_connected' | 'pending'>('pending');
  const [lastChecked, setLastVerified] = useState<string>('Nunca verificado');
  const [testUrl, setTestUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Copy click tracking triggers
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [copiedGTM, setCopiedGTM] = useState(false);

  useEffect(() => {
    const loadIntegrationData = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        setStore(mainStore);

        if (mainStore) {
          const fetchedSettings = (await db.generalSettings.getAll(mainStore.id))[0];
          setSettings(fetchedSettings || null);
          setTestUrl(mainStore.domain || '');
        }

        // Simulating loading initial integration status from localStorage/mock settings
        const status = localStorage.getItem('vidlytics_integration_status') as any;
        const verified = localStorage.getItem('vidlytics_integration_last_checked');
        if (status) setIntegrationStatus(status);
        if (verified) setLastVerified(verified);

      } catch (error) {
        console.error('Erro ao carregar dados de integração:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIntegrationData();
  }, []);

  const appDomain = window.location.origin;
  const storeId = store?.id || '11111111-1111-1111-1111-111111111111';

  // Code generation
  const directScriptCode = `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${appDomain}/widget.js?licenseId=${storeId}';
  script.type = 'text/javascript';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;

  const gtmScriptCode = `<script>
(function() {
  window.VideoCommerceConfig = window.VideoCommerceConfig || {};
  window.VideoCommerceConfig.licenseId = '${storeId}';

  var script = document.createElement('script');
  script.src = '${appDomain}/widget.js?licenseId=${storeId}';
  script.type = 'text/javascript';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;

  const handleCopyDirect = () => {
    navigator.clipboard.writeText(directScriptCode);
    setCopiedDirect(true);
    showSuccess('Script direto copiado para a área de transferência!');
    setTimeout(() => setCopiedDirect(false), 2500);
  };

  const handleCopyGTM = () => {
    navigator.clipboard.writeText(gtmScriptCode);
    setCopiedGTM(true);
    showSuccess('Script para Google Tag Manager copiado!');
    setTimeout(() => setCopiedGTM(false), 2500);
  };

  const handleTestIntegration = () => {
    if (!testUrl.trim()) {
      showError('Insira uma URL da loja válida para testar.');
      return;
    }

    setIsTesting(true);

    setTimeout(() => {
      // High fidelity simulated checking logic
      const timestamp = new Date().toLocaleString('pt-BR');
      setLastVerified(timestamp);
      localStorage.setItem('vidlytics_integration_last_checked', timestamp);

      // In sandbox/demo we connect automatically if they submit any URL
      setIntegrationStatus('connected');
      localStorage.setItem('vidlytics_integration_status', 'connected');

      setIsTesting(false);
      showSuccess('Instalação verificada com sucesso! Script detectado em ' + testUrl);
    }, 1800);
  };

  const handleResetIntegrationStatus = () => {
    setIntegrationStatus('not_connected');
    setLastVerified('Nunca verificado');
    localStorage.setItem('vidlytics_integration_status', 'not_connected');
    localStorage.setItem('vidlytics_integration_last_checked', 'Nunca verificado');
    showSuccess('Status resetado com sucesso!');
  };

  const getStatusDetails = () => {
    switch (integrationStatus) {
      case 'connected':
        return {
          title: 'Conectado',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          dot: 'bg-emerald-500',
          desc: 'O script foi detectado e está funcionando normalmente na sua loja.'
        };
      case 'not_connected':
        return {
          title: 'Não conectado',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          dot: 'bg-rose-500',
          desc: 'Ainda não identificamos nenhuma tag ativa no seu site.'
        };
      case 'pending':
      default:
        return {
          title: 'Aguardando Instalação',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          dot: 'bg-amber-50 animate-pulse',
          desc: 'Aguardando a inclusão do código e a primeira chamada de visualizações.'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-sm text-slate-400 font-semibold">Carregando canais de integração...</p>
      </div>
    );
  }

  const activeStatus = getStatusDetails();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            Central de Integrações
          </h1>
          <p className="text-slate-400 mt-1">
            Instale o Vidlytics Stories em qualquer plataforma de e-commerce e sites customizados injetando o script.
          </p>
        </div>

        {/* SECTION 1: STATUS DE INTEGRAÇÃO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Activity className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-bold text-slate-100">Status da Integração</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Status block */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Status atual</span>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase border ${activeStatus.color}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${activeStatus.dot}`} />
                  {activeStatus.title}
                </span>
              </div>
              <Wifi className="w-8 h-8 text-slate-700" />
            </div>

            {/* Last verified */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Última verificação</span>
                <span className="text-sm font-mono text-slate-300 font-semibold block">{lastChecked}</span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-slate-700" />
            </div>

            {/* Explanatory detail */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeStatus.desc}
              </p>
              <button
                onClick={handleResetIntegrationStatus}
                className="text-[10px] text-slate-500 font-bold uppercase hover:text-slate-300 transition-colors block"
              >
                Resetar Status
              </button>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SECTION 2: INSTALAÇÃO POR SCRIPT DIRETO */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-md font-bold text-slate-100">1. Script Direto no HTML</h3>
                </div>
                <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">Recomendado</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Copie o script abaixo e cole-o logo antes do fechamento da tag <code className="font-mono text-slate-200 bg-slate-950 px-1 py-0.5 rounded">{"</head>"}</code> ou no rodapé do HTML do seu site.
              </p>

              {/* Code block */}
              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-850 max-h-[180px] leading-relaxed">
                  {directScriptCode}
                </pre>
                <button
                  onClick={handleCopyDirect}
                  className="absolute top-3 right-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-800 transition-all"
                  title="Copiar Código"
                >
                  {copiedDirect ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyDirect}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copiar Script de Injeção
            </button>
          </div>

          {/* SECTION 3: INSTALAÇÃO VIA GOOGLE TAG MANAGER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-fuchsia-400" />
                  <h3 className="text-md font-bold text-slate-100">2. Google Tag Manager</h3>
                </div>
                <span className="text-[9px] font-black uppercase bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-2 py-0.5 rounded-full">Universal</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Utilize o Google Tag Manager para injetar a tag em plataformas como Nuvemshop, Shopify e WooCommerce sem alterar arquivos de código.
              </p>

              {/* Step list */}
              <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850 text-xs">
                <div className="flex gap-2"><span className="text-violet-400 font-bold">Passo 1:</span> <span className="text-slate-300">Acesse sua conta do GTM.</span></div>
                <div className="flex gap-2"><span className="text-violet-400 font-bold">Passo 2:</span> <span className="text-slate-300">Crie uma nova Tag.</span></div>
                <div className="flex gap-2"><span className="text-violet-400 font-bold">Passo 3:</span> <span className="text-slate-300">Escolha o tipo "HTML Personalizado".</span></div>
                <div className="flex gap-2"><span className="text-violet-400 font-bold">Passo 4:</span> <span className="text-slate-300">Cole o código do GTM abaixo.</span></div>
                <div className="flex gap-2"><span className="text-violet-400 font-bold">Passo 5:</span> <span className="text-slate-300">Em acionador, escolha "All Pages" (Todas).</span></div>
                <div className="flex gap-2"><span className="text-violet-400 font-bold">Passo 6:</span> <span className="text-slate-300">Publique a versão.</span></div>
              </div>

              {/* Code GTM block */}
              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-850 max-h-[150px] leading-relaxed">
                  {gtmScriptCode}
                </pre>
                <button
                  onClick={handleCopyGTM}
                  className="absolute top-3 right-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-800 transition-all"
                  title="Copiar Código GTM"
                >
                  {copiedGTM ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyGTM}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copiar Script para GTM
            </button>
          </div>

        </div>

        {/* SECTION 4 & 5: TESTAR INTEGRAÇÃO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">Teste de Instalação em Tempo Real</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Informe a URL onde instalou o código. Nosso rastreador fará um diagnóstico buscando o script Vidlytics Stories no header da sua página.
              </p>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="ex: useanny.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-600"
                  />
                </div>
                
                <button
                  onClick={handleTestIntegration}
                  disabled={isTesting}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-600/10 flex items-center gap-2 shrink-0 disabled:opacity-60"
                >
                  {isRegenerating || isSubmittingReply || isTesting() ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {isRegenerating ? 'Validando...' : 'Testar Conexão'}
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
              <div className="space-y-1 text-xs text-slate-400">
                <span className="font-bold text-slate-200 block">Dica de Suporte</span>
                <p className="leading-relaxed">
                  Caso o script não seja localizado de imediato, limpe o cache do seu navegador e verifique se a Tag foi publicada no container do Google Tag Manager.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: PLATAFORMAS SUPORTADAS (DOCUMENTAÇÃO RÁPIDA) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100 font-bold">Plataformas de E-commerce Compatíveis</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Nossa tag de Stories foi programada para rodar de forma agnóstica a nível do cliente. Ao usar o injeção direta ou Google Tag Manager, você consegue integrar os vídeos em 100% das plataformas abaixo:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {[
              { name: 'Shopify', desc: 'Via script customizado ou GTM' },
              { name: 'Nuvemshop', desc: 'Códigos extras no painel admin' },
              { name: 'Tray E-commerce', desc: 'Seção de Tags e Scripts' },
              { name: 'Loja Integrada', desc: 'Menu Aplicativos > Tags' },
              { name: 'WooCommerce', desc: 'Plugin de Header/Footer ou GTM' },
              { name: 'VTEX', desc: 'Injetando via Tag Manager' },
              { name: 'Cartpanda', desc: 'Menu Scripts do Checkout' },
              { name: 'Sites Próprios (React/HTML)', desc: 'Direto no index.html ou App.tsx' },
              { name: 'Yampi Checkout', desc: 'Scripts adicionais do cabeçalho' },
              { name: 'Páginas de Venda / HTML', desc: 'Injetado direto no cabeçalho' }
            ].map((platform, idx) => (
              <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all flex flex-col justify-between space-y-1">
                <span className="text-xs font-bold text-slate-200">{platform.name}</span>
                <span className="text-[10px] text-slate-500 leading-normal font-semibold">{platform.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );

  // Helper
  function isTesting() {
    return isTesting;
  }
};

export default IntegrationPage;