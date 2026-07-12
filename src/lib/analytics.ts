import { endOfDay, startOfDay, subDays } from 'date-fns';
import { db, Metric, Video } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type AnalyticsInterval = 'today' | '7' | '30' | 'custom';

export type AnalyticsDateRange = {
  start: Date;
  end: Date;
};

export type DashboardMetrics = {
  views: number;
  plays: number;
  pauses: number;
  clicks: number;
  ctaClicks: number;
  productClicks: number;
  whatsappClicks: number;
  likes: number;
  shares: number;
  comments: number;
  closes: number;
  conversions: number;
  ctr: number;
};

export type VideoMetricsRow = Video & {
  metrics: DashboardMetrics;
};

const eventTypes = [
  'view',
  'play',
  'pause',
  'click',
  'cta_click',
  'product_click',
  'whatsapp_click',
  'like',
  'share',
  'comment',
  'close',
  'conversion',
] as const;

const getRange = (interval: AnalyticsInterval, customRange?: { from?: Date; to?: Date }): AnalyticsDateRange => {
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
});

const mapMetrics = (items: Metric[]): DashboardMetrics => {
  const totals = zeroMetrics();
  items.forEach((item) => {
    if (item.event_type === 'view') totals.views += 1;
    if (item.event_type === 'play') totals.plays += 1;
    if (item.event_type === 'pause') totals.pauses += 1;
    if (item.event_type === 'click') totals.clicks += 1;
    if (item.event_type === 'cta_click') totals.ctaClicks += 1;
    if (item.event_type === 'product_click') totals.productClicks += 1;
    if (item.event_type === 'whatsapp_click') totals.whatsappClicks += 1;
    if (item.event_type === 'like') totals.likes += 1;
    if (item.event_type === 'share') totals.shares += 1;
    if (item.event_type === 'comment') totals.comments += 1;
    if (item.event_type === 'close') totals.closes += 1;
    if (item.event_type === 'conversion') totals.conversions += 1;
  });
  totals.ctr = totals.views > 0 ? Number(((totals.ctaClicks / totals.views) * 100).toFixed(1)) : 0;
  return totals;
};

export const trackMetric = async (metric: Partial<Metric> & { store_id: string; event_type: Metric['event_type'] }) => {
  const payload = {
    store_id: metric.store_id,
    story_id: metric.story_id ?? null,
    video_id: metric.video_id ?? null,
    product_id: metric.product_id ?? null,
    event_type: metric.event_type,
    page_url: metric.page_url ?? window.location.href,
    device_type: metric.device_type ?? (window.innerWidth < 768 ? 'mobile' : 'desktop'),
    browser: metric.browser ?? navigator.userAgent,
    referrer: metric.referrer ?? document.referrer ?? null,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('metrics').insert(payload);
      if (!error) return;
    } catch (error) {
      console.error('Failed to insert metric into Supabase', error);
    }
  }

  try {
    await db.metrics.save({
      id: crypto.randomUUID(),
      store_id: payload.store_id,
      story_id: payload.story_id ?? '',
      video_id: payload.video_id ?? undefined,
      product_id: payload.product_id ?? undefined,
      event_type: payload.event_type,
      page_url: payload.page_url ?? '',
      device_type: payload.device_type ?? '',
      browser: payload.browser ?? '',
      referrer: payload.referrer ?? undefined,
      created_at: new Date().toISOString(),
    } as Metric);
  } catch (error) {
    console.error('Failed to persist local metric fallback', error);
  }
};

export const getMetricsByStore = async (storeId: string, interval: AnalyticsInterval, customRange?: { from?: Date; to?: Date }) => {
  const range = getRange(interval, customRange);

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('metrics')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', range.start.toISOString())
      .lte('created_at', range.end.toISOString());

    return (data || []) as Metric[];
  }

  const all = await db.metrics.getAll(storeId);
  return all.filter((metric) => {
    const createdAt = metric.created_at ? new Date(metric.created_at) : null;
    return createdAt ? createdAt >= range.start && createdAt <= range.end : true;
  });
};

export const getDashboardMetrics = async (storeId: string, interval: AnalyticsInterval, customRange?: { from?: Date; to?: Date }) => {
  const items = await getMetricsByStore(storeId, interval, customRange);
  return mapMetrics(items);
};

export const getVideoMetricsRows = async (storeId: string, videos: Video[], interval: AnalyticsInterval, customRange?: { from?: Date; to?: Date }) => {
  const items = await getMetricsByStore(storeId, interval, customRange);
  return videos.map((video) => {
    const videoItems = items.filter((item) => item.video_id === video.id);
    return {
      ...video,
      metrics: mapMetrics(videoItems),
    };
  });
};

export const getMetricsFlow = async (storeId: string, interval: AnalyticsInterval, customRange?: { from?: Date; to?: Date }) => {
  const range = getRange(interval, customRange);
  const items = await getMetricsByStore(storeId, interval, customRange);
  const days: Date[] = [];
  const cursor = new Date(range.start);
  while (cursor <= range.end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayItems = items.filter((item) => {
      const createdAt = item.created_at ? new Date(item.created_at) : null;
      return createdAt ? createdAt >= day && createdAt < nextDay : false;
    });
    const totals = mapMetrics(dayItems);
    return {
      name: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      views: totals.views,
      clicks: totals.ctaClicks,
      sales: totals.conversions,
      revenue: 0,
    };
  });
};

export const analyticsHasSupabase = () => isSupabaseConfigured && !!supabase;
export const analyticsEventTypes = eventTypes;
