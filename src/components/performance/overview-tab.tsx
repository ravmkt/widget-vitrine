import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  CheckCircle2,
  DollarSign,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { db } from '@/lib/db';
import {
  getDashboardMetrics,
  getMetricsFlow,
  getVideoMetricsRows,
  type AnalyticsInterval,
} from '@/lib/analytics';
import { getSectorBenchmark } from '@/lib/services/metrics-service';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Tipos ──────────────────────────────────────────────────

type Props = {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
};

interface DailyMetricPoint {
  date: string;
  value: number;
}

interface BenchmarkRow {
  metric_key: string;
  metric_label: string;
  value_low: number;
  value_mid: number;
  value_high: number;
  unit: string;
}

// ─── Config do seletor de métricas ──────────────────────────

const METRIC_OPTIONS = [
  { key: 'views',           label: 'Visualizações',           isRate: false },
  { key: 'likes',           label: 'Curtidas',                isRate: false },
  { key: 'ctr',             label: 'CTR',                     isRate: true  },
  { key: 'comments',        label: 'Comentários',             isRate: false },
  { key: 'shares',          label: 'Compartilhamentos',       isRate: false },
  { key: 'whatsapp_clicks', label: 'Cliques WhatsApp',        isRate: false },
  { key: 'cta_clicks',      label: 'Total de Cliques (CTA)',  isRate: false }, // 🟢 corrigido: label mais claro
  { key: 'conversions',     label: 'Conversões',              isRate: false },
  { key: 'revenue',         label: 'Receita',                 isRate: false },
] as const;

// ─── Mapeamento métrica → benchmark ─────────────────────────

const METRIC_TO_BENCHMARK: Record<string, string> = {
  ctr:             'video_ctr',
  cta_clicks:      'video_ctr',
  whatsapp_clicks: 'ctr_whatsapp',
  conversions:     'conversion_rate',
  likes:           'engagement_rate',
  comments:        'engagement_rate',
  shares:          'engagement_rate',
};

// ─── Helpers ────────────────────────────────────────────────

const mapInterval = (timeRange: string): AnalyticsInterval => {
  if (timeRange === '7d') return '7';
  if (timeRange === '30d' || timeRange === '15d') return '30';
  if (timeRange === 'custom') return 'custom';
  return '30';
};

const getDiasNoPeriodo = (timeRange: string, customFrom?: string, customTo?: string): number => {
  if (timeRange === 'custom' && customFrom && customTo) {
    const diff = new Date(customTo).getTime() - new Date(customFrom).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  }
  if (timeRange === '7d') return 7;
  if (timeRange === '15d') return 15;
  return 30;
};

// ─── Componente principal ───────────────────────────────────

