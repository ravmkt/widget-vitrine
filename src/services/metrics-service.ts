// src/services/metrics-service.ts

import { supabase } from '@/lib/supabase'
import { subDays } from 'date-fns'

// ─── TIPOS (usa os do performance.ts também) ──────────────

export type TimeRange = '7d' | '15d' | '30d' | 'custom'

export type MetricCard = {
  label: string
  value: number
  unit: '%' | 'count' | 'R$'
  trend: number
  trendDirection: 'up' | 'down' | 'flat'
  benchmark?: number
  benchmarkDiff?: number
}

export type VideoMetrics = {
  video_id: string
  title: string
  thumbnail_url: string
  views: number
  ctr: number
  whatsapp_clicks: number
  product_clicks: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  conversion_count: number
  estimated_revenue: number
}

export type DailyView = {
  date: string
  views: number
  clicks: number
}

export type EventBreakdown = {
  name: string
  value: number
  color: string
}

export type PerformanceData = {
  cards: MetricCard[]
  dailyViews: DailyView[]
  eventBreakdown: EventBreakdown[]
  topVideos: VideoMetrics[]
  period: { from: string; to: string }
}

// ─── SERVICE ─────────────────────────────────────────────

export async function getPerformanceData(
  storeId: string,
  timeRange: TimeRange,
  customFrom?: string,
  customTo?: string
): Promise<PerformanceData> {
  if (!supabase) throw new Error('Supabase não configurado')

  // 1. Define período
  const now = new Date()
  const days = timeRange === '7d' ? 7 : timeRange === '15d' ? 15 : 30
  const from = customFrom
    ? new Date(customFrom)
    : subDays(now, days)
  const to = customTo ? new Date(customTo) : now

  const fromISO = from.toISOString()
  const toISO = to.toISOString()

  // Período anterior para tendência
  const rangeMs = to.getTime() - from.getTime()
  const prevFrom = new Date(from.getTime() - rangeMs)
  const prevTo = from
  const prevFromISO = prevFrom.toISOString()
  const prevToISO = prevTo.toISOString()

  // 2. Query principal
  const { data: stats } = await supabase
    .from('metrics')
    .select('video_id, event_name, product_id, created_at')
    .eq('store_id', storeId)
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

  // 3. Views do período anterior
  const { count: prevViews } = await supabase
    .from('metrics')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('event_name', 'play')
    .gte('created_at', prevFromISO)
    .lt('created_at', prevToISO)

  // 4. Vídeos ativos
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, thumbnail_url')
    .eq('store_id', storeId)
    .eq('active', true)

  if (!stats || !videos) return emptyPerformanceData(timeRange)

  // 5. Agregação manual
  const videoMap = new Map<string, VideoMetrics>()

  for (const v of videos) {
    videoMap.set(v.id, {
      video_id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      views: 0, ctr: 0, whatsapp_clicks: 0, product_clicks: 0,
      likes: 0, comments: 0, shares: 0,
      engagement_rate: 0, conversion_count: 0, estimated_revenue: 0,
    })
  }

  const dailyMap = new Map<string, number>()
  const eventCount: Record<string, number> = {
    play: 0, like: 0, unlike: 0, comment: 0,
    comment_open: 0, share: 0, whatsapp_click: 0,
  }

  for (const row of stats || []) {
    const vm = videoMap.get(row.video_id)
    if (!vm) continue

    switch (row.event_name) {
      case 'play':          vm.views++; eventCount.play++; break
      case 'like':          vm.likes++; eventCount.like++; break
      case 'comment':
      case 'comment_open':  vm.comments++; eventCount.comment++; break
      case 'share':         vm.shares++; eventCount.share++; break
      case 'whatsapp_click': vm.whatsapp_clicks++; eventCount.whatsapp_click++; break
      case 'product_click':  vm.product_clicks++; break
    }

    const day = row.created_at.slice(0, 10) // "2026-08-02"
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }

  // 6. Métricas derivadas
  const totalViews = eventCount.play
  const totalClicks = eventCount.whatsapp_click

  for (const vm of videoMap.values()) {
    vm.ctr = vm.views > 0
      ? +((vm.whatsapp_clicks + vm.product_clicks) / vm.views * 100).toFixed(1)
      : 0
    vm.engagement_rate = vm.views > 0
      ? +((vm.likes + vm.comments + vm.shares) / vm.views * 100).toFixed(1)
      : 0
  }

  // 7. Cards
  const ctrValue = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0
  const engagementValue = totalViews > 0
    ? ((eventCount.like + eventCount.comment + eventCount.share) / totalViews) * 100
    : 0
  const viewsTrend = (prevViews || 0) > 0
    ? ((totalViews - (prevViews || 0)) / (prevViews || 1)) * 100
    : 0

  const cards: MetricCard[] = [
    {
      label: 'Visualizações', value: totalViews, unit: 'count',
      trend: +viewsTrend.toFixed(1),
      trendDirection: viewsTrend > 5 ? 'up' : viewsTrend < -5 ? 'down' : 'flat',
    },
    {
      label: 'CTR Total', value: +ctrValue.toFixed(1), unit: '%',
      trend: 0, trendDirection: 'flat',
    },
    {
      label: 'Engajamento', value: +engagementValue.toFixed(1), unit: '%',
      trend: 0, trendDirection: 'flat',
    },
    {
      label: 'WhatsApp', value: eventCount.whatsapp_click, unit: 'count',
      trend: 0, trendDirection: 'flat',
    },
  ]

  // 8. Daily views
  const dailyViews: DailyView[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, views: count, clicks: 0 }))

  // 9. Event breakdown
  const eventBreakdown: EventBreakdown[] = [
    { name: 'Plays', value: eventCount.play, color: '#6366f1' },
    { name: 'Likes', value: eventCount.like, color: '#f43f5e' },
    { name: 'Comentários', value: eventCount.comment, color: '#10b981' },
    { name: 'Compartilham.', value: eventCount.share, color: '#f59e0b' },
    { name: 'WhatsApp', value: eventCount.whatsapp_click, color: '#25D366' },
  ]

  // 10. Top 5 vídeos
  const topVideos = Array.from(videoMap.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  return { cards, dailyViews, eventBreakdown, topVideos, period: { from: fromISO, to: toISO } }
}

// ─── BENCHMARK ───────────────────────────────────────────

export async function getSectorBenchmark(storeId: string) {
  if (!supabase) return null

  const { data: store } = await supabase
    .from('stores')
    .select('sector_id')
    .eq('id', storeId)
    .single()

  if (!store?.sector_id) return null

  const { data: benchmarks } = await supabase
    .from('benchmarks')
    .select('*')
    .eq('sector_id', store.sector_id)

  return benchmarks
}

// ─── HELPER ──────────────────────────────────────────────

function emptyPerformanceData(timeRange: TimeRange): PerformanceData {
  return {
    cards: [
      { label: 'Visualizações', value: 0, unit: 'count', trend: 0, trendDirection: 'flat' },
      { label: 'CTR Total', value: 0, unit: '%', trend: 0, trendDirection: 'flat' },
      { label: 'Engajamento', value: 0, unit: '%', trend: 0, trendDirection: 'flat' },
      { label: 'WhatsApp', value: 0, unit: 'count', trend: 0, trendDirection: 'flat' },
    ],
    dailyViews: [],
    eventBreakdown: [],
    topVideos: [],
    period: { from: '', to: '' },
  }
}
