import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Video } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, MousePointerClick, ShoppingBag, CheckCircle2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7' | '30' | 'custom'>('30');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);

  const activeInterval = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'today') return { start: startOfDay(now), end: endOfDay(now) };
    if (selectedPeriod === '7') return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    if (selectedPeriod === '30') return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    return { start: startOfDay(customRange.from || subDays(now, 7)), end: endOfDay(customRange.to || now) };
  }, [selectedPeriod, customRange]);

  // Gerador determinístico baseado na data para evitar números aleatórios bugados
  const getDailyMetric = (date: Date, type: 'views' | 'clicks' | 'sales') => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const seed = (day * 13) + (month * 101) + (year % 100);
    
    if (type === 'views') return 120 + (seed % 300);
    if (type === 'clicks') return Math.floor((120 + (seed % 300)) * (0.12 + (seed % 8) / 100));
    return Math.floor((120 + (seed % 300)) * (0.02 + (seed % 3) / 100));
  };

  const calculateVideoMetrics = (videoId: string) => {
    const end = new Date();
    const start = subDays(end, 30);
    const seed = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const daysInterval = eachDayOfInterval({ start, end });

    let views = 0;
    let clicks = 0;
    let comments = 0;

    daysInterval.forEach(date => {
      const dateSeed = date.getDate() + date.getMonth() * 31 + (date.getFullYear() % 100) * 400;
      const combinedSeed = (seed + dateSeed) % 1000;
      const dailyViews = 15 + (combinedSeed % 40);
      const dailyClicks = Math.floor(dailyViews * (0.10 + (combinedSeed % 15) / 100));
      const dailyComments = Math.floor(dailyClicks * (0.05 + (combinedSeed % 5) / 100));
      views += dailyViews;
      clicks += dailyClicks;
      comments += dailyComments;
    });

    return { views, clicks, comments };
  };

  const dashboardData = useMemo(() => {
    const days = eachDayOfInterval({ start: activeInterval.start, end: activeInterval.end });
    
    const flow = days.map(day => {
      const views = getDailyMetric(day, 'views');
      const clicks = getDailyMetric(day, 'clicks');
      const sales = getDailyMetric(day, 'sales');
      
      return {
        name: format(day, 'dd/MM', { locale: ptBR }),
        views, clicks, sales,
        revenue: sales * 89.9
      };
    });

    const totals = flow.reduce((acc, curr) => ({
      views: acc.views + curr.views,
      clicks: acc.clicks + curr.clicks,
      sales: acc.sales + curr.sales,
      revenue: acc.revenue + curr.revenue
    }), { views: 0, clicks: 0, sales: 0, revenue: 0 });

    const topVideos = [...videos]
      .map((video) => {
        const metrics = calculateVideoMetrics(video.id);
        const clicks = Number((video as any).clicks_count ?? (video as any).click_count ?? (video as any).clicks ?? metrics.clicks ?? 0);
        const views = Number((video as any).views_count ?? (video as any).view_count ?? (video as any).views ?? metrics.views ?? 0);
        const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(1)) : 0;
        return { ...video, metrics: { views, clicks, ctr } };
      })
      .sort((a, b) => b.metrics.views - a.metrics.views)
      .slice(0, 4)
      .map((video) => ({
        id: video.id,
        name: video.title,
        thumbnail: video.thumbnail_url || video.image_url || '',
        views: video.metrics.views,
        ctr: video.metrics.ctr,
      }));

    return { flow, totals, topVideos };
  }, [activeInterval, videos]);

  useEffect(() => {
    const init = async () => {
      const allVideos = await db.videos.getAll();
      setVideos(allVideos);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1">
            Métricas de <span className="text-[#0094EB] font-bold">{format(activeInterval.start, "dd/MM")}</span> até <span className="text-[#0094EB] font-bold">{format(activeInterval.end, "dd/MM")}</span>
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
              onClick={() => p.id === 'custom' ? setIsCalendarOpen(true) : setSelectedPeriod(p.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                selectedPeriod === p.id ? "bg-[#0094EB] text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {p.icon && <p.icon size={14} />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Visualizações" value={dashboardData.totals.views.toLocaleString()} change="+12.5%" icon={Eye} />
        <MetricCard title="Cliques em CTA" value={dashboardData.totals.clicks.toLocaleString()} change="+8.3%" icon={MousePointerClick} />
        <MetricCard title="Conversões" value={dashboardData.totals.sales.toLocaleString()} change="+15.1%" icon={CheckCircle2} isConversion />
        <MetricCard title="CTR" value="12.4%" change="+5.4%" icon={MousePointerClick} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Fluxo de Performance de Vídeos</h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.flow}>
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
            {dashboardData.topVideos.map((item, i) => (
              <div key={item.id} className="flex flex-col gap-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-[#0094EB]/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-200 overflow-hidden shrink-0">
                    {item.thumbnail ? <img src={item.thumbnail} alt={item.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-800 truncate">{item.name}</p>
                    <span className="text-[10px] font-black text-slate-400">RANK #{i+1}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualizações</p>
                    <p className="text-sm font-black text-slate-900">{item.views.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa (CTR)</p>
                    <p className="text-sm font-black text-slate-900">{item.ctr}%</p>
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

const MetricCard = ({ title, value, change, icon: Icon, isConversion = false }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
    <div className="flex items-start justify-between mb-6">
      <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110", isConversion ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-[#0094EB]')}>
        <Icon size={24} />
      </div>
      <span className="text-[11px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">{change}</span>
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h2 className="text-2xl font-black text-slate-900">{value}</h2>
  </div>
);

export default DashboardPage;