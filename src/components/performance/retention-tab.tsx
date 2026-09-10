import React, { useState, useMemo, useRef } from 'react';
import {
  Clock,
  FastForward,
  RotateCcw,
  LogOut,
  Info,
  Play,
  Pause,
  Sparkles,
  TrendingDown,
  Flame,
  CheckCircle2,
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
import { cn } from '@/lib/utils';

type Props = {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
};

interface VideoRetentionData {
  id: string;
  title: string;
  duration: number; // segundos
  videoUrl?: string;
  thumbnailUrl?: string;
  completionRate: number; // %
  avgDuration: number; // segundos
  percentageViewed: number; // %
  skipsForward: number;
  rewinds: number;
  dropOffs: number;
  curve: { second: number; retention: number }[]; // pontos segundo a segundo
}

export function RetentionTab({ timeRange, customFrom, customTo }: Props) {
  // Simulação / Integração de vídeos de teste (conectável ao Supabase/db)
  const mockVideos: VideoRetentionData[] = useMemo(() => [
    {
      id: '1',
      title: 'oculos-de-sol.mp4',
      duration: 31,
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60',
      completionRate: 68,
      avgDuration: 22,
      percentageViewed: 73.0,
      skipsForward: 4,
      rewinds: 13,
      dropOffs: 109,
      curve: [
        { second: 0, retention: 100 },
        { second: 3, retention: 94 },
        { second: 6, retention: 89 },
        { second: 10, retention: 84 },
        { second: 14, retention: 80 },
        { second: 16, retention: 76 },
        { second: 20, retention: 72 },
        { second: 24, retention: 68 },
        { second: 28, retention: 64 },
        { second: 31, retention: 61 },
      ],
    },
    {
      id: '2',
      title: 'relogio-elegance-ouro.mp4',
      duration: 25,
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=60',
      completionRate: 74,
      avgDuration: 19,
      percentageViewed: 78.5,
      skipsForward: 2,
      rewinds: 21,
      dropOffs: 54,
      curve: [
        { second: 0, retention: 100 },
        { second: 2, retention: 98 },
        { second: 5, retention: 92 },
        { second: 10, retention: 88 },
        { second: 15, retention: 82 },
        { second: 20, retention: 77 },
        { second: 25, retention: 74 },
      ],
    },
  ], []);

  const [selectedVideoId, setSelectedVideoId] = useState<string>(mockVideos[0]?.id || '');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredSecond, setHoveredSecond] = useState<number | null>(null);

  const selectedVideo = useMemo(
    () => mockVideos.find((v) => v.id === selectedVideoId) || mockVideos[0],
    [mockVideos, selectedVideoId]
  );

  // Formatação de minutos e segundos
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Médias e somatórios gerais para os cards superiores
  const generalCards = useMemo(() => {
    const totalV = mockVideos.length || 1;
    const avgCompletion = Math.round(
      mockVideos.reduce((acc, v) => acc + v.completionRate, 0) / totalV
    );
    const avgDurationTotal = Math.round(
      mockVideos.reduce((acc, v) => acc + v.avgDuration, 0) / totalV
    );
    const totalSkips = mockVideos.reduce((acc, v) => acc + v.skipsForward, 0);
    const totalRewinds = mockVideos.reduce((acc, v) => acc + v.rewinds, 0);
    const totalDropOffs = mockVideos.reduce((acc, v) => acc + v.dropOffs, 0);

    return {
      avgCompletion,
      avgDurationTotal,
      totalSkips,
      totalRewinds,
      totalDropOffs,
    };
  }, [mockVideos]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 animate-fade-in font-sans">
        {/* ══════════════════════════════════════════════════════════════════
            1. CARDS SUPERIORES DE RETENÇÃO (PADRÃO VISÃO GERAL)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Taxa de Conclusão */}
          <Card className="rounded-[1.6rem] border border-blue-200/60 dark:border-blue-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Taxa de Conclusão
                </span>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-blue-500 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl space-y-1">
                    <p className="font-bold text-blue-400">Taxa de Conclusão</p>
                    <p className="text-slate-300">Porcentagem de espectadores que assistiram ao vídeo até o último segundo.</p>
                    <p className="text-slate-100 font-medium">💡 Vídeos com até 20s têm uma taxa de conclusão 40% superior.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {generalCards.avgCompletion}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Média geral de retenção total
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Tempo Médio de Visualização */}
          <Card className="rounded-[1.6rem] border border-emerald-200/60 dark:border-emerald-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tempo Médio Assistido
                </span>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-emerald-500 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl space-y-1">
                    <p className="font-bold text-emerald-400">Tempo Médio Assistido</p>
                    <p className="text-slate-300">Quantidade de tempo em segundos que o usuário assiste antes de sair ou avançar.</p>
                    <p className="text-slate-100 font-medium">💡 Insira seu produto em uso nos primeiros 3 segundos para reter atenção.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Flame size={20} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatTime(generalCards.avgDurationTotal)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tempo de atenção contínua
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Pulos vs Retrocessos (Grid 50% / 50%) */}
          <Card className="rounded-[1.6rem] border border-purple-200/60 dark:border-purple-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Navegação do Usuário
                </span>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-purple-500 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl space-y-1">
                    <p className="font-bold text-purple-400">Pulos e Replays</p>
                    <p className="text-slate-300">Pulos indicam pressa ou desinteresse; retrocessos indicam interesse em rever detalhes.</p>
                    <p className="text-slate-100 font-medium">💡 Muitos retrocessos revelam detalhes do produto que chamaram muita atenção.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FastForward size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 items-center divide-x divide-slate-100 dark:divide-white/10 mt-0.5">
                <div className="pr-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {generalCards.totalSkips}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Pulos p/ Frente</span>
                </div>
                <div className="pl-4">
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {generalCards.totalRewinds}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Retrocessos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Abandonos / Drop-offs */}
          <Card className="rounded-[1.6rem] border border-rose-200/60 dark:border-rose-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Abandonos
                </span>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-slate-400 hover:text-rose-500 cursor-pointer">
                      <Info size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl space-y-1">
                    <p className="font-bold text-rose-400">Total de Abandonos</p>
                    <p className="text-slate-300">Número de usuários que fecharam o story antes de terminar.</p>
                    <p className="text-slate-100 font-medium">💡 Se mais de 30% saem nos primeiros 2s, melhore a capa ou o gancho inicial.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <LogOut size={20} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-500">
                {generalCards.totalDropOffs}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Saídas prematuras do player
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2. SELETOR DE VÍDEO PREMIUM
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vídeo Selecionado:
            </label>
            <div className="relative">
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0091ff]/30 focus:border-[#0091ff] dark:focus:ring-[#ff7a29]/30 dark:focus:border-[#ff7a29] transition-all"
              >
                {mockVideos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({formatTime(v.duration)})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interesse no seu conteúdo · Desde a publicação</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. ÁREA YOUTUBE STUDIO: MOMENTOS IMPORTANTES DE RETENÇÃO
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 rounded-3xl p-6 lg:p-8 shadow-xs">
          {/* Título & Subtítulo */}
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles size={18} className="text-[#0091ff] dark:text-[#ff7a29]" />
              Momentos importantes da retenção de público
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Descubra em que segundo os clientes perdem ou ganham interesse para otimizar suas ofertas e chamadas.
            </p>
          </div>

          {/* Grid Principal: Métricas do Vídeo + Mini Player */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-b border-slate-100 dark:border-white/10 pb-6 mb-6">
            {/* Lado Esquerdo: Estatísticas do Vídeo Específico */}
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Duração média da visualização
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {formatTime(selectedVideo.avgDuration)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    de {formatTime(selectedVideo.duration)} total
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Porcentagem visualizada média
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-[#0091ff] dark:text-[#ff7a29]">
                    {selectedVideo.percentageViewed.toFixed(1).replace('.', ',')}%
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> Ótimo desempenho
                  </span>
                </div>
              </div>

              {/* Destaques de Momentos */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0091ff] dark:bg-[#ff7a29]" />
                  <span>Este vídeo</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>Retenção típica (Benchmark)</span>
                </div>
              </div>
            </div>

            {/* Lado Direito: Player de Vídeo Mockup com Proporção 16:9 / 9:16 */}
            <div className="flex justify-center md:justify-end">
              <div className="relative w-full max-w-[320px] aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex items-center justify-center group">
                {selectedVideo.thumbnailUrl ? (
                  <img
                    src={selectedVideo.thumbnailUrl}
                    alt={selectedVideo.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900" />
                )}

                {/* Botão Play / Overlay */}
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>

                {/* Barra de controle inferior sincronizada */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-6 flex items-center justify-between text-white text-[11px] font-mono">
                  <span>{formatTime(hoveredSecond ?? selectedVideo.avgDuration)} / {formatTime(selectedVideo.duration)}</span>
                  <span className="text-[10px] text-slate-300 uppercase tracking-widest font-sans font-bold">Preview</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              4. GRÁFICO DA CURVA DE RETENÇÃO (00:00 até o final)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="h-[260px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={selectedVideo.curve}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e.activePayload && e.activePayload.length > 0) {
                    setHoveredSecond(e.activePayload[0].payload.second);
                  }
                }}
                onMouseLeave={() => setHoveredSecond(null)}
              >
                <defs>
                  <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0091ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0091ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                  className="dark:stroke-slate-800"
                />
                <XAxis
                  dataKey="second"
                  tickFormatter={(val) => formatTime(val)}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1', className: 'dark:stroke-slate-800' }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 33, 66, 100]}
                  tickFormatter={(val) => `${val}%`}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip content={<CustomRetentionTooltip />} />
                
                {/* Linha de referência da média */}
                <ReferenceLine
                  y={50}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  opacity={0.5}
                />

                <Area
                  type="monotone"
                  dataKey="retention"
                  name="Retenção"
                  stroke="#0091ff"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#retentionGradient)"
                  activeDot={{
                    r: 6,
                    fill: '#0091ff',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dica de Análise do Momento Crítico */}
          <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 flex items-start gap-3">
            <TrendingDown size={18} className="text-[#0091ff] dark:text-[#ff7a29] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-bold block mb-0.5">
                Ponto de Análise: Os Primeiros 3 Segundos
              </strong>
              94% dos usuários continuam assistindo após os 3 primeiros segundos. Isso significa que o gancho do story está chamativo e converte a atenção do visitante imediatamente.
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Tooltip interativo do gráfico mostrando o tempo e a porcentagem
function CustomRetentionTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-xs">
        <p className="font-mono text-blue-400 font-bold">{formatTime(data.second)}</p>
        <p className="text-sm font-black mt-0.5">{data.retention}% de público</p>
      </div>
    );
  }
  return null;
}
