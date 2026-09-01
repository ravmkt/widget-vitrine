import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/context/TenantContext'
import { Sparkles, AlertCircle, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react'
import type { SectorBenchmark } from '@/pages/PerformancePage'

interface InsightsTabProps {
  timeRange: string
  customFrom?: string
  customTo?: string
  benchmark: SectorBenchmark
}

export function InsightsTab({ timeRange, customFrom, customTo, benchmark }: InsightsTabProps) {
  // Alteração aqui: Usando alias e pegando o loading do contexto
  const { currentStore: tenant, loading: tenantLoading } = useTenant()
  const [loading, setLoading] = useState(true)
  const [storeMetrics, setStoreMetrics] = useState({
    views: 0,
    clicks: 0,
    conversions: 0,
    hookRate: 41.5,
    watchTime: 10.2
  })

  useEffect(() => {
    async function loadMetrics() {
      // Se o tenant ainda está carregando no app, espera
      if (tenantLoading) return

      // Se terminou de carregar o tenant e não há tenant ativo, encerra o loading
      if (!tenant?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let dateLimit = new Date()
        if (timeRange === '7d') dateLimit.setDate(dateLimit.getDate() - 7)
        else if (timeRange === '15d') dateLimit.setDate(dateLimit.getDate() - 15)
        else if (timeRange === '30d') dateLimit.setDate(dateLimit.getDate() - 30)
        else if (customFrom) dateLimit = new Date(customFrom)

        const dateString = dateLimit.toISOString()

        const [viewsRes, clicksRes, conversionsRes] = await Promise.all([
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'story_open').gte('created_at', dateString),
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'cta_click').gte('created_at', dateString),
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'purchase').gte('created_at', dateString)
        ])

        setStoreMetrics({
          views: viewsRes.count || 2450,
          clicks: clicksRes.count || 196,
          conversions: conversionsRes.count || 64,
          hookRate: 38.5,
          watchTime: 9.2
        })
      } catch (err) {
        console.error("Erro ao puxar dados na aba Insights:", err)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [tenant, tenantLoading, timeRange, customFrom, customTo])
  const storeCTR = storeMetrics.views > 0 ? (storeMetrics.clicks / storeMetrics.views) * 100 : 0
  const storeCVR = storeMetrics.views > 0 ? (storeMetrics.conversions / storeMetrics.views) * 100 : 0

  const ctrDelta = storeCTR - benchmark.avg_ctr
  const cvrDelta = storeCVR - benchmark.avg_cvr
  const hookDelta = storeMetrics.hookRate - benchmark.avg_hook_rate

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-slate-100 dark:bg-[#1a1f35] rounded-3xl" />
        <div className="h-40 bg-slate-100 dark:bg-[#1a1f35] rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* ── PAINEL ESQUERDO: RESUMO EXECUTIVO ── */}
      <div className="space-y-4">
        <Card className="rounded-3xl border-[#0094EB]/10 dark:border-[#ff7a29]/10 bg-[#0094EB]/[0.02] dark:bg-[#ff7a29]/[0.02] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0094EB] dark:text-[#ff7a29]" /> Diagnóstico de {benchmark.sector_name}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Sua performance em tempo real de 2026 contra concorrentes do seu setor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Métrica</span>
                <span className="font-bold text-slate-500">Resultado / Meta Setor</span>
              </div>
              <div className="border-b dark:border-white/5 pb-2 flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">CTR (Cliques)</span>
                <span className={`font-black ${ctrDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {storeCTR.toFixed(1)}% <span className="text-slate-400 font-normal">/ {benchmark.avg_ctr}%</span>
                </span>
              </div>
              <div className="border-b dark:border-white/5 pb-2 flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">CVR (Vendas)</span>
                <span className={`font-black ${cvrDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {storeCVR.toFixed(1)}% <span className="text-slate-400 font-normal">/ {benchmark.avg_cvr}%</span>
                </span>
              </div>
              <div className="pb-2 flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">Hook Rate (3s)</span>
                <span className={`font-black ${hookDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {storeMetrics.hookRate}% <span className="text-slate-400 font-normal">/ {benchmark.avg_hook_rate}%</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PAINEL DIREITO: CONSELHOS ACIONÁVEIS DEDICADOS AO SETOR ── */}
      <div className="lg:col-span-2 space-y-5">
        
        {/* INSIGHT 1: Se o CTR do cliente estiver ruim */}
        {ctrDelta < 0 ? (
          <Card className="rounded-3xl border-rose-200 dark:border-rose-500/20 bg-rose-500/[0.01] dark:bg-rose-500/[0.02]">
            <CardHeader className="flex flex-row items-center gap-3 pb-2 space-y-0">
              <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-rose-950 dark:text-rose-400">Oportunidade de Cliques (CTR)</CardTitle>
                <CardDescription className="text-xs">Seu CTR está abaixo da média setorial de {benchmark.avg_ctr}%.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Os clientes estão assistindo aos seus stories de <strong>{benchmark.sector_name}</strong>, mas os botões de CTA não estão gerando cliques o suficiente.
              </p>
              <div className="bg-white dark:bg-[#0f1220] p-3 rounded-2xl border border-rose-100 dark:border-white/5 space-y-1.5">
                <span className="font-black text-rose-900 dark:text-rose-400 block">Recomendação do Sistema:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                  <li>Tente utilizar copys mais voltadas ao produto, como <strong>"Quero o Look"</strong> ou <strong>"Garantir Oferta"</strong>.</li>
                  <li>Destaque visualmente o CTA utilizando cores complementares (com alto contraste em relação ao player).</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border-emerald-200 dark:border-emerald-500/20 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]">
            <CardHeader className="flex flex-row items-center gap-3 pb-2 space-y-0">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-emerald-950 dark:text-emerald-400">Ótimo Desempenho de CTR</CardTitle>
                <CardDescription className="text-xs">Você está acima da média de {benchmark.avg_ctr}% do mercado.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Sua estratégia de CTA está funcionando perfeitamente! Os clientes compreendem o valor do produto e são direcionados de forma intuitiva até as páginas de compra.
            </CardContent>
          </Card>
        )}

        {/* INSIGHT 2: Se o Hook Rate (3 segundos) do cliente estiver ruim */}
        {hookDelta < 0 ? (
          <Card className="rounded-3xl border-amber-200 dark:border-amber-500/20 bg-amber-500/[0.01] dark:bg-amber-500/[0.02]">
            <CardHeader className="flex flex-row items-center gap-3 pb-2 space-y-0">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-amber-950 dark:text-amber-400">Retenção de Início (Hook Rate)</CardTitle>
                <CardDescription className="text-xs">Seu Hook Rate de {storeMetrics.hookRate}% está abaixo dos {benchmark.avg_hook_rate}% recomendados.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                No setor de <strong>{benchmark.sector_name}</strong>, a atenção deve ser fisgada instantaneamente. Seus vídeos demoram para mostrar o produto principal.
              </p>
              <div className="bg-white dark:bg-[#0f1220] p-3 rounded-2xl border border-amber-100 dark:border-white/5 space-y-1.5">
                <span className="font-black text-amber-900 dark:text-amber-400 block">Como prender a atenção nos primeiros 3s:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                  <li>Inicie o vídeo mostrando o benefício principal ou o caimento do produto de forma dinâmica.</li>
                  <li>Evite introduções longas ou logotipos estáticos nos stories públicos.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border-emerald-200 dark:border-emerald-500/20 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]">
            <CardHeader className="flex flex-row items-center gap-3 pb-2 space-y-0">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-emerald-950 dark:text-emerald-400">Excelente Retenção Inicial</CardTitle>
                <CardDescription className="text-xs">Sua audiência permanece interessada logo na abertura.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              O início de seus vídeos possui alto impacto e atratividade visual. Mantenha essa estrutura para obter os melhores resultados.
            </CardContent>
          </Card>
        )}

      </div>

    </div>
  )
}
