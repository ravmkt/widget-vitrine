import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  CheckCircle2,
  DollarSign,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { db } from '@/lib/db';
import {
  getDashboardMetrics,
  getMetricsFlow,
  getVideoMetricsRows,
  type AnalyticsInterval,
} from '@/lib/analytics';
import { getSectorBenchmark } from '@/lib/services/metrics-service';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Tipos ──────────────────────────────────────────────────

type Props = {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
};

interface DailyMetricPoint {
  date: string;
  value: number;
}

interface BenchmarkRow {
  metric_key: string;
  metric_label: string;
  value_low: number;
  value_mid: number;
  value_high: number;
  unit: string;
}

// ─── Config do seletor de métricas ──────────────────────────

const METRIC_OPTIONS = [
  { key: 'views',           label: 'Visualizações',           isRate: false },
  { key: 'likes',           label: 'Curtidas',                isRate: false },
  { key: 'ctr',             label: 'CTR',                     isRate: true  },
  { key: 'comments',        label: 'Comentários',             isRate: false },
  { key: 'shares',          label: 'Compartilhamentos',       isRate: false },
  { key: 'whatsapp_clicks', label: 'Cliques WhatsApp',        isRate: false },
  { key: 'cta_clicks',      label: 'Total de Cliques (CTA)',  isRate: false }, // 🟢 corrigido: label mais claro
  { key: 'conversions',     label: 'Conversões',              isRate: false },
  { key: 'revenue',         label: 'Receita',                 isRate: false },
] as const;

// ─── Mapeamento métrica → benchmark ─────────────────────────

const METRIC_TO_BENCHMARK: Record<string, string> = {
  ctr:             'video_ctr',
  cta_clicks:      'video_ctr',
  whatsapp_clicks: 'ctr_whatsapp',
  conversions:     'conversion_rate',
  likes:           'engagement_rate',
  comments:        'engagement_rate',
  shares:          'engagement_rate',
};

// ─── Helpers ────────────────────────────────────────────────

const mapInterval = (timeRange: string): AnalyticsInterval => {
  if (timeRange === '7d') return '7';
  if (timeRange === '30d' || timeRange === '15d') return '30';
  if (timeRange === 'custom') return 'custom';
  return '30';
};

const getDiasNoPeriodo = (timeRange: string, customFrom?: string, customTo?: string): number => {
  if (timeRange === 'custom' && customFrom && customTo) {
    const diff = new Date(customTo).getTime() - new Date(customFrom).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  }
  if (timeRange === '7d') return 7;
  if (timeRange === '15d') return 15;
  return 30;
};

// ─── Componente principal ───────────────────────────────────

