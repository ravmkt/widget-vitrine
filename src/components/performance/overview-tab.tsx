import React, { useEffect, useState } from 'react';
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
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  CheckCircle2,
  DollarSign,
  Heart,
  MessageCircle,
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

type Props = {
  timeRange: string; // '7d' | '15d' | '30d' | 'custom'
  customFrom?: string;
  customTo?: string;
};

// Converte o timeRange da PerformancePage pro formato do analytics.ts
const mapInterval = (timeRange: string): AnalyticsInterval => {
  if (timeRange === '7d') return '7';
  if (timeRange === '30d' || timeRange === '15d') return '30';
  if (timeRange === 'custom') return 'custom';
  return '30';
};

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

  useEffect(() => {
    if (!storeId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const interval = mapInterval(timeRange);
        const customRange = {
          from: customFrom ? new Date(customFrom) : undefined,
          to: customTo ? new Date(customTo) : undefined,
        };

        const [dashMetrics, flowRows, videos] = await Promise.all([
          getDashboardMetrics(storeId, interval, customRange),
          getMetricsFlow(storeId, interval, customRange),
          db.videos.getAll(storeId),
        ]);

        if (!mounted) return;

        setMetrics(dashMetrics);
        setFlow(flowRows);

        const rows = await getVideoMetricsRows(storeId, videos, interval, customRange);
        if (!mounted) return;

        setTopVideos(
          [...rows].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5)
        );
      } catch (e) {
        console.error('Erro ao carregar Overview:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [storeId, timeRange, customFrom, customTo]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  // ── Donut chart data ──
  const eventBreakdown = [
    { name: 'Plays', value: metrics.plays, color: '#0094EB' },
    { name: 'Curtidas', value: metrics.likes, color: '#f43f5e' },
    { name: 'Comentários', value: metrics.comments, color: '#10b981' },
    { name: 'Compartilh.', value: metrics.shares, color: '#f59e0b' },
    { name: 'WhatsApp', value: metrics.whatsappClicks, color: '#25D366' },
  ].filter((e) => e.value > 0);

  const hasEventData = eventBreakdown.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard title="Visualizações" value={metrics.views.toLocaleString()} icon={Eye} />
        <MetricCard title="Cliques em CTA" value={metrics.ctaClicks.toLocaleString()} icon={MousePointerClick} />
        <MetricCard title="Conversões" value={metrics.conversions.toLocaleString()} icon={CheckCircle2} isConversion />
        <MetricCard title="CTR" value={`${metrics.ctr.toFixed(1).replace('.', ',')}%`} icon={MousePointerClick} />
        <MetricCard
          title="Receita"
          value={`R$ ${metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          isRevenue
        />
      </div>

      {/* ── Cards de engajamento ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Curtidas" value={metrics.likes.toLocaleString()} icon={Heart} isConversion />
        <MetricCard title="Comentários" value={metrics.comments.toLocaleString()} icon={MessageCircle} />
        <MetricCard title="Compartilhamentos" value={metrics.shares.toLocaleString()} icon={MousePointerClick} />
        <MetricCard title="Cliques WhatsApp" value={metrics.whatsappClicks.toLocaleString()} icon={MousePointerClick} isRevenue />
      </div>

      {/* ── Gráfico de área + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Fluxo de visualizações */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8">
            Fluxo de Visualizações
          </h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flow}>
                <defs>
                  <linearGradient id="colorViewsOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0094EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0094EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }} />
                <Area type="monotone" dataKey="views" stroke="#0094EB" strokeWidth={4} fillOpacity={1} fill="url(#colorViewsOverview)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut de eventos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8">
            Distribuição de Eventos
          </h3>
          {hasEventData ? (
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
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
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
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Views
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {item.metrics.views.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    CTR
                  </p>
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

/* ─── Card reutilizado do DashboardPage ─── */
const MetricCard = ({ title, value, icon: Icon, isConversion = false, isRevenue = false }: any) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
    <div className="flex items-start justify-between mb-6">
      <div
        className={cn(
          'p-4 rounded-2xl transition-all group-hover:scale-110',
          isConversion
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400'
            : isRevenue
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            : 'bg-blue-50 dark:bg-blue-900/30 text-[#0094EB]'
        )}
      >
        <Icon size={24} />
      </div>
    </div>
    <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
      {title}
    </p>
    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h2>
  </div>
);
