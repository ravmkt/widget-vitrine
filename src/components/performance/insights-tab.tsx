import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Sparkles, 
  Lightbulb, 
  ArrowUpRight, 
  TrendingUp, 
  Video, 
  AlertTriangle, 
  Zap,
  CheckCircle2,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightsTabProps {
  timeRange: string
}

export function InsightsTab({ timeRange }: InsightsTabProps) {
  // Simulação de insights inteligentes baseados na loja de teste
  const [insights, setInsights] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Gancho Inicial Altamente Eficiente',
      description: 'O vídeo "Calça Confort Bicolor Preto" obteve um Hook Rate de 74% nos primeiros 3 segundos. Esse comportamento de retenção está 15% acima da média do seu setor.',
      impact: 'Alto Impacto no CTR',
      actionText: 'Impulsionar mais esse criativo',
      icon: TrendingUp
    },
    {
      id: 2,
      type: 'warning',
      title: 'Queda Drástica de Retenção',
      description: 'O vídeo "Blusa Confort - Verde Jade" está sofrendo um drop-off de 60% antes do segundo 4. O público está ignorando o CTA do produto.',
      impact: 'Perda de Conversão',
      actionText: 'Re-editar os primeiros 3 segundos',
      icon: AlertTriangle
    },
    {
      id: 3,
      type: 'tip',
      title: 'Otimização de Horário Recomendada',
      description: 'Identificamos que 68% dos cliques em CTAs ocorrem entre 19:00 e 22:30. Considere colocar ofertas relâmpago de Stories fixos neste período.',
      impact: 'Aumento de CVR em potencial',
      actionText: 'Agendar Stories',
      icon: Lightbulb
    }
  ])

  return (
    <div className="space-y-6">
      {/* Header com chamada IA */}
      <div className="bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="w-[45px] h-[45px] rounded-2xl bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/20 text-[#0091ff] dark:text-[#ff7a29] flex items-center justify-center shrink-0">
            <Sparkles className="w-[22px] h-[22px] animate-pulse" />
          </div>
          <div>
            <h3 className="text-[18px] font-black text-slate-900 dark:text-white flex items-center gap-2">
              Vidlytics AI Insights
            </h3>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Análise inteligente do comportamento dos seus Stories nos últimos <strong>{timeRange === '7d' ? '7 dias' : '30 dias'}</strong>.
            </p>
          </div>
        </div>
        
        <span className="inline-flex items-center gap-1.5 bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/30 text-[#0091ff] dark:text-[#ff7a29] px-4 py-2 rounded-2xl text-[12px] font-black">
          <Zap className="w-4 h-4 fill-current" /> Modelo GPT-4o Ativo
        </span>
      </div>

      {/* Grid de Recomendações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {insights.map((insight) => {
          const IconComponent = insight.icon
          return (
            <Card 
              key={insight.id} 
              className={cn(
                "rounded-2xl border bg-white dark:bg-[#1a1f35] p-5 shadow-xs transition-all duration-300 flex flex-col justify-between hover:shadow-md",
                insight.type === 'success' && 'border-slate-200 dark:border-[#ff7a29]/30 hover:border-emerald-500/50',
                insight.type === 'warning' && 'border-slate-200 dark:border-[#ff7a29]/30 hover:border-amber-500/50',
                insight.type === 'tip' && 'border-slate-200 dark:border-[#ff7a29]/30 hover:border-[#0091ff]/50 dark:hover:border-[#ff7a29]/50'
              )}
            >
              <div>
                <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
                  <span className={cn(
                    "text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-2xl border",
                    insight.type === 'success' && 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15',
                    insight.type === 'warning' && 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/15',
                    insight.type === 'tip' && 'text-[#0091ff] dark:text-[#ff7a29] bg-[#0091ff]/5 dark:bg-[#ff7a29]/5 border-[#0091ff]/10 dark:border-[#ff7a29]/15'
                  )}>
                    {insight.impact}
                  </span>
                  <div className={cn(
                    "w-[45px] h-[45px] rounded-2xl flex items-center justify-center shrink-0 border",
                    insight.type === 'success' && 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                    insight.type === 'warning' && 'bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
                    insight.type === 'tip' && 'bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border-[#0091ff]/20 dark:border-[#ff7a29]/20 text-[#0091ff] dark:text-[#ff7a29]'
                  )}>
                    <IconComponent className="w-[22px] h-[22px]" />
                  </div>
                </CardHeader>

                <CardContent className="p-0 pt-2">
                  <h4 className="text-[16px] font-black text-slate-800 dark:text-white leading-tight">
                    {insight.title}
                  </h4>
                  <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {insight.description}
                  </p>
                </CardContent>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#ff7a29]/20 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Ação Sugerida:</span>
                <button className="text-[12px] font-black text-[#0091ff] dark:text-[#ff7a29] hover:underline flex items-center gap-1 cursor-pointer">
                  {insight.actionText} <ChevronRight size={14} />
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
