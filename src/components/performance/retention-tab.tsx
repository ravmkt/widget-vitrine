import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTenant } from '@/context/TenantContext';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, SkipForward, Rewind, XCircle, Clock } from 'lucide-react';

interface RetentionPoint {
  percentual: string;
  espectadores: number;
  taxa: number;
}

interface VideoRetention {
  video_id: string;
  title: string;
  thumbnail_url: string;
  retention: RetentionPoint[];
  pulos: number;
  retrocessos: number;
  abandonos: number;
  tempoMedio: string;
  taxaConclusao: number;
}

type Props = {
  timeRange?: string;
  customFrom?: string;
  customTo?: string;
};

function generateMockRetention(videos: any[]): VideoRetention[] {
  return videos.map((v) => {
    const baseViewers = 50 + Math.floor(Math.random() * 200);
    const decay = 0.6 + Math.random() * 0.3;

    return {
      video_id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      retention: [
        { percentual: '25%', espectadores: baseViewers, taxa: 100 },
        { percentual: '50%', espectadores: Math.round(baseViewers * (0.75 + Math.random() * 0.2)), taxa: 0 },
        { percentual: '75%', espectadores: Math.round(baseViewers * (0.4 + Math.random() * 0.35)), taxa: 0 },
        { percentual: '100%', espectadores: Math.round(baseViewers * decay), taxa: 0 },
      ],
      pulos: Math.floor(Math.random() * 20),
      retrocessos: Math.floor(Math.random() * 10),
      abandonos: Math.round(baseViewers * (1 - decay)),
      tempoMedio: `${Math.floor(1 + Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      taxaConclusao: +(decay * 100).toFixed(1),
    };
  });
}

export function RetentionTab(_props: Props) {
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [retentions, setRetentions] = useState<VideoRetention[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('all');
  const [isDark, setIsDark] = useState(false);

  // Escuta ativa de tema para mudar os gradientes e textos do Recharts de forma dinâmica
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    checkTheme();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!storeId) return;
    const load = async () => {
      setLoading(true);
      try {
        const videos = await db.videos.getAll(storeId);
        const mock = generateMockRetention(videos);
        setRetentions(mock);
        if (mock.length > 0) setSelectedVideoId(mock[0].video_id);
      } catch (e) {
        console.error('Erro ao carregar retenção:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0091ff] dark:border-[#ff7a29]" />
      </div>
    );
  }

  const dataAgregada = retentions.length > 0
    ? (() => {
        const total = retentions.reduce((acc, r) => {
          r.retention.forEach((p, i) => {
            if (!acc[i]) acc[i] = { percentual: p.percentual, espectadores: 0, taxa: 0 };
            acc[i].espectadores += p.espectadores;
          });
          return acc;
        }, [] as { percentual: string; espectadores: number; taxa: number }[]);

        const max = total[0]?.espectadores || 1;
        return total.map(p => ({
          ...p,
          taxa: +((p.espectadores / max) * 100).toFixed(1),
        }));
      })()
    : [];

  const videoSelecionado = selectedVideoId === 'all'
    ? null
    : retentions.find(r => r.video_id === selectedVideoId);

  const dadosGrafico = selectedVideoId === 'all'
    ? dataAgregada.map(d => ({ percentual: d.percentual, espectadores: d.espectadores, taxa: d.taxa }))
    : (videoSelecionado?.retention || []).map((p, _, arr) => ({
        percentual: p.percentual,
        espectadores: p.espectadores,
        taxa: arr[0] ? +((p.espectadores / arr[0].espectadores) * 100).toFixed(1) : 0,
      }));

  const totalPulos = retentions.reduce((s, r) => s + r.pulos, 0);
  const totalRetrocessos = retentions.reduce((s, r) => s + r.retrocessos, 0);
  const totalAbandonos = retentions.reduce((s, r) => s + r.abandonos, 0);
  const taxaConclusaoMedia = retentions.length > 0
    ? +(retentions.reduce((s, r) => s + r.taxaConclusao, 0) / retentions.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Cards resumo unificados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <RetentionCard
          icon={Clock}
          label="Taxa de Conclusão"
          value={`${taxaConclusaoMedia}%`}
        />
        <RetentionCard
          icon={SkipForward}
          label="Pulos p/ Frente"
          value={totalPulos.toLocaleString()}
        />
        <RetentionCard
          icon={Rewind}
          label="Retrocessos"
          value={totalRetrocessos.toLocaleString()}
        />
        <RetentionCard
          icon={XCircle}
          label="Abandonos"
          value={totalAbandonos.toLocaleString()}
        />
      </div>

      {/* Seletor de vídeo unificado */}
      <div className="flex items-center gap-4">
        <span className="text-[14px] font-black text-slate-700 dark:text-slate-350">
          Vídeo:
        </span>
        <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
          <SelectTrigger className="w-[280px] h-10 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#0091ff]/30 dark:focus:ring-[#ff7a29]/30 focus:border-[#0091ff] dark:focus:border-[#ff7a29]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 text-slate-800 dark:text-white rounded-2xl">
            <SelectItem value="all" className="text-xs font-bold cursor-pointer">
              📊 Todos os vídeos (agregado)
            </SelectItem>
            {retentions.map(r => (
              <SelectItem key={r.video_id} value={r.video_id} className="text-xs font-bold cursor-pointer">
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gráfico de retenção Dual-Theme */}
      <div className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl p-6 sm:p-8 shadow-xs">
        <h3 className="text-[18px] font-black text-slate-800 dark:text-white mb-8">
          Curva de Retenção — {selectedVideoId === 'all' ? 'Todos os Vídeos' : videoSelecionado?.title}
        </h3>
        <div className="h-[340px] w-full">
          {dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} barSize={60}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#ff7a29' : '#0091ff'} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={isDark ? '#ff7a29' : '#0091ff'} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(148, 163, 184, 0.12)'} />
                <XAxis
                  dataKey="percentual"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94A3B8' : '#64748b', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94A3B8' : '#64748b', fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 145, 255, 0.02)', radius: 8 }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-[#171c30] border border-slate-200 dark:border-[#ff7a29]/30 p-3.5 rounded-2xl shadow-md dark:shadow-xl text-left min-w-[160px] backdrop-blur-md">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                            Ponto: {data.percentual}
                          </p>
                          <div className="space-y-1.5 text-slate-800 dark:text-white">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Espectadores:</span>
                              <span className="text-xs font-black">
                                {data.espectadores?.toLocaleString()}
                              </span>
                            </div>
                            {data.taxa !== undefined && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Retenção:</span>
                                <span className="text-xs font-black text-[#0091ff] dark:text-[#ff7a29]">
                                  {data.taxa}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="espectadores" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Espectadores" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Tabela de retenção unificada */}
      <div className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl p-6 sm:p-8 shadow-xs">
        <h3 className="text-[18px] font-black text-slate-800 dark:text-white mb-8">
          Retenção por Vídeo
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#ff7a29]/20">
                <th className="pb-4 text-left text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Vídeo</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">25%</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">50%</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">75%</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">100%</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">⏭️ Pulos</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">⏮️ Retro.</th>
                <th className="pb-4 text-center text-[11px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">🚫 Aband.</th>
              </tr>
            </thead>
            <tbody>
              {retentions.map(r => (
                <tr key={r.video_id} className="border-b border-slate-100 dark:border-[#ff7a29]/10 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 pr-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-white/5">
                        {r.thumbnail_url && (
                          <img src={r.thumbnail_url} alt={r.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="text-sm font-black text-slate-800 dark:text-white truncate max-w-[140px]">
                        {r.title}
                      </span>
                    </div>
                  </td>
                  {r.retention.map(p => (
                    <td key={p.percentual} className="py-4 text-center">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        {p.espectadores}
                      </span>
                    </td>
                  ))}
                  <td className="py-4 text-center">
                    <span className="text-sm font-bold text-[#0091ff] dark:text-amber-500">{r.pulos}</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{r.retrocessos}</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className="text-sm font-bold text-rose-500">{r.abandonos}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const RetentionCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => {
  return (
    <div className="bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#0091ff]/50 dark:hover:border-[#ff7a29]/60 transition-all duration-300 group flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        {/* Quadrado do Ícone Premium Ampliado para 45px */}
        <div className="w-[45px] h-[45px] rounded-2xl flex items-center justify-center bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/20 text-[#0091ff] dark:text-[#ff7a29] transition-transform duration-300 group-hover:scale-110 shrink-0">
          <Icon className="w-[22px] h-[22px] stroke-[2.5]" />
        </div>
      </div>
      <div>
        <p className="text-[14px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
          {value}
        </h3>
      </div>
    </div>
  );
};