export function OverviewTab({ timeRange, customFrom, customTo }: Props) {
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    views: 0, plays: 0, pauses: 0, clicks: 0, ctaClicks: 0,
    productClicks: 0, whatsappClicks: 0, likes: 0, shares: 0,
    comments: 0, closes: 0, conversions: 0, ctr: 0, revenue: 0,
  });
  const [flow, setFlow] = useState<any[]>([]);
  const [topVideos, setTopVideos] = useState<any[]>([]);

  // ── Estados para gráfico e benchmarks ──
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [dailyData, setDailyData] = useState<Record<string, DailyMetricPoint[]>>({});
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [avgDailyViews, setAvgDailyViews] = useState(0);

  // 🆕 estado para erro nos dados diários (correção #2)
  const [dailyError, setDailyError] = useState(false);

  // ── Computar datas do período ──
  const getDateRange = useCallback(() => {
    const now = new Date();

    // 🟢 correção #3: custom sem datas → usar fallback claro
    if (timeRange === 'custom') {
      if (!customFrom || !customTo) {
        // Retorna intervalo de 30 dias como fallback seguro,
        // mas o loader só será exibido se houver storeId e a UI
        // abaixo mostrará aviso de "selecione as datas"
        const from = new Date(now.getTime() - 30 * 86400000);
        return { fromISO: from.toISOString(), toISO: now.toISOString(), datasInvalidas: true };
      }
      return {
        fromISO: new Date(customFrom).toISOString(),
        toISO: new Date(customTo).toISOString(),
        datasInvalidas: false,
      };
    }

    const days = timeRange === '7d' ? 7 : timeRange === '15d' ? 15 : 30;
    const from = new Date(now.getTime() - days * 86400000);
    return { fromISO: from.toISOString(), toISO: now.toISOString(), datasInvalidas: false };
  }, [timeRange, customFrom, customTo]);

  // ── LOAD ──
  useEffect(() => {
    if (!storeId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setDailyError(false); // 🆕 reset
      try {
        const interval = mapInterval(timeRange);

        // 🟢 correção #1: só monta customRange se for custom com datas reais
        const isCustomWithDates = timeRange === 'custom' && Boolean(customFrom) && Boolean(customTo);
        const customRange = isCustomWithDates
          ? { from: new Date(customFrom!), to: new Date(customTo!) }
          : undefined;

        const { fromISO, toISO } = getDateRange();

        const [dashMetrics, flowRows, videos, benchRows] = await Promise.all([
          getDashboardMetrics(storeId, interval, customRange),
          getMetricsFlow(storeId, interval, customRange),
          db.videos.getAll(storeId),
          getSectorBenchmark(storeId),
        ]);

        if (!mounted) return;

        setMetrics(dashMetrics);
        setFlow(flowRows);
        setBenchmarks(benchRows || []);

        const rows = await getVideoMetricsRows(storeId, videos, interval, customRange);
        if (!mounted) return;

        setTopVideos(
          [...rows].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5)
        );

        // ── Dados diários (Supabase) ──
        // 🟢 correção #2: try/catch com fallback visível
        if (supabase) {
          try {
            const [{ data: metricRows }, { data: convRows }] = await Promise.all([
              supabase
                .from('metrics')
                .select('created_at, event_name')
                .eq('store_id', storeId)
                .gte('created_at', fromISO)
                .lte('created_at', toISO),
              supabase
                .from('conversions')
                .select('created_at, order_value')
                .eq('store_id', storeId)
                .gte('created_at', fromISO)
                .lte('created_at', toISO),
            ]);

            if (!mounted) return;

            // Agrupar por dia + event_name
            const dayMap: Record<string, Record<string, number>> = {};
            for (const row of metricRows || []) {
              const day = row.created_at.slice(0, 10);
              if (!dayMap[day]) dayMap[day] = {};
              dayMap[day][row.event_name] = (dayMap[day][row.event_name] || 0) + 1;
            }

            // Agrupar conversões por dia
            const convDayMap: Record<string, { count: number; revenue: number }> = {};
            for (const row of convRows || []) {
              const day = row.created_at.slice(0, 10);
              if (!convDayMap[day]) convDayMap[day] = { count: 0, revenue: 0 };
              convDayMap[day].count++;
              convDayMap[day].revenue += row.order_value || 0;
            }

            // Pivotar por métrica
            const sortedDays = Object.keys(dayMap).sort();
            const daily: Record<string, DailyMetricPoint[]> = {
              views:           sortedDays.map(d => ({ date: d, value: dayMap[d]?.play || 0 })),
              likes:           sortedDays.map(d => ({ date: d, value: dayMap[d]?.like || 0 })),
              comments:        sortedDays.map(d => ({ date: d, value: (dayMap[d]?.comment || 0) + (dayMap[d]?.comment_open || 0) })),
              shares:          sortedDays.map(d => ({ date: d, value: dayMap[d]?.share || 0 })),
              whatsapp_clicks: sortedDays.map(d => ({ date: d, value: dayMap[d]?.whatsapp_click || 0 })),
              // 🟢 correção #5: comentário documentando que cta_clicks inclui whatsapp + product
              cta_clicks:      sortedDays.map(d => ({ date: d, value: (dayMap[d]?.whatsapp_click || 0) + (dayMap[d]?.product_click || 0) })),
              conversions:     sortedDays.map(d => ({ date: d, value: convDayMap[d]?.count || 0 })),
              revenue:         sortedDays.map(d => ({ date: d, value: +(convDayMap[d]?.revenue || 0).toFixed(2) })),
              ctr:             sortedDays.map(d => {
                const v = dayMap[d]?.play || 0;
                const c = (dayMap[d]?.whatsapp_click || 0) + (dayMap[d]?.product_click || 0);
                return { date: d, value: v > 0 ? +((c / v) * 100).toFixed(1) : 0 };
              }),
            };

            setDailyData(daily);
            setDailyError(false);

            const totalViews = sortedDays.reduce((s, d) => s + (dayMap[d]?.play || 0), 0);

            // 🟢 correção #6: fallback se sortedDays estiver vazio
            if (sortedDays.length > 0) {
              setAvgDailyViews(Math.round(totalViews / sortedDays.length));
            } else {
              const dias = getDiasNoPeriodo(timeRange, customFrom, customTo);
              setAvgDailyViews(dias > 0 ? Math.round(metrics.views / dias) : 0);
            }
          } catch (supabaseErr) {
            console.error('Erro ao buscar dados diários do Supabase:', supabaseErr);
            if (mounted) {
              setDailyError(true);
              // 🟢 correção #6: fallback usando métricas agregadas
              const dias = getDiasNoPeriodo(timeRange, customFrom, customTo);
              setAvgDailyViews(dias > 0 ? Math.round(metrics.views / dias) : 0);
            }
          }
        }
      } catch (e) {
        console.error('Erro ao carregar Overview:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [storeId, timeRange, customFrom, customTo, getDateRange]);
  // ── NOVO: achar benchmark para a métrica selecionada ──
  const getBenchmarkForMetric = (metricKey: string): number | undefined => {
    const benchKey = METRIC_TO_BENCHMARK[metricKey];
    if (!benchKey) return undefined;
    const b = benchmarks.find(x => x.metric_key === benchKey);
    return b?.value_mid;
  };

  // ── NOVO: valor da linha de referência ──
  const referenceLineValue = ((): number | undefined => {
    const option = METRIC_OPTIONS.find(o => o.key === selectedMetric);
    if (!option) return undefined;

    if (option.isRate) {
      // Para taxas (CTR), o benchmark é o próprio valor
      return getBenchmarkForMetric(selectedMetric);
    }

    // Para absolutos, benchmark_rate × avg_daily_views
    const benchRate = getBenchmarkForMetric(selectedMetric);
    if (benchRate && avgDailyViews > 0) {
      return +(benchRate / 100 * avgDailyViews).toFixed(1);
    }
    return undefined;
  })();

  // ── NOVO: computar diff para os cards ──
  const computeBenchmarkDiff = (cardKey: string, cardValue: number, cardIsRate: boolean): { diff: number; bench: number } | null => {
    const benchKey = METRIC_TO_BENCHMARK[cardKey];
    if (!benchKey) return null;
    const b = benchmarks.find(x => x.metric_key === benchKey);
    if (!b) return null;

    if (cardIsRate) {
      // Compara taxas diretamente
      return { diff: +((cardValue - b.value_mid) / b.value_mid * 100).toFixed(0), bench: b.value_mid };
    }

    // Para absolutos: compara com benchmark_rate × total_views
    const expectedValue = b.value_mid / 100 * metrics.views;
    if (expectedValue === 0) return null;
    return { diff: +((cardValue - expectedValue) / expectedValue * 100).toFixed(0), bench: b.value_mid };
  };

  // ── Dados para os cards com benchmark ──
  const cardData = [
    { key: 'views',           label: 'Visualizações',      value: metrics.views,                   unit: 'count' as const, icon: Eye,              color: 'blue',    isRate: false },
    { key: 'cta_clicks',      label: 'Cliques em CTA',     value: metrics.ctaClicks,               unit: 'count' as const, icon: MousePointerClick, color: 'blue',    isRate: false },
    { key: 'conversions',     label: 'Conversões',         value: metrics.conversions,             unit: 'count' as const, icon: CheckCircle2,     color: 'emerald', isRate: false },
    { key: 'ctr',             label: 'CTR',                value: metrics.ctr,                     unit: '%'    as const, icon: MousePointerClick, color: 'blue',    isRate: true  },
    { key: 'revenue',         label: 'Receita',            value: metrics.revenue,                 unit: 'R$'   as const, icon: DollarSign,        color: 'amber',  isRate: false },
    { key: 'likes',           label: 'Curtidas',           value: metrics.likes,                   unit: 'count' as const, icon: Heart,             color: 'emerald', isRate: false },
    { key: 'comments',        label: 'Comentários',        value: metrics.comments,                unit: 'count' as const, icon: MessageCircle,     color: 'blue',    isRate: false },
    { key: 'shares',          label: 'Compartilhamentos',  value: metrics.shares,                  unit: 'count' as const, icon: Share2,            color: 'blue',    isRate: false },
    { key: 'whatsapp_clicks', label: 'Cliques WhatsApp',   value: metrics.whatsappClicks,          unit: 'count' as const, icon: MessageCircle,     color: 'amber',  isRate: false },
  ];

  // ── Dados do gráfico ──
  const chartData = dailyData[selectedMetric] || [];
  const selectedOption = METRIC_OPTIONS.find(o => o.key === selectedMetric);

  // 🆕 Verifica se é custom sem datas
  const isCustomSemDatas = timeRange === 'custom' && (!customFrom || !customTo);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  // ── Donut ──
  const eventBreakdown = [
    { name: 'Plays', value: metrics.plays, color: '#0094EB' },
    { name: 'Curtidas', value: metrics.likes, color: '#f43f5e' },
    { name: 'Comentários', value: metrics.comments, color: '#10b981' },
    { name: 'Compartilh.', value: metrics.shares, color: '#f59e0b' },
    { name: 'WhatsApp', value: metrics.whatsappClicks, color: '#25D366' },
  ].filter((e) => e.value > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 🟢 correção #3: aviso custom sem datas */}
      {isCustomSemDatas && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700">
          <AlertTriangle size={18} className="shrink-0" />
          Período personalizado selecionado. Clique em <strong className="mx-1">Selecionar datas</strong> para definir o intervalo.
        </div>
      )}

      {/* 🆕 correção #2: aviso de erro nos dados diários */}
      {dailyError && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-500">
          <AlertTriangle size={18} className="shrink-0" />
          Dados diários indisponíveis no momento. Os gráficos e benchmarks podem estar limitados.
        </div>
      )}

      {/* ── Cards de métricas principais (5 colunas) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {cardData.slice(0, 5).map(card => {
          const bench = computeBenchmarkDiff(card.key, card.value, card.isRate);
          return (
            <MetricCard
              key={card.key}
              title={card.label}
              value={card.unit === 'R$'
                ? `R$ ${card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : card.unit === '%'
                  ? `${card.value.toFixed(1).replace('.', ',')}%`
                  : card.value.toLocaleString()
              }
              icon={card.icon}
              color={card.color}
              benchmarkDiff={bench?.diff ?? undefined}
              benchmarkLabel={bench ? `${bench.bench}%` : undefined}
            />
          );
        })}
      </div>

      {/* ── Cards de engajamento ── */}
      {/* 🟢 correção #4: grid padronizado lg:grid-cols-4 (igual linha acima) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardData.slice(5).map(card => {
          const bench = computeBenchmarkDiff(card.key, card.value, card.isRate);
          return (
            <MetricCard
              key={card.key}
              title={card.label}
              value={card.value.toLocaleString()}
              icon={card.icon}
              color={card.color}
              benchmarkDiff={bench?.diff ?? undefined}
              benchmarkLabel={bench ? `${bench.bench}%` : undefined}
            />
          );
        })}
      </div>

      {/* ── Gráfico com seletor de métrica + Referência ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {selectedOption?.label || 'Visualizações'}
            </h3>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[200px] h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map(opt => (
                  <SelectItem key={opt.key} value={opt.key} className="text-xs font-bold">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-[340px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0094EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0094EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                    dy={10}
                    tickFormatter={(d: string) => {
                      const parts = d.split('-');
                      return `${parts[2]}/${parts[1]}`;
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                    formatter={(val: number) => [
                      selectedOption?.isRate ? `${val}%` : val.toLocaleString(),
                      selectedOption?.label || '',
                    ]}
                  />
                  {/* Linha de referência do benchmark */}
                  {referenceLineValue !== undefined && referenceLineValue > 0 && (
                    <ReferenceLine
                      y={referenceLineValue}
                      stroke="#94A3B8"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{
                        value: selectedOption?.isRate
                          ? `Média: ${referenceLineValue}%`
                          : `Média: ${Math.round(referenceLineValue)}`,
                        position: 'insideTopRight',
                        fill: '#94A3B8',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0094EB"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-bold">
                {dailyError ? 'Dados diários indisponíveis' : 'Sem dados no período'}
              </div>
            )}
          </div>
        </div>

        {/* ── Donut de eventos ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8">
            Distribuição de Eventos
          </h3>
          {eventBreakdown.length > 0 ? (
            <div className="h-[280px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {eventBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      padding: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={60}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-bold">
              Sem eventos no período
            </div>
          )}
        </div>
      </div>

      {/* ── Top 5 vídeos ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8">
          Top 5 Vídeos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {topVideos.map((item, i) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-[#0094EB]/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-800 dark:text-white truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                    RANK #{i + 1}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Views</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {item.metrics.views.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CTR</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {item.metrics.ctr.toFixed(1).replace('.', ',')}%
                  </p>
                </div>
              </div>
            </div>
          ))}
          {topVideos.length === 0 && (
            <p className="col-span-full text-center text-slate-400 dark:text-slate-500 font-bold py-8">
              Nenhum vídeo com dados no período.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MetricCard com badge de benchmark ───────────────────────

const MetricCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  benchmarkDiff,
  benchmarkLabel,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'amber';
  benchmarkDiff?: number;
  benchmarkLabel?: string;
}) => {
  const colorClasses = {
    blue:    'bg-blue-50 dark:bg-blue-900/30 text-[#0094EB]',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400',
    amber:   'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative h-full">
      <div className="flex items-start justify-between mb-6">
        <div className={cn('p-4 rounded-2xl transition-all group-hover:scale-110', colorClasses[color])}>
          <Icon size={24} />
        </div>

        {/* Badge de benchmark */}
        {benchmarkDiff !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black',
              benchmarkDiff > 5
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                : benchmarkDiff < -5
                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            )}
          >
            {benchmarkDiff > 5 ? (
              <TrendingUp size={12} />
            ) : benchmarkDiff < -5 ? (
              <TrendingDown size={12} />
            ) : (
              <Minus size={12} />
            )}
            <span>
              {benchmarkDiff > 0 ? '↑' : benchmarkDiff < 0 ? '↓' : ''}
              {Math.abs(benchmarkDiff)}%
              {Math.abs(benchmarkDiff) <= 5 ? ' na média' : benchmarkDiff > 0 ? ' acima' : ' abaixo'}
            </span>
          </div>
        )}
      </div>

      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
        {title}
      </p>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h2>

      {benchmarkLabel && (
        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1">
          Média do setor: {benchmarkLabel}
        </p>
      )}
    </div>
  );
};
