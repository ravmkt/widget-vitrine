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

  // Cálculo determinístico baseado em seed
  const calculateVideoStats = (videoId: string, start: Date, end: Date) => {
    const seed = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const daysInterval = eachDayOfInterval({ start, end });
    
    let views = 0;
    let clicks = 0;
    let conversions = 0;

    daysInterval.forEach(date => {
      const dateSeed = date.getDate() + date.getMonth() * 31 + (date.getFullYear() % 100) * 400;
      const combinedSeed = (seed + dateSeed) % 1000;
      
      const dailyViews = 15 + (combinedSeed % 40);
      const dailyClicks = Math.floor(dailyViews * (0.10 + (combinedSeed % 15) / 100));
      const dailyConversions = Math.floor(dailyClicks * (0.05 + (combinedSeed % 5) / 100));
      
      views += dailyViews;
      clicks += dailyClicks;
      conversions += dailyConversions;
    });

    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";
    return { views, clicks, conversions, ctr };
  };

  const videoStats = useMemo(() => {
    return videos
      .filter(v => (v.title || '').toLowerCase().includes(filters.search.toLowerCase()))
      .map(v => {
        const metrics = calculateVideoStats(v.id, activeInterval.start, activeInterval.end);
        
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
            engagement: (parseFloat(metrics.ctr) * 1.3).toFixed(1)
          },
          trends: { views: viewDiff }
        };
      });
  }, [videos, filters.search, activeInterval]);

  const totals = useMemo(() => {
    const sum = videoStats.reduce((acc, curr) => ({
      views: acc.views + curr.metrics.views,
      clicks: acc.clicks + curr.metrics.clicks,
      conversions: acc.conversions + curr.metrics.conversions
    }), { views: 0, clicks: 0, conversions: 0 });

    const ctr = sum.views > 0 ? ((sum.clicks / sum.views) * 100).toFixed(1) : "0.0";
    return { ...sum, ctr };
  }, [videoStats]);

  const handleOpenPlayer = (video: any) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"><ArrowLeft size={18}/></button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Performance de Vídeos</h1>
        </div>

        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
          {['today', '7', '30', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => p === 'custom' ? setIsCalendarOpen(true) : setFilters(prev => ({ ...prev, period: p }))}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                filters.period === p ? "bg-[#0094EB] text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {p === 'today' ? 'Hoje' : p === '7' ? '7 dias' : p === '30' ? '30 dias' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Visualizações" value={totals.views.toLocaleString()} icon={Eye} color="blue" trend="+12%" />
        <SummaryCard label="Cliques (CTA)" value={totals.clicks.toLocaleString()} icon={MousePointer2} color="violet" trend="+5%" />
        <SummaryCard label="Conversões" value={totals.conversions.toLocaleString()} icon={CheckCircle2} color="emerald" trend="+8%" />
        <SummaryCard label="CTR Geral" value={`${totals.ctr}%`} icon={TrendingUp} color="amber" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="Filtrar vídeos..." value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
          />
        </div>

        <div className="space-y-3">
          {videoStats.map((v) => (
            <div key={v.id} className="bg-white border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/50 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <img src={v.thumbnail_url || ''} className="h-12 w-12 rounded-xl object-cover shrink-0 bg-slate-200" alt={v.title} onError={e => { e.currentTarget.style.display = 'none'; }} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-800 truncate">{v.title}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.source_type}</p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <MetricItem label="Views" value={v.metrics.views} trend={v.trends.views} />
                  <MetricItem label="Cliques" value={v.metrics.clicks} />
                  <MetricItem label="Conversões" value={v.metrics.conversions} />
                  <MetricItem label="CTR" value={`${v.metrics.ctr}%`} />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleOpenPlayer(v)} className="bg-[#EAF6FF] text-[#0094EB] px-4 py-2 rounded-xl text-[10px] font-black transition-all">Ver vídeo</button>
                  <button onClick={() => navigate(`/videos/${v.id}/edit`)} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black transition-all">Editar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Visualizar Vídeo Redimensionado - FIXED PLAYER */}
      <CustomDialog isOpen={isViewModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-4xl" onCancel={() => setIsViewModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-[240px] shrink-0 mx-auto lg:mx-0">
              {viewingVideo.video_url ? (
                <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh]">
                  <video 
                    src={viewingVideo.video_url} 
                    className="w-full max-w-full h-auto max-h-[400px] object-contain" 
                    poster={viewingVideo.thumbnail_url} 
                    controls 
                    autoPlay 
                    loop
                  />
                </div>
              ) : (
                <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh] flex flex-col items-center justify-center gap-4 p-4">
                  <p className="text-white text-sm font-bold text-center">
                    {viewingVideo.source_type === 'instagram' ? 'Vídeo do Instagram' : viewingVideo.source_type === 'tiktok' ? 'Vídeo do TikTok' : 'Sem vídeo'}
                  </p>
                  {viewingVideo.instagram_link && (
                    <a href={viewingVideo.instagram_link} target="_blank" rel="noreferrer" className="bg-[#0094EB] text-white px-4 py-2 rounded-xl text-xs font-black">Abrir no Instagram</a>
                  )}
                  {viewingVideo.tiktok_link && (
                    <a href={viewingVideo.tiktok_link} target="_blank" rel="noreferrer" className="bg-[#0094EB] text-white px-4 py-2 rounded-xl text-xs font-black">Abrir no TikTok</a>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col pt-1">
              <div className="mb-4">
                <h3 className="text-xl font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">Conteúdo Real</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <CompactMetric label="Views" value={(viewingVideo as any).metrics.views} />
                <CompactMetric label="CTR" value={`${(viewingVideo as any).metrics.ctr}%`} color="text-[#0094EB]" />
                <CompactMetric label="Conversões" value={(viewingVideo as any).metrics.conversions} color="text-emerald-600" />
                <CompactMetric label="Engajamento" value={`${(viewingVideo as any).metrics.engagement}%`} color="text-violet-600" />
              </div>

              <div className="mt-auto flex gap-2">
                <button onClick={() => navigate(`/videos/${viewingVideo.id}/edit`)} className="flex-1 py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"><Edit3 size={14} /> Editar</button>
                <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs">Fechar</button>
              </div>
            </div>
          </div>
        )}
      </CustomDialog>

      <CustomDialog isOpen={isCalendarOpen} type="form" title="Período" maxWidth="max-w-md" onCancel={() => setIsCalendarOpen(false)} onConfirm={() => setIsCalendarOpen(false)} confirmText="Aplicar Filtro">
        <div className="scale-90 origin-top">
          <DayPicker mode="range" selected={filters.customRange} onSelect={(r) => r && setFilters(prev => ({ ...prev, period: 'custom', customRange: { from: r.from || prev.customRange.from, to: r.to || prev.customRange.to } }))} locale={ptBR} className="border-none" modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} />
        </div>
      </CustomDialog>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", 
      color === 'blue' ? "bg-blue-50 text-[#0094EB]" : 
      color === 'violet' ? "bg-violet-50 text-violet-500" : 
      color === 'emerald' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-600")}>
      <Icon size={18} />
    </div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <div className="flex items-center justify-between">
      <h3 className="text-base font-black text-slate-900">{value}</h3>
      {trend && <span className="text-[9px] font-bold text-emerald-500">{trend}</span>}
    </div>
  </div>
);

const MetricItem = ({ label, value, trend }: any) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-black text-slate-800">{value}</span>
      {trend !== undefined && (
        <span className={cn("text-[9px] font-bold", trend >= 0 ? "text-emerald-500" : "text-rose-500")}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
);

const CompactMetric = ({ label, value, color = "text-slate-900" }: any) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{label}</p>
    <p className={cn("text-sm font-black", color)}>{value}</p>
  </div>
);

export default VideoPerformancePage;