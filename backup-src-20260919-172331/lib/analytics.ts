import { endOfDay, startOfDay, subDays, format } from 'date-fns';
import { db, Video } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AnalyticsInterval = 'today' | '7' | '30' | 'custom';

export type AnalyticsDateRange = {
  start: Date;
  end: Date;
};

export type DashboardMetrics = {
  views: number;
  plays: number;        // ⚠️ Não rastreado no Sistema B — sempre 0
  pauses: number;        // ⚠️ Nunca existiu rastreamento — sempre 0
  clicks: number;         // ⚠️ Não rastreado — sempre 0
  ctaClicks: number;
  productClicks: number;
  whatsappClicks: number; // ⚠️ Indistinguível de ctaClicks hoje — sempre 0 (ver Prioridade 4)
  likes: number;
  shares: number;         // ⚠️ Não rastreado no Sistema B — sempre 0
  comments: number;
  closes: number;         // ⚠️ Nunca existiu — sempre 0
  conversions: number;
  ctr: number;
  revenue: number;
};

export type VideoMetricsRow = Video & {
  metrics: DashboardMetrics;
};

const getRange = (
  interval: AnalyticsInterval,
  customRange?: { from?: Date; to?: Date },
): AnalyticsDateRange => {
  const now = new Date();

  if (interval === 'today') return { start: startOfDay(now), end: endOfDay(now) };
  if (interval === '7') return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  if (interval === '30') return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };

  return {
    start: startOfDay(customRange?.from || subDays(now, 7)),
    end: endOfDay(customRange?.to || now),
  };
};

const zeroMetrics = (): DashboardMetrics => ({
  views: 0,
  plays: 0,
  pauses: 0,
  clicks: 0,
  ctaClicks: 0,
  productClicks: 0,
  whatsappClicks: 0,
  likes: 0,
  shares: 0,
  comments: 0,
  closes: 0,
  conversions: 0,
  ctr: 0,
  revenue: 0,
});

/* ══════════════════════════════════════════════════════════════
   NOVO: leitura de daily_store_metrics (Sistema B) — substitui
   a leitura direta de `metrics` (legada e congelada desde 16/08)
   ══════════════════════════════════════════════════════════════ */
type DailyStoreRow = {
  date: string;
  views_count: number;
  cta_clicks_count: number;
  product_clicks_count: number;
  estimated_revenue: number;
};

const getDailyStoreMetrics = async (
  storeId: string,
  range: AnalyticsDateRange,
): Promise<DailyStoreRow[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('daily_store_metrics')
      .select('date, views_count, cta_clicks_count, product_clicks_count, estimated_revenue')
      .eq('store_id', storeId)
      .gte('date', format(range.start, 'yyyy-MM-dd'))
      .lte('date', format(range.end, 'yyyy-MM-dd'));

    if (error || !data) return [];
    return data as DailyStoreRow[];
  } catch {
    return [];
  }
};

/* ══════════════════════════════════════════════════════════════
   NOVO: leitura de daily_video_metrics (Sistema B) — por vídeo.
   ⚠️ Esta tabela NÃO tem product_clicks_count nem estimated_revenue.
   ══════════════════════════════════════════════════════════════ */
type DailyVideoRow = {
  video_id: string;
  date: string;
  views_count: number;
  cta_clicks_count: number;
};

const getDailyVideoMetrics = async (
  storeId: string,
  videoIds: string[],
  range: AnalyticsDateRange,
): Promise<DailyVideoRow[]> => {
  if (!isSupabaseConfigured || !supabase || videoIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('daily_video_metrics')
      .select('video_id, date, views_count, cta_clicks_count')
      .eq('store_id', storeId)
      .in('video_id', videoIds)
      .gte('date', format(range.start, 'yyyy-MM-dd'))
      .lte('date', format(range.end, 'yyyy-MM-dd'));

    if (error || !data) return [];
    return data as DailyVideoRow[];
  } catch {
    return [];
  }
};

const sumStoreRows = (rows: DailyStoreRow[]): DashboardMetrics => {
  const totals = zeroMetrics();
  rows.forEach((r) => {
    totals.views += r.views_count || 0;
    totals.ctaClicks += r.cta_clicks_count || 0;
    totals.productClicks += r.product_clicks_count || 0;
    totals.revenue += Number(r.estimated_revenue) || 0;
  });

  const engagementClicks = totals.ctaClicks + totals.productClicks;
  totals.ctr = totals.views > 0
    ? Number(((engagementClicks / totals.views) * 100).toFixed(1))
    : 0;

  return totals;
};

/* ══════════════════════════════════════════════════════════════
   CONVERSÕES — inalterado (já lia a tabela certa)
   ══════════════════════════════════════════════════════════════ */
const getConversionData = async (
  storeId: string,
  range: AnalyticsDateRange,
): Promise<Record<string, { count: number; revenue: number }>> => {
  if (!isSupabaseConfigured || !supabase) return {};

  try {
    const videos = await db.videos.getAll(storeId);
    const videoIds = videos.map((v) => v.id);
    if (videoIds.length === 0) return {};

    const { data, error } = await supabase
      .from('conversions')
      .select('video_id, order_value, status, created_at')
      .in('video_id', videoIds)
      .eq('status', 'paid')
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());

    if (error || !data) return {};

    const result: Record<string, { count: number; revenue: number }> = {};
    data.forEach((row: any) => {
      const vid = row.video_id;
      if (!vid) return;
      if (!result[vid]) result[vid] = { count: 0, revenue: 0 };
      result[vid].count += 1;
      result[vid].revenue += Number(row.order_value) || 0;
    });
    return result;
  } catch {
    return {};
  }
};

