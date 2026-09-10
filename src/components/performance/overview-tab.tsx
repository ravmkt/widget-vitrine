import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/context/TenantContext'
import {
  FileText,
  X,
  Check,
  Sparkles,
  TrendingUp,
  Compass,
  Eye,
  MousePointerClick,
  TrendingDown,
  DollarSign,
  Heart,
  Hourglass,
  CheckCircle2,
  Wallet,
  Percent,
  Info
} from 'lucide-react'
import type { SectorBenchmark } from '@/pages/PerformancePage'
import { cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OverviewTabProps {
  timeRange: string
  customFrom?: string
  customTo?: string
  benchmark: SectorBenchmark
}

interface FinancialDayPoint {
  date: string
  pending: number
  paid: number
  referral: number
  total: number
}

interface PerformanceDayPoint {
  date: string
  views: number
  clicks: number
  social: number
  ctr: number
}

export function OverviewTab({
  timeRange,
  customFrom,
  customTo,
  benchmark
}: OverviewTabProps) {
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Filtros dos gráficos
  const [financialMetricFilter, setFinancialMetricFilter] = useState<'all' | 'pending' | 'paid' | 'referral' | 'total'>('all')
  const [performanceMetricFilter, setPerformanceMetricFilter] = useState<'all' | 'views' | 'clicks' | 'social' | 'ctr'>('all')

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    checkTheme()
    return () => observer.disconnect()
  }, [])

  const getSectorStrategicPlaybook = (slug: string) => {
    switch (slug) {
      case 'moda_acessorios':
        return {
          audienceBehavior: "Clientes de moda compram por caimento, movimento e combinação visual direta. Stories que trazem corpos reais e mostram os tecidos de perto convertem até 3x mais.",
          tips: [
            "Provador Humano Real: Evite apenas fotos estáticas. Mostre o caimento das peças em movimento em pessoas de biotipos reais.",
            "Visualização em 360°: Dedique os primeiros 3 segundos do story (Hook) para mostrar um close na textura, acabamento e costura.",
            "Combinação de Looks (Mix & Match): Grave sequências rápidas de vídeo ensinando a combinar a peça principal com calçados e acessórios."
          ]
        }
      case 'beleza_cosmeticos':
        return {
          audienceBehavior: "O público de cosméticos busca textura, aplicação prática e provas reais de eficácia. Reviews sinceros dominam o engajamento.",
          tips: [
            "Prova e Aplicação Real: Faça stories mostrando a textura do produto na pele e o resultado instantâneo sem filtros.",
            "Micro-Influenciadores: Vídeos de pessoas reais fazendo unboxing aumentam o CTR de beleza em até 32%.",
            "Dicas de Rotina: Crie sequências curtas educacionais integrando o produto em um ritual de autocuidado."
          ]
        }
      default:
        return {
          audienceBehavior: "Comportamento de varejo digital focado em dinamismo, gatilhos visuais e clareza imediata de proposta de valor.",
          tips: [
            "Regra dos 3 Segundos: Apresente o benefício ou dor resolvida logo no início.",
            "Legendas Sempre Ativas: Garanta que quem assiste sem som consiga comprar com facilidade.",
            "CTA Direto: Indique claramente o card do produto logo abaixo do vídeo."
          ]
        }
    }
  }

  const playbook = getSectorStrategicPlaybook(benchmark?.sector_key || 'default')

  const { storeId, currentStore: tenant, loading: tenantLoading } = useTenant()
  const resolvedStoreId = storeId || tenant?.id

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    views: 0,
    clicks: 0,
    paidCount: 0,
    paidRevenue: 0,
    pendingCount: 0,
    pendingRevenue: 0,
    referralEarnings: 0,
    likes: 0,
    comments: 0
  })

  const [financialChartData, setFinancialChartData] = useState<FinancialDayPoint[]>([])
  const [performanceChartData, setPerformanceChartData] = useState<PerformanceDayPoint[]>([])

  useEffect(() => {
    async function fetchRealMetrics() {
      if (tenantLoading) return

      if (!resolvedStoreId || resolvedStoreId === '11111111-1111-4111-8111-111111111111') {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let dateLimit = new Date()
        if (timeRange === '7d') {
          dateLimit.setDate(dateLimit.getDate() - 7)
        } else if (timeRange === '15d') {
          dateLimit.setDate(dateLimit.getDate() - 15)
        } else if (timeRange === '30d') {
          dateLimit.setDate(dateLimit.getDate() - 30)
        } else if (timeRange === 'custom' && customFrom) {
          dateLimit = new Date(customFrom)
        }

        const dateString = dateLimit.toISOString()

        const [viewsRes, clicksRes, conversionsRes, socialRes, referralRes] = await Promise.all([
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', resolvedStoreId).eq('event_type', 'story_open').gte('created_at', dateString),
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', resolvedStoreId).eq('event_type', 'cta_click').gte('created_at', dateString),
          supabase.from('conversions').select('order_value, status, created_at').eq('store_id', resolvedStoreId).gte('created_at', dateString),
          supabase.from('tracking_events').select('event_type, created_at').eq('tenant_id', resolvedStoreId).in('event_type', ['story_like', 'story_comment']).gte('created_at', dateString),
          supabase.from('referral_rewards').select('amount, created_at').eq('referrer_store_id', resolvedStoreId).eq('status', 'paid').gte('created_at', dateString)
        ])

        let paidRevenue = 0
        let paidCount = 0
        let pendingRevenue = 0
        let pendingCount = 0

        const finDayMap: { [key: string]: FinancialDayPoint } = {}
        const perfDayMap: { [key: string]: { views: number; clicks: number; social: number } } = {}

        const tempDate = new Date(dateLimit)
        const today = new Date()

        while (tempDate <= today) {
          const label = tempDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          finDayMap[label] = { date: label, pending: 0, paid: 0, referral: 0, total: 0 }
          perfDayMap[label] = { views: 0, clicks: 0, social: 0 }
          tempDate.setDate(tempDate.getDate() + 1)
        }

        if (conversionsRes.data) {
          const convList = conversionsRes.data as Array<{ order_value: number; status: string; created_at: string }>
          for (const item of convList) {
            const val = Number(item.order_value) || 0
            const st = (item.status || 'pending').toLowerCase()
            const label = new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

            if (st === 'paid' || st === 'approved' || st === 'completed') {
              paidRevenue += val
              paidCount += 1
              if (finDayMap[label]) {
                finDayMap[label].paid += val
                finDayMap[label].total += val
              }
            } else {
              pendingRevenue += val
              pendingCount += 1
              if (finDayMap[label]) {
                finDayMap[label].pending += val
              }
            }
          }
        }

        let totalReferrals = 0
        if (referralRes.data) {
          for (const r of referralRes.data as Array<{ amount: number; created_at: string }>) {
            const val = Number(r.amount) || 0
            totalReferrals += val
            const label = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            if (finDayMap[label]) {
              finDayMap[label].referral += val
              finDayMap[label].total += val
            }
          }
        }

        const totalLikes = socialRes.data?.filter((e: any) => e.event_type === 'story_like').length || 0
        const totalComments = socialRes.data?.filter((e: any) => e.event_type === 'story_comment').length || 0

        if (socialRes.data) {
          socialRes.data.forEach((e: any) => {
            const label = new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            if (perfDayMap[label]) {
              perfDayMap[label].social += 1
            }
          })
        }

        const { data: rawEvents } = await supabase
          .from('tracking_events')
          .select('created_at, event_type')
          .eq('tenant_id', resolvedStoreId)
          .in('event_type', ['story_open', 'cta_click'])
          .gte('created_at', dateString)
          .order('created_at', { ascending: true })

        if (rawEvents) {
          rawEvents.forEach((ev: any) => {
            const label = new Date(ev.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            if (perfDayMap[label]) {
              if (ev.event_type === 'story_open') {
                perfDayMap[label].views += 1
              } else if (ev.event_type === 'cta_click') {
                perfDayMap[label].clicks += 1
              }
            }
          })
        }

        const computedPerf: PerformanceDayPoint[] = Object.keys(perfDayMap).map(label => {
          const item = perfDayMap[label]
          const dayCtr = item.views > 0 ? (item.clicks / item.views) * 100 : 0
          return {
            date: label,
            views: item.views,
            clicks: item.clicks,
            social: item.social,
            ctr: parseFloat(dayCtr.toFixed(1))
          }
        })

        setData({
          views: viewsRes.count || 0,
          clicks: clicksRes.count || 0,
          paidCount,
          paidRevenue,
          pendingCount,
          pendingRevenue,
          referralEarnings: totalReferrals,
          likes: totalLikes,
          comments: totalComments
        })

        setFinancialChartData(Object.values(finDayMap))
        setPerformanceChartData(computedPerf)
      } catch (err) {
        console.error("Erro ao computar métricas:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRealMetrics()
  }, [resolvedStoreId, tenantLoading, timeRange, customFrom, customTo])

  // CTR = Taxa de cliques nos cards de produto em relação às visualizações
  const ctr = data.views > 0 ? (data.clicks / data.views) * 100 : 0
  const ctrDelta = ctr - benchmark.avg_ctr
  const totalAppImpact = data.paidRevenue + data.referralEarnings

  const renderSectorBadge = (delta: number) => {
    const positive = delta >= 0
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full mt-1 border transition-colors",
        positive
          ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5"
          : "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/5"
      )}>
        {positive ? <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
        {positive ? '+' : ''}{delta.toFixed(1)}% vs Setor
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-[#f8fafc] dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-[#f8fafc] dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 animate-pulse" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-10 font-sans">
        {/* ══════════════════════════════════════════════════════════════════
            1. SEÇÃO FINANCEIRA
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-[#8a90a0]">
              Resultados Financeiros
            </h3>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400">
              Período: {timeRange === 'custom' ? 'Personalizado' : `Últimos ${timeRange.replace('d', ' dias')}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Aguardando Pagamento (Âmbar #f59e0b) */}
            <Card className="rounded-[1.6rem] border border-amber-200/60 dark:border-amber-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Aguardando Pagamento
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-amber-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-amber-400">Pedidos que não foram pagos</p>
                      <p className="mt-1 text-slate-300">Pedidos gerados (Pix/Boleto) aguardando compensação. <span className="font-semibold text-white">Dica:</span> Entre em contato com o lead e ofereça um cupom para fechar.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Hourglass size={20} className="stroke-[2.5]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.pendingRevenue)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-amber-600 dark:text-amber-400">{data.pendingCount}</span> {data.pendingCount === 1 ? 'pedido em aberto' : 'pedidos em aberto'}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Vendas Pagas (Verde #10b981) */}
            <Card className="rounded-[1.6rem] border border-emerald-200/60 dark:border-emerald-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Vendas Pagas
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-emerald-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-emerald-400">Pedidos pagos</p>
                      <p className="mt-1 text-slate-300">Vendas confirmadas geradas a partir dos Stories. <span className="font-semibold text-white">Dica:</span> Ofereça um Upsell ao cliente logo após a compra para aumentar o LTV.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="stroke-[2.5]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.paidRevenue)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.paidCount}</span> {data.paidCount === 1 ? 'pedido confirmado' : 'pedidos confirmados'}
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Indicações (Roxo / Indigo #8b5cf6) */}
            <Card className="rounded-[1.6rem] border border-purple-200/60 dark:border-purple-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Indicações
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-purple-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-purple-400">Faturamento Indica & Ganha</p>
                      <p className="mt-1 text-slate-300">Comissões recebidas indicando a plataforma. <span className="font-semibold text-white">Dica:</span> Compartilhe seu link exclusivo com outros lojistas para lucrar no automático.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <DollarSign size={20} className="stroke-[2.5]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.referralEarnings)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Comissões disponíveis
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Total Gerado (Azul #0091ff / Laranja #ff7a29) */}
            <Card className="rounded-[1.6rem] border-2 border-[#0091ff]/30 dark:border-[#ff7a29]/40 bg-gradient-to-br from-blue-50/40 via-white to-sky-50/30 dark:from-[#ff7a29]/10 dark:via-[#1a1f35] dark:to-[#1a1f35] shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#0091ff] dark:text-[#ff7a29]">
                    Total Gerado
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-[#0091ff] dark:hover:text-[#ff7a29] cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-[#0091ff] dark:text-[#ff7a29]">Impacto Total no seu Caixa</p>
                      <p className="mt-1 text-slate-300">Soma de Vendas Pagas + Ganhos de Indicação. <span className="font-semibold text-white">Dica:</span> Compare este valor com o plano do Vidlytics para ver o ROI líquido.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#0091ff] dark:bg-[#ff7a29] text-white flex items-center justify-center shrink-0">
                  <Wallet size={20} className="stroke-[2.5]" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-black text-[#0091ff] dark:text-[#ff7a29]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAppImpact)}
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Vendas Pagas + Indicações
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GRÁFICO DE LINHA FINANCEIRO COM FILTROS */}
          <Card className="rounded-[1.8rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 gap-3 border-b border-slate-100 dark:border-white/5">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  📈 Evolução Financeira Diária (R$)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitore faturamento aprovado, boletos/Pix em aberto e receitas por dia.
                </p>
              </div>

              {/* Botões de Filtro */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-black/30 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFinancialMetricFilter('all')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    financialMetricFilter === 'all'
                      ? "bg-white dark:bg-[#ff7a29] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  Todas Juntas
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialMetricFilter('pending')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    financialMetricFilter === 'pending'
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-amber-500"
                  )}
                >
                  Aguardando
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialMetricFilter('paid')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    financialMetricFilter === 'paid'
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-emerald-500"
                  )}
                >
                  Vendas Pagas
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialMetricFilter('referral')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    financialMetricFilter === 'referral'
                      ? "bg-purple-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-purple-500"
                  )}
                >
                  Indicações
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialMetricFilter('total')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    financialMetricFilter === 'total'
                      ? "bg-[#0091ff] dark:bg-[#ff7a29] text-white shadow-xs"
                      : "text-slate-500 hover:text-[#0091ff]"
                  )}
                >
                  Total Gerado
                </button>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                    tickFormatter={(v) => `R$ ${v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)), '']}
                    contentStyle={{
                      backgroundColor: isDark ? '#111524' : '#ffffff',
                      borderRadius: '14px',
                      border: isDark ? '1px solid rgba(255, 122, 41, 0.3)' : '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {(financialMetricFilter === 'all' || financialMetricFilter === 'pending') && (
                    <Line
                      name="Aguardando Pagamento"
                      type="monotone"
                      dataKey="pending"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f59e0b' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {(financialMetricFilter === 'all' || financialMetricFilter === 'paid') && (
                    <Line
                      name="Vendas Pagas"
                      type="monotone"
                      dataKey="paid"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#10b981' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {(financialMetricFilter === 'all' || financialMetricFilter === 'referral') && (
                    <Line
                      name="Indicações"
                      type="monotone"
                      dataKey="referral"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#8b5cf6' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {(financialMetricFilter === 'all' || financialMetricFilter === 'total') && (
                    <Line
                      name="Total Gerado"
                      type="monotone"
                      dataKey="total"
                      stroke={isDark ? '#ff7a29' : '#0091ff'}
                      strokeWidth={3}
                      dot={{ r: 3, fill: isDark ? '#ff7a29' : '#0091ff' }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2. SEÇÃO DE PERFORMANCE DOS VÍDEOS & INTERAÇÃO DO PÚBLICO
        ══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-[#8a90a0]">
              Performance dos Vídeos & Interação do Público
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Visualizações (Azul #0091ff) */}
            <Card className="rounded-[1.6rem] border border-blue-200/60 dark:border-blue-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Visualizações
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-blue-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-blue-400">Total de Visualizações</p>
                      <p className="mt-1 text-slate-300">Número de vezes que seus stories foram abertos. <span className="font-semibold text-white">Dica:</span> Deixe o widget visível logo na primeira dobra do site para atrair mais cliques.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Eye size={20} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {data.views.toLocaleString('pt-BR')}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sessões de stories abertas</p>
              </CardContent>
            </Card>

            {/* Card 2: Cliques em CTA (Laranja #ff7a29) */}
            <Card className="rounded-[1.6rem] border border-orange-200/60 dark:border-orange-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cliques em CTA
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-orange-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-orange-400">Interesse Direto de Compra</p>
                      <p className="mt-1 text-slate-300">Cliques nos botões e cards de produtos anexados aos vídeos. <span className="font-semibold text-white">Dica:</span> Fale no vídeo: "Toque no produto abaixo para comprar com frete grátis".</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-[#ff7a29] flex items-center justify-center shrink-0">
                  <MousePointerClick size={20} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {data.clicks.toLocaleString('pt-BR')}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Cliques no card/botão de compra</p>
              </CardContent>
            </Card>

            {/* Card 3: Engajamento Social (Rosa #f43f5e) */}
            <Card className="rounded-[1.6rem] border border-rose-200/60 dark:border-rose-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Engajamento Social
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-rose-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-rose-400">Conexão com a Marca</p>
                      <p className="mt-1 text-slate-300">Curtidas e comentários deixados nos vídeos. <span className="font-semibold text-white">Dica:</span> Faça perguntas no vídeo ("Qual cor você prefere?") para gerar comentários imediatos.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <Heart size={20} className="fill-rose-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mt-0.5">
                  <div>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-500">
                      {data.likes}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Curtidas</span>
                  </div>
                  <div className="border-l border-slate-200 dark:border-white/10 pl-4">
                    <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                      {data.comments}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Comentários</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: CTR - Taxa de Cliques no Produto (Verde Esmeralda #10b981) */}
            <Card className="rounded-[1.6rem] border border-emerald-200/60 dark:border-emerald-500/30 bg-white dark:bg-[#1a1f35]/90 shadow-xs hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    CTR (Taxa de Cliques)
                  </span>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-emerald-500 cursor-pointer">
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs bg-slate-900 text-white rounded-xl shadow-xl">
                      <p className="font-bold text-emerald-400">CTR (Click-Through Rate)</p>
                      <p className="mt-1 text-slate-300">Porcentagem de pessoas que assistiram e clicaram no produto. <span className="font-semibold text-white">Dica:</span> Vídeos diretos e focados na dor do cliente elevam o CTR para acima de 4%.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Percent size={20} className="stroke-[2.5]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {ctr.toFixed(1)}%
                </div>
                <div className="flex flex-col mt-0.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Cliques sobre visualizações</span>
                  {renderSectorBadge(ctrDelta)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GRÁFICO DE LINHA DE PERFORMANCE DE VÍDEOS COM FILTROS */}
          <Card className="rounded-[1.8rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 gap-3 border-b border-slate-100 dark:border-white/5">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  🎬 Evolução Diária de Engajamento & Funil de Vídeos
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Acompanhe o volume de visualizações, cliques nos produtos, reações e a taxa de CTR ao longo do tempo.
                </p>
              </div>

              {/* Botões de Filtro */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-black/30 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPerformanceMetricFilter('all')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    performanceMetricFilter === 'all'
                      ? "bg-white dark:bg-[#ff7a29] text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  Todas Juntas
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceMetricFilter('views')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    performanceMetricFilter === 'views'
                      ? "bg-blue-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-blue-500"
                  )}
                >
                  Visualizações
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceMetricFilter('clicks')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    performanceMetricFilter === 'clicks'
                      ? "bg-[#ff7a29] text-white shadow-xs"
                      : "text-slate-500 hover:text-[#ff7a29]"
                  )}
                >
                  Cliques CTA
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceMetricFilter('social')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    performanceMetricFilter === 'social'
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-rose-500"
                  )}
                >
                  Engajamento
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceMetricFilter('ctr')}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                    performanceMetricFilter === 'ctr'
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-500 hover:text-emerald-500"
                  )}
                >
                  CTR (%)
                </button>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#111524' : '#ffffff',
                      borderRadius: '14px',
                      border: isDark ? '1px solid rgba(255, 122, 41, 0.3)' : '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                  {(performanceMetricFilter === 'all' || performanceMetricFilter === 'views') && (
                    <Line
                      name="Visualizações"
                      type="monotone"
                      dataKey="views"
                      stroke="#0091ff"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#0091ff' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {(performanceMetricFilter === 'all' || performanceMetricFilter === 'clicks') && (
                    <Line
                      name="Cliques em CTA"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#ff7a29"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#ff7a29' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {(performanceMetricFilter === 'all' || performanceMetricFilter === 'social') && (
                    <Line
                      name="Engajamento Social"
                      type="monotone"
                      dataKey="social"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#f43f5e' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {(performanceMetricFilter === 'all' || performanceMetricFilter === 'ctr') && (
                    <Line
                      name="Taxa de Cliques (CTR %)"
                      type="monotone"
                      dataKey="ctr"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#10b981' }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. BENCHMARK DO SETOR
        ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 p-5 rounded-[1.6rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Compass className="w-7 h-7 text-[#0091ff] dark:text-[#ff7a29] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Como funciona o benchmark do setor?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                As metas de comparação do setor de <strong>{benchmark?.sector_name || 'Geral'}</strong> são baseadas em pesquisas consolidadas de mercado nacional de 2026 (Ebit/Nielsen, Neotrust e Social Commerce global).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBenchmarkModalOpen(true)}
            className="bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <FileText size={14} className="text-white" />
            Ver Estudo de Mercado
          </button>
        </div>

        {/* MODAL BENCHMARK */}
        {isBenchmarkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl shadow-2xl p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsBenchmarkModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] text-slate-500 dark:text-slate-400 hover:text-[#0091ff] dark:hover:text-[#ff7a29] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-1.5 border-b border-slate-100 dark:border-[#ff7a29]/20 pb-5">
                <span className="inline-flex items-center gap-1 bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/30 text-[#0091ff] dark:text-[#ff7a29] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Inteligência Setorial 2026
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  Estudo de Mercado: {benchmark?.sector_name || 'Geral'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Métricas ideais compiladas do ecossistema de Social Commerce do varejo brasileiro.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200 dark:border-[#ff7a29]/30">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CTR Médio (Cliques)</span>
                  <p className="text-2xl font-black text-[#0091ff] dark:text-[#ff7a29] mt-1">{benchmark?.avg_ctr || 0}%</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Taxa ideal de cliques no card de produto durante a exibição.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200 dark:border-[#ff7a29]/30">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CVR Médio (Conversão)</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{benchmark?.avg_cvr || 0}%</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Taxa ideal de vendas pagas em relação às visualizações totais.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200 dark:border-[#ff7a29]/30">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hook Rate (Fisgada 3s)</span>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{benchmark?.avg_hook_rate || 0}%</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Média de retenção de usuários nos primeiros 3s críticos do vídeo.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4 bg-slate-50/50 dark:bg-[#171c30]/50 border border-slate-200 dark:border-[#ff7a29]/30 p-5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#0091ff] dark:text-[#ff7a29]" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Playbook de Ação para Alcançar a Meta
                  </h4>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Comportamento do Consumidor:</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      {playbook.audienceBehavior}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-[#ff7a29]/20 pt-3.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Recomendações Práticas (2026):</span>
                    <div className="space-y-2">
                      {playbook.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <div className="p-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md shrink-0 mt-0.5">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                          <span className="leading-relaxed">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#ff7a29]/20 text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                * Estudo compilado em Janeiro/2026 a partir do cruzamento de pesquisas de mercado nacional e taxas empíricas de Social Video Commerce do varejo digital brasileiro B2C.
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
