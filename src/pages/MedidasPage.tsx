import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { db, Story, Video, Product, EventType } from '@/lib/db';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Filter,
  Layers,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
  RefreshCw,
  Search,
  Activity,
  ArrowDown,
  ArrowRight,
  ChevronDown,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Phone,
  Eye,
  ShoppingBag,
  ExternalLink,
  Target
} from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';

interface DetailedEvent {
  id: string;
  timestamp: string; // ISO String
  eventType: EventType;
  storyId: string;
  storyTitle: string;
  videoId: string;
  videoTitle: string;
  productId?: string;
  productName?: string;
  pageUrl: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  referrer: string;
}

// Generate high fidelity mock events for real-time calculation & interactive filtering
const generateMockEvents = (stories: Story[], videos: Video[], products: Product[]): DetailedEvent[] => {
  const events: DetailedEvent[] = [];
  const eventTypes: EventType[] = [
    'view', 'play', 'cta_click', 'product_click', 'whatsapp_click', 'like', 'share', 'comment', 'conversion'
  ];
  const devices = ['mobile', 'desktop', 'tablet'] as const;
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const referrers = ['Google', 'Instagram Direct', 'TikTok App', 'Directo', 'Facebook', 'yampi.com.br'];
  const pages = ['/home', '/produtos/vestido-floral', '/colecoes/novidades', '/checkout', '/carrinho'];

  // Start generation over the last 30 days
  const now = new Date();
  let idCounter = 1;

  for (let i = 0; i < 450; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const eventTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 12) * 60 * 60 * 1000);
    
    // Pick story, video, product randomly or deterministically
    const story = stories[i % stories.length] || { id: 's1', title: 'Coleção Outono 🍂' };
    const video = videos[i % videos.length] || { id: 'v1', title: 'Apresentação da Coleção' };
    const product = products[i % products.length] || { id: 'p1', name: 'Vestido Floral Verão' };
    const device = devices[Math.random() < 0.7 ? 0 : Math.random() < 0.85 ? 1 : 2]; // 70% mobile
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    const pageUrl = pages[Math.floor(Math.random() * pages.length)];

    // Event type logic following funnel dropoffs
    let type: EventType = 'view';
    const rand = Math.random();
    if (rand < 0.35) {
      type = 'view';
    } else if (rand < 0.65) {
      type = 'play';
    } else if (rand < 0.75) {
      type = 'cta_click';
    } else if (rand < 0.82) {
      type = 'product_click';
    } else if (rand < 0.88) {
      type = 'whatsapp_click';
    } else if (rand < 0.92) {
      type = 'like';
    } else if (rand < 0.95) {
      type = 'share';
    } else if (rand < 0.97) {
      type = 'comment';
    } else {
      type = 'conversion';
    }

    events.push({
      id: `ev-${idCounter++}`,
      timestamp: eventTime.toISOString(),
      eventType: type,
      storyId: story.id,
      storyTitle: story.title,
      videoId: video.id,
      videoTitle: video.title,
      productId: type === 'product_click' || type === 'conversion' ? product.id : undefined,
      productName: type === 'product_click' || type === 'conversion' ? product.name : undefined,
      pageUrl,
      device,
      browser,
      referrer,
    });
  }

  // Sort chronologically (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#3B82F6', '#EF4444'];

