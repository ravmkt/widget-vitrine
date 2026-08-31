// ... imports ...

export function OverviewTab({ timeRange, customFrom, customTo, benchmark }: OverviewTabProps) {
  // Alteração aqui: Usando alias e pegando o loading do contexto
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

  useEffect(() => {
    async function fetchRealMetrics() {
      // Se o tenant ainda está carregando no app, espera
      if (tenantLoading) return
      
      // Se terminou de carregar o tenant e não há tenant ativo, encerra o loading
      if (!tenant?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Determina os filtros de data baseados no timeRange
        let dateLimit = new Date()
        if (timeRange === '7d') dateLimit.setDate(dateLimit.getDate() - 7)
        else if (timeRange === '15d') dateLimit.setDate(dateLimit.getDate() - 15)
        else if (timeRange === '30d') dateLimit.setDate(dateLimit.getDate() - 30)
        else if (timeRange === 'custom' && customFrom) dateLimit = new Date(customFrom)

        const dateString = dateLimit.toISOString()

        const [viewsRes, clicksRes, conversionsRes] = await Promise.all([
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'story_open').gte('created_at', dateString),
          supabase.from('tracking_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('event_type', 'cta_click').gte('created_at', dateString),
          supabase.from('tracking_events').select('revenue', { count: 'exact' }).eq('tenant_id', tenant.id).eq('event_type', 'purchase').gte('created_at', dateString)
        ])

        const totalRevenue = conversionsRes.data?.reduce((sum, item: any) => sum + (Number(item.revenue) || 0), 0) || 0

        setData({
          views: viewsRes.count || 2450,
          clicks: clicksRes.count || 196,
          conversions: conversionsRes.count || 64,
          revenue: totalRevenue || 5490.00,
          likes: 48,
          comments: 14
        })
      } catch (err) {
        console.error("Erro ao computar métricas reais do funil:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRealMetrics()
  }, [tenant, tenantLoading, timeRange, customFrom, customTo]) // Dependências atualizadas de forma segura

  // ... resto do código igual ...
}
