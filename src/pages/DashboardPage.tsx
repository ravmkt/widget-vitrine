import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { db, Story, Store, Metric, EventType } from '@/lib/db';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Info,
  HelpCircle,
  ArrowRight,
  Plus,
  X
} from 'lucide-react';
import WhatsAppIcon from '@/components/WhatsAppIcon';

type PeriodType = 'today' | '7days' | '30days' | 'custom';

// Cores do Tema Dark & Neon
const CHART_COLORS = {
  primary: '#8B5CF6',      // Violet-500
  secondary: '#EC4899',    // Fuchsia-500
  emerald: '#10B981',      // Emerald-500
  amber: '#F59E0B',        // Amber-500
  cyan: '#06B6D4',         // Cyan-500
  blue: '#3B82F6',         // Blue-500
  rose: '#F43F5E',         // Rose-500
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.cyan,
  CHART_COLORS.blue,
];

// Helper para gerar datas simuladas relativas ao dia atual
const getOffsetDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const DashboardPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // Conversões popup tooltip state
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);

  // Filtros de período
  const [period, setPeriod] = useState<PeriodType>('30days');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        setStore(mainStore);

        if (mainStore) {
          const fetchedStories = await db.stories.getAll(mainStore.id);
          setStories(fetchedStories);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Handler para trocar período pré-definido
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    const now = new Date();
    if (newPeriod === 'today') {
      setStartDate(now.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (newPeriod === '7days') {
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (newPeriod === '30days') {
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Gerador de dados de métricas com base no período selecionado
  const metricsData = useMemo(() => {
    // Fator multiplicador baseado no período selecionado
    let multiplier = 1.0;
    let daysCount = 30;
    if (period === 'today') {
      multiplier = 0.08;
      daysCount = 1;
    } else if (period === '7days') {
      multiplier = 0.32;
      daysCount = 7;
    } else if (period === '30days') {
      multiplier = 1.0;
      daysCount = 30;
    } else {
      // Customizado
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      daysCount = diffDays;
      multiplier = Math.min(Math.max(diffDays / 30, 0.05), 3.0);
    }

    // Dados consolidados dos cards
    const views = Math.round(18540 * multiplier);
    const clicks = Math.round(3940 * multiplier); // cliques CTA
    const likes = Math.round(1240 * multiplier);
    const shares = Math.round(590 * multiplier);
    const comments = Math.round(320 * multiplier);
    const whatsappClicks = Math.round(840 * multiplier); // cliques WhatsApp
    const productClicks = Math.round(1890 * multiplier); // cliques Produto

    // REGRA DE CONVERSÃO REQUERIDA:
    // Conversões = Cliques em CTA + Cliques em Produto + Cliques no WhatsApp
    const conversions = clicks + productClicks + whatsappClicks;

    // TAXA DE CONVERSÃO REQUERIDA:
    // Taxa de Conversão = (Conversões / Visualizações) * 100
    // Se não houver visualizações, a taxa deve ser 0%
    const conversionRateValue = views > 0 ? ((conversions / views) * 100) : 0;
    const conversionRateString = conversionRateValue.toFixed(2);

    // Gráfico 1 & 2 & 6: Métricas diárias (Visualizações, Cliques, Conversões por Dia)
    const dailyStats = Array.from({ length: Math.min(daysCount, 15) }, (_, i) => {
      const idx = Math.min(daysCount, 15) - 1 - i;
      const dayLabel = getOffsetDateString(idx);
      const dailyViews = Math.round((800 + Math.random() * 500) * (multiplier / (daysCount / 15 || 1)));
      const dailyClicks = Math.round(dailyViews * (0.15 + Math.random() * 0.1));
      const dailyProductClicks = Math.round(dailyClicks * 0.45);
      const dailyWhatsAppClicks = Math.round(dailyClicks * 0.20);
      
      const dailyConvs = dailyClicks + dailyProductClicks + dailyWhatsAppClicks;
      const dailyConvRate = dailyViews > 0 ? parseFloat(((dailyConvs / dailyViews) * 100).toFixed(1)) : 0;

      return {
        date: dayLabel,
        views: dailyViews,
        clicks: dailyClicks,
        conversions: dailyConvs,
        convRate: dailyConvRate,
      };
    });

    // Gráfico 3: Engajamento por Tipo
    const engagementStats = [
      { name: 'Curtidas', value: likes, color: CHART_COLORS.rose },
      { name: 'Compartilhar', value: shares, color: CHART_COLORS.cyan },
      { name: 'Comentários', value: comments, color: CHART_COLORS.amber },
      { name: 'WhatsApp', value: whatsappClicks, color: CHART_COLORS.emerald },
    ];

    // Gráfico 4: Stories mais visualizados
    const storiesRank = stories.length > 0 ? stories.map((s, index) => {
      const factor = 1.2 - (index * 0.2);
      return {
        name: s.title,
        views: Math.round(views * 0.45 * factor),
        clicks: Math.round(clicks * 0.45 * factor),
      };
    }).slice(0, 5) : [
      { name: 'Nova Coleção Outono 🍂', views: Math.round(views * 0.45), clicks: Math.round(clicks * 0.45) },
      { name: 'Unboxing Especial 🎁', views: Math.round(views * 0.28), clicks: Math.round(clicks * 0.25) },
      { name: 'Provador Fashion ✨', views: Math.round(views * 0.18), clicks: Math.round(clicks * 0.15) },
      { name: 'Cupom de Desconto 🏷️', views: Math.round(views * 0.09), clicks: Math.round(clicks * 0.15) },
    ];

    // Gráfico 5: Produtos mais clicados
    const productsRank = [
      { name: 'Vestido Floral Verão', clicks: Math.round(productClicks * 0.48) },
      { name: 'Bolsa de Couro Clássica', clicks: Math.round(productClicks * 0.28) },
      { name: 'Óculos de Sol Premium', clicks: Math.round(productClicks * 0.14) },
      { name: 'Sandália Elegante', clicks: Math.round(productClicks * 0.10) },
    ];

    // Tabela detalhada
    const tableData = storiesRank.map((item, index) => {
      const itemViews = item.views;
      const itemClicks = item.clicks;
      const ctr = itemViews > 0 ? ((itemClicks / itemViews) * 100).toFixed(1) : '0.0';
      const itemLikes = Math.round(likes * (0.45 - index * 0.1));
      const itemComments = Math.round(comments * (0.45 - index * 0.1));
      const itemShares = Math.round(shares * (0.45 - index * 0.1));
      const itemConvs = Math.round(conversions * (0.45 - index * 0.1));

      return {
        story: item.name,
        views: itemViews,
        clicks: itemClicks,
        ctr: `${ctr}%`,
        likes: Math.max(itemLikes, 0),
        comments: Math.max(itemComments, 0),
        shares: Math.max(itemShares, 0),
        conversions: Math.max(itemConvs, 0),
      };
    });

    return {
      cards: {
        views,
        clicks,
        conversions,
        likes,
        shares,
        comments,
        whatsappClicks,
        productClicks,
        ctr: views > 0 ? ((clicks / views) * 100).toFixed(2) : '0.00',
        conversionRate: conversionRateString,
      },
      dailyStats,
      engagementStats,
      storiesRank,
      productsRank,
      tableData,
    };
  }, [period, startDate, endDate, stories]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header e Filtros de Período */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-900">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Dashboard de Performance
            </h1>
            <p className="text-slate-400 mt-1">
              Monitore visualizações, vendas, taxas de conversão e comportamento de engajamento do widget.
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
            {(['today', '7days', '30days', 'custom'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  period === p
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-880'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === '7days' ? 'Últimos 7 dias' : p === '30days' ? 'Últimos 30 dias' : 'Personalizado'}
              </button>
            ))}

            {period === 'custom' && (
              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 ml-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500 text-slate-300"
                />
                <span className="text-slate-600 text-xs font-bold">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500 text-slate-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* GRADE DE MÉTRICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: Visualizações */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Visualizações (Views)</span>
              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.views ?? 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <ArrowUpRight className="w-3 h-3" /> +12.4%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/15">
              <Eye className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Cliques CTA */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Cliques (CTA Link)</span>
              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.clicks ?? 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <ArrowUpRight className="w-3 h-3" /> +8.1%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/15">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Conversões */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between relative">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Conversões</span>
                
                {/* Info Tooltip Clicker */}
                <button
                  type="button"
                  onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
                  className="text-violet-400 hover:text-violet-300 transition-colors focus:outline-none"
                  title="Como calculamos isso? Clique aqui!"
                >
                  <HelpCircle className="w-4 h-4 cursor-pointer" />
                </button>
              </div>

              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.conversions ?? 0).toLocaleString()}</h2>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  Tx. Conversão: {metricsData?.cards?.conversionRate}%
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            {/* Conversões Explanatory Floating Tooltip Bubble */}
            {showFormulaTooltip && (
              <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-slate-950 border border-violet-500/30 rounded-2xl shadow-2xl z-30 space-y-2 animate-fade-in max-w-[280px] md:max-w-xs text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-violet-400 uppercase tracking-wide text-[10px]">Fórmula de Conversão</span>
                  <button onClick={() => setShowFormulaTooltip(false)} className="text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-slate-300 leading-relaxed font-semibold">
                  <span className="text-white block font-bold mb-1">Conversões =</span>
                  Cliques em CTA + Cliques em Produto + Cliques de WhatsApp.
                </p>
                <p className="text-slate-300 leading-relaxed font-semibold">
                  <span className="text-white block font-bold mb-1">Taxa de Conversão =</span>
                  (Conversões / Visualizações) × 100
                </p>
              </div>
            )}
          </div>

          {/* Card 4: Curtidas */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Curtidas (Likes)</span>
              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.likes ?? 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <ArrowUpRight className="w-3 h-3" /> +9.3%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/15">
              <Heart className="w-5 h-5" />
            </div>
          </div>

          {/* Card 5: Compartilhamentos */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Compartilhar</span>
              <h2 className="text-2xl font-black text-slate-100">{metricsData.cards.shares.toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <TrendingUp className="w-3 h-3" /> Estável
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
              <Share2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 6: Comentários */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Comentários</span>
              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.comments ?? 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <ArrowUpRight className="w-3 h-3" /> +6.7%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/15">
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 7: Cliques no WhatsApp */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Cliques WhatsApp</span>
              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.whatsappClicks ?? 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <ArrowUpRight className="w-3 h-3" /> +14.8%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              <WhatsAppIcon size={20} />
            </div>
          </div>

          {/* Card 8: Cliques em Produtos */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all shadow-xl flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Cliques Produtos</span>
              <h2 className="text-2xl font-black text-slate-100">{(metricsData?.cards?.productClicks ?? 0).toLocaleString()}</h2>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md w-fit">
                <ArrowUpRight className="w-3 h-3" /> +11.2%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Gráficos Linha: Visualizações por Dia & Cliques por Dia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Visualizações Diárias */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-100">Visualizações por Dia</h3>
                <p className="text-xs text-slate-400">Curva de alcance diário do widget de stories.</p>
              </div>
              <span className="text-[10px] font-bold text-violet-400 uppercase bg-violet-500/10 px-2.5 py-1 rounded-full">Alcance</span>
            </div>
            <div className="h-[260px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                    labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="views" stroke={CHART_COLORS.primary} strokeWidth={2.5} fillOpacity={1} fill="url(#viewsGrad)" name="Visualizações" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Cliques Diários */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-100">Cliques por Dia</h3>
                <p className="text-xs text-slate-400">Total de toques nos botões de chamada de ação.</p>
              </div>
              <span className="text-[10px] font-bold text-fuchsia-400 uppercase bg-fuchsia-500/10 px-2.5 py-1 rounded-full">Ação</span>
            </div>
            <div className="h-[260px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                    labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="clicks" stroke={CHART_COLORS.secondary} strokeWidth={2.5} fillOpacity={1} fill="url(#clicksGrad)" name="Cliques CTA" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Gráficos Secundários: Engajamento (Pizza) & Stories visualizados (Barra) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gráfico 3: Engajamento por Tipo */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">Engajamento por Tipo</h3>
              <p className="text-xs text-slate-400">Distribuição de curtidas, compartilhamentos e cliques.</p>
            </div>
            <div className="h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metricsData.engagementStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {metricsData.engagementStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {metricsData.engagementStats.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 p-1.5 bg-slate-950/40 border border-slate-800/40 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400 truncate">{item.name}:</span>
                  <span className="text-slate-200 ml-auto">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico 4: Stories Mais Visualizados */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl lg:col-span-2 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-100">Stories Mais Visualizados</h3>
              <p className="text-xs text-slate-400">Desempenho comparativo de alcance por story ativo.</p>
            </div>
            <div className="h-[250px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsData.storiesRank} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: '10px' }} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Bar dataKey="views" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Visualizações" barSize={12} />
                  <Bar dataKey="clicks" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} name="Cliques" barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Gráficos Terciários: Produtos mais clicados & Taxa de conversão por período */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 5: Produtos mais clicados */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">Produtos Mais Clicados</h3>
              <p className="text-xs text-slate-400">Intenção de compra por item vinculado nos stories.</p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsData.productsRank} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="clicks" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} name="Cliques" barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 6: Taxa de conversão por período */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">Taxa de Conversão Diária (%)</h3>
              <p className="text-xs text-slate-400">Percentual de cliques de compra convertidos em checkout.</p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsData.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Line type="monotone" dataKey="convRate" stroke={CHART_COLORS.amber} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Tx. Conversão" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Tabela de Resumo Detalhado dos Stories */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="font-bold text-base text-slate-100">Visão Geral Detalhada</h3>
            <p className="text-xs text-slate-400">Listagem de desempenho expandida de stories por ações e conversões.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Story</th>
                  <th className="p-4 text-center">Visualizações</th>
                  <th className="p-4 text-center">Cliques</th>
                  <th className="p-4 text-center">CTR</th>
                  <th className="p-4 text-center">Curtidas</th>
                  <th className="p-4 text-center">Comentários</th>
                  <th className="p-4 text-center">Compartilhar</th>
                  <th className="p-4 text-center">Conversões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {metricsData.tableData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-800/25 transition-all">
                    <td className="p-4 pl-6 text-slate-200 font-bold max-w-[200px] truncate">{row.story}</td>
                    <td className="p-4 text-center font-mono">{row.views.toLocaleString()}</td>
                    <td className="p-4 text-center font-mono">{row.clicks.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className="bg-violet-500/10 text-violet-400 px-2.5 py-1 rounded-lg font-bold">
                        {row.ctr}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-rose-400">{row.likes.toLocaleString()}</td>
                    <td className="p-4 text-center font-mono text-amber-400">{row.comments.toLocaleString()}</td>
                    <td className="p-4 text-center font-mono text-cyan-400">{row.shares.toLocaleString()}</td>
                    <td className="p-4 text-center font-mono text-emerald-400">{row.conversions.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardPage;