import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import {
  Eye,
  MousePointerClick,
  CheckCircle2,
  Calendar,
  DollarSign,
  HardDrive,
  FileText,
  Clock,
  Sparkles,
  Play,
  Share2,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { getDashboardMetrics, getMetricsFlow, getVideoMetricsRows, type AnalyticsInterval } from '@/lib/analytics';
import { useTenant } from '@/context/TenantContext';

interface StoreUsageData {
  planName: string;
  subscriptionStatus: string;
  trialDaysLeft: number | null;
  currentPeriodEnd: string | null;
  viewsUsed: number;
  viewsLimit: number;
  storageUsedMB: number;
  storageLimitMB: number;
  pagesUsed: number;
  pagesLimit: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
}

interface ActivityEvent {
  id: string;
  event_type: string;
  created_at: string;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { storeId } = useTenant();
const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [storeName, setStoreName] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsInterval>('30');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    views: 0,
    plays: 0,
    pauses: 0,
    clicks: 0,
    ctaClicks: 0,
    productClicks: 0,
    whatsappClicks: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    closes: 0,
    conversions: 0,
    ctr: 0,
    revenue: 0,
  });
  const [topVideos, setTopVideos] = useState<any[]>([]);

  // Estados dos Blocos
  const [usage, setUsage] = useState<StoreUsageData>({
    planName: 'Starter',
    subscriptionStatus: 'trialing',
    trialDaysLeft: 7,
    currentPeriodEnd: null,
    viewsUsed: 0,
    viewsLimit: 10000,
    storageUsedMB: 0,
    storageLimitMB: 2048,
    pagesUsed: 0,
    pagesLimit: 5,
  });

  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'videos', title: 'Fazer upload de vídeos', description: 'Suba seus vídeos verticais ou importe das redes sociais.', route: '/videos', completed: false },
    { id: 'products', title: 'Cadastrar produtos da loja', description: 'Vincule produtos com preço para compra direta.', route: '/products', completed: false },
    { id: 'stories', title: 'Criar coleção de Stories', description: 'Agrupe seus vídeos em coleções interativas.', route: '/stories', completed: false },
    { id: 'appearance', title: 'Personalizar aparência do player', description: 'Ajuste cores, bordas e botões da marca.', route: '/appearance', completed: false },
    { id: 'locations', title: 'Publicar widget na sua loja', description: 'Escolha onde os vídeos devem aparecer no seu tema.', route: '/settings', completed: false },
  ]);

  const activeInterval = useMemo(() => selectedPeriod, [selectedPeriod]);

  // 1. Carregamento Estrutural da Página (Executa apenas na troca de loja)
  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const loadStoreStructure = async () => {
      try {
        setLoading(true);

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        const [
          fetchedVideos,
          storeRes,
          usageCounterRes,
          productsRes,
          storiesRes,
          appearanceRes,
          locationsRes,
          eventsRes
        ] = await Promise.all([
          db.videos.getAll(storeId),
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('usage_counters').select('*').eq('store_id', storeId).eq('month', currentMonth).maybeSingle(),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
          supabase.from('stories').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
          supabase.from('appearances').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
          supabase.from('display_locations').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
          supabase.from('store_activity_events').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(6),
        ]);

        if (!isMounted) return;
        setVideos(fetchedVideos);

        const storeData = storeRes.data || {};
        setStoreName(storeData.name || '');

        let trialDays: number | null = null;
        if (storeData.subscription_status === 'trialing' && storeData.trial_ends_at) {
          const diff = new Date(storeData.trial_ends_at).getTime() - Date.now();
          trialDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        const totalVideosCount = fetchedVideos.length;
        const estimatedStorage = Math.round(totalVideosCount * 15);
        const usageData = usageCounterRes.data || {};

        setUsage({
          planName: String(storeData.plan_tier || 'starter').toUpperCase(),
          subscriptionStatus: storeData.subscription_status || 'trialing',
          trialDaysLeft: trialDays,
          currentPeriodEnd: storeData.current_period_end || storeData.trial_ends_at,
          viewsUsed: usageData.views_count || 0,
          viewsLimit: 10000,
          storageUsedMB: estimatedStorage,
          storageLimitMB: 2048,
          pagesUsed: locationsRes.count || 0,
          pagesLimit: 5,
        });

        setActivities(eventsRes.data || []);

        // Checklist 100% validado pelo banco de dados
        setChecklist([
          { id: 'videos', title: 'Fazer upload de vídeos', description: 'Suba seus vídeos verticais ou importe das redes sociais.', route: '/videos', completed: totalVideosCount > 0 },
          { id: 'products', title: 'Cadastrar produtos da loja', description: 'Vincule produtos com preço para compra direta.', route: '/products', completed: (productsRes.count || 0) > 0 },
          { id: 'stories', title: 'Criar coleção de Stories', description: 'Agrupe seus vídeos em coleções interativas.', route: '/stories', completed: (storiesRes.count || 0) > 0 },
          { id: 'appearance', title: 'Personalizar aparência do player', description: 'Ajuste cores, bordas e botões da marca.', route: '/appearance', completed: (appearanceRes.count || 0) > 0 },
          { id: 'locations', title: 'Publicar widget na sua loja', description: 'Escolha onde os vídeos devem aparecer no seu tema.', route: '/settings', completed: (locationsRes.count || 0) > 0 },
        ]);
      } catch (err) {
        console.error('[DashboardPage] Erro ao carregar estrutura:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStoreStructure();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  // 2. Carregamento Isolado do Filtro de Métricas (Sem recarregar a página toda)
  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const updateMetricsOnly = async () => {
      try {
        setMetricsLoading(true);
        const [metrics, rows] = await Promise.all([
          getDashboardMetrics(storeId, activeInterval, customRange),
          getVideoMetricsRows(storeId, videos, activeInterval, customRange),
        ]);

        if (!isMounted) return;
        setDashboardMetrics(metrics);
        setTopVideos([...rows].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5));
      } catch (err) {
        console.error('[DashboardPage] Erro ao atualizar métricas:', err);
      } finally {
        if (isMounted) setMetricsLoading(false);
      }
    };

    updateMetricsOnly();

    return () => {
      isMounted = false;
    };
  }, [storeId, activeInterval, customRange, videos]);
  
  const calcPercent = (current: number, max: number) => {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const viewsPercent = calcPercent(usage.viewsUsed, usage.viewsLimit);
  const storagePercent = calcPercent(usage.storageUsedMB, usage.storageLimitMB);
  const pagesPercent = calcPercent(usage.pagesUsed, usage.pagesLimit);

  const completedSteps = checklist.filter((item) => item.completed).length;
  const checklistPercent = Math.round((completedSteps / checklist.length) * 100);

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-[#0094EB]';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#0094EB] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Atualizando visão geral...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-900 dark:text-slate-100">
{/* ── 1. HEADER (BOAS-VINDAS PERSONALIZADAS & STATUS DO PLANO) ── */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#0094EB] bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
            Plano {usage.planName}
          </span>
          {usage.subscriptionStatus === 'trialing' && usage.trialDaysLeft !== null && (
            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Período de Testes ({usage.trialDaysLeft} dias restantes)
            </span>
          )}
          {usage.subscriptionStatus === 'active' && (
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Assinatura Ativa
            </span>
          )}
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Olá, {storeName || 'seja bem-vindo(a)'} 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Visão Geral — Acompanhe o consumo do plano, performance dos vídeos e configuração da sua loja.
        </p>
      </div>

      {/* ── 2. CONSUMO DO PLANO (4 CARDS COM BARRAS DE %) ── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">
          Consumo do Plano
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Views */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Visualizações</span>
              <Eye size={18} className="text-[#0094EB]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {usage.viewsUsed.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-400">de {usage.viewsLimit.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getBarColor(viewsPercent)} rounded-full transition-all duration-500`} style={{ width: `${viewsPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Quota do mês</span>
              <span className={viewsPercent >= 90 ? 'text-rose-500 font-black' : ''}>{viewsPercent}%</span>
            </div>
          </div>

          {/* Card Armazenamento */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Armazenamento</span>
              <HardDrive size={18} className="text-[#0094EB]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {usage.storageUsedMB >= 1024 ? `${(usage.storageUsedMB / 1024).toFixed(1)} GB` : `${usage.storageUsedMB} MB`}
              </span>
              <span className="text-xs font-bold text-slate-400">de {(usage.storageLimitMB / 1024).toFixed(0)} GB</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getBarColor(storagePercent)} rounded-full transition-all duration-500`} style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Vídeos na nuvem</span>
              <span className={storagePercent >= 90 ? 'text-rose-500 font-black' : ''}>{storagePercent}%</span>
            </div>
          </div>

          {/* Card Páginas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Páginas com Vídeos</span>
              <FileText size={18} className="text-[#0094EB]" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900 dark:text-white">{usage.pagesUsed}</span>
              <span className="text-xs font-bold text-slate-400">de {usage.pagesLimit} ativas</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getBarColor(pagesPercent)} rounded-full transition-all duration-500`} style={{ width: `${pagesPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Locais de exibição</span>
              <span className={pagesPercent >= 90 ? 'text-rose-500 font-black' : ''}>{pagesPercent}%</span>
            </div>
          </div>

          {/* Card Próximo Vencimento */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Ciclo da Conta</span>
              <Clock size={18} className="text-[#0094EB]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {usage.subscriptionStatus === 'active' ? 'Assinatura Ativa' : `${usage.trialDaysLeft} dias restantes`}
              </p>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>Renovação:</span>
              <span>{usage.currentPeriodEnd ? new Date(usage.currentPeriodEnd).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </div>
        </div>
      </div>

{/* ── 3. DESEMPENHO DOS VÍDEOS (SPLIT 50/50: GRID 2x2 À ESQUERDA + TOP VÍDEOS À DIREITA) ── */}
      <div className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6 transition-opacity duration-200",
        metricsLoading && "opacity-60 pointer-events-none"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Desempenho dos Vídeos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Métricas consolidadas de engajamento e conversão.
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 shadow-inner">
            {[
              { id: 'today', label: 'Hoje' },
              { id: '7', label: '7 dias' },
              { id: '30', label: '30 dias' },
              { id: 'custom', label: 'Personalizado', icon: Calendar },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => p.id === 'custom' ? setIsCalendarOpen(true) : setSelectedPeriod(p.id as AnalyticsInterval)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
                  selectedPeriod === p.id
                    ? 'bg-[#0094EB] text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {p.icon && <p.icon size={13} />}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Lado Esquerdo: Grid 2x2 com 4 Métricas (Sem Receita) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard title="Visualizações" value={dashboardMetrics.views.toLocaleString()} icon={Eye} />
            <MetricCard title="Cliques em CTA" value={dashboardMetrics.ctaClicks.toLocaleString()} icon={MousePointerClick} />
            <MetricCard title="Conversões" value={dashboardMetrics.conversions.toLocaleString()} icon={CheckCircle2} isConversion />
            <MetricCard title="CTR Médio" value={`${dashboardMetrics.ctr.toFixed(1).replace('.', ',')}%`} icon={MousePointerClick} />
          </div>

          {/* Lado Direito: Top Vídeos Mais Assistidos */}
          <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-8 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Top Vídeos Mais Assistidos
                </h4>
                <button
                  onClick={() => navigate('/videos/performance')}
                  className="text-xs font-bold text-[#0094EB] hover:underline"
                >
                  Ver relatório completo &rarr;
                </button>
              </div>

              {topVideos.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  Nenhum vídeo registrado no período selecionado.
                </div>
              ) : (
                <div className="space-y-3">
                  {topVideos.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-[#0094EB]/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs">🎬</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                            {item.title}
                          </p>
                          <span className="text-[10px] font-black text-slate-400">RANK #{i + 1}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-right flex-shrink-0">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Views</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{item.metrics?.views?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">CTR</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {item.metrics?.ctr ? `${item.metrics.ctr.toFixed(1).replace('.', ',')}%` : '0,0%'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 & 5. LINHA DIVIDIDA: CHECKLIST À ESQUERDA + ATIVIDADE RECENTE À DIREITA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Lado Esquerdo: Checklist de Ativação (Itens Empilhados Verticalmente) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
              <div>
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span>🚀</span> Checklist da Ativação da Loja
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Conclua os passos para publicar seus stories.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-24 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${checklistPercent}%` }} />
                </div>
                <span className="text-xs font-extrabold text-emerald-600">{checklistPercent}%</span>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              {checklist.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.route)}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                    item.completed
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-[#0094EB] hover:shadow-md'
                  }`}
                >
<div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-[11px] transition-all ${
                  item.completed
                    ? 'bg-emerald-500 dark:bg-[#fd8539] text-white shadow-sm'
                    : 'border-2 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-[#0094EB] dark:group-hover:border-[#fd8539]'
                }`}
              >
                {item.completed ? '✓' : index + 1}
              </div>
              
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-xs font-black ${item.completed ? 'text-emerald-950 dark:text-emerald-300 line-through opacity-80' : 'text-slate-900 dark:text-white group-hover:text-[#0094EB]'}`}>
                        {item.title}
                      </h3>
                      <span className="text-[11px] font-bold text-[#0094EB] opacity-0 group-hover:opacity-100 transition-opacity">
                        Configurar &rarr;
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-relaxed truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lado Direito: Atividade Recente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span>⚡</span> Atividade Recente
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Feed de eventos e interações em tempo real.
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                Nenhuma interação recente registrada.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activities.map((ev) => (
                  <div key={ev.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-[#0094EB] rounded-lg font-black text-[10px] uppercase">
                        {ev.event_type === 'video_view' ? '👁️ View' : ev.event_type === 'cta_click' ? '🛍️ Clique CTA' : '⚡ Evento'}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Interação no widget da loja
                      </span>
                    </div>
                    <span className="text-slate-400 font-medium text-[11px]">
                      {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6 & 7. SEÇÃO INFERIOR: ACADEMY (7 COLS) & DESTAQUE DE BENEFÍCIOS (5 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Videolytics Academy com Thumbnail Semântica */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center gap-5">
          <div className="w-full md:w-44 h-28 bg-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden flex-shrink-0 group cursor-pointer border border-slate-800">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop"
              alt="Thumbnail do Tutorial"
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#0094EB] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={16} fill="white" className="ml-0.5" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5 text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0094EB] bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-800 inline-block">
              🎓 Vidlytics Academy
            </span>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">
              Como dobrar suas conversões com vídeos em 3 passos
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Aprenda as melhores práticas de posicionamento e gatilhos de CTA para aumentar as vendas da sua loja.
            </p>
          </div>
        </div>

        {/* Card Destaque: Indique e Ganhe / Ganhos & Benefícios */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0094EB] to-blue-700 text-white p-6 sm:p-7 rounded-[2.5rem] shadow-lg flex flex-col justify-between border border-blue-400/30">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-sm">
                Programa de Parceiros
              </span>
              <Share2 size={16} className="text-white/80" />
            </div>
            <h4 className="text-lg font-black text-white">Indique e Ganhe</h4>
            <p className="text-xs text-blue-50 mt-1 font-medium leading-relaxed">
              Receba comissões e desbloqueie meses gratuitos ao indicar o Vidlytics para outros lojistas.
            </p>
          </div>
          <button
            onClick={() => alert('Link de indicação copiado para a área de transferência!')}
            className="mt-4 w-full bg-white text-[#0094EB] hover:bg-blue-50 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Share2 size={14} /> Copiar Meu Link de Indicação
          </button>
        </div>
      </div>

      {/* DIALOG DE DATA PERSONALIZADA */}
      <CustomDialog
        isOpen={isCalendarOpen}
        type="form"
        title="Período Personalizado"
        maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)}
        onConfirm={() => {
          if (customRange.from && customRange.to) {
            setSelectedPeriod('custom');
            setIsCalendarOpen(false);
          }
        }}
        confirmText="Aplicar Filtro"
      >
        <div className="flex flex-col items-center">
          <DayPicker
            mode="range"
            selected={customRange}
            onSelect={(r) => setCustomRange({ from: r?.from, to: r?.to })}
            locale={ptBR}
            className="border-none"
            modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }}
          />
        </div>
      </CustomDialog>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isConversion?: boolean;
  isRevenue?: boolean;
}

const MetricCard = ({ title, value, icon: Icon, isConversion = false, isRevenue = false }: MetricCardProps) => (
  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-[1.8rem] p-5 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between mb-3">
      <div
        className={cn(
          'p-3 rounded-2xl transition-all group-hover:scale-110',
          isConversion
            ? 'bg-emerald-50 text-emerald-500 dark:bg-orange-500/15 dark:text-[#fd8539]'
            : isRevenue
            ? 'bg-amber-50 text-amber-600 dark:bg-orange-500/15 dark:text-[#fd8539]'
            : 'bg-blue-50 text-[#0094EB] dark:bg-orange-500/15 dark:text-[#fd8539]'
        )}
      >
        <Icon size={20} />
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</p>
    <h2 className="text-xl font-black text-slate-900 dark:text-white">{value}</h2>
  </div>
);

export default DashboardPage;