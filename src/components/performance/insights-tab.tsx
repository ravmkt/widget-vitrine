import React, { useEffect, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { db } from '@/lib/db';
import {
  getDashboardMetrics,
  getVideoMetricsRows,
  type AnalyticsInterval,
} from '@/lib/analytics';
import { getSectorBenchmark } from '@/lib/services/metrics-service';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  ArrowRight,
  Zap,
  Target,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ──────────────────────────────────────────────────

interface InsightCard {
  id: string;
  type: 'praise' | 'suggestion' | 'alert';
  category: string;
  title: string;
  description: string;
  action: string;
  icon: React.ElementType;
}

type Props = {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
};

// ─── Motor de regras ────────────────────────────────────────

function generateInsights(
  metrics: any,
  topVideos: any[],
  benchmarks: any[],
  videos: any[]
): InsightCard[] {
  const insights: InsightCard[] = [];
  const getBench = (key: string) => benchmarks.find(b => b.metric_key === key);

  // ── Praises (elogios) ──
  const ctrBench = getBench('video_ctr');
  if (ctrBench && metrics.ctr > ctrBench.value_high) {
    insights.push({
      id: 'praise-ctr',
      type: 'praise',
      category: 'CTR',
      title: 'CTR acima da média do mercado',
      description: `Seu CTR de ${metrics.ctr.toFixed(1)}% está acima do topo do setor (${ctrBench.value_high}%). Seus vídeos estão chamando atenção!`,
      action: 'Continue otimizando thumbnails e hooks iniciais.',
      icon: TrendingUp,
    });
  }

  const convBench = getBench('conversion_rate');
  if (convBench && metrics.conversions > 0 && metrics.views > 0) {
    const convRate = (metrics.conversions / metrics.views) * 100;
    if (convRate > convBench.value_high) {
      insights.push({
        id: 'praise-conv',
        type: 'praise',
        category: 'Conversão',
        title: 'Taxa de conversão excelente',
        description: `Sua taxa de ${convRate.toFixed(1)}% supera o topo do mercado (${convBench.value_high}%).`,
        action: 'Replique as estratégias de CTA dos seus melhores vídeos.',
        icon: Target,
      });
    }
  }

  // ── Alerts (alertas) ──
  if (ctrBench && metrics.ctr < ctrBench.value_low && metrics.views > 10) {
    insights.push({
      id: 'alert-ctr',
      type: 'alert',
      category: 'CTR',
      title: 'CTR abaixo da média do mercado',
      description: `Seu CTR de ${metrics.ctr.toFixed(1)}% está abaixo da faixa baixa do setor (${ctrBench.value_low}%).`,
      action: 'Avalie ajustar o hook inicial dos vídeos e testar thumbnails mais atrativas.',
      icon: AlertTriangle,
    });
  }

  const engBench = getBench('engagement_rate');
  if (engBench && metrics.views > 0) {
    const engRate = ((metrics.likes + metrics.comments + metrics.shares) / metrics.views) * 100;
    if (engRate < engBench.value_low) {
      insights.push({
        id: 'alert-eng',
        type: 'alert',
        category: 'Engajamento',
        title: 'Engajamento baixo',
        description: `Taxa de engajamento de ${engRate.toFixed(1)}% — abaixo da média do setor (${engBench.value_low}%).`,
        action: 'Inclua chamadas para curtir e comentar durante o vídeo.',
        icon: AlertTriangle,
      });
    }
  }

  // ── Suggestions (sugestões) ──
  if (topVideos.length >= 2) {
    const best = topVideos[0];
    const worst = topVideos[topVideos.length - 1];
    if (best.metrics.views > worst.metrics.views * 3) {
      insights.push({
        id: 'sug-best',
        type: 'suggestion',
        category: 'Conteúdo',
        title: `"${best.title}" é seu destaque`,
        description: `Este vídeo tem ${best.metrics.views} views — ${Math.round(best.metrics.views / Math.max(worst.metrics.views, 1))}× mais que "${worst.title}".`,
        action: 'Produza mais conteúdos no mesmo formato e tema deste vídeo.',
        icon: Zap,
      });
    }
  }

  // Vídeos sem conversão
  const noConvVideos = topVideos.filter(v => v.metrics.conversion_count === 0 && v.metrics.views > 5);
  if (noConvVideos.length > 0) {
    insights.push({
      id: 'sug-no-conv',
      type: 'suggestion',
      category: 'Conversão',
      title: `${noConvVideos.length} vídeo(s) sem conversão`,
      description: 'Alguns vídeos têm visualizações mas nenhuma conversão registrada.',
      action: 'Verifique se o CTA e o produto vinculado estão configurados corretamente.',
      icon: Target,
    });
  }

  // Vídeos com alto engajamento mas baixa conversão
  const highEngLowConv = topVideos.filter(
    v => v.metrics.engagement_rate > 10 && v.metrics.conversion_count === 0 && v.metrics.views > 5
  );
  if (highEngLowConv.length > 0) {
    insights.push({
      id: 'sug-eng-no-conv',
      type: 'suggestion',
      category: 'Conversão',
      title: 'Alto engajamento, baixa conversão',
      description: `${highEngLowConv.length} vídeo(s) com bom engajamento mas sem conversão.`,
      action: 'Adicione um CTA mais direto nos momentos de pico de atenção.',
      icon: Lightbulb,
    });
  }

  // Feedback sobre volume de vídeos
  if (videos.length <= 2) {
    insights.push({
      id: 'sug-more-videos',
      type: 'suggestion',
      category: 'Volume',
      title: 'Catálogo de vídeos pequeno',
      description: `Você tem apenas ${videos.length} vídeos ativos. Um catálogo maior gera mais oportunidades de conversão.`,
      action: 'Adicione novos vídeos regularmente — ideal mínimo de 5-10 vídeos.',
      icon: Video,
    });
  }

  // WhatsApp performance
  const waBench = getBench('ctr_whatsapp');
  if (waBench && metrics.whatsappClicks > 0 && metrics.views > 0) {
    const waRate = (metrics.whatsappClicks / metrics.views) * 100;
    if (waRate > waBench.value_high) {
      insights.push({
        id: 'praise-wa',
        type: 'praise',
        category: 'WhatsApp',
        title: 'WhatsApp performando bem',
        description: `CTR do WhatsApp de ${waRate.toFixed(1)}% — acima da média do setor.`,
        action: 'Mantenha o número visível e mensagens claras.',
        icon: ThumbsUp,
      });
    }
  }

  // Ordenar: alerts primeiro, depois sugestões, depois praises
  const order = { alert: 0, suggestion: 1, praise: 2 };
  return insights.sort((a, b) => order[a.type] - order[b.type]);
}

// ─── Componente ─────────────────────────────────────────────

export function InsightsTab({ timeRange, customFrom, customTo }: Props) {
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightCard[]>([]);

  useEffect(() => {
    if (!storeId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const interval: AnalyticsInterval =
          timeRange === '7d' ? '7' : timeRange === '15d' || timeRange === '30d' ? '30' : '30';
        const customRange = {
          from: customFrom ? new Date(customFrom) : undefined,
          to: customTo ? new Date(customTo) : undefined,
        };

        const [dashMetrics, videos, benchRows] = await Promise.all([
          getDashboardMetrics(storeId, interval, customRange),
          db.videos.getAll(storeId),
          getSectorBenchmark(storeId),
        ]);

        if (!mounted) return;

        const rows = await getVideoMetricsRows(storeId, videos, interval, customRange);
        if (!mounted) return;

        const sortedVideos = [...rows].sort((a, b) => b.metrics.views - a.metrics.views);
        const insightsList = generateInsights(dashMetrics, sortedVideos, benchRows || [], videos);
        setInsights(insightsList);
      } catch (e) {
        console.error('Erro ao gerar insights:', e);
        setInsights([]);
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

  const typeConfig = {
    praise: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300',
      label: 'Destaque',
    },
    suggestion: {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300',
      label: 'Sugestão',
    },
    alert: {
      bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300',
      label: 'Atenção',
    },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/30">
          <Lightbulb size={20} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            Insights & Recomendações
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Análise inteligente baseada nos seus dados
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-16 text-center">
          <Lightbulb size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-black text-slate-500 dark:text-slate-400 mb-2">
            Nenhum insight no momento
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-md mx-auto">
            Continue usando a plataforma. Assim que tivermos dados suficientes, geraremos recomendações personalizadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {insights.map(insight => {
            const config = typeConfig[insight.type];
            const Icon = insight.icon;

            return (
              <div
                key={insight.id}
                className={cn(
                  'rounded-[2rem] border p-8 transition-all hover:shadow-lg',
                  config.bg
                )}
              >
                <div className="flex items-start gap-5">
                  <div className={cn('p-3 rounded-2xl shrink-0', config.badge)}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn('text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider', config.badge)}>
                        {config.label}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {insight.category}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-3">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0094EB] dark:text-blue-400">
                      <ArrowRight size={14} />
                      <span>{insight.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
