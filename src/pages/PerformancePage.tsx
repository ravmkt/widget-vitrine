// ... imports ...

export default function PerformancePage() {
  // Alteração aqui: Renomeando currentStore para tenant e pegando o loading do contexto
  const { currentStore: tenant, loading: tenantLoading } = useTenant()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({})

  // ... resto do código igual ...

  // Carrega o setor configurado na loja do tenant logado
  useEffect(() => {
    async function loadSectorAndBenchmark() {
      // Evita rodar se o tenant ainda estiver carregando
      if (tenantLoading) return;
      if (!tenant?.id) return;
      
      try {
        // 1. Busca o setor definido nas configurações da loja
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('sector')
          .eq('tenant_id', tenant.id)
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
  }, [tenant, tenantLoading]); // Adicionado tenantLoading nas dependências

  // ... resto do código igual ...
}
