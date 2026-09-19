import React, { useState, useEffect, lazy, Suspense } from 'react'
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
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/context/TenantContext'

// Componentes modulares (lazy-loaded para code-splitting do Recharts)
const OverviewTab = lazy(() => import('@/components/performance/overview-tab').then(m => ({ default: m.OverviewTab })))
const VideosTab = lazy(() => import('@/components/performance/videos-tab').then(m => ({ default: m.VideosTab })))
const InsightsTab = lazy(() => import('@/components/performance/insights-tab').then(m => ({ default: m.InsightsTab })))
const RetentionTab = lazy(() => import('@/components/performance/retention-tab').then(m => ({ default: m.RetentionTab })))

type TabKey = 'overview' | 'videos' | 'insights' | 'retention'

export interface SectorBenchmark {
  sector_key: string;
  sector_name: string;
  avg_ctr: number;
  avg_cvr: number;
  avg_hook_rate: number;
  avg_watch_time: number;
}

// ── Loader exibido enquanto o chunk da aba está sendo baixado ──
const TabLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#0091ff] dark:border-[#ff7a29]" />
  </div>
);

export default function PerformancePage() {
  const { currentStore: tenant, loading: tenantLoading } = useTenant()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({})

  // Estado para armazenar o benchmark do setor da loja
  const [benchmark, setBenchmark] = useState<SectorBenchmark>({
    sector_key: 'moda_acessorios',
    sector_name: 'Moda e Acessórios',
    avg_ctr: 8.2,
    avg_cvr: 3.5,
    avg_hook_rate: 45.0,
    avg_watch_time: 12.0
  })

  // Carrega o setor configurado na loja do tenant logado
  useEffect(() => {
    async function loadSectorAndBenchmark() {
      if (tenantLoading) return;
      if (!tenant?.id) return;

      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('sector')
          .eq('id', tenant.id)
          .single();

        const selectedSector = store?.sector || 'moda_acessorios';

        // 2. Busca os dados de benchmark para o setor encontrado
        const { data: bench, error: benchError } = await supabase
          .from('sector_benchmarks')
          .select('*')
          .eq('sector_key', selectedSector)
          .single();

        if (bench && !benchError) {
          setBenchmark(bench);
        }
      } catch (err) {
        console.error("Erro ao buscar configurações setoriais da loja:", err);
      }
    }

    loadSectorAndBenchmark();
  }, [tenant, tenantLoading]);

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── HEADER NOVO ESTILO VIDLYTICS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Resultados
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-[#c0c5d4] mt-1">
            Métricas reais de <span className="text-[#0091ff] dark:text-[#ff7a29] font-bold">{benchmark.sector_name}</span> comparadas aos benchmarks nacionais de 2026.
          </p>
        </div>

        {/* ── FILTRO DE PERÍODO REFINADO ── */}
        <div className="flex items-center gap-2.5">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-36 h-10 rounded-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35] text-xs font-black text-slate-800 dark:text-white shadow-sm focus:border-[#0091ff] dark:focus:border-[#ff7a29]">
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
                  ? 'border-[#0091ff]/40 bg-[#0091ff]/10 text-[#0091ff] dark:border-[#ff7a29]/40 dark:bg-[#ff7a29]/10 dark:text-[#ff7a29]'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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

      {/* ── ABAS DE NAVEGAÇÃO COM CONTRASTE REFINADO NO DARK MODE ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="flex flex-col gap-6"
      >
        <TabsList className="w-fit bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/5 rounded-2xl p-1.5 gap-1 shadow-inner h-auto">
          <TabsTrigger
            value="overview"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer
              hover:text-slate-800 dark:hover:text-white
              data-[state=inactive]:!bg-slate-200 dark:data-[state=inactive]:!bg-slate-800
              data-[state=inactive]:!text-slate-600 dark:data-[state=inactive]:!text-slate-400
              data-[state=active]:!bg-[#0091ff] dark:data-[state=active]:!bg-[#ff7a29]
              data-[state=active]:!text-white data-[state=active]:shadow-md
              data-[state=active]:shadow-blue-500/20 dark:data-[state=active]:shadow-orange-500/30"
          >
            📊 Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="videos"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer
              hover:text-slate-800 dark:hover:text-white
              data-[state=inactive]:!bg-slate-200 dark:data-[state=inactive]:!bg-slate-800
              data-[state=inactive]:!text-slate-600 dark:data-[state=inactive]:!text-slate-400
              data-[state=active]:!bg-[#0091ff] dark:data-[state=active]:!bg-[#ff7a29]
              data-[state=active]:!text-white data-[state=active]:shadow-md
              data-[state=active]:shadow-blue-500/20 dark:data-[state=active]:shadow-orange-500/30"
          >
            🎬 Vídeos
          </TabsTrigger>
          <TabsTrigger
            value="retention"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer
              hover:text-slate-800 dark:hover:text-white
              data-[state=inactive]:!bg-slate-200 dark:data-[state=inactive]:!bg-slate-800
              data-[state=inactive]:!text-slate-600 dark:data-[state=inactive]:!text-slate-400
              data-[state=active]:!bg-[#0091ff] dark:data-[state=active]:!bg-[#ff7a29]
              data-[state=active]:!text-white data-[state=active]:shadow-md
              data-[state=active]:shadow-blue-500/20 dark:data-[state=active]:shadow-orange-500/30"
          >
            📈 Retenção
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer
              hover:text-slate-800 dark:hover:text-white
              data-[state=inactive]:!bg-slate-200 dark:data-[state=inactive]:!bg-slate-800
              data-[state=inactive]:!text-slate-600 dark:data-[state=inactive]:!text-slate-400
              data-[state=active]:!bg-[#0091ff] dark:data-[state=active]:!bg-[#ff7a29]
              data-[state=active]:!text-white data-[state=active]:shadow-md
              data-[state=active]:shadow-blue-500/20 dark:data-[state=active]:shadow-orange-500/30"
          >
            🧠 Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Suspense fallback={<TabLoader />}>
            <OverviewTab
              timeRange={timeRange}
              customFrom={customRange.from?.toISOString()}
              customTo={customRange.to?.toISOString()}
              benchmark={benchmark}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="videos">
          <Suspense fallback={<TabLoader />}>
            <VideosTab
              timeRange={timeRange}
              customFrom={customRange.from?.toISOString()}
              customTo={customRange.to?.toISOString()}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="retention">
          <Suspense fallback={<TabLoader />}>
            <RetentionTab
              timeRange={timeRange}
              customFrom={customRange.from?.toISOString()}
              customTo={customRange.to?.toISOString()}
              benchmark={benchmark}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="insights">
          <Suspense fallback={<TabLoader />}>
            <InsightsTab
              timeRange={timeRange}
              customFrom={customRange.from?.toISOString()}
              customTo={customRange.to?.toISOString()}
              benchmark={benchmark}
            />
          </Suspense>
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
        <div className="flex flex-col items-center">
          <DayPicker
            mode="range"
            selected={customRange}
            onSelect={(r) => r && setCustomRange({ from: r.from, to: r.to })}
            locale={ptBR}
            className="border-none"
            modifiersClassNames={{
              selected: '!bg-[#0091ff] dark:!bg-[#ff7a29] !text-white',
            }}
          />
        </div>
      </CustomDialog>
    </div>
  )
}
