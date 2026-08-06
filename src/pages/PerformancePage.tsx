import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DayPicker } from 'react-day-picker'
import CustomDialog from '@/components/CustomDialog'
import type { TimeRange } from '@/lib/services/metrics-service'

// Placeholders — vamos codar depois
import { OverviewTab } from '@/components/performance/overview-tab'
import { VideosTab } from '@/components/performance/videos-tab'
import { InsightsTab } from '@/components/performance/insights-tab'
import { RetentionTab } from '@/components/performance/retention-tab'

type TabKey = 'overview' | 'videos' | 'insights' | 'retention'

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({})

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Performance
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Métricas, insights e recomendações para seus vídeos
          </p>
        </div>

        {/* ── Filtro de período ── */}
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="15d">15 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === 'custom' && (
            <button
              onClick={() => setIsCalendarOpen(true)}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold',
                customRange.from
                  ? 'text-slate-900 bg-slate-50'
                  : 'text-slate-400'
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {customRange.from
                ? `${format(customRange.from, 'dd/MM/yy', { locale: ptBR })} → ${customRange.to ? format(customRange.to, 'dd/MM/yy', { locale: ptBR }) : '...'}`
                : 'Selecionar datas'}
            </button>
          )}
        </div>
      </div>

      {/* ── Abas ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="flex flex-col gap-6"
      >
        <TabsList className="w-fit bg-white border border-slate-200 rounded-xl p-1.5">
          <TabsTrigger
            value="overview"
            className="px-5 py-2.5 text-sm font-bold data-[state=active]:shadow-sm"
          >
            📊 Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="videos"
            className="px-5 py-2.5 text-sm font-bold data-[state=active]:shadow-sm"
          >
            🎬 Vídeos
          </TabsTrigger>
          <TabsTrigger
            value="retention"
            className="px-5 py-2.5 text-sm font-bold data-[state=active]:shadow-sm"
          >
            📈 Retenção
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="px-5 py-2.5 text-sm font-bold data-[state=active]:shadow-sm"
          >
            🧠 Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab timeRange={timeRange} customFrom={customRange.from?.toISOString()} customTo={customRange.to?.toISOString()} />
        </TabsContent>

        <TabsContent value="videos">
          <VideosTab timeRange={timeRange} customFrom={customRange.from?.toISOString()} customTo={customRange.to?.toISOString()} />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionTab timeRange={timeRange} customFrom={customRange.from?.toISOString()} customTo={customRange.to?.toISOString()} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab timeRange={timeRange} customFrom={customRange.from?.toISOString()} customTo={customRange.to?.toISOString()} />
        </TabsContent>
      </Tabs>

      {/* ── Modal calendário ── */}
      <CustomDialog
        isOpen={isCalendarOpen}
        type="form"
        title="Período personalizado"
        maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)}
        onConfirm={() => setIsCalendarOpen(false)}
        confirmText="Aplicar"
      >
        <DayPicker
          mode="range"
          selected={customRange}
          onSelect={(r) => r && setCustomRange({ from: r.from, to: r.to })}
          locale={ptBR}
          modifiersStyles={{
            selected: { backgroundColor: '#0094EB', color: 'white' },
          }}
        />
      </CustomDialog>
    </div>
  )
}
