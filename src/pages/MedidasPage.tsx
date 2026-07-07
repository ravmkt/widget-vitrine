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

const generateMockEvents = (stories: Story[], videos: Video[], products: Product[]): DetailedEvent[] => {
  const events: DetailedEvent[] = [];
  const eventTypes: EventType[] = [
    'view', 'play', 'cta_click', 'product_click', 'whatsapp_click', 'like', 'share', 'comment', 'conversion'
  ];
  const devices = ['mobile', 'desktop', 'tablet'] as const;
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
  const referrers = ['Google', 'Instagram Direct', 'TikTok App', 'Directo', 'Facebook', 'yampi.com.br'];
  const pages = ['/home', '/produtos/vestido-floral', '/colecoes/novidades', '/checkout', '/carrinho'];

  const now = new Date();
  let idCounter = 1;

  for (let i = 0; i < 450; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const eventTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 12) * 60 * 60 * 1000);
    
    const story = stories[i % stories.length] || { id: 's1', title: 'Coleção Outono 🍂' };
    const video = videos[i % videos.length] || { id: 'v1', title: 'Apresentação da Coleção' };
    const product = products[i % products.length] || { id: 'p1', name: 'Vestido Floral Verão' };
    const device = devices[Math.random() < 0.7 ? 0 : Math.random() < 0.85 ? 1 : 2];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const referrer = referrers[Math.floor(Math.random() * referrers.length)];
    const pageUrl = pages[Math.floor(Math.random() * pages.length)];

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
          const fetchedStories = await db.stories.getAll(mainStore.id);
          setStories(fetchedStories);
          const fetchedVideos = await db.videos.getAll(mainStore.id);
          setVideos(fetchedVideos);
          const fetchedProducts = await db.products.getAll(mainStore.id);
          setProducts(fetchedProducts);

          const generated = generateMockEvents(fetchedStories, fetchedVideos, fetchedProducts);
          setAllEvents(generated);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      if (filterStoryId !== 'all' && event.storyId !== filterStoryId) return false;
      if (filterVideoId !== 'all' && event.videoId !== filterVideoId) return false;
      if (filterProductId !== 'all' && event.productId !== filterProductId) return false;
      if (filterPageUrl !== 'all' && event.pageUrl !== filterPageUrl) return false;
      if (filterDevice !== 'all' && event.device !== filterDevice) return false;
      if (filterEventType !== 'all' && event.eventType !== filterEventType) return false;
      return true;
    });
  }, [allEvents, filterStoryId, filterVideoId, filterProductId, filterPageUrl, filterDevice, filterEventType]);

  const computedMetrics = useMemo(() => {
    const views = filteredEvents.filter(e => e.eventType === 'view').length;
    const clicks = filteredEvents.filter(e => e.eventType === 'cta_click' || e.eventType === 'product_click' || e.eventType === 'whatsapp_click').length;
    return { views, clicks };
  }, [filteredEvents]);

  const metricsData = () => {
    return { cards: computedMetrics };
  };

  const pagePerformanceData = useMemo(() => {
    const mockPages = [
      { name: '/home', views: Math.round(metricsData().cards.views * 0.45), clicks: Math.round(metricsData().cards.clicks * 0.42) },
      { name: '/produtos/vestido-floral', views: Math.round(metricsData().cards.views * 0.25), clicks: Math.round(metricsData().cards.clicks * 0.32) },
      { name: '/colecoes/novidades', views: Math.round(metricsData().cards.views * 0.18), clicks: Math.round(metricsData().cards.clicks * 0.16) },
      { name: '/checkout', views: Math.round(metricsData().cards.views * 0.12), clicks: Math.round(metricsData().cards.clicks * 0.10) },
    ];
    return mockPages;
  }, [filteredEvents]);

  const deviceData = useMemo(() => {
    const mobile = filteredEvents.filter(e => e.device === 'mobile').length;
    const desktop = filteredEvents.filter(e => e.device === 'desktop').length;
    const tablet = filteredEvents.filter(e => e.device === 'tablet').length;
    return [
      { name: 'Celular', value: mobile || 1 },
      { name: 'Desktop', value: desktop || 0 },
      { name: 'Tablet', value: tablet || 0 },
    ];
  }, [filteredEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-sm text-slate-400 font-medium">Carregando painel analítico...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Módulo Medidas (Analytics)
          </h1>
          <p className="text-slate-400 mt-1">
            Métricas detalhadas sobre o comportamento do seu público.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Uso por Dispositivo</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Desempenho por URL</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pagePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="views" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Visualizações" />
                  <Bar dataKey="clicks" fill="#EC4899" radius={[4, 4, 0, 0]} name="Cliques" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MedidasPage;