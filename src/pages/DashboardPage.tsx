import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, MousePointerClick, ShoppingBag, CheckCircle2, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { getDashboardMetrics, getMetricsFlow, getVideoMetricsRows, type AnalyticsInterval } from '@/lib/analytics';
import { useTenant } from '@/context/TenantContext';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsInterval>('30');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState({ views: 0, plays: 0, pauses: 0, clicks: 0, ctaClicks: 0, productClicks: 0, whatsappClicks: 0, likes: 0, shares: 0, comments: 0, closes: 0, conversions: 0, ctr: 0, revenue: 0 });
  const [flow, setFlow] = useState<any[]>([]);
  const [topVideos, setTopVideos] = useState<any[]>([]);

  const activeInterval = useMemo(() => selectedPeriod, [selectedPeriod]);

  useEffect(() => {
    const init = async () => {
      const allVideos = storeId ? await db.videos.getAll(storeId) : [];
      setVideos(allVideos);
      setLoading(false);
    };
    init();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    const loadMetrics = async () => {
      const metrics = await getDashboardMetrics(storeId, activeInterval, customRange);
      const flowRows = await getMetricsFlow(storeId, activeInterval, customRange);
      const rows = await getVideoMetricsRows(storeId, videos, activeInterval, customRange);
      setDashboardMetrics(metrics);
      setFlow(flowRows);
      setTopVideos([...rows].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 4));
    };
    loadMetrics();
  }, [storeId, activeInterval, customRange, videos]);

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 font-medium mt-3">
            Métricas de <span className="text-[#0094EB] font-bold">{format(new Date(), "dd/MM")}</span> com dados reais do Supabase
          </p>
        </div>

        <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 gap-1 shadow-sm">
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
                'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2',
                selectedPeriod === p.id ? 'bg-[#0094EB] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              {p.icon && <p.icon size={14} />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard title="Visualizações" value={dashboardMetrics.views.toLocaleString()} icon={Eye} />
        <MetricCard title="Cliques em CTA" value={dashboardMetrics.ctaClicks.toLocaleString()} icon={MousePointerClick} />
        <MetricCard title="Conversões" value={dashboardMetrics.conversions.toLocaleString()} icon={CheckCircle2} isConversion />
        <MetricCard title="CTR" value={`${dashboardMetrics.ctr.toFixed(1).replace('.', ',')}%`} icon={MousePointerClick} />
        <MetricCard title="Receita" value={`R$ ${dashboardMetrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} isRevenue />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Fluxo de Performance de Vídeos</h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flow}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0094EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#0094EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dx={-10} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}} />
                <Area type="monotone" dataKey="views" stroke="#0094EB" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 mb-8">Performance de Vídeos</h3>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {topVideos.map((item, i) => (
              <div key={item.id} className="flex flex-col gap-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-[#0094EB]/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-200 overflow-hidden shrink-0">
                    {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-800 truncate">{item.title}</p>
                    <span className="text-[10px] font-black text-slate-400">RANK #{i+1}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualizações</p>
                    <p className="text-sm font-black text-slate-900">{item.metrics.views.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CTR</p>
                    <p className="text-sm font-black text-slate-900">{item.metrics.ctr.toFixed(1).replace('.', ',')}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/videos/performance')}
            className="w-full mt-8 py-4 bg-[#0094EB] hover:bg-[#0077c2] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
          >
            Ver relatório completo
          </button>
        </div>
      </div>

      <CustomDialog
        isOpen={isCalendarOpen} type="form" title="Período Personalizado" maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)} onConfirm={() => { if(customRange.from && customRange.to) { setSelectedPeriod('custom'); setIsCalendarOpen(false); } }}
        confirmText="Aplicar Filtro"
      >
        <div className="flex flex-col items-center">
          <DayPicker mode="range" selected={customRange} onSelect={(r) => setCustomRange({ from: r?.from, to: r?.to })} locale={ptBR} className="border-none" modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} />
        </div>
      </CustomDialog>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, isConversion = false, isRevenue = false }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
    <div className="flex items-start justify-between mb-6">
      <div className={cn('p-4 rounded-2xl transition-all group-hover:scale-110', isConversion ? 'bg-emerald-50 text-emerald-500' : isRevenue ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#0094EB]')}>
        <Icon size={24} />
      </div>
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h2 className="text-2xl font-black text-slate-900">{value}</h2>
  </div>
);

export default DashboardPage;