export function OverviewTab({ timeRange, customFrom, customTo }: Props) {
  const { storeId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    views: 0, plays: 0, pauses: 0, clicks: 0, ctaClicks: 0,
    productClicks: 0, whatsappClicks: 0, likes: 0, shares: 0,
    comments: 0, closes: 0, conversions: 0, ctr: 0, revenue: 0,
  });
  const [flow, setFlow] = useState<any[]>([]);
  const [topVideos, setTopVideos] = useState<any[]>([]);

  // ── Estados para gráfico e benchmarks ──
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [dailyData, setDailyData] = useState<Record<string, DailyMetricPoint[]>>({});
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [avgDailyViews, setAvgDailyViews] = useState(0);

  // 🆕 estado para erro nos dados diários (correção #2)
  const [dailyError, setDailyError] = useState(false);

  // ── Computar datas do período ──
  const getDateRange = useCallback(() => {
    const now = new Date();

    // 🟢 correção #3: custom sem datas → usar fallback claro
    if (timeRange === 'custom') {
      if (!customFrom || !customTo) {
        // Retorna intervalo de 30 dias como fallback seguro,
        // mas o loader só será exibido se houver storeId e a UI
        // abaixo mostrará aviso de "selecione as datas"
        const from = new Date(now.getTime() - 30 * 86400000);
        return { fromISO: from.toISOString(), toISO: now.toISOString(), datasInvalidas: true };
      }
      return {
        fromISO: new Date(customFrom).toISOString(),
        toISO: new Date(customTo).toISOString(),
        datasInvalidas: false,
      };
    }

    const days = timeRange === '7d' ? 7 : timeRange === '15d' ? 15 : 30;
    const from = new Date(now.getTime() - days * 86400000);
    return { fromISO: from.toISOString(), toISO: now.toISOString(), datasInvalidas: false };
  }, [timeRange, customFrom, customTo]);

  // ── LOAD ──
  useEffect(() => {
    if (!storeId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setDailyError(false); // 🆕 reset
      try {
        const interval = mapInterval(timeRange);

        // 🟢 correção #1: só monta customRange se for custom com datas reais
        const isCustomWithDates = timeRange === 'custom' && Boolean(customFrom) && Boolean(customTo);
        const customRange = isCustomWithDates
          ? { from: new Date(customFrom!), to: new Date(customTo!) }
          : undefined;

        const { fromISO, toISO } = getDateRange();

        const [dashMetrics, flowRows, videos, benchRows] = await Promise.all([
          getDashboardMetrics(storeId, interval, customRange),
          getMetricsFlow(storeId, interval, customRange),
          db.videos.getAll(storeId),
          getSectorBenchmark(storeId),
        ]);

        if (!mounted) return;

        setMetrics(dashMetrics);
        setFlow(flowRows);
        setBenchmarks(benchRows || []);

        const rows = await getVideoMetricsRows(storeId, videos, interval, customRange);
        if (!mounted) return;

        setTopVideos(
          [...rows].sort((a, b) => b.metrics.views - a.metrics.views).slice(0, 5)
        );

        // ── Dados diários (Supabase) ──
        // 🟢 correção #2: try/catch com fallback visível
        if (supabase) {
          try {
            const [{ data: metricRows }, { data: convRows }] = await Promise.all([
              supabase
                .from('metrics')
                .select('created_at, event_name')
                .eq('store_id', storeId)
                .gte('created_at', fromISO)
                .lte('created_at', toISO),
              supabase
                .from('conversions')
                .select('created_at, order_value')
                .eq('store_id', storeId)
                .gte('created_at', fromISO)
                .lte('created_at', toISO),
            ]);

            if (!mounted) return;

            // Agrupar por dia + event_name
            const dayMap: Record<string, Record<string, number>> = {};
            for (const row of metricRows || []) {
              const day = row.created_at.slice(0, 10);
              if (!dayMap[day]) dayMap[day] = {};
              dayMap[day][row.event_name] = (dayMap[day][row.event_name] || 0) + 1;
            }

            // Agrupar conversões por dia
            const convDayMap: Record<string, { count: number; revenue: number }> = {};
            for (const row of convRows || []) {
              const day = row.created_at.slice(0, 10);
              if (!convDayMap[day]) convDayMap[day] = { count: 0, revenue: 0 };
              convDayMap[day].count++;
              convDayMap[day].revenue += row.order_value || 0;
            }

            // Pivotar por métrica
            const sortedDays = Object.keys(dayMap).sort();
            const daily: Record<string, DailyMetricPoint[]> = {
              views:           sortedDays.map(d => ({ date: d, value: dayMap[d]?.play || 0 })),
              likes:           sortedDays.map(d => ({ date: d, value: dayMap[d]?.like || 0 })),
              comments:        sortedDays.map(d => ({ date: d, value: (dayMap[d]?.comment || 0) + (dayMap[d]?.comment_open || 0) })),
              shares:          sortedDays.map(d => ({ date: d, value: dayMap[d]?.share || 0 })),
              whatsapp_clicks: sortedDays.map(d => ({ date: d, value: dayMap[d]?.whatsapp_click || 0 })),
              // 🟢 correção #5: comentário documentando que cta_clicks inclui whatsapp + product
              cta_clicks:      sortedDays.map(d => ({ date: d, value: (dayMap[d]?.whatsapp_click || 0) + (dayMap[d]?.product_click || 0) })),
              conversions:     sortedDays.map(d => ({ date: d, value: convDayMap[d]?.count || 0 })),
              revenue:         sortedDays.map(d => ({ date: d, value: +(convDayMap[d]?.revenue || 0).toFixed(2) })),
              ctr:             sortedDays.map(d => {
                const v = dayMap[d]?.play || 0;
                const c = (dayMap[d]?.whatsapp_click || 0) + (dayMap[d]?.product_click || 0);
                return { date: d, value: v > 0 ? +((c / v) * 100).toFixed(1) : 0 };
              }),
            };

            setDailyData(daily);
            setDailyError(false);

            const totalViews = sortedDays.reduce((s, d) => s + (dayMap[d]?.play || 0), 0);

            // 🟢 correção #6: fallback se sortedDays estiver vazio
            if (sortedDays.length > 0) {
              setAvgDailyViews(Math.round(totalViews / sortedDays.length));
            } else {
              const dias = getDiasNoPeriodo(timeRange, customFrom, customTo);
              setAvgDailyViews(dias > 0 ? Math.round(metrics.views / dias) : 0);
            }
          } catch (supabaseErr) {
            console.error('Erro ao buscar dados diários do Supabase:', supabaseErr);
            if (mounted) {
              setDailyError(true);
              // 🟢 correção #6: fallback usando métricas agregadas
              const dias = getDiasNoPeriodo(timeRange, customFrom, customTo);
              setAvgDailyViews(dias > 0 ? Math.round(metrics.views / dias) : 0);
            }
          }
        }
      } catch (e) {
        console.error('Erro ao carregar Overview:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [storeId, timeRange, customFrom, customTo, getDateRange]);
