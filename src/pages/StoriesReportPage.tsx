import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Filter, 
  ChevronDown,
  TrendingUp,
  TrendingDown,
  PlayCircle,
  MousePointer2,
  CheckCircle2
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';

const StoriesReportPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // 1. Estado único de filtros
  const [filters, setFilters] = useState({
    period: '30',
    search: '',
    storyId: 'all',
    status: 'all'
  });

  // Simulação de carregamento inicial
  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  // 2. Base de dados bruta (Mock que simula retorno de API)
  const rawData = useMemo(() => [
    { id: '1', name: "Coleção Outono 🍂", status: 'active', views: 1240, clicks: 96, sales: 8, baseViews: 870, baseClicks: 64, baseSales: 5 },
    { id: '2', name: "Oferta Relâmpago ⚡", status: 'active', views: 980, clicks: 48, sales: 2, baseViews: 870, baseClicks: 64, baseSales: 5 },
    { id: '3', name: "Unboxing Vestido Max", status: 'active', views: 820, clicks: 112, sales: 15, baseViews: 870, baseClicks: 64, baseSales: 5 },
    { id: '4', name: "Provador Casual", status: 'inactive', views: 650, clicks: 32, sales: 1, baseViews: 870, baseClicks: 64, baseSales: 5 },
    { id: '5', name: "Promoção de Inverno ❄️", status: 'active', views: 2100, clicks: 240, sales: 12, baseViews: 1500, baseClicks: 180, baseSales: 10 },
  ], []);

  // 3. Lógica de filtragem e recálculo
  const filteredData = useMemo(() => {
    // Fator de escala baseado no período selecionado para simular dados reais
    const periodFactor = filters.period === 'today' ? 0.1 : filters.period === '7' ? 0.3 : filters.period === '90' ? 2.5 : 1;

    return rawData
      .filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStory = filters.storyId === 'all' || item.id === filters.storyId;
        const matchesStatus = filters.status === 'all' || item.status === filters.status;
        return matchesSearch && matchesStory && matchesStatus;
      })
      .map(item => ({
        ...item,
        views: Math.round(item.views * periodFactor),
        clicks: Math.round(item.clicks * periodFactor),
        sales: Math.round(item.sales * periodFactor),
        conv: ((item.sales * periodFactor) / (item.views * periodFactor || 1) * 100).toFixed(1),
        avgConv: (item.baseSales / item.baseViews * 100).toFixed(1)
      }));
  }, [filters, rawData]);

  // 4. Totais consolidados para os cards superiores
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      views: acc.views + curr.views,
      clicks: acc.clicks + curr.clicks,
      sales: acc.sales + curr.sales
    }), { views: 0, clicks: 0, sales: 0 });
  }, [filteredData]);

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relatório de Stories</h1>
            <p className="text-slate-500 font-medium">Dados detalhados por período e story.</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Combinados */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome do story..." 
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro de Período */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'today', label: 'Hoje' },
              { id: '7', label: '7d' },
              { id: '30', label: '30d' },
              { id: '90', label: '90d' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setFilters(prev => ({ ...prev, period: p.id }))}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filters.period === p.id ? "bg-white text-[#0094EB] shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Seletor de Status */}
          <select 
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          {/* Botão Limpar */}
          <button 
            onClick={() => setFilters({ period: '30', search: '', storyId: 'all', status: 'all' })}
            className="px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Cards de Resumo Consolidados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          label="Total de Visualizações" 
          value={totals.views.toLocaleString()} 
          icon={PlayCircle} 
          color="blue"
        />
        <SummaryCard 
          label="Total de Cliques" 
          value={totals.clicks.toLocaleString()} 
          icon={MousePointer2} 
          color="violet"
        />
        <SummaryCard 
          label="Total de Conversões" 
          value={totals.sales.toLocaleString()} 
          icon={CheckCircle2} 
          color="emerald"
        />
      </div>

      {/* Listagem de Stories Filtrada */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
          <Filter size={20} className="text-[#0094EB]" />
          Resultados do Período
        </h3>
        
        {filteredData.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredData.map((story) => (
              <div key={story.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm group hover:border-[#0094EB]/30 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#0094EB]">
                      <PlayCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">{story.name}</h4>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                        story.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {story.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visualizações</p>
                      <p className="text-lg font-black text-slate-800">{story.views.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliques</p>
                      <p className="text-lg font-black text-slate-800">{story.clicks.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa Conv.</p>
                      <p className="text-lg font-black text-emerald-600">{story.conv}%</p>
                    </div>
                  </div>
                </div>

                {/* Área de Comparativo com Média */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                  <ComparisonItem label="Vs Média de Views" current={story.views} base={story.baseViews} />
                  <ComparisonItem label="Vs Média de Cliques" current={story.clicks} base={story.baseClicks} />
                  <ComparisonItem label="Vs Média de Conv." current={parseFloat(story.conv)} base={parseFloat(story.avgConv)} suffix="%" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center bg-white border border-slate-200 rounded-[3rem]">
            <Search size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-bold">Nenhum story encontrado com os filtros aplicados.</p>
            <button 
              onClick={() => setFilters({ period: '30', search: '', storyId: 'all', status: 'all' })}
              className="mt-4 text-[#0094EB] text-sm font-black hover:underline"
            >
              Resetar busca
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
    <div className={cn(
      "h-12 w-12 rounded-2xl flex items-center justify-center mb-6",
      color === 'blue' ? "bg-blue-50 text-blue-500" : 
      color === 'emerald' ? "bg-emerald-50 text-emerald-500" : "bg-violet-50 text-violet-500"
    )}>
      <Icon size={24} />
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-3xl font-black text-slate-900">{value}</h3>
  </div>
);

const ComparisonItem = ({ label, current, base, suffix = "" }: any) => {
  const diff = ((current - base) / (base || 1)) * 100;
  const isUp = diff >= 0;

  return (
    <div className="flex items-center justify-between md:justify-start md:gap-4 p-4 bg-slate-50/50 rounded-2xl">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "text-xs font-black flex items-center",
          isUp ? "text-emerald-500" : "text-rose-500"
        )}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(diff).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default StoriesReportPage;