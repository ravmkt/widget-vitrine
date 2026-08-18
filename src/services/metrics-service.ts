// src/services/metrics-service.ts

import { supabase } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

// ─── TIPOS ────────────────────────────────────────────────

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
  cta_clicks: number       // renomeado de whatsapp_clicks — ver nota abaixo
  product_clicks: number   // ⚠️ sempre 0 (daily_video_metrics não tem essa coluna)
  likes: number
  comments: number
  shares: number            // ⚠️ sempre 0 — não rastreado no Sistema B
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
  const from = customFrom ? new Date(customFrom) : subDays(now, days)
  const to = customTo ? new Date(customTo) : now

  const fromDate = format(from, 'yyyy-MM-dd')
  const toDate = format(to, 'yyyy-MM-dd')

  // Período anterior, para tendência
  const rangeMs = to.getTime() - from.getTime()
  const prevFrom = new Date(from.getTime() - rangeMs)
  const prevTo = from
  const prevFromDate = format(prevFrom, 'yyyy-MM-dd')
  const prevToDate = format(prevTo, 'yyyy-MM-dd')

  // 2. Vídeos ativos
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, thumbnail_url')
    .eq('store_id', storeId)
    .eq('active', true)

  if (!videos) return emptyPerformanceData()

  const videoIds = videos.map((v) => v.id)

  // 3. Métricas diárias por vídeo (Sistema B)
  const { data: videoStats } = videoIds.length
    ? await supabase
        .from('daily_video_metrics')
        .select('video_id, date, views_count, cta_clicks_count')
        .eq('store_id', storeId)
        .in('video_id', videoIds)
        .gte('date', fromDate)
        .lte('date', toDate)
    : { data: [] as any[] }

  // 4. Métricas diárias da loja (para dailyViews e views totais)
  const { data: storeStats } = await supabase
    .from('daily_store_metrics')
    .select('date, views_count, cta_clicks_count, product_clicks_count, estimated_revenue')
    .eq('store_id', storeId)
    .gte('date', fromDate)
    .lte('date', toDate)

  // 5. Views do período anterior (para tendência)
  const { data: prevStoreStats } = await supabase
    .from('daily_store_metrics')
    .select('views_count')
    .eq('store_id', storeId)
    .gte('date', prevFromDate)
    .lt('date', prevToDate)

  const prevViews = (prevStoreStats || []).reduce((sum, r: any) => sum + (r.views_count || 0), 0)

  // 6. Likes reais (video_likes)
  const { data: likesData } = videoIds.length
    ? await supabase
        .from('video_likes')
        .select('video_id')
        .in('video_id', videoIds)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
    : { data: [] as any[] }

  // 7. Comentários reais (aprovados)
  const { data: commentsData } = await supabase
    .from('comments')
    .select('video_id')
    .eq('store_id', storeId)
    .eq('status', 'approved')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  // 8. Conversões pagas
  const { data: conversionsData } = videoIds.length
    ? await supabase
        .from('conversions')
        .select('video_id, order_value')
        .in('video_id', videoIds)
        .eq('status', 'paid')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
    : { data: [] as any[] }

  // 9. Agregação por vídeo
  const videoMap = new Map<string, VideoMetrics>()
  for (const v of videos) {
    videoMap.set(v.id, {
      video_id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      views: 0,
      ctr: 0,
      cta_clicks: 0,
      product_clicks: 0, // sem dado por vídeo
      likes: 0,
      comments: 0,
      shares: 0, // sem dado
      engagement_rate: 0,
      conversion_count: 0,
      estimated_revenue: 0,
    })
  }

  for (const row of videoStats || []) {
    const vm = videoMap.get(row.video_id)
    if (!vm) continue
    vm.views += row.views_count || 0
    vm.cta_clicks += row.cta_clicks_count || 0
  }

  for (const row of likesData || []) {
    const vm = videoMap.get(row.video_id)
    if (vm) vm.likes++
  }

  for (const row of commentsData || []) {
    const vm = videoMap.get(row.video_id)
    if (vm) vm.comments++
  }

  for (const row of conversionsData || []) {
    const vm = videoMap.get(row.video_id)
    if (vm) {
      vm.conversion_count++
      vm.estimated_revenue += Number(row.order_value) || 0
    }
  }

  for (const vm of videoMap.values()) {
    vm.ctr = vm.views > 0 ? +((vm.cta_clicks / vm.views) * 100).toFixed(1) : 0
    vm.engagement_rate = vm.views > 0
      ? +(((vm.likes + vm.comments) / vm.views) * 100).toFixed(1)
      : 0
  }

  // 10. Totais da loja (cards)
  const totalViews = (storeStats || []).reduce((sum, r: any) => sum + (r.views_count || 0), 0)
  const totalCtaClicks = (storeStats || []).reduce((sum, r: any) => sum + (r.cta_clicks_count || 0), 0)
  const totalProductClicks = (storeStats || []).reduce((sum, r: any) => sum + (r.product_clicks_count || 0), 0)
  const totalLikes = (likesData || []).length
  const totalComments = (commentsData || []).length

  const ctrValue = totalViews > 0 ? ((totalCtaClicks + totalProductClicks) / totalViews) * 100 : 0
  const engagementValue = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0
  const viewsTrend = prevViews > 0 ? ((totalViews - prevViews) / prevViews) * 100 : 0

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
      label: 'Cliques CTA', value: totalCtaClicks, unit: 'count', // renomeado de "WhatsApp" — não distinguível hoje
      trend: 0, trendDirection: 'flat',
    },
  ]

  // 11. Daily views (granularidade real, direto da tabela)
  const dailyViews: DailyView[] = (storeStats || [])
    .slice()
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((r: any) => ({ date: r.date, views: r.views_count || 0, clicks: r.cta_clicks_count || 0 }))

  // 12. Event breakdown — HONESTO: só eventos que existem de fato
  const eventBreakdown: EventBreakdown[] = [
    { name: 'Visualizações', value: totalViews, color: '#6366f1' },
    { name: 'Cliques CTA', value: totalCtaClicks, color: '#25D366' },
    { name: 'Cliques Produto', value: totalProductClicks, color: '#f59e0b' },
    { name: 'Curtidas', value: totalLikes, color: '#f43f5e' },
    { name: 'Comentários', value: totalComments, color: '#10b981' },
  ]

  // 13. Top 5 vídeos
  const topVideos = Array.from(videoMap.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  return {
    cards,
    dailyViews,
    eventBreakdown,
    topVideos,
    period: { from: fromDate, to: toDate },
  }
}

// ─── BENCHMARK — inalterado ──────────────────────────────

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

function emptyPerformanceData(): PerformanceData {
  return {
    cards: [
      { label: 'Visualizações', value: 0, unit: 'count', trend: 0, trendDirection: 'flat' },
      { label: 'CTR Total', value: 0, unit: '%', trend: 0, trendDirection: 'flat' },
      { label: 'Engajamento', value: 0, unit: '%', trend: 0, trendDirection: 'flat' },
      { label: 'Cliques CTA', value: 0, unit: 'count', trend: 0, trendDirection: 'flat' },
    ],
    dailyViews: [],
    eventBreakdown: [],
    topVideos: [],
    period: { from: '', to: '' },
  }
}
