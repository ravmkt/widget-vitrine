// lib/types/performance.ts

export interface PerformanceData {
  cards: MetricCard[]
  dailyViews: DailyView[]
  eventBreakdown: EventBreakdown[]
  topVideos: VideoMetricRow[]
  period: DateRange
  benchmark?: SectorBenchmark | null
}

export interface MetricCard {
  label: string
  value: number
  unit: '%' | 'count' | 'R$'
  trend: number
  trendDirection: 'up' | 'down' | 'flat'
  benchmark?: number
  benchmarkDiff?: number
}

export interface DailyView {
  date: string
  views: number
  clicks: number
}

export interface EventBreakdown {
  name: string
  value: number
  color: string
}

export interface VideoMetricRow {
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

export interface DateRange {
  from: string
  to: string
}

export interface SectorBenchmark {
  sector_name: string
  sector_icon: string
  metrics: BenchmarkMetric[]
}

export interface BenchmarkMetric {
  metric_key: string
  metric_label: string
  value_low: number
  value_mid: number
  value_high: number
  unit: string
}

export interface Insight {
  id: string
  store_id: string
  type: 'praise' | 'suggestion' | 'alert'
  category: string
  title: string
  description: string
  affected_video_ids: string[]
  metrics_snapshot: Record<string, number>
  action: string
  dismissed: boolean
  created_at: string
}

export type TabKey = 'overview' | 'videos' | 'insights' | 'retention'
export type TimeRange = '7d' | '15d' | '30d' | 'custom'
