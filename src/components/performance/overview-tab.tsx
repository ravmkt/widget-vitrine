import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/context/TenantContext'
import { 
  HelpCircle, 
  FileText, 
  X, 
  Check, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  Compass, 
  Eye, 
  MousePointerClick, 
  TrendingDown, 
  CircleDollarSign, 
  Heart, 
  Trophy 
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
  // ── INÍCIO DA ADIÇÃO DO STATE E DO PLAYBOOK ──
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false)

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
      case 'artesanato':
        return {
          audienceBehavior: "O comprador de artesanato valoriza o processo criativo, a exclusividade e a história por trás de cada detalhe. O 'fazer manual' gera uma conexão afetiva poderosa.",
          tips: [
            "Storytelling do Processo ('Crafting'): Grave vídeos acelerados do produto sendo fabricado à mão. Esse formato gera um Hook Rate de até 75%.",
            "Selo de Exclusividade: Enfatize na narração e nos textos flutuantes que cada lote do produto é único e limitado.",
            "Vídeos de Embalagem: Stories mostrando o cuidado na hora de embalar e escrever cartinhas personalizadas para o cliente geram alto engajamento."
          ]
        };
      case 'eletronicos':
        return {
          audienceBehavior: "Consumidores de tecnologia são extremamente racionais e técnicos. Eles buscam demonstrações de recursos específicos, unboxings detalhados e testes de durabilidade.",
          tips: [
            "Uso Funcional Imediato: Não mostre o eletrônico desligado. O vídeo deve começar com o aparelho executando sua principal função ou brilhando.",
            "Resolvendo uma Dor Técnica: Mostre como o gadget economiza tempo ou resolve um gargalo técnico específico no dia a dia.",
            "Unboxing Dinâmico: Stories ágeis de 15s revelando o que vem na caixa e o sentimento de novidade estimulam a conversão."
          ]
        };
      case 'casa_decoracao':
        return {
          audienceBehavior: "Compradores de decoração buscam harmonização e transformação de ambientes. Eles precisam visualizar o objeto inserido em um contexto residencial completo.",
          tips: [
            "O Poder do Antes e Depois: Grave stories rápidos mostrando um cômodo sem graça sendo transformado instantaneamente com o seu produto.",
            "Ambientação Realista: Evite fundo branco de estúdio. Filme o objeto sob iluminação natural em salas, quartos ou cozinhas reais.",
            "Proporção e Dimensões: Pegue o objeto na mão ou coloque-o ao lado de itens comuns para que o cliente tenha noção exata do tamanho."
          ]
        };
      case 'saude_suplementos':
        return {
          audienceBehavior: "Setor movido por confiança, autoridade científica e benefícios claros para a saúde. O cliente precisa compreender o impacto direto da fórmula na sua rotina.",
          tips: [
            "Explicação Simples dos Benefícios: Use legendas flutuantes coloridas listando as 3 principais melhorias físicas que o suplemento traz.",
            "Rotina Matinal/Pré-Treino: Grave vídeos dinâmicos de preparo, mistura do produto e consumo diário, reforçando a consistência de uso.",
            "Origem e Certificação: Destaque a pureza dos ingredientes, selos da Anvisa ou recomendações profissionais nos primeiros segundos."
          ]
        };
      case 'pet_shop':
        return {
          audienceBehavior: "Tutores tratam seus animais de estimação como membros da família. O apelo emocional focado em fofura, alegria e bem-estar animal é imbatível.",
          tips: [
            "Pets Usando o Produto: Mostre o cachorro ou gato se divertindo com o brinquedo ou saboreando o petisco com entusiasmo.",
            "Alívio de Stress/Dificuldade: Demonstre como o produto acalma o pet, melhora a higiene ou facilita a rotina de banho e alimentação.",
            "Alta Carga de Fofura: Use áudios carinhosos ou divertidos e garanta closes bem nítidos na expressão de felicidade do pet."
          ]
        };
      case 'esporte_lazer':
        return {
          audienceBehavior: "Público motivado por performance, superação física e pertencimento a uma tribo. O story deve transpirar energia, resistência e atividade física real.",
          tips: [
            "Produto Sob Esforço: Grave o tênis na corrida, a roupa suportando o agachamento ou o acessório sendo usado sob sol e chuva.",
            "Gatilho de Inspiração: Crie histórias que incentivem o cliente a começar a praticar exercícios hoje mesmo usando a sua marca.",
            "Destaque Tecnológico: Mostre a elasticidade do tecido, respirabilidade ou leveza através de testes dinâmicos de vídeo."
          ]
        };
      case 'infantil_brinquedos':
        return {
          audienceBehavior: "A compra é feita pelos pais, mas motivada pela alegria e desenvolvimento dos filhos. Destaque segurança, estímulo cognitivo e momentos felizes em família.",
          tips: [
            "Crianças Brincando Livremente: Mostre a interação genuína e as risadas das crianças interagindo com o brinquedo de forma segura.",
            "Benefício Educativo: Explique rapidamente quais habilidades motoras, criativas ou sociais o produto ajuda a desenvolver.",
            "Fácil Limpeza e Durabilidade: Faça stories mostrando a resistência do material a quedas e como é prático de limpar no dia a dia."
          ]
        };
      case 'alimentos_bebidas':
        return {
          audienceBehavior: "O apetite-appeal é a chave de ouro. O cliente precisa 'comer com os olhos'. O som da crocância, a fumaça quente ou o brilho do alimento vendem o produto na hora.",
          tips: [
            "Closes Sensoriais Extremas: O queijo derretendo, o corte macio de uma carne ou a calda de chocolate caindo bem devagar sobre o doce.",
            "Efeitos de Áudio (ASMR): Capte o som real da embalagem abrindo, do gelo caindo no copo ou da crocância ao morder.",
            "Segurança de Preparo: Mostre a higiene da cozinha, o carinho na montagem do prato e a velocidade de entrega rápida."
          ]
        };
      case 'joias_semijoias':
        return {
          audienceBehavior: "Mercado de luxo, autoestima e presentes memoráveis. O foco deve ser o brilho sob iluminação correta, o refinamento da peça e a embalagem luxuosa.",
          tips: [
            "O Jogo da Luz: Filme as joias sob luz natural direta para capturar o reflexo e o brilho real de cada detalhe e pedra preciosa.",
            "Modelos em Close: Mostre a peça sendo usada de forma harmoniosa no pescoço, orelha ou dedos, para dar noção de escala e sofisticação.",
            "Experiência do Unboxing Premium: Grave o processo de abertura de caixas de veludo, sacolas de seda e certificados de garantia."
          ]
        };
      default:
        return {
          audienceBehavior: "Comportamento geral de e-commerce e varejo digital baseado em vídeos rápidos, explicativos e com forte apelo visual imediato.",
          tips: [
            "Regra dos 3 Segundos: Coloque a maior transformação do seu produto logo no início para capturar a atenção do usuário.",
            "Legendas Sempre Ativas: 80% do público assiste vídeos sem áudio. O uso de textos grandes na tela é obrigatório para não perder vendas.",
            "CTA Claro: Mantenha um único botão direcionando o usuário para a ação que você deseja (Ex: Compre Agora)."
          ]
        };
    }
  };

  const playbook = getSectorStrategicPlaybook(benchmark?.sector_key || 'default')
  // ── FIM DA ADIÇÃO DO STATE E DO PLAYBOOK ──

  const { currentStore: tenant, loading: tenantLoading } = useTenant()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    views: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    likes: 0,
    comments: 0
  })
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  useEffect(() => {
    async function fetchRealMetrics() {
      if (tenantLoading) return

      // Evita disparar requisições para o id default nulo ou vazio
      if (!tenant?.id || tenant.id === '11111111-1111-4111-8111-111111111111') {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let dateLimit = new Date()
        let daysCount = 30
        if (timeRange === '7d') {
          dateLimit.setDate(dateLimit.getDate() - 7)
          daysCount = 7
        } else if (timeRange === '15d') {
          dateLimit.setDate(dateLimit.getDate() - 15)
          daysCount = 15
        } else if (timeRange === '30d') {
          dateLimit.setDate(dateLimit.getDate() - 30)
          daysCount = 30
        } else if (timeRange === 'custom' && customFrom) {
          dateLimit = new Date(customFrom)
          const diffTime = Math.abs(new Date().getTime() - dateLimit.getTime())
          daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        const dateString = dateLimit.toISOString()

        // 1. Busca dados agregados para os cards
        const [viewsRes, clicksRes, conversionsRes, socialRes] = await Promise.all([
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'story_open').gte('created_at', dateString),
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'cta_click').gte('created_at', dateString),
          supabase.from('tracking_events').select('revenue', { count: 'exact' }).eq('tenant_id', tenant.id).eq('event_type', 'purchase').gte('created_at', dateString),
          supabase.from('tracking_events').select('event_type').eq('tenant_id', tenant.id).in('event_type', ['story_like', 'story_comment']).gte('created_at', dateString)
        ])

        const totalRevenue = conversionsRes.data?.reduce((sum, item: any) => sum + (Number(item.revenue) || 0), 0) || 0
        const totalLikes = socialRes.data?.filter((e: any) => e.event_type === 'story_like').length || 0
        const totalComments = socialRes.data?.filter((e: any) => e.event_type === 'story_comment').length || 0

        setData({
          views: viewsRes.count || 0,
          clicks: clicksRes.count || 0,
          conversions: conversionsRes.count || 0,
          revenue: totalRevenue,
          likes: totalLikes,
          comments: totalComments
        })

        // 2. Busca e monta os dados do gráfico dinamicamente
        const { data: rawEvents } = await supabase
          .from('tracking_events')
          .select('created_at, event_type')
          .eq('tenant_id', tenant.id)
          .in('event_type', ['story_open', 'cta_click'])
          .gte('created_at', dateString)
          .order('created_at', { ascending: true })

        // Preencher o histórico com zeros para não quebrar a linha do gráfico
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
  }, [tenant, tenantLoading, timeRange, customFrom, customTo])

  const ctr = data.views > 0 ? (data.clicks / data.views) * 100 : 0
  const cvr = data.views > 0 ? (data.conversions / data.views) * 100 : 0

  const ctrDelta = ctr - benchmark.avg_ctr
  const cvrDelta = cvr - benchmark.avg_cvr

  const renderSectorBadge = (delta: number) => {
    const positive = delta >= 0
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-1.5 border",
        positive
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
      )}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {positive ? '+' : ''}{delta.toFixed(1)}% vs Setor
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-[#1a1f35] rounded-3xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-100 dark:bg-[#1a1f35] rounded-3xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── METRICAS DO FUNIL ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. VISUALIZAÇÕES */}
        <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f35] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              1. Visualizações
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Eye className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800 dark:text-white">
              {data.views.toLocaleString('pt-BR')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Interações no widget</p>
          </CardContent>
        </Card>

        {/* 2. CLIQUES */}
        <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f35] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              2. Cliques em CTA
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800 dark:text-white">
              {data.clicks.toLocaleString('pt-BR')}
            </div>
            <div className="flex flex-col mt-0.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">CTR: {ctr.toFixed(1)}%</span>
              {renderSectorBadge(ctrDelta)}
            </div>
          </CardContent>
        </Card>

        {/* 3. VENDAS */}
        <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f35] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              3. Vendas Realizadas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Trophy className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800 dark:text-white">
              {data.conversions.toLocaleString('pt-BR')}
            </div>
            <div className="flex flex-col mt-0.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Conversão: {cvr.toFixed(1)}%</span>
              {renderSectorBadge(cvrDelta)}
            </div>
          </CardContent>
        </Card>

        {/* 4. RECEITA */}
        <Card className="rounded-3xl border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              4. Faturamento ROI
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-500 mt-1 font-bold">Vendas Diretas dos Vídeos</p>
          </CardContent>
        </Card>

        {/* 5. ENGAJAMENTO SOCIAL */}
        <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f35] shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Engajamento Social
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mt-1">
              <div>
                <span className="text-base font-black text-rose-500 flex items-center gap-1">
                  ❤️ {data.likes}
                </span>
                <span className="text-[9px] text-slate-400">Curtidas</span>
              </div>
              <div className="border-l border-slate-100 dark:border-white/10 pl-4">
                <span className="text-base font-black text-sky-500 flex items-center gap-1">
                  💬 {data.comments}
                </span>
                <span className="text-[9px] text-slate-400">Comentários</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── NOVO GRÁFICO DE EVOLUÇÃO TEMPORAL (RECHARTS) ── */}
      <Card className="rounded-3xl border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f35] p-6 shadow-sm">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            📊 Evolução Diária de Conversões
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">Comparativo de cliques em CTAs e exibições dos Stories ao longo do tempo</p>
        </CardHeader>
        <CardContent className="p-0 h-80 w-full">
          {chartData.length === 0 || (data.views === 0 && data.clicks === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl p-6">
              <span className="text-3xl">📈</span>
              <h5 className="font-bold text-slate-700 dark:text-slate-300 mt-2">Sem dados históricos para exibir</h5>
              <p className="text-xs text-slate-400 max-w-xs mt-1">Assim que seu widget receber as primeiras interações, o gráfico de evolução será desenhado automaticamente.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                    borderRadius: '16px', 
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  name="Visualizações"
                  type="monotone" 
                  dataKey="views" 
                  stroke="#38bdf8" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
                <Area 
                  name="Cliques em CTA"
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#6366f1" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorClicks)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── CONTEXTO DO MERCADO ── */}
      <div className="bg-slate-50 dark:bg-[#0f1220] border border-slate-100 dark:border-white/5 p-4 rounded-3xl flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-slate-800 dark:text-slate-200">Como funciona o benchmark do setor?</h4>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Nós analisamos os dados agregados das lojas do setor de <strong>{benchmark.sector_name}</strong> que utilizam a nossa tecnologia e criamos metas baseadas em CTR e Conversão de vendas reais de 2026.
          </p>
        </div>
      </div>
    </div>
  )
}
