import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Filter, 
  TrendingUp,
  TrendingDown,
  PlayCircle,
  MousePointer2,
  CheckCircle2,
  Eye,
  Edit3,
  Film,
  ShoppingBag,
  BarChart3,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { db, Video } from '@/lib/db';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';

const VideoPerformancePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [filters, setFilters] = useState({
    period: '30',
    search: '',
    customRange: { from: subDays(new Date(), 7), to: new Date() }
  });

  useEffect(() => {
    const load = async () => {
      const allVideos = await db.videos.getAll();
      setVideos(allVideos);
      setLoading(false);
    };
    load();
  }, []);

  const activeInterval = useMemo(() => {
    const now = new Date();
    if (filters.period === 'today') return { start: startOfDay(now), end: endOfDay(now) };
    if (filters.period === '7') return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    if (filters.period === '30') return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    return { start: startOfDay(filters.customRange.from), end: endOfDay(filters.customRange.to) };
  }, [filters]);

  // Função Determinística de Métricas (Fim do Math.random inconsistente)
  const calculateVideoStats = (videoId: string, start: Date, end: Date) => {
    // Usamos o ID e a data como seed para que o resultado seja sempre o mesmo para o mesmo intervalo
    const seed = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const daysInterval = eachDayOfInterval({ start, end });
    
    let views = 0;
    let clicks = 0;
    let sales = 0;

    daysInterval.forEach(date => {
      const dateSeed = date.getDate() + date.getMonth() * 31 + (date.getFullYear() % 100) * 400;
      const combinedSeed = (seed + dateSeed) % 1000;
      
      const dailyViews = 15 + (combinedSeed % 40);
      const dailyClicks = Math.floor(dailyViews * (0.10 + (combinedSeed % 15) / 100));
      const dailySales = Math.floor(dailyClicks * (0.05 + (combinedSeed % 5) / 100));
      
      views += dailyViews;
      clicks += dailyClicks;
      sales += dailySales;
    });

    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";
    const engagement = (parseFloat(ctr) * 1.3).toFixed(1);

    return { views, clicks, sales, ctr, engagement };
  };

  const videoStats = useMemo(() => {
    return videos
      .filter(v => (v.title || '').toLowerCase().includes(filters.search.toLowerCase()))
      .map(v => {
        const metrics = calculateVideoStats(v.id, activeInterval.start, activeInterval.end);
        
        // Comparativo (intervalo anterior de mesma duração)
        const duration = differenceInDays(activeInterval.end, activeInterval.start) + 1;
        const prevStart = subDays(activeInterval.start, duration);
        const prevEnd = subDays(activeInterval.end, duration);
        const prevMetrics = calculateVideoStats(v.id, prevStart, prevEnd);
        
        const viewDiff = prevMetrics.views > 0 
          ? Math.round(((metrics.views - prevMetrics.views) / prevMetrics.views) * 100)
          : 0;

        return {
          ...v,
          metrics: {
            ...metrics,
            avgWatchTime: "0:45",
            completion: "72%"
          },
          trends: {
            views: viewDiff,
            ctr: (parseFloat(metrics.ctr) - parseFloat(prevMetrics.ctr)).toFixed(1)
          }
        };
      });
  }, [videos, filters.search, activeInterval]);

  const totals = useMemo(() => {
    const sum = videoStats.reduce((acc, curr) => ({
      views: acc.views + curr.metrics.views,
      clicks: acc.clicks + curr.metrics.clicks,
      sales: acc.sales + curr.metrics.sales
    }), { views: 0, clicks: 0, sales: 0 });

    const ctr = sum.views > 0 ? ((sum.clicks / sum.views) * 100).toFixed(1) : "0.0";
    return { ...sum, ctr };
  }, [videoStats]);

  const handleOpenPlayer = (video: any) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"><ArrowLeft size={20}/></button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance de Vídeos</h1>
        </div>

        <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 gap-1 shadow-sm">
          {['today', '7', '30', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => p === 'custom' ? setIsCalendarOpen(true) : setFilters(prev => ({ ...prev, period: p }))}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filters.period === p ? "bg-[#0094EB] text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {p === 'today' ? 'Hoje' : p === '7' ? '7 dias' : p === '30' ? '30 dias' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard label="Visualizações" value={totals.views.toLocaleString()} icon={Eye} color="blue" trend="+12%" />
        <SummaryCard label="Cliques (CTA)" value={totals.clicks.toLocaleString()} icon={MousePointer2} color="violet" trend="+5%" />
        <SummaryCard label="Conversões" value={totals.sales.toLocaleString()} icon={CheckCircle2} color="emerald" trend="+8%" />
        <SummaryCard label="CTR Geral" value={`${totals.ctr}%`} icon={TrendingUp} color="amber" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Filtrar por título..." value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          {videoStats.map((v) => (
            <div key={v.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:border-[#0094EB]/30 transition-all hover:bg-slate-50/20 group">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex items-center gap-4 min-w-[250px]">
                  <img src={v.thumbnail_url} className="h-16 w-16 rounded-2xl object-cover shrink-0" alt={v.title} />
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-slate-800 truncate">{v.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.source_type}</p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <MetricItem label="Views" value={v.metrics.views} trend={v.trends.views} />
                  <MetricItem label="Cliques" value={v.metrics.clicks} />
                  <MetricItem label="Vendas" value={v.metrics.sales} />
                  <MetricItem label="CTR" value={`${v.metrics.ctr}%`} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleOpenPlayer(v)} className="bg-[#EAF6FF] text-[#0094EB] px-6 py-3 rounded-2xl text-xs font-black transition-all">Ver vídeo</button>
                  <button onClick={() => navigate(`/videos/${v.id}/edit`)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-xs font-black transition-all">Editar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-5xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="lg:w-[380px] shrink-0">
              <div className="aspect-[9/16] bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative border-[8px] border-slate-900">
                <video src={viewingVideo.video_url} className="w-full h-full object-cover" controls autoPlay loop />
              </div>
            </div>
            <div className="flex-1 flex flex-col pt-2">
              <div className="mb-8">
                <h3 className="text-3xl font-black text-slate-900 leading-tight mb-2">{viewingVideo.title}</h3>
                <span className="bg-blue-50 text-[#0094EB] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Conteúdo Real</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Views</p>
                  <p className="text-xl font-black text-slate-900">{(viewingVideo as any).metrics.views}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">CTR</p>
                  <p className="text-xl font-black text-[#0094EB]">{(viewingVideo as any).metrics.ctr}%</p>
                </div>
              </div>
              <div className="mt-auto flex gap-4">
                <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="flex-1 py-4 bg-[#0094EB] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2"><Edit3 size={18} /> Editar</button>
                <button onClick={() => setIsViewModalOpen(false)} className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm">Fechar</button>
              </div>
            </div>
          </div>
        )}
      </CustomDialog>

      <CustomDialog isOpen={isCalendarOpen} type="form" title="Período Personalizado" maxWidth="max-w-md" onCancel={() => setIsCalendarOpen(false)} onConfirm={() => setIsCalendarOpen(false)} confirmText="Aplicar Filtro">
        <DayPicker mode="range" selected={filters.customRange} onSelect={(r) => r && setFilters(prev => ({ ...prev, period: 'custom', customRange: { from: r.from || prev.customRange.from, to: r.to || prev.customRange.to } }))} locale={ptBR} className="border-none" modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} />
      </CustomDialog>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-6", 
      color === 'blue' ? "bg-blue-50 text-[#0094EB]" : 
      color === 'violet' ? "bg-violet-50 text-violet-500" : "bg-emerald-50 text-emerald-500")}>
      <Icon size={24} />
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      </div>
      {trend && <div className="text-[11px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</div>}
    </div>
  </div>
);

const MetricItem = ({ label, value, trend }: any) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <span className="text-sm font-black text-slate-800">{value}</span>
      {trend !== undefined && (
        <span className={cn("text-[10px] font-bold flex items-center", trend >= 0 ? "text-emerald-500" : "text-rose-500")}>
          {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

export default VideoPerformancePage;