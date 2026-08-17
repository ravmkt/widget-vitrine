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
import type { TimeRange } from '@/services/metrics-service'

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
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── HEADER NOVO ESTILO VIDLYTICS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Performance
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-[#c0c5d4] mt-1">
            Métricas consolidadas, insights e recomendações de conversão para seus vídeos.
          </p>
        </div>

        {/* ── FILTRO DE PERÍODO REFINADO ── */}
        <div className="flex items-center gap-2.5">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-36 h-10 rounded-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35] text-xs font-black text-slate-800 dark:text-white shadow-sm focus:border-[#ff7a29]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-xs font-bold text-slate-800 dark:text-white shadow-xl">
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="15d">15 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === 'custom' && (
            <button
              type="button"
              onClick={() => setIsCalendarOpen(true)}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-black transition-all shadow-sm',
                customRange.from
                  ? 'border-[#ff7a29]/40 bg-[#ff7a29]/10 text-[#ff7a29]'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-slate-400 hover:text-white'
              )}
            >
              <CalendarIcon className="h-4 w-4 shrink-0" />
              {customRange.from
                ? `${format(customRange.from, 'dd/MM/yy', { locale: ptBR })} → ${customRange.to ? format(customRange.to, 'dd/MM/yy', { locale: ptBR }) : '...'}`
                : 'Selecionar datas'}
            </button>
          )}
        </div>
      </div>

      {/* ── ABAS DE NAVEGAÇÃO MODULARES E ARREDONDADAS ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="flex flex-col gap-6"
      >
        <TabsList className="w-fit bg-slate-100 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-2xl p-1.5 gap-1 shadow-inner h-auto">
          <TabsTrigger
            value="overview"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white data-[state=active]:!bg-[#ff7a29] data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/30 cursor-pointer"
          >
            📊 Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="videos"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white data-[state=active]:!bg-[#ff7a29] data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/30 cursor-pointer"
          >
            🎬 Vídeos
          </TabsTrigger>
          <TabsTrigger
            value="retention"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white data-[state=active]:!bg-[#ff7a29] data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/30 cursor-pointer"
          >
            📈 Retenção
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all text-slate-500 dark:text-[#8a90a0] hover:text-slate-800 dark:hover:text-white data-[state=active]:!bg-[#ff7a29] data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/30 cursor-pointer"
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
