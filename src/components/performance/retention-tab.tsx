import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  LogOut,
  Info,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  ChevronDown,
  Video as VideoIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { db, resolveStoreId } from '@/lib/db';
import { useTenant } from '@/context/TenantContext';

type Props = {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
};

interface VideoItem {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
}

interface RetentionPoint {
  second: number;
  retention: number;
}

/**
 * Gera um número pseudo-aleatório determinístico (0 a 1) a partir de uma string.
 * Usado para que cada vídeo tenha uma "assinatura" própria na curva simulada,
 * evitando que vídeos com duração parecida gerem gráficos idênticos.
 */
function seededFactor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 1000) / 1000; // 0..1
  return 0.85 + normalized * 0.3; // entre 0.85 e 1.15 (variação suave)
}

export function RetentionTab({ timeRange, customFrom, customTo }: Props) {
  const { storeId: tenantStoreId } = useTenant();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredSecond, setHoveredSecond] = useState<number | null>(null);

  const [videoStats, setVideoStats] = useState<{
    completionRate: number;
    avgDuration: number;
    percentageViewed: number;
    skipsForward: number;
    rewinds: number;
    dropOffRate: number;
    dropOffCount: number;
  isRealData: boolean;
  curve: RetentionPoint[];
}>({
    completionRate: 0,
    avgDuration: 0,
    percentageViewed: 0,
    skipsForward: 0,
    rewinds: 0,
    dropOffRate: 0,
    dropOffCount: 0,
  isRealData: false,
  curve: [],
});

  // 1. Carregar vídeos da loja
  useEffect(() => {
    let isMounted = true;

    async function loadTenantVideos() {
      try {
        setLoading(true);
        const candidate =
          tenantStoreId ||
          localStorage.getItem('vidlytics_selected_store_id') ||
          localStorage.getItem('current_store_id') ||
          localStorage.getItem('store_id') ||
          '';
        const safeStoreId = await resolveStoreId(candidate || undefined);

        if (!safeStoreId) {
          if (isMounted) {
            setVideos([]);
            setSelectedVideoId('');
            setLoading(false);
          }
          return;
        }

        let loadedVideos: any[] = [];
        try {
          loadedVideos = await db.videos.getAll(safeStoreId);
        } catch {
          const { data } = await supabase
            .from('videos')
            .select('*')
            .eq('store_id', safeStoreId);
          loadedVideos = data || [];
        }

        if (!isMounted) return;

        if (loadedVideos && loadedVideos.length > 0) {
          const formatted: VideoItem[] = loadedVideos.map((item: any) => ({
            id: String(item.id),
            title: item.title || item.name || 'Vídeo sem título',
            video_url: item.video_url || item.url || item.file_url || '',
            thumbnail_url: item.thumbnail_url || item.thumb_url || item.poster_url || '',
            duration: Number(item.duration) || 15,
          }));

          setVideos(formatted);
          setSelectedVideoId(formatted[0].id);
        } else {
          setVideos([]);
          setSelectedVideoId('');
        }
      } catch (err) {
        console.error('Erro ao carregar vídeos para retenção:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTenantVideos();

    return () => {
      isMounted = false;
    };
  }, [tenantStoreId]);

  // Vídeo selecionado
  const selectedVideo = useMemo(() => {
    return videos.find((v) => v.id === selectedVideoId) || videos[0] || null;
  }, [videos, selectedVideoId]);

  // 2. Carregar estatísticas e curva do vídeo selecionado
  useEffect(() => {
    let isMounted = true;

    async function loadVideoStats() {
      if (!selectedVideo) return;

      try {
        const candidate =
          tenantStoreId ||
          localStorage.getItem('vidlytics_selected_store_id') ||
          localStorage.getItem('current_store_id') ||
          '';
        const safeStoreId = await resolveStoreId(candidate || undefined);

        const duration = Math.max(5, Math.min(120, selectedVideo.duration || 15));

let query = supabase
  .from('store_activity_events')
  .select('event_type, metadata, session_id, watch_second, created_at')
  .eq('video_id', selectedVideo.id);

if (safeStoreId) {
  query = query.eq('store_id', safeStoreId);
}

const { data: eventsData, error: eventsError } = await query;

if (eventsError) {
  console.error('Erro ao buscar eventos de retenção:', eventsError);
}

const totalPlays =
  eventsData?.filter((m) => m.event_type === 'video_view').length || 0;
const totalCompletions =
  eventsData?.filter((m) => m.event_type === 'story_complete').length || 0;

const progressEvents = eventsData?.filter((m) => m.event_type === 'progress') || [];
const completionRate = totalPlays > 0 ? Math.round((totalCompletions / totalPlays) * 100) : 0;
const avgDuration = Math.round(duration * (completionRate / 100));
const percentageViewed = Math.round((avgDuration / duration) * 100);

let finalCurve: RetentionPoint[] = [];
let isRealData = false;

if (progressEvents.length > 0) {
  // Curva real: para cada segundo, conta quantas sessões distintas chegaram até ali
  const sessionsBySecond = new Map<number, Set<string>>();
  progressEvents.forEach((ev) => {
    const sec = ev.watch_second ?? 0;
    const sid = ev.session_id ?? 'unknown';
    if (!sessionsBySecond.has(sec)) sessionsBySecond.set(sec, new Set());
    sessionsBySecond.get(sec)!.add(sid);
  });

  const totalSessions = new Set(progressEvents.map((e) => e.session_id)).size || 1;

  for (let sec = 0; sec <= duration; sec++) {
    let reached = 0;
    sessionsBySecond.forEach((set, s) => {
      if (s >= sec) reached += set.size; // aproximação; refinar se necessário
    });
    const retention = Math.round((reached / totalSessions) * 100);
    finalCurve.push({ second: sec, retention: Math.max(0, Math.min(100, retention)) });
  }
  isRealData = true;
} else {
  // Fallback simulado — SEM dados reais de progresso ainda
  const signature = seededFactor(selectedVideo.id);
  const startRetention = 100;
  const endRetention = totalPlays > 0 ? Math.max(10, Math.min(95, completionRate)) : 60;
  for (let sec = 0; sec <= duration; sec++) {
    const progress = sec / duration;
    const decayRate = (1.1 - endRetention / 100) * 1.4 * signature;
    const decay = Math.exp(-progress * decayRate);
    const retention = Math.round(endRetention + (startRetention - endRetention) * decay);
    finalCurve.push({ second: sec, retention: Math.max(0, Math.min(100, retention)) });
  }
}

setVideoStats({
  completionRate,
  avgDuration,
  percentageViewed,
  skipsForward: Math.max(1, Math.round(totalPlays * 0.12)),
  rewinds: Math.max(1, Math.round(totalPlays * 0.05)),
  dropOffRate: Math.max(5, 100 - completionRate),
  dropOffCount: Math.round(totalPlays * 0.32),
  isRealData,
  curve: finalCurve,
});
      } catch (err) {
        console.error('Erro ao calcular estatísticas do vídeo:', err);
      }
    }

    loadVideoStats();

    return () => {
      isMounted = false;
    };
  }, [selectedVideo, tenantStoreId, timeRange, customFrom, customTo]);

  // Identificar ponto crítico de saída (maior queda na curva)
  const criticalDropSecond = useMemo(() => {
    if (!videoStats.curve || videoStats.curve.length < 2) return null;
    let maxDrop = 0;
    let dropSec = videoStats.curve[1].second;
    for (let i = 1; i < videoStats.curve.length; i++) {
      const drop = videoStats.curve[i - 1].retention - videoStats.curve[i].retention;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropSec = videoStats.curve[i].second;
      }
    }
    return dropSec;
  }, [videoStats.curve]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0091ff] border-t-transparent dark:border-[#ff7a29]" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <VideoIcon className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Nenhum vídeo cadastrado
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Adicione vídeos na Galeria ou crie seus Stories para visualizar a análise detalhada de retenção segundo a segundo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* CARDS DE RESUMO DE RETENÇÃO (do vídeo selecionado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Conclusão */}
        <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Taxa de Conclusão
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {videoStats.completionRate}%
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Assistiram até o último segundo
            </p>
          </CardContent>
        </Card>

        {/* Tempo Médio Assistido */}
        <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tempo Médio
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {videoStats.avgDuration}s
              </span>
              <span className="text-xs font-bold text-slate-400">
                de {selectedVideo?.duration || 15}s
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {videoStats.percentageViewed}% da duração total
            </p>
          </CardContent>
        </Card>

        {/* Ponto Crítico */}
        <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Maior Queda
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <TrendingDown size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {criticalDropSecond !== null ? `${criticalDropSecond}s` : '—'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Momento com maior evasão do público
            </p>
          </CardContent>
        </Card>

        {/* Evasão Total */}
        <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Taxa de Evasão
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <LogOut size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {videoStats.dropOffRate}%
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Saíram antes do final
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SELETOR DE VÍDEO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1a1f35] p-4 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 shadow-xs">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Vídeo Analisado
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Selecione qual vídeo você quer inspecionar
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <select
            value={selectedVideoId}
            onChange={(e) => setSelectedVideoId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-4 py-2.5 pr-10 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff] dark:focus:border-[#ff7a29] transition-colors cursor-pointer"
          >
            {videos.map((vid) => (
              <option key={vid.id} value={vid.id}>
                {vid.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* GRÁFICO SEGUNDO A SEGUNDO COM PLAYER SINCRONIZADO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva de Retenção */}
        <Card className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                Curva de Retenção (Segundo a Segundo)
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe onde a audiência perde o interesse ou onde fica engajada
              </p>
            </div>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Info size={16} className="text-slate-400 hover:text-slate-600" />
                </TooltipTrigger>
<TooltipContent>
  {isRealData
    ? 'Curva real calculada com base nos eventos de progresso coletados segundo a segundo pelo widget.'
    : 'Estimativa com base no completion rate — ainda não há dados granulares de progresso para este vídeo.'}
</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  key={selectedVideoId}
                  data={videoStats.curve}
                  onMouseMove={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      setHoveredSecond(e.activePayload[0].payload.second);
                    }
                  }}
                  onMouseLeave={() => setHoveredSecond(null)}
                >
                  <defs>
                    <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0091ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0091ff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis
                    dataKey="second"
                    tickFormatter={(val) => `${val}s`}
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <RechartsTooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111524] p-3 shadow-lg">
                            <p className="text-xs font-bold text-slate-500">
                              Segundo {payload[0].payload.second}s
                            </p>
                            <p className="text-sm font-black text-[#0091ff] dark:text-[#ff7a29]">
                              {payload[0].value}% assistindo
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {criticalDropSecond !== null && (
                    <ReferenceLine
                      x={criticalDropSecond}
                      stroke="#f43f5e"
                      strokeDasharray="3 3"
                      label={{
                        value: 'Gargalo',
                        fill: '#f43f5e',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="retention"
                    stroke="#0091ff"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#retentionGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Insight Automático com IA */}
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#0091ff]/5 dark:bg-[#ff7a29]/10 p-3.5 border border-[#0091ff]/20 dark:border-[#ff7a29]/20">
              <Sparkles className="mt-0.5 h-5 w-5 text-[#0091ff] dark:text-[#ff7a29] shrink-0" />
              <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Diagnóstico Inteligente: </span>
                {criticalDropSecond !== null && criticalDropSecond <= 4 ? (
                  <>O vídeo perde audiência rapidamente nos primeiros {criticalDropSecond} segundos. Considere encurtar a introdução ou adicionar um gancho visual mais chamativo no início.</>
                ) : (
                  <>Boa retenção inicial. A maior parte da audiência permaneceu além dos primeiros segundos de exibição.</>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player de Prévia */}
        <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35] flex flex-col">
          <CardHeader className="pb-2">
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              Visualização
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {selectedVideo?.title}
            </p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-black shadow-md">
              {selectedVideo?.video_url ? (
                <video
                  key={selectedVideoId}
                  src={selectedVideo.video_url}
                  poster={selectedVideo.thumbnail_url}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                />
              ) : selectedVideo?.thumbnail_url ? (
                <img
                  src={selectedVideo.thumbnail_url}
                  alt={selectedVideo.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-slate-500">
                  <VideoIcon size={32} className="mb-2 opacity-50" />
                  <span className="text-xs">Sem prévia de vídeo</span>
                </div>
              )}
            </div>

            {hoveredSecond !== null && (
              <div className="mt-3 text-center">
                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Visualizando ponto: {hoveredSecond}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