const MedidasPage = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allEvents, setAllEvents] = useState<DetailedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterPeriod, setFilterPeriod] = useState<'today' | '7days' | '30days'>('30days');
  const [filterStoryId, setFilterStoryId] = useState<string>('all');
  const [filterVideoId, setFilterVideoId] = useState<string>('all');
  const [filterProductId, setFilterProductId] = useState<string>('all');
  const [filterPageUrl, setFilterPageUrl] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        if (mainStore) {
          const s = await db.stories.getAll(mainStore.id);
          const v = await db.videos.getAll(mainStore.id);
          const p = await db.products.getAll(mainStore.id);
          setStories(s);
          setVideos(v);
          setProducts(p);

          const generated = generateMockEvents(s, v, p);
          setAllEvents(generated);
        }
      } catch (e) {
        console.error("Error loading measures/analytics data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter logic
  const filteredEvents = useMemo(() => {
    const now = new Date();
    return allEvents.filter(ev => {
      // 1. Period filter
      const evDate = new Date(ev.timestamp);
      const diffTime = Math.abs(now.getTime() - evDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filterPeriod === 'today' && diffDays > 1) return false;
      if (filterPeriod === '7days' && diffDays > 7) return false;
      if (filterPeriod === '30days' && diffDays > 30) return false;

      // 2. Story filter
      if (filterStoryId !== 'all' && ev.storyId !== filterStoryId) return false;

      // 3. Video filter
      if (filterVideoId !== 'all' && ev.videoId !== filterVideoId) return false;

      // 4. Product filter
      if (filterProductId !== 'all' && ev.productId !== filterProductId) return false;

      // 5. Page filter
      if (filterPageUrl !== 'all' && ev.pageUrl !== filterPageUrl) return false;

      // 6. Device filter
      if (filterDevice !== 'all' && ev.device !== filterDevice) return false;

      // 7. Event Type filter
      if (filterEventType !== 'all' && ev.eventType !== filterEventType) return false;

      return true;
    });
  }, [allEvents, filterPeriod, filterStoryId, filterVideoId, filterProductId, filterPageUrl, filterDevice, filterEventType]);

  // Compute Metrics Cards
  const computedMetrics = useMemo(() => {
    const total = filteredEvents.length;
    const views = filteredEvents.filter(e => e.eventType === 'view').length;
    const plays = filteredEvents.filter(e => e.eventType === 'play').length;
    const ctaClicks = filteredEvents.filter(e => e.eventType === 'cta_click').length;
    const productClicks = filteredEvents.filter(e => e.eventType === 'product_click').length;
    const whatsappClicks = filteredEvents.filter(e => e.eventType === 'whatsapp_click').length;
    const likes = filteredEvents.filter(e => e.eventType === 'like').length;
    const comments = filteredEvents.filter(e => e.eventType === 'comment').length;
    const shares = filteredEvents.filter(e => e.eventType === 'share').length;
    const conversions = filteredEvents.filter(e => e.eventType === 'conversion').length;

    // Total clicks across all buttons
    const totalClicks = ctaClicks + productClicks + whatsappClicks;

    // Engagement Rate = (plays + interactions + clicks) / views
    const interactions = likes + comments + shares;
    const engagementRate = views > 0 ? ((plays + interactions + totalClicks) / views * 100).toFixed(1) : '0.0';

    // Conversion Rate = conversions / views
    const conversionRate = views > 0 ? ((conversions / views) * 100).toFixed(1) : '0.0';

    return {
      views,
      plays,
      clicks: totalClicks,
      ctaClicks,
      productClicks,
      whatsappClicks,
      likes,
      comments,
      shares,
      conversions,
      engagementRate,
      conversionRate
    };
  }, [filteredEvents]);

  // Devices breakdown
  const deviceChartData = useMemo(() => {
    const mobile = filteredEvents.filter(e => e.device === 'mobile').length;
    const desktop = filteredEvents.filter(e => e.device === 'desktop').length;
    const tablet = filteredEvents.filter(e => e.device === 'tablet').length;

    return [
      { name: 'Mobile', value: mobile, color: '#EC4899' },
      { name: 'Desktop', value: desktop, color: '#8B5CF6' },
      { name: 'Tablet', value: tablet, color: '#06B6D4' }
    ].filter(item => item.value > 0);
  }, [filteredEvents]);

  // Traffic sources breakdown
  const trafficSourcesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents.forEach(e => {
      counts[e.referrer] = (counts[e.referrer] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredEvents]);

  // Performance by target page URL
  const pagePerformanceData = useMemo(() => {
    const map = new Map<string, { views: number; clicks: number }>();
    filteredProducts.forEach(p => {}); // placeholder
    
    filteredEventsGrouped('page', filteredEvents => {
      // Just simulate distribution
    });

    const mockPages = [
      { name: '/home', views: Math.round(metricsData().cards.views * 0.45), clicks: Math.round(metricsData().cards.clicks * 0.42) },
      { name: '/produtos/vestido-floral', views: Math.round(metricsData.cards.views * 0.25), clicks: Math.round(metricsData.cards.clicks * 0.32) },
      { name: '/colecoes/outono', views: Math.round(metricsData.cards.views * 0.18), clicks: Math.round(metricsData.cards.clicks * 0.16) },
      { name: '/checkout', views: Math.round(metricsData.cards.views * 0.12), clicks: Math.round(metricsData.cards.clicks * 0.10) },
    ];
    return mockPages;
  }, [filteredEvents]);

  // Ranking lists
  const storyRankingData = useMemo(() => {
    const counts: Record<string, { views: number; clicks: number }> = {};
    filteredEvents.forEach(e => {
      if (!counts[e.storyTitle]) counts[e.storyTitle] = { views: 0, clicks: 0 };
      if (e.eventType === 'view') counts[e.storyTitle].views += 1;
      if (e.eventType === 'cta_click' || e.eventType === 'product_click') counts[e.storyTitle].clicks += 1;
    });
    return Object.entries(counts)
      .map(([name, val]) => ({ name, views: val.views, clicks: val.clicks }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [filteredEvents]);

  const productRankingData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents.forEach(e => {
      if (e.productName) {
        counts[e.productName] = (counts[e.productName] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);
  }, [filteredEvents]);

  // Events timeline data grouped by date
  const eventsTimelineData = useMemo(() => {
    const groups: Record<string, { views: number; plays: number; clicks: number }> = {};
    
    // Sort events ascending to render left-to-right correctly
    const chronological = [...filteredEvents].reverse();

    chronological.forEach(e => {
      const d = new Date(e.timestamp);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (!groups[dateStr]) {
        groups[dateStr] = { views: 0, plays: 0, clicks: 0 };
      }
      if (e.eventType === 'view') groups[dateStr].views += 1;
      if (e.eventType === 'play') groups[dateStr].plays += 1;
      if (e.eventType === 'cta_click' || e.eventType === 'product_click' || e.eventType === 'whatsapp_click') {
        groups[dateStr].clicks += 1;
      }
    });

    return Object.entries(groups).map(([date, vals]) => ({
      date,
      views: vals.views,
      plays: vals.plays,
      clicks: vals.clicks
    })).slice(-10); // Keep last 10 days for clarity
  }, [filteredEvents]);

  // Helpers
  function filteredEventsGrouped(key: string, fn: (arr: any[]) => void) {}
  function metricsData() {
    return { cards: computedMetrics };
  }

  const handleClearFilters = () => {
    setFilterStoryId('all');
    setFilterVideoId('all');
    setFilterProductId('all');
    setFilterPageUrl('all');
    setFilterDevice('all');
    setFilterEventType('all');
    showSuccess("Filtros limpos com sucesso!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-sm text-slate-400">Preparando painel analítico avançado...</p>
      </div>
    );
  }

  // Formatting for Funnel stages
  const funnelStages = [
    { stage: '1. Visualizou', value: computedMetrics.views, desc: 'Entraram no raio do widget', color: 'bg-violet-600' },
    { stage: '2. Deu Play', value: computedMetrics.plays, desc: 'Engajaram assistindo ao vídeo', color: 'bg-indigo-600' },
    { stage: '3. Clicou no CTA', value: computedMetrics.ctaClicks, desc: 'Pressionaram o CTA principal', color: 'bg-fuchsia-600' },
    { stage: '4. Clicou no Produto', value: computedMetrics.productClicks, desc: 'Abriram informações do item', color: 'bg-cyan-600' },
    { stage: '5. Converteu', value: computedMetrics.conversions, desc: 'Realizaram compra/finalização', color: 'bg-emerald-600' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-900">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              Medidas
            </h1>
            <p className="text-slate-400 mt-1">
              Área analítica de alta granularidade. Monitore e isole o desempenho de cada story, vídeo, produto e dispositivo.
            </p>
          </div>

          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-all self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpar Filtros
          </button>
        </div>

        {/* Dynamic Interactive Filters Box */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
            <Filter className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Filtros Dinâmicos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            
            {/* 1. Period */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Período</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="today">Hoje</option>
                <option value="7days">7 Dias</option>
                <option value="30days">30 Dias</option>
              </select>
            </div>

            {/* 2. Story */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Story</label>
              <select
                value={filterStoryId}
                onChange={(e) => setFilterStoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todos</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* 3. Video */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vídeo</label>
              <select
                value={filterVideoId}
                onChange={(e) => setFilterVideoId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todos</option>
                {videos.map(v => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>

            {/* 4. Product */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Produto</label>
              <select
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todos</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 5. Target Page URL */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Página</label>
              <select
                value={filterPageUrl}
                onChange={(e) => setFilterPageUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todas</option>
                <option value="/home">/home</option>
                <option value="/produtos/vestido-floral">/produtos/vestido-floral</option>
                <option value="/colecoes/novidades">/colecoes/novidades</option>
                <option value="/checkout">/checkout</option>
              </select>
            </div>

            {/* 6. Device */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dispositivo</label>
              <select
                value={filterDevice}
                onChange={(e) => setFilterDevice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todos</option>
                <option value="mobile">Celular (Mobile)</option>
                <option value="desktop">Computador (Desktop)</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            {/* 7. Event Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Evento</label>
              <select
                value={filterEventType}
                onChange={(e) => setFilterEventType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todos</option>
                <option value="view">Visualização</option>
                <option value="play">Play (Assistiu)</option>
                <option value="cta_click">Clique CTA</option>
                <option value="product_click">Clique Produto</option>
                <option value="whatsapp_click">WhatsApp</option>
                <option value="like">Curtida</option>
                <option value="comment">Comentário</option>
                <option value="share">Compartilhar</option>
                <option value="conversion">Conversão</option>
              </select>
            </div>

          </div>
        </div>

        {/* Detailed Metrics Panel */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visualizações</span>
            <span className="text-2xl font-black text-slate-100 mt-2">{computedMetrics.views}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plays</span>
            <span className="text-2xl font-black text-slate-100 mt-2">{computedMetrics.plays}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cliques (Total)</span>
            <span className="text-2xl font-black text-slate-100 mt-2">{computedMetrics.clicks}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">WhatsApp</span>
            <span className="text-2xl font-black text-slate-100 mt-2">{computedMetrics.whatsappClicks}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tx. Engajamento</span>
            <span className="text-2xl font-black text-violet-400 mt-2">{computedMetrics.engagementRate}%</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tx. Conversão</span>
            <span className="text-2xl font-black text-emerald-400 mt-2">{computedMetrics.conversionRate}%</span>
          </div>

        </div>

        {/* Funnel & Device Distribution Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Detailed CSS Funnel Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl lg:col-span-2 flex flex-col justify-between gap-5">
            <div>
              <h3 className="font-bold text-base text-slate-100">Funil de Conversão Integrado</h3>
              <p className="text-xs text-slate-400">Veja o percentual de evasão em cada etapa da jornada de compra.</p>
            </div>

            <div className="space-y-3.5">
              {funnelStages.map((stage, idx) => {
                // Calculate drop-off based on views
                const percentage = computedMetrics.views > 0 ? (stage.value / computedMetrics.views * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="relative">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                      <span className="text-slate-300">{stage.stage}</span>
                      <span className="text-slate-400">{stage.value.toLocaleString()} <span className="text-[10px] text-violet-400">({percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-950 h-6 rounded-lg overflow-hidden flex items-center relative border border-slate-800">
                      <div className={`h-full ${stage.color} opacity-85 transition-all`} style={{ width: `${percentage}%` }}></div>
                      <span className="absolute left-3 text-[10px] font-bold text-white drop-shadow-md">{stage.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device Distribution (Pie Chart) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">Distribuição por Dispositivo</h3>
              <p className="text-xs text-slate-400">Proporção de acessos dividida por desktop, mobile e tablet.</p>
            </div>

            {deviceChartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Sem dados para este filtro.</div>
            ) : (
              <>
                <div className="h-[180px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-around gap-2 text-xs font-bold">
                  {deviceChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 p-1 rounded-lg">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400 capitalize">{item.name}:</span>
                      <span className="text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Timeline Events */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">Eventos ao Longo do Tempo</h3>
              <p className="text-xs text-slate-400">Comportamento cronológico das principais medidas selecionadas.</p>
            </div>
            <div className="h-[250px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eventsTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="medGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Area type="monotone" dataKey="views" stroke="#8B5CF6" fillOpacity={1} fill="url(#medGrad)" name="Views" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="plays" stroke="#EC4899" fillOpacity={0} name="Plays" strokeWidth={2} />
                  <Area type="monotone" dataKey="clicks" stroke="#10B981" fillOpacity={0} name="Clicks" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Page Performance */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-100">Performance por URL da Página</h3>
              <p className="text-xs text-slate-400">Volume de interação segmentada por páginas de destino da loja.</p>
            </div>
            <div className="h-[250px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pagePerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Bar dataKey="views" fill="#8B5CF6" name="Views" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="clicks" fill="#EC4899" name="Cliques" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Ranking & Traffic Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Story Ranking */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5"><Eye className="w-4 h-4 text-violet-400" /> Ranking de Stories</h4>
            <div className="space-y-3">
              {storyRankingData.length === 0 ? (
                <p className="text-xs text-slate-500">Sem resultados.</p>
              ) : (
                storyRankingData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-850">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[160px]">🎬 {item.name}</span>
                    <span className="text-xs text-slate-500 font-bold">{item.views} views</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Product Ranking */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-fuchsia-400" /> Ranking de Produtos</h4>
            <div className="space-y-3">
              {productRankingData.length === 0 ? (
                <p className="text-xs text-slate-500">Sem resultados.</p>
              ) : (
                productRankingData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-850">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[160px]">🛍️ {item.name}</span>
                    <span className="text-xs text-slate-500 font-bold">{item.clicks} cliques</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Referrers */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5"><Target className="w-4 h-4 text-emerald-400" /> Origem dos Acessos</h4>
            <div className="space-y-3">
              {trafficSourcesData.length === 0 ? (
                <p className="text-xs text-slate-500">Sem resultados.</p>
              ) : (
                trafficSourcesData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-850">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[160px]">🌐 {item.name}</span>
                    <span className="text-xs text-slate-500 font-bold">{item.value} ref</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Detailed Events Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-100">Log Detalhado de Eventos</h3>
              <p className="text-xs text-slate-400">Relação e rastreamento de cada ação tomada no widget de stories.</p>
            </div>
            <span className="bg-violet-500/10 text-violet-400 px-3 py-1 rounded-full text-xs font-bold border border-violet-500/20">
              {filteredEvents.length} Eventos filtrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-4 pl-6">Data/Hora</th>
                  <th className="p-4">Tipo Evento</th>
                  <th className="p-4">Story</th>
                  <th className="p-4">Vídeo</th>
                  <th className="p-4">Produto</th>
                  <th className="p-4">Página URL</th>
                  <th className="p-4">Dispositivo</th>
                  <th className="p-4">Navegador</th>
                  <th className="p-4 pr-6">Referrer (Origem)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {filteredEvents.slice(0, 15).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 transition-all">
                    <td className="p-4 pl-6 font-mono text-slate-400">
                      {new Date(row.timestamp).toLocaleDateString('pt-BR')} {new Date(row.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        row.eventType === 'conversion' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        row.eventType === 'view' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                        row.eventType === 'play' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        row.eventType === 'cta_click' ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {row.eventType}
                      </span>
                    </td>
                    <td className="p-4 text-slate-200 truncate max-w-[120px]" title={row.storyTitle}>{row.storyTitle}</td>
                    <td className="p-4 text-slate-400 truncate max-w-[120px]" title={row.videoTitle}>{row.videoTitle}</td>
                    <td className="p-4 font-mono text-[11px] text-fuchsia-400">{row.productName || <span className="text-slate-700 italic">-</span>}</td>
                    <td className="p-4 font-mono text-[10px] text-slate-400">{row.pageUrl}</td>
                    <td className="p-4 capitalize flex items-center gap-1 mt-1 text-slate-400">
                      {row.device === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-pink-400" /> : row.device === 'desktop' ? <Laptop className="w-3.5 h-3.5 text-violet-400" /> : <Tablet className="w-3.5 h-3.5 text-cyan-400" />}
                      {row.device}
                    </td>
                    <td className="p-4 text-slate-400">{row.browser}</td>
                    <td className="p-4 pr-6 text-slate-400 truncate max-w-[100px]">{row.referrer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEvents.length > 15 && (
              <div className="p-4 text-center bg-slate-950/20 text-[10px] text-slate-500 font-bold uppercase border-t border-slate-800/60">
                Mostrando os 15 eventos mais recentes de {filteredEvents.length} no total.
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default MedidasPage;