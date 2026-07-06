import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import WidgetPreview from '@/components/WidgetPreview';
import { db, Story, WidgetSettings, Store } from '@/lib/db';
import { Film, Eye, MousePointerClick, Percent, ArrowRight, Sparkles, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const stores = await db.getStores();
        const mainStore = stores[0]; // Useanny
        setStore(mainStore);

        if (mainStore) {
          const [fetchedStories, fetchedSettings] = await Promise.all([
            db.getStories(mainStore.id),
            db.getSettings(mainStore.id),
          ]);
          setStories(fetchedStories);
          setSettings(fetchedSettings);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  const activeStoriesCount = stories.filter(s => s.active).length;

  // Métricas simuladas realistas
  const metrics = [
    {
      label: 'Total de Stories',
      value: stories.length,
      icon: Film,
      color: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'Stories Ativos',
      value: activeStoriesCount,
      icon: Sparkles,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Visualizações do Widget',
      value: '12.480',
      icon: Eye,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Cliques em Stories',
      value: '1.842',
      icon: MousePointerClick,
      color: 'text-fuchsia-600 bg-fuchsia-50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Olá, Useanny! 👋</h1>
            <p className="text-slate-500 mt-1">
              Gerencie seus stories em vídeo e acompanhe o engajamento da sua loja virtual.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/stories"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Story
            </Link>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda: Métricas e Ações */}
          <div className="lg:col-span-2 space-y-8">
            {/* Métricas */}
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${metric.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">{metric.label}</p>
                      <p className="text-2xl font-bold text-slate-800 mt-0.5">{metric.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTR Card */}
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-xl shadow-violet-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Performance Excelente
                </span>
                <h3 className="text-xl font-bold">Taxa de Cliques (CTR) de 14.7%</h3>
                <p className="text-white/80 text-sm max-w-md">
                  Seus stories estão convertendo muito bem! Continue adicionando vídeos curtos e dinâmicos para prender a atenção dos clientes.
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm flex flex-col items-center justify-center min-w-[120px]">
                <Percent className="w-8 h-8 text-white mb-1" />
                <span className="text-2xl font-extrabold">14.7%</span>
                <span className="text-[10px] text-white/70 uppercase font-bold">Média da Loja</span>
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Configuração Rápida</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/stories"
                  className="p-4 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all group flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">
                      Gerenciar Stories
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Adicione, ordene ou remova vídeos da sua vitrine.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-violet-600 transition-all group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/settings"
                  className="p-4 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all group flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">
                      Customizar Widget
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Altere cores, posições e o comportamento do widget.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-violet-600 transition-all group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Simulador de Celular */}
          <div className="flex flex-col items-center">
            <div className="sticky top-24">
              <div className="text-center mb-4">
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Visualização em Tempo Real
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">Simulador de Loja</h3>
              </div>
              {settings && (
                <WidgetPreview stories={stories} settings={settings} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;