import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  ArrowRight,
  Zap,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Radio,
  Code2,
  ShieldCheck,
  Check,
  X,
  Eye,
  DollarSign,
  PieChart
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'store' | 'admin'>('store');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleStartTrial = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-orange-500 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Play className="w-5 h-5 text-orange-500 fill-orange-500 ml-0.5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white">
                Vid<span className="text-orange-500">lytics</span>
              </span>
              <span className="text-[10px] font-semibold text-blue-400 tracking-widest -mt-1 uppercase">Video & Live Commerce</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#metricas" className="hover:text-orange-400 transition-colors">Analytics & Métricas</a>
            <a href="#liveshop" className="hover:text-orange-400 transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Shopping
            </a>
            <a href="#comparativo" className="hover:text-orange-400 transition-colors">Comparativo</a>
            <a href="#gtm" className="hover:text-orange-400 transition-colors">Instalação GTM</a>
            <a href="#precos" className="hover:text-orange-400 transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogin}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Entrar
            </button>
            <button
              onClick={handleStartTrial}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Testar 7 Dias Grátis
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/20 to-orange-500/20 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-inner mb-8">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-slate-300">
              A única plataforma focada em Atribuição de Vendas Real & Live Commerce
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
            Não coloque apenas vídeos na loja.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-orange-400 bg-clip-text text-transparent">
              Domine as Métricas
            </span>{' '}
            e Multiplique suas Vendas
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Esqueça plugins que só contam "views". O <strong>Vidlytics</strong> entrega inteligência de conversão real, stories interativos, Live Shopping direto na sua loja e integração universal em 2 minutos via <strong>Google Tag Manager</strong>.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStartTrial}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1"
            >
              Criar Conta Grátis por 7 Dias
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#comparativo"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold text-lg rounded-2xl transition-all text-center"
            >
              Por que somos superiores?
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Métricas e Atribuição com precisão cirúrgica
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Compatível com qualquer plataforma via GTM
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Shopping nativa no seu domínio
            </span>
          </div>

          {/* SIMULADOR VISUAL (WIDGET VS ANALYTICS) */}
          <div className="mt-16 max-w-5xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('store')}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    activeTab === 'store'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Stories na Loja Virtual
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    activeTab === 'admin'
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Painel de BI & Atribuição Vidlytics
                </button>
              </div>
            </div>

            <div className="pt-4">
              {activeTab === 'store' ? (
                <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800/80 text-left">
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-6 h-6 text-blue-400" />
                      <span className="font-bold text-lg text-white">SuaLojaVirtual.com.br</span>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-medium">
                      ● Shadow DOM Ativo — Zero lentidão no checkout
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-4">
                      Stories Interativos & Shoppable:
                    </p>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                      {[
                        { title: 'Provador VIP', tag: 'Novo', ring: 'from-orange-500 to-amber-400' },
                        { title: 'Promoção Exclusiva', tag: '-40%', ring: 'from-blue-500 to-cyan-400' },
                        { title: 'Demonstração Prática', tag: 'Dicas', ring: 'from-purple-500 to-pink-500' },
                        { title: 'Quem Usou e Aprovou', tag: 'Depoimentos', ring: 'from-emerald-500 to-teal-400' },
                        { title: 'Unboxing Oficial', tag: 'Vídeo Real', ring: 'from-orange-500 to-rose-500' }
                      ].map((story, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0">
                          <div className={`w-20 h-20 rounded-full p-[2.5px] bg-gradient-to-tr ${story.ring} shadow-lg transition-transform group-hover:scale-105`}>
                            <div className="w-full h-full bg-slate-900 rounded-full border-2 border-slate-950 flex items-center justify-center relative overflow-hidden">
                              <Play className="w-6 h-6 text-white/80 group-hover:text-orange-400 transition-colors" />
                              <span className="absolute bottom-1 bg-black/60 text-[9px] px-1.5 py-0.2 rounded font-bold text-white">
                                {story.tag}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-300 font-medium group-hover:text-white">
                            {story.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800/80 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                    <div>
                      <h4 className="font-bold text-lg text-white">Métricas de Conversão Direta e Assistida</h4>
                      <p className="text-xs text-slate-400">Dados que nenhum outro aplicativo de stories disponibiliza</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold border border-blue-500/30">
                        ROI dos Vídeos: 14.8x
                      </span>
                      <span className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-semibold border border-orange-500/30">
                        Faturamento Rastreado: R$ 42.680
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Conversão Assistida por Vídeo</span>
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">R$ 29.350</div>
                      <span className="text-[11px] text-emerald-400 font-medium">Usuários que compraram após assistir</span>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Drop-off / Retenção do Story</span>
                        <PieChart className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">82% retidos</div>
                      <span className="text-[11px] text-blue-400 font-medium">Assistem até o Call-to-Action</span>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Adições ao Carrinho no Player</span>
                        <ShoppingBag className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">1.840 itens</div>
                      <span className="text-[11px] text-orange-400 font-medium">+31% no Ticket Médio</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 1: O PODER DAS MÉTRICAS E APIS (O PONTO MAIS FORTE) */}
      <section id="metricas" className="py-24 bg-slate-900/40 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Inteligência de Dados</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-2">
              Seu e-commerce guiado por Métricas, não por achismos
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Aplicativos comuns apenas mostram quantas vezes o vídeo deu play. O Vidlytics entrega telemetria e atribuição de receita de nível corporativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl hover:border-blue-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Atribuição de Vendas com Precisão</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Descubra quais vídeos realmente geraram pedidos no checkout. Saiba o valor exato em Reais trazido por cada criativo e cada story postado.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl hover:border-orange-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Análise de Drop-off Segundo a Segundo</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Veja o ponto exato em que os clientes perdem o interesse no vídeo. Ajuste o gancho inicial e posicione os botões de compra no segundo exato de maior retenção.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">API Aberta & Webhooks para BI</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Exporte todos os eventos de visualização, clique e conversão para o seu Power BI, Google Analytics 4, Meta Conversions API ou data warehouse próprio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: LIVE SHOPPING NATIVO NO SEU SITE */}
      <section id="liveshop" className="py-24 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 text-xs font-semibold mb-6">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Commerce Nativo
              </div>
              <h3 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                Faça Live Shopping no seu próprio domínio sem travar a loja
              </h3>
              <p className="mt-4 text-slate-400 text-base leading-relaxed">
                Não envie seu cliente para o Instagram ou TikTok para fazer lives onde ele se distrai com notificações e outros perfis. 
                Com o Vidlytics, você transmite a live <strong>direto na página inicial da sua loja virtual</strong>, utilizando o poder e a estabilidade da infraestrutura do YouTube.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong>Produtos na Tela:</strong> Destaque os produtos em tempo real com botão de compra imediato durante a transmissão.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong>Zero Custo de Servidor de Vídeo:</strong> Utilizamos o streaming do YouTube como motor, garantindo zero buffering para milhares de espectadores simultâneos.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong>Chat e Interatividade ao Vivo:</strong> Tire dúvidas e faça ofertas relâmpago que só duram enquanto a live estiver no ar.
                  </p>
                </div>
              </div>
            </div>

            {/* Simulação Visual de Live Shopping */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="relative rounded-3xl bg-slate-900 border-2 border-red-500/50 p-4 shadow-2xl shadow-red-500/10">
                <div className="aspect-[9/16] rounded-2xl bg-gradient-to-t from-black via-slate-900 to-slate-800 relative overflow-hidden flex flex-col justify-between p-4">
                  {/* Topo da Live */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-full uppercase tracking-wider">
                      <Radio className="w-3.5 h-3.5" /> Ao Vivo
                    </span>
                    <span className="flex items-center gap-1 text-xs bg-black/60 px-2.5 py-1 rounded-full text-slate-300">
                      <Eye className="w-3.5 h-3.5 text-blue-400" /> 1.482 assistindo
                    </span>
                  </div>

                  {/* Produto Destacado na Live */}
                  <div className="bg-slate-950/90 border border-slate-700/80 p-3 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h6 className="text-xs font-bold text-white truncate">Jaqueta Corta-Vento Streetwear</h6>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-black text-orange-400">R$ 189,90</span>
                          <span className="text-[10px] text-slate-400 line-through">R$ 259,90</span>
                        </div>
                      </div>
                      <button className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow">
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 3: COMPATIBILIDADE UNIVERSAL VIA GTM */}
      <section id="gtm" className="py-20 bg-slate-900/30 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-2xl">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Instalação Universal</span>
              <h3 className="text-3xl font-extrabold text-white mt-2">
                Compatível com 100% dos E-commerces via Google Tag Manager (GTM)
              </h3>
              <p className="mt-4 text-slate-400 leading-relaxed text-sm">
                Não importa se a sua loja é <strong>Shopify, Nuvemshop, WooCommerce, Tray, VTEX, Yampi, CartPanda ou código próprio</strong>.
                Através do Google Tag Manager (GTM), você instala o Vidlytics em segundos, sem mexer no código-fonte e sem risco de quebrar o tema.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-center">
              {['Shopify', 'Nuvemshop', 'WooCommerce', 'Tray', 'VTEX', 'Yampi', 'Loja Integrada', 'Magento'].map((platform, idx) => (
                <div key={idx} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-semibold text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400" />
                  {platform}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: TABELA COMPARATIVA COM CONCORRENTES */}
      <section id="comparativo" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Benchmarking de Mercado</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
            Por que o Vidlytics supera os outros aplicativos?
          </h2>
          <p className="mt-4 text-slate-400 text-sm">
            Comparamos tecnicamente os recursos do Vidlytics com as soluções tradicionais do mercado (*Widde, Tolstoy, iShorts, Replay, VideoCommerce*).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/60">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                <th className="p-5 text-sm font-bold text-slate-300">Recurso / Diferencial</th>
                <th className="p-5 text-sm font-black text-orange-400 bg-orange-500/10 border-x border-orange-500/20 text-center">
                  Vidlytics Stories
                </th>
                <th className="p-5 text-sm font-bold text-slate-400 text-center">Widde / iShorts</th>
                <th className="p-5 text-sm font-bold text-slate-400 text-center">Tolstoy / Vidjet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
              <tr>
                <td className="p-5 font-medium text-white">Métricas de Conversão Assistida Real no Checkout</td>
                <td className="p-5 text-center bg-orange-500/5 border-x border-orange-500/20 font-bold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Sim (BI Avançado)</span>
                </td>
                <td className="p-5 text-center text-slate-400"><X className="w-4 h-4 text-red-400 mx-auto" /> Apenas cliques</td>
                <td className="p-5 text-center text-slate-400"><X className="w-4 h-4 text-red-400 mx-auto" /> Métricas básicas</td>
              </tr>
              <tr>
                <td className="p-5 font-medium text-white">Live Shopping Nativa no Site (Via YouTube)</td>
                <td className="p-5 text-center bg-orange-500/5 border-x border-orange-500/20 font-bold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Nativo e Incluso</span>
                </td>
                <td className="p-5 text-center text-slate-400"><X className="w-4 h-4 text-red-400 mx-auto" /> Não possui</td>
                <td className="p-5 text-center text-slate-400"><X className="w-4 h-4 text-red-400 mx-auto" /> Requer plano Enterprise</td>
              </tr>
              <tr>
                <td className="p-5 font-medium text-white">Instalação Universal via Google Tag Manager (GTM)</td>
                <td className="p-5 text-center bg-orange-500/5 border-x border-orange-500/20 font-bold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> 100% Compatível</span>
                </td>
                <td className="p-5 text-center text-slate-300">Depende de Apps/Plugins</td>
                <td className="p-5 text-center text-slate-300">Foco restrito em poucas plataformas</td>
              </tr>
              <tr>
                <td className="p-5 font-medium text-white">Isolamento Completo com Shadow DOM (Zero conflito de CSS)</td>
                <td className="p-5 text-center bg-orange-500/5 border-x border-orange-500/20 font-bold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Sim (Tecnologia proprietária)</span>
                </td>
                <td className="p-5 text-center text-slate-400"><X className="w-4 h-4 text-red-400 mx-auto" /> Pode quebrar temas</td>
                <td className="p-5 text-center text-slate-300">Risco em temas personalizados</td>
              </tr>
              <tr>
                <td className="p-5 font-medium text-white">Preço Justo em Reais sem taxas em Dólar</td>
                <td className="p-5 text-center bg-orange-500/5 border-x border-orange-500/20 font-bold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Faturado em R$ via Asaas</span>
                </td>
                <td className="p-5 text-center text-slate-300">Em Reais (limites baixos)</td>
                <td className="p-5 text-center text-red-400 font-semibold">Cobrado em Dólar (USD)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* PLANOS E PREÇOS */}
      <section id="precos" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Planos Transparentes</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">Comece a vender mais hoje mesmo</h2>
          <p className="mt-4 text-slate-400">Todos os planos contam com 7 dias de teste grátis com acesso total.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Básico */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <h4 className="text-xl font-bold text-white">Iniciante</h4>
              <p className="text-xs text-slate-400 mt-1">Para lojas virtuais que querem validar os primeiros vídeos.</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">R$ 67</span>
                <span className="text-xs text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Até 10.000 visualizações</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Importador de TikTok e Reels</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Instalação Universal via GTM</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Métricas essenciais de cliques</li>
              </ul>
            </div>
            <button
              onClick={handleStartTrial}
              className="mt-8 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Testar 7 Dias Grátis
            </button>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-orange-500 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-orange-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md">
              Mais Recomendado
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Profissional & Analytics</h4>
              <p className="text-xs text-slate-400 mt-1">Para marcas que buscam alta conversão e métricas reais.</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">R$ 147</span>
                <span className="text-xs text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Até 50.000 visualizações</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> <strong>Módulo de Live Shopping Ativo</strong></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Atribuição de Vendas no Checkout</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Análise de Drop-off segundo a segundo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Sem marca d'água</li>
              </ul>
            </div>
            <button
              onClick={handleStartTrial}
              className="mt-8 w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 text-sm"
            >
              Começar Teste Grátis de 7 Dias
            </button>
          </div>

          {/* Scale */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <h4 className="text-xl font-bold text-white">Escala & Enterprise</h4>
              <p className="text-xs text-slate-400 mt-1">Para grandes operações com alto volume de tráfego.</p>
              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-white">R$ 297</span>
                <span className="text-xs text-slate-400">/mês</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Visualizações Ilimitadas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Lives Ilimitadas com CDN Dedicada</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Webhooks e API Aberta de Dados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Múltiplas Lojas / Domínios</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-400" /> Suporte Prioritário por WhatsApp</li>
              </ul>
            </div>
            <button
              onClick={handleStartTrial}
              className="mt-8 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Testar 7 Dias Grátis
            </button>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Dúvidas Frequentes</span>
            <h3 className="text-3xl font-extrabold text-white mt-2">Perguntas Frequentes</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Como funciona a integração com o Google Tag Manager (GTM)?',
                a: 'Basta criar uma tag HTML personalizada no seu GTM e colar nosso script único. Com isso, o Vidlytics funciona instantaneamente em qualquer plataforma (Shopify, Nuvemshop, WooCommerce, Tray, VTEX) sem precisar editar o código dos arquivos do seu tema.'
              },
              {
                q: 'Como funciona o recurso de Live Shopping?',
                a: 'Você realiza a transmissão ao vivo pelo YouTube Studio (utilizando celular, OBS ou câmera profissional) e vincula o link no painel do Vidlytics. A live é transmitida diretamente no site da sua loja, onde os clientes assistem e adicionam os produtos na sacola sem sair da transmissão.'
              },
              {
                q: 'Qual a diferença das métricas do Vidlytics para os outros apps?',
                a: 'Enquanto outros aplicativos só informam quantas vezes o vídeo foi clicado, o Vidlytics rastreia o ciclo completo: taxa de retenção por segundo, abandono de vídeo, conversão assistida e o volume financeiro real (R$) gerado por cada story no checkout.'
              },
              {
                q: 'O widget causa lentidão na minha loja virtual?',
                a: 'Não. Nosso widget foi desenvolvido com isolamento Shadow DOM e carregamento assíncrono. O script inicial é ultraleve (apenas ~24KB) e não interfere na velocidade de renderização da sua página.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-semibold text-white text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-orange-400 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-slate-800/40 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Pronto para revolucionar as vendas da sua loja com Stories e Lives?
          </h3>
          <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">
            Instale em 2 minutos via GTM e aproveite 7 dias grátis para comprovar o impacto nas suas métricas.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleStartTrial}
              className="px-10 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-lg rounded-2xl shadow-2xl shadow-orange-500/30 transition-transform transform hover:-translate-y-1"
            >
              Começar Teste de 7 Dias Grátis
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">Cancele quando quiser. Sem taxas ocultas.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
            <span className="font-bold text-white text-base">Vidlytics</span>
            <span className="ml-2">© 2026 Vidlytics Inc. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#metricas" className="hover:text-slate-300 transition-colors">Analytics & BI</a>
            <a href="#liveshop" className="hover:text-slate-300 transition-colors">Live Commerce</a>
            <a href="#comparativo" className="hover:text-slate-300 transition-colors">Comparativo</a>
            <button onClick={handleLogin} className="hover:text-slate-300 transition-colors">Painel do Lojista</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
