import React, { useState } from 'react';
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

// ─── Tipos ──────────────────────────────────────────────────

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

// ─── Mock ───────────────────────────────────────────────────

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

// ─── Componente ─────────────────────────────────────────────

export function RetentionTab(_props: Props) {
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [retentions, setRetentions] = useState<VideoRetention[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('all');

  React.useEffect(() => {
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0094EB]" />
      </div>
    );
  }

  // ── Dados agregados (todos os vídeos) ──
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

  // ── Vídeo selecionado ──
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

  // ── Totais agregados ──
  const totalPulos = retentions.reduce((s, r) => s + r.pulos, 0);
  const totalRetrocessos = retentions.reduce((s, r) => s + r.retrocessos, 0);
  const totalAbandonos = retentions.reduce((s, r) => s + r.abandonos, 0);
  const taxaConclusaoMedia = retentions.length > 0
    ? +(retentions.reduce((s, r) => s + r.taxaConclusao, 0) / retentions.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Cards resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <RetentionCard
          icon={Clock}
          label="Taxa de Conclusão"
          value={`${taxaConclusaoMedia}%`}
          color="blue"
        />
        <RetentionCard
          icon={SkipForward}
          label="Pulos p/ Frente"
          value={totalPulos.toLocaleString()}
          color="amber"
        />
        <RetentionCard
          icon={Rewind}
          label="Retrocessos"
          value={totalRetrocessos.toLocaleString()}
          color="emerald"
        />
        <RetentionCard
          icon={XCircle}
          label="Abandonos"
          value={totalAbandonos.toLocaleString()}
          color="rose"
        />
      </div>

      {/* ── Seletor de vídeo ── */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-black text-slate-600 dark:text-slate-300">
          Vídeo:
        </span>
        <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
          <SelectTrigger className="w-[280px] h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs font-bold">
              📊 Todos os vídeos (agregado)
            </SelectItem>
            {retentions.map(r => (
              <SelectItem key={r.video_id} value={r.video_id} className="text-xs font-bold">
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Gráfico de retenção (funil) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8">
          Curva de Retenção — {selectedVideoId === 'all' ? 'Todos os Vídeos' : videoSelecionado?.title}
        </h3>
        <div className="h-[340px] w-full">
          {dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} barSize={60}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0094EB" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#0094EB" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="percentual"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    padding: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: number, name: string) => [
                    name === 'taxa'
                      ? `${val}%`
                      : val.toLocaleString(),
                    name === 'taxa' ? 'Retenção (%)' : 'Espectadores',
                  ]}
                />
                <Bar dataKey="espectadores" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Espectadores" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">
              Sem dados de retenção
            </div>
          )}
        </div>
      </div>

      {/* ── Tabela de retenção por vídeo ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-8">
          Retenção por Vídeo
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vídeo</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">25%</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">50%</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">75%</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">100%</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">⏭️ Pulos</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">⏮️ Retro.</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">🚫 Aband.</th>
              </tr>
            </thead>
            <tbody>
              {retentions.map(r => (
                <tr key={r.video_id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
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
                    <td key={p.percentual} className="py-4">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {p.espectadores}
                      </span>
                    </td>
                  ))}
                  <td className="py-4">
                    <span className="text-sm font-bold text-amber-600">{r.pulos}</span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm font-bold text-emerald-600">{r.retrocessos}</span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm font-bold text-rose-600">{r.abandonos}</span>
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

// ─── Card de retenção (Padronizado em Laranja #ff7a29) ───

const RetentionCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) => {
  return (
    <div className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2rem] p-6 shadow-sm hover:shadow-lg dark:hover:shadow-[0_8px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        {/* Quadrado do Ícone Padronizado: Laranja #ff7a29 com Ícone Branco */}
        <div 
          style={{ backgroundColor: '#ff7a29' }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(255,122,41,0.45)] transition-transform duration-300 group-hover:scale-110 shrink-0"
        >
          <Icon size={20} style={{ color: '#ffffff', stroke: '#ffffff' }} className="!text-white stroke-[2.5]" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1">
          {label}
        </p>
        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
      </div>
    </div>
  );
};