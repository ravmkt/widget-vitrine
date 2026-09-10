import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Trophy,
  Hourglass,
  CheckCircle2,
  Wallet,
  ArrowUpRight
} from 'lucide-react'
import type { SectorBenchmark } from '@/pages/PerformancePage'
import { cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface OverviewTabProps {
  timeRange: string
  customFrom?: string
  customTo?: string
  benchmark: SectorBenchmark
}

interface ChartDataPoint {
  date: string
  views: number
  clicks: number
}

export function OverviewTab({
  timeRange,
  customFrom,
  customTo,
  benchmark
}: OverviewTabProps) {
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

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
        };
      case 'beleza_cosmeticos':
        return {
          audienceBehavior: "O público de cosméticos busca textura, aplicação prática e provas reais de eficácia. Vídeos no estilo 'Get Ready With Me' e reviews sinceros dominam o engajamento.",
          tips: [
            "Prova e Aplicação Real: Faça stories mostrando a textura do produto na pele e o resultado instantâneo sem filtros artificiais.",
            "Uso de Micro-Influenciadores: Vídeos de pessoas comuns fazendo unboxing e primeiras impressões aumentam o CVR de beleza em até 32%.",
            "Dicas de Rotina (Skincare/Make): Crie sequências curtas educacionais integrando o produto em um ritual de autocuidado diário."
          ]
        };
      case 'eletronicos':
        return {
          audienceBehavior: "Consumidores de tecnologia são extremamente racionais e técnicos. Buscam demonstrações funcionais, unboxings e testes de durabilidade.",
          tips: [
            "Uso Funcional Imediato: Mostre o eletrônico executando sua principal função nos primeiros 3 segundos.",
            "Resolvendo uma Dor: Demonstre como o produto economiza tempo ou resolve um gargalo real.",
            "Unboxing Dinâmico: Stories ágeis de 15s mostrando o pacote completo."
          ]
        };
      default:
        return {
          audienceBehavior: "Comportamento de varejo digital focado em dinamismo, gatilhos visuais e clareza imediata de proposta de valor.",
          tips: [
            "Regra dos 3 Segundos: Apresente o benefício ou dor resolvida logo no início.",
            "Legendas Sempre Ativas: Garanta que quem assiste sem som consiga comprar com facilidade.",
            "CTA Direto: Aponte um botão visível direto para o checkout ou página de compra."
          ]
        };
    }
  };

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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

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
          supabase.from('tracking_events').select('event_type').eq('tenant_id', resolvedStoreId).in('event_type', ['story_like', 'story_comment']).gte('created_at', dateString),
          supabase.from('referral_rewards').select('amount').eq('referrer_store_id', resolvedStoreId).eq('status', 'paid').gte('created_at', dateString)
        ])

        let paidRevenue = 0
        let paidCount = 0
        let pendingRevenue = 0
        let pendingCount = 0

        if (conversionsRes.data) {
          const convList = conversionsRes.data as Array<{ order_value: number; status: string }>
          for (const item of convList) {
            const val = Number(item.order_value) || 0
            const st = (item.status || 'pending').toLowerCase()

            if (st === 'paid' || st === 'approved' || st === 'completed') {
              paidRevenue += val
              paidCount += 1
            } else {
              pendingRevenue += val
              pendingCount += 1
            }
          }
        }

        let totalReferrals = 0
        if (referralRes.data) {
          totalReferrals = referralRes.data.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0)
        }

        const totalLikes = socialRes.data?.filter((e: any) => e.event_type === 'story_like').length || 0
        const totalComments = socialRes.data?.filter((e: any) => e.event_type === 'story_comment').length || 0

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

        const { data: rawEvents } = await supabase
          .from('tracking_events')
          .select('created_at, event_type')
          .eq('tenant_id', resolvedStoreId)
          .in('event_type', ['story_open', 'cta_click'])
          .gte('created_at', dateString)
          .order('created_at', { ascending: true })

        const daysMap: { [key: string]: ChartDataPoint } = {}
        const tempDate = new Date(dateLimit)
        const today = new Date()

        while (tempDate <= today) {
          const label = tempDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          daysMap[label] = { date: label, views: 0, clicks: 0 }
          tempDate.setDate(tempDate.getDate() + 1)
        }

        if (rawEvents) {
          rawEvents.forEach((ev: any) => {
            const dateObj = new Date(ev.created_at)
            const label = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            if (daysMap[label]) {
              if (ev.event_type === 'story_open') {
                daysMap[label].views++
              } else if (ev.event_type === 'cta_click') {
                daysMap[label].clicks++
              }
            }
          })
        }

        setChartData(Object.values(daysMap))
      } catch (err) {
        console.error("Erro ao computar métricas reais do funil:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRealMetrics()
  }, [resolvedStoreId, tenantLoading, timeRange, customFrom, customTo])

  const ctr = data.views > 0 ? (data.clicks / data.views) * 100 : 0
  const cvr = data.views > 0 ? (data.paidCount / data.views) * 100 : 0

  const ctrDelta = ctr - benchmark.avg_ctr
  const cvrDelta = cvr - benchmark.avg_cvr

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
        <div className="h-28 bg-[#f8fafc] dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 animate-pulse" />
        <div className="h-80 bg-[#f8fafc] dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans">
      {/* ── 1. BLOCO FINANCEIRO: FATURAMENTO & IMPACTO DIRETO DO APP ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
            Resultados Financeiros do Aplicativo
          </h3>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Período selecionado: {timeRange === 'custom' ? 'Personalizado' : `Últimos ${timeRange.replace('d', ' dias')}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Vendas Pagas */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Vendas Pagas
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="stroke-[2.5]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.paidRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.paidCount}</span> {data.paidCount === 1 ? 'pedido confirmado' : 'pedidos confirmados'}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Aguardando Pagamento */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Aguardando Pagamento
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Hourglass size={20} className="stroke-[2.5]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.pendingRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-amber-600 dark:text-amber-400">{data.pendingCount}</span> {data.pendingCount === 1 ? 'pedido em aberto (Pix/Boleto)' : 'pedidos em aberto (Pix/Boleto)'}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Comissões Indica & Ganha */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Faturamento Indicações
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29] flex items-center justify-center shrink-0">
                <DollarSign size={20} className="stroke-[2.5]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.referralEarnings)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Comissões líquidas geradas
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Impacto Total do Aplicativo */}
          <Card className="rounded-[1.6rem] border-2 border-[#0091ff]/30 dark:border-[#ff7a29]/40 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-[#ff7a29]/10 dark:via-[#1a1f35] dark:to-[#1a1f35] shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-black uppercase tracking-wider text-[#0091ff] dark:text-[#ff7a29]">
                Impacto Total Gerado
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#0091ff] dark:bg-[#ff7a29] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Wallet size={20} className="stroke-[2.5]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-black text-[#0091ff] dark:text-[#ff7a29]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAppImpact)}
              </div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Vendas Confirmadas + Indicações
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 2. TABELA DE RESUMO DE FATURAMENTO & AUDITORIA ── */}
      <Card className="rounded-[1.8rem] border border-slate-200 dark:border-[#ff7a29]/20 bg-white dark:bg-[#1a1f35]/80 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Tabela de Consolidação de Receita
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Detalhamento de conversão por canal de receita do Vidlytics.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40 self-start sm:self-auto">
            {data.paidCount + data.pendingCount} conversões registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100 dark:border-white/5">
              <tr>
                <th className="py-3 px-5">Origem da Receita</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Volume (Qtd)</th>
                <th className="py-3 px-5">Ticket Médio</th>
                <th className="py-3 px-5 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-[#e8ecf4]">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Stories & Vídeos (Checkout Pago)
                </td>
                <td className="py-3.5 px-5">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    Aprovado / Pago
                  </span>
                </td>
                <td className="py-3.5 px-5 font-bold">{data.paidCount} pedidos</td>
                <td className="py-3.5 px-5">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    data.paidCount > 0 ? data.paidRevenue / data.paidCount : 0
                  )}
                </td>
                <td className="py-3.5 px-5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.paidRevenue)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold flex items-center gap-2">
                  <Hourglass size={16} className="text-amber-500" />
                  Stories & Vídeos (Pix / Boleto em Aberto)
                </td>
                <td className="py-3.5 px-5">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    Pendente
                  </span>
                </td>
                <td className="py-3.5 px-5 font-bold">{data.pendingCount} pedidos</td>
                <td className="py-3.5 px-5">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    data.pendingCount > 0 ? data.pendingRevenue / data.pendingCount : 0
                  )}
                </td>
                <td className="py-3.5 px-5 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.pendingRevenue)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td className="py-3.5 px-5 font-bold flex items-center gap-2">
                  <DollarSign size={16} className="text-[#0091ff] dark:text-[#ff7a29]" />
                  Programa Indica & Ganha
                </td>
                <td className="py-3.5 px-5">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase bg-blue-50 dark:bg-[#ff7a29]/15 text-[#0091ff] dark:text-[#ff7a29] border border-blue-200 dark:border-orange-500/30">
                    Disponível
                  </span>
                </td>
                <td className="py-3.5 px-5 font-bold">—</td>
                <td className="py-3.5 px-5">—</td>
                <td className="py-3.5 px-5 text-right font-black text-slate-900 dark:text-white text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.referralEarnings)}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50/80 dark:bg-white/[0.03] font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/10">
              <tr>
                <td className="py-3.5 px-5 uppercase tracking-wider text-[11px]" colSpan={4}>
                  Total Confirmado (Vendas Pagas + Comissões)
                </td>
                <td className="py-3.5 px-5 text-right text-base text-[#0091ff] dark:text-[#ff7a29]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAppImpact)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* ── 3. BLOCO DE ENGAJAMENTO & FUNIL DOS VÍDEOS ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
          Performance dos Vídeos & Interação do Público
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. VISUALIZAÇÕES */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Visualizações
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 text-[#0091ff] dark:text-[#ff7a29] flex items-center justify-center shrink-0">
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

          {/* 2. CLIQUES EM CTA */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cliques em CTA
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 text-[#0091ff] dark:text-[#ff7a29] flex items-center justify-center shrink-0">
                <MousePointerClick size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {data.clicks.toLocaleString('pt-BR')}
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">CTR: {ctr.toFixed(1)}%</span>
                {renderSectorBadge(ctrDelta)}
              </div>
            </CardContent>
          </Card>

          {/* 3. TAXA DE CONVERSÃO DOS VÍDEOS */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Conversão (CVR)
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Trophy size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {cvr.toFixed(1)}%
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Vendas por visualização</span>
                {renderSectorBadge(cvrDelta)}
              </div>
            </CardContent>
          </Card>

          {/* 4. ENGAJAMENTO SOCIAL */}
          <Card className="rounded-[1.6rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/90 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Engajamento Social
              </span>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Heart size={20} className="fill-rose-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-0.5">
                <div>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-500">
                    {data.likes}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Curtidas</span>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10 pl-4">
                  <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                    {data.comments}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Comentários</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 4. GRÁFICO DE EVOLUÇÃO TEMPORAL ── */}
      <Card className="rounded-[1.8rem] border border-slate-200 dark:border-[#ff7a29]/25 bg-white dark:bg-[#1a1f35]/80 p-6 shadow-sm">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            📊 Evolução Diária de Conversões e Visualizações
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comparativo de cliques em CTAs e exibições dos Stories ao longo do tempo selecionado.
          </p>
        </CardHeader>
        <CardContent className="p-0 h-80 w-full">
          {chartData.length === 0 || (data.views === 0 && data.clicks === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl p-6">
              <span className="text-3xl">📈</span>
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mt-2 text-sm">Sem dados históricos para exibir</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                Assim que seu widget receber interações, a linha de tendência será desenhada automaticamente.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0091ff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0091ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7a29" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ff7a29" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#111524' : '#ffffff',
                    borderRadius: '16px',
                    border: isDark ? '1px solid rgba(255, 122, 41, 0.3)' : '1px solid #e2e8f0',
                    color: isDark ? '#fff' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                />
                <Area
                  name="Visualizações"
                  type="monotone"
                  dataKey="views"
                  stroke="#0091ff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  name="Cliques em CTA"
                  type="monotone"
                  dataKey="clicks"
                  stroke="#ff7a29"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorClicks)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── 5. BENCHMARK DO SETOR ── */}
      <div className="bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 p-5 rounded-[1.6rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Compass className="w-7 h-7 text-[#0091ff] dark:text-[#ff7a29] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Como funciona o benchmark do setor?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
              As metas de comparação do setor de <strong>{benchmark?.sector_name || 'Geral'}</strong> são baseadas em pesquisas de mercado e inteligência competitiva nacional de 2026 (cruzando dados de Nielsen, Neotrust e Social Commerce global).
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

      {/* ── MODAL BENCHMARK ── */}
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
                Métricas e taxas ideais coletadas do ecossistema de Social Commerce do varejo brasileiro.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200 dark:border-[#ff7a29]/30">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CTR Médio (Cliques)</span>
                <p className="text-2xl font-black text-[#0091ff] dark:text-[#ff7a29] mt-1">{benchmark?.avg_ctr || 0}%</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Taxa ideal de visualizadores que clicam em um produto/CTA no story.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200 dark:border-[#ff7a29]/30">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CVR Médio (Conversão)</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{benchmark?.avg_cvr || 0}%</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Taxa ideal de vendas geradas em relação às visualizações totais.
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
              * Estudo metodológico compilado em Janeiro/2026 a partir do cruzamento de pesquisas consolidadas de mercado nacional (Ebit, Nielsen, Neotrust) e taxas empíricas de Social Video Commerce do varejo digital brasileiro B2C.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
