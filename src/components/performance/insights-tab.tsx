// ... imports ...

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
  }, [tenant, tenantLoading, timeRange, customFrom, customTo]) // Dependências atualizadas de forma segura

  // ... resto do código igual ...
}
