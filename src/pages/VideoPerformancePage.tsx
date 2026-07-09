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
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
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

  // Simulação de métricas detalhadas para todos os vídeos
  const videoStats = useMemo(() => {
    return videos
      .filter(v => (v.title || '').toLowerCase().includes(filters.search.toLowerCase()))
      .map(v => {
        // Gera dados baseados no ID para consistência na simulação
        const seed = v.id.length;
        const views = Math.floor(100 * seed + Math.random() * 50);
        const clicks = Math.floor(views * (0.1 + (seed % 10) / 100));
        const sales = Math.floor(clicks * 0.05);
        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";
        const conv = clicks > 0 ? ((sales / clicks) * 100).toFixed(1) : "0.0";
        
        return {
          ...v,
          metrics: {
            views,
            clicks,
            sales,
            ctr,
            conv,
            engagement: (parseFloat(ctr) * 1.2).toFixed(1),
            avgWatchTime: "0:42",
            completion: "68%"
          },
          trends: {
            views: (seed % 2 === 0 ? 1 : -1) * (5 + (seed % 15)),
            ctr: (seed % 3 === 0 ? 1 : -1) * (2 + (seed % 8))
          }
        };
      });
  }, [videos, filters.search, activeInterval]);

  const totals = useMemo(() => {
    return videoStats.reduce((acc, curr) => ({
      views: acc.views + curr.metrics.views,
      clicks: acc.clicks + curr.metrics.clicks,
      sales: acc.sales + curr.metrics.sales
    }), { views: 0, clicks: 0, sales: 0 });
  }, [videoStats]);

  const handleOpenPlayer = (video: any) => {
    setViewingVideo(video);
    setIsViewModalOpen(true);
  };

  const handleEditVideo = (videoId: string) => {
    navigate(`/videos/${videoId}/edit`);
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance de Vídeos</h1>
            <p className="text-slate-500 font-medium">Análise completa de engajamento e conversão de conteúdo.</p>
          </div>
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
              onClick={() => p.id === 'custom' ? setIsCalendarOpen(true) : setFilters(prev => ({ ...prev, period: p.id }))}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                filters.period === p.id ? "bg-[#0094EB] text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {p.icon && <p.icon size={14} />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard label="Visualizações" value={totals.views.toLocaleString()} icon={Eye} color="blue" trend="+12%" />
        <SummaryCard label="Cliques (CTA)" value={totals.clicks.toLocaleString()} icon={MousePointer2} color="violet" trend="+5%" />
        <SummaryCard label="Conversões" value={totals.sales.toLocaleString()} icon={CheckCircle2} color="emerald" trend="+8%" />
        <SummaryCard label="CTR Médio" value={`${(totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0).toFixed(1)}%`} icon={TrendingUp} color="amber" trend="+2%" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por título do vídeo..." 
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
            <Filter size={20} className="text-[#0094EB]" />
            Resultados por Conteúdo
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {videoStats.length > 0 ? (
              videoStats.map((v) => (
                <div key={v.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:border-[#0094EB]/30 transition-all hover:bg-slate-50/30 group">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-4 min-w-[280px]">
                      <div className="h-16 w-16 rounded-2xl bg-slate-900 overflow-hidden shrink-0 relative group-hover:scale-105 transition-transform">
                        <img src={v.thumbnail_url} className="w-full h-full object-cover opacity-80" alt={v.title} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle className="text-white fill-white/20" size={24} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-black text-slate-800 truncate">{v.title}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Film size={10} /> {v.source_type}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-8">
                      <MetricItem label="Views" value={v.metrics.views} trend={v.trends.views} />
                      <MetricItem label="Cliques" value={v.metrics.clicks} />
                      <MetricItem label="Vendas" value={v.metrics.sales} />
                      <MetricItem label="CTR" value={`${v.metrics.ctr}%`} trend={v.trends.ctr} />
                      <div className="hidden lg:block">
                        <MetricItem label="Engajamento" value={`${v.metrics.engagement}%`} />
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleOpenPlayer(v)}
                        className="flex-1 lg:flex-none px-6 py-3 bg-[#EAF6FF] text-[#0094EB] hover:bg-[#0094EB] hover:text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2"
                      >
                        <Eye size={16} /> Ver vídeo
                      </button>
                      <button 
                        onClick={() => handleEditVideo(v.id)}
                        className="flex-1 lg:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <Film size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">Nenhum vídeo encontrado para os filtros atuais.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Visualização Refatorado */}
      <CustomDialog
        isOpen={isViewModalOpen}
        type="form"
        title="Visualizar Vídeo"
        maxWidth="max-w-5xl"
        onCancel={() => setIsViewModalOpen(false)}
      >
        {viewingVideo && (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Coluna Esquerda: Player */}
            <div className="lg:w-[380px] shrink-0">
              <div className="aspect-[9/16] bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative border-[8px] border-slate-900">
                <video 
                  src={viewingVideo.video_url} 
                  className="w-full h-full object-cover" 
                  controls 
                  autoPlay 
                  loop
                />
              </div>
            </div>

            {/* Coluna Direita: Informações e Métricas */}
            <div className="flex-1 flex flex-col pt-2">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-50 text-[#0094EB] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Conteúdo Real
                  </span>
                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 flex items-center gap-1">
                    <Film size={12} /> {viewingVideo.source_type}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 leading-tight mb-2">{viewingVideo.title}</h3>
                <p className="text-slate-500 font-medium flex items-center gap-2">
                  <Calendar size={14} /> Cadastrado em {format(new Date(viewingVideo.created_at || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Views</p>
                  <p className="text-xl font-black text-slate-900">{(viewingVideo as any).metrics.views}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">CTR</p>
                  <p className="text-xl font-black text-[#0094EB]">{(viewingVideo as any).metrics.ctr}%</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vendas</p>
                  <p className="text-xl font-black text-emerald-600">{(viewingVideo as any).metrics.sales}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Retenção</p>
                  <p className="text-xl font-black text-slate-900">{(viewingVideo as any).metrics.completion}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tempo Médio</p>
                  <p className="text-xl font-black text-slate-900">{(viewingVideo as any).metrics.avgWatchTime}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Engajamento</p>
                  <p className="text-xl font-black text-violet-600">{(viewingVideo as any).metrics.engagement}%</p>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Produto Vinculado</p>
                      <p className="text-sm font-bold">Vestido Max Floral - Outono</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-600" />
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleEditVideo(viewingVideo.id)}
                    className="flex-1 py-4 bg-[#0094EB] hover:bg-[#0E4787] text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={18} /> Editar Vídeo
                  </button>
                  <button 
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CustomDialog>

      {/* Modal de Calendário */}
      <CustomDialog
        isOpen={isCalendarOpen} type="form" title="Selecionar Período" maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)} onConfirm={() => { if(filters.customRange.from && filters.customRange.to) { setFilters(prev => ({ ...prev, period: 'custom' })); setIsCalendarOpen(false); } }}
        confirmText="Aplicar Filtro"
      >
        <div className="flex flex-col items-center">
          <DayPicker 
            mode="range" 
            selected={filters.customRange} 
            onSelect={(r) => setFilters(prev => ({ ...prev, customRange: { from: r?.from || prev.customRange.from, to: r?.to || prev.customRange.to } }))} 
            locale={ptBR} 
            className="border-none" 
            modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} 
          />
        </div>
      </CustomDialog>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-6", 
      color === 'blue' ? "bg-blue-50 text-[#0094EB]" : 
      color === 'violet' ? "bg-violet-50 text-violet-500" : 
      color === 'emerald' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-600")}>
      <Icon size={24} />
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      </div>
      <div className="flex items-center gap-1 text-[11px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
        <TrendingUp size={12} /> {trend}
      </div>
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