/* ══════════════════════════════════════════════════════════════
   CURTIDAS — inalterado
   ══════════════════════════════════════════════════════════════ */
const getVideoLikeCounts = async (
  storeId: string,
  range: AnalyticsDateRange,
): Promise<Record<string, number>> => {
  if (!isSupabaseConfigured || !supabase) return {};

  try {
    const videos = await db.videos.getAll(storeId);
    const videoIds = videos.map((v) => v.id);
    if (videoIds.length === 0) return {};

    const { data, error } = await supabase
      .from('video_likes')
      .select('video_id')
      .in('video_id', videoIds)
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    data.forEach((row: any) => {
      const vid = row.video_id;
      if (vid) counts[vid] = (counts[vid] || 0) + 1;
    });

    return counts;
  } catch {
    return {};
  }
};

/* ══════════════════════════════════════════════════════════════
   COMENTÁRIOS — inalterado
   ══════════════════════════════════════════════════════════════ */
const getCommentCounts = async (
  storeId: string,
  range: AnalyticsDateRange,
): Promise<Record<string, number>> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[analytics] getCommentCounts: Supabase não configurado');
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('video_id')
      .eq('store_id', storeId)
      .eq('status', 'approved')
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());

    if (error) {
      console.error('[analytics] getCommentCounts erro:', error);
      return {};
    }

    if (!data) return {};

    const counts: Record<string, number> = {};
    data.forEach((row: any) => {
      const vid = row.video_id;
      if (vid) counts[vid] = (counts[vid] || 0) + 1;
    });
    return counts;
  } catch (err) {
    console.error('[analytics] getCommentCounts exception:', err);
    return {};
  }
};

/* ══════════════════════════════════════════════════════════════
   DASHBOARD — agora lê daily_store_metrics em vez de `metrics`
   ══════════════════════════════════════════════════════════════ */
export const getDashboardMetrics = async (
  storeId: string,
  interval: AnalyticsInterval,
  customRange?: { from?: Date; to?: Date },
) => {
  const range = getRange(interval, customRange);
  const dailyRows = await getDailyStoreMetrics(storeId, range);
  const mapped = sumStoreRows(dailyRows);

  const [realLikes, realComments, conversions] = await Promise.all([
    getVideoLikeCounts(storeId, range),
    getCommentCounts(storeId, range),
    getConversionData(storeId, range),
  ]);

  mapped.likes = Object.values(realLikes).reduce((sum, n) => sum + n, 0);
  mapped.comments = Object.values(realComments).reduce((sum, n) => sum + n, 0);
  mapped.conversions = Object.values(conversions).reduce((sum, c) => sum + c.count, 0);
  // revenue: soma estimated_revenue (Sistema B) + receita real de conversions.
  // Enquanto estimated_revenue não tiver escritor (ver Prioridade 4), isso
  // efetivamente equivale só à receita de conversions.
  mapped.revenue += Object.values(conversions).reduce((sum, c) => sum + c.revenue, 0);

  return mapped;
};

/* ══════════════════════════════════════════════════════════════
   LINHAS POR VÍDEO — agora lê daily_video_metrics
   ⚠️ productClicks fica 0 por vídeo (coluna não existe nessa tabela)
   ══════════════════════════════════════════════════════════════ */
export const getVideoMetricsRows = async (
  storeId: string,
  videos: Video[],
  interval: AnalyticsInterval,
  customRange?: { from?: Date; to?: Date },
) => {
  const range = getRange(interval, customRange);
  const videoIds = videos.map((v) => v.id);

  const [dailyVideoRows, realLikes, realComments, conversions] = await Promise.all([
    getDailyVideoMetrics(storeId, videoIds, range),
    getVideoLikeCounts(storeId, range),
    getCommentCounts(storeId, range),
    getConversionData(storeId, range),
  ]);

  return videos.map((video) => {
    const rowsForVideo = dailyVideoRows.filter((r) => r.video_id === video.id);
    const mapped = zeroMetrics();

    rowsForVideo.forEach((r) => {
      mapped.views += r.views_count || 0;
      mapped.ctaClicks += r.cta_clicks_count || 0;
    });

    mapped.ctr = mapped.views > 0
      ? Number(((mapped.ctaClicks / mapped.views) * 100).toFixed(1))
      : 0;

    mapped.likes = realLikes[video.id] || 0;
    mapped.comments = realComments[video.id] || 0;
    mapped.conversions = conversions[video.id]?.count || 0;
    mapped.revenue = conversions[video.id]?.revenue || 0;

    return {
      ...video,
      metrics: mapped,
    };
  });
};

/* ══════════════════════════════════════════════════════════════
   FLUXO DIÁRIO — agora usa daily_store_metrics diretamente,
   que já é granular por dia (não precisa mais filtrar manualmente)
   ══════════════════════════════════════════════════════════════ */
export const getMetricsFlow = async (
  storeId: string,
  interval: AnalyticsInterval,
  customRange?: { from?: Date; to?: Date },
) => {
  const range = getRange(interval, customRange);
  const dailyRows = await getDailyStoreMetrics(storeId, range);

  const days: Date[] = [];
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const byDate = new Map(dailyRows.map((r) => [r.date, r]));

  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const row = byDate.get(key);
    return {
      name: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      views: row?.views_count || 0,
      clicks: row?.cta_clicks_count || 0,
      sales: 0, // conversões não têm granularidade diária aqui; ver metrics-service
      revenue: Number(row?.estimated_revenue) || 0,
    };
  });
};

export const analyticsHasSupabase = () => isSupabaseConfigured && !!supabase;
