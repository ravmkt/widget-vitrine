import { eachDayOfInterval, endOfDay, startOfDay, subDays } from 'date-fns';
import { Video } from '@/lib/db';

export type VideoPeriod = 'today' | '7' | '30' | 'custom';

export type VideoInterval = {
  start: Date;
  end: Date;
};

export type VideoMetrics = {
  views: number;
  clicks: number;
  conversions: number;
  ctr: number;
};

export type VideoMetricsRow = Video & {
  metrics: VideoMetrics;
  trends?: { views: number };
};

export const getVideoInterval = (
  period: VideoPeriod,
  customRange: { from?: Date; to?: Date } = {},
): VideoInterval => {
  const now = new Date();

  if (period === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (period === '7') {
    return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  }

  if (period === '30') {
    return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }

  return {
    start: startOfDay(customRange.from || subDays(now, 7)),
    end: endOfDay(customRange.to || now),
  };
};

export const calculateCTR = (clicks: number, views: number): number => {
  if (!views || views <= 0) return 0;
  return Number(((clicks / views) * 100).toFixed(1));
};

export const calculateVideoMetrics = (videoId: string, interval: VideoInterval): VideoMetrics => {
  // Retornando 0 para métricas reais.
  // O sistema agora utiliza src/lib/analytics.ts para buscar dados reais do Supabase.
  return {
    views: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
  };
};

export const buildVideoMetricsRows = (videos: Video[], interval: VideoInterval): VideoMetricsRow[] => {
  return videos.map((video) => {
    const metrics = calculateVideoMetrics(video.id, interval);
    return {
      ...video,
      metrics,
    };
  });
};

export const aggregateVideoMetrics = (videos: VideoMetricsRow[]) => {
  const totals = videos.reduce(
    (acc, video) => {
      acc.views += video.metrics.views || 0;
      acc.clicks += video.metrics.clicks || 0;
      acc.conversions += video.metrics.conversions || 0;
      return acc;
    },
    {
      views: 0,
      clicks: 0,
      conversions: 0,
    },
  );

  return {
    ...totals,
    ctr: calculateCTR(totals.clicks, totals.views),
  };
};
