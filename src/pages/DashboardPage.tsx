import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, Story, Store } from '@/lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Eye, MousePointerClick, TrendingUp, LayoutDashboard } from 'lucide-react';

const DashboardPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const stores = await db.getStores();
        const mainStore = stores[0];
        setStore(mainStore);

        if (mainStore) {
          const fetchedStories = await db.getStories(mainStore.id);
          setStories(fetchedStories);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">Carregando dados do dashboard...</p>
      </div>
    );
  }

  const totalViews = stories.reduce((sum, story) => sum + (story.view_count || 0), 0);
  const totalClicks = stories.reduce((sum, story) => sum + (story.click_count || 0), 0);
  const overallCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

  const chartData = stories.map(story => ({
    name: story.title,
    views: story.view_count || 0,
    clicks: story.click_count || 0,
    ctr: story.view_count && story.view_count > 0 ? parseFloat(((story.click_count || 0) / story.view_count * 100).toFixed(2)) : 0,
  }));

  const pieData = [
    { name: 'Visualizações', value: totalViews, color: '#8B5CF6' },
    { name: 'Cliques', value: totalClicks, color: '#EC4899' },
  ];

  const COLORS = ['#8B5CF6', '#EC4899', '#FBBF24', '#10B981'];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard de Métricas</h1>
          <p className="text-slate-500 mt-1">
            Acompanhe o desempenho dos seus stories em vídeo.
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-violet-100 text-violet-600">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Visualizações</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{totalViews.toLocaleString()}</h2>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-fuchsia-100 text-fuchsia-600">
              <MousePointerClick className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Cliques (CTA)</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{totalClicks.toLocaleString()}</h2>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">CTR Médio</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{overallCTR}%</h2>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Visualizações e Cliques por Story</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} interval={0} style={{ fontSize: '10px' }} />
                <YAxis />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="views" fill="#8B5CF6" name="Visualizações" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" fill="#EC4899" name="Cliques CTA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Distribuição de Engajamento</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;