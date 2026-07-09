import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, MousePointerClick, ShoppingBag, CheckCircle2, Calendar, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7' | '30' | 'custom'>('30');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 1. Definir o intervalo de datas ativo
  const activeInterval = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'today') {
      return { start: startOfDay(now), end: endOfDay(now) };
    }
    if (selectedPeriod === '7') {
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    }
    if (selectedPeriod === '30') {
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    }
    return { 
      start: startOfDay(customRange.from || subDays(now, 7)), 
      end: endOfDay(customRange.to || now) 
    };
  }, [selectedPeriod, customRange]);

  // 2. Gerar/Filtrar dados baseados no intervalo (Simulação de processamento real)
  const dashboardData = useMemo(() => {
    const days = eachDayOfInterval({ start: activeInterval.start, end: activeInterval.end });
    
    // Gerar métricas diárias com base no intervalo
    const flow = days.map(day => {
      // Semente baseada na data para manter consistência ao trocar filtros
      const seed = day.getDate() + day.getMonth();
      const views = Math.floor(500 + Math.random() * 1000 + seed * 10);
      const clicks = Math.floor(views * (0.15 + Math.random() * 0.1));
      const sales = Math.floor(clicks * (0.05 + Math.random() * 0.05));
      
      return {
        name: format(day, 'dd/MM', { locale: ptBR }),
        fullDate: day,
        views,
        clicks,
        sales,
        revenue: sales * 89.9
      };
    });

    // Totais calculados
    const totals = flow.reduce((acc, curr) => ({
      views: acc.views + curr.views,
      clicks: acc.clicks + curr.clicks,
      sales: acc.sales + curr.sales,
      revenue: acc.revenue + curr.revenue
    }), { views: 0, clicks: 0, sales: 0, revenue: 0 });

    // Performance por Story (também dinâmica)
    const stories = [
      { name: "Coleção Outono 🍂", viewsWeight: 0.35, ctr: "24.5%" },
      { name: "Oferta Relâmpago ⚡", viewsWeight: 0.25, ctr: "18.2%" },
      { name: "Unboxing Vestido Max", viewsWeight: 0.20, ctr: "21.0%" },
      { name: "Provador Casual", viewsWeight: 0.15, ctr: "14.8%" },
      { name: "Acessórios Premium", viewsWeight: 0.05, ctr: "12.1%" },
    ].map(s => ({
      ...s,
      views: Math.floor(totals.views * s.viewsWeight),
    }));

    return { flow, totals, stories };
  }, [activeInterval]);

  useEffect(() => {
    const init = async () => {
      await new Promise(r => setTimeout(r, 400)); // Simular latência de rede
      setLoading(false);
    };
    init();
  }, []);

  const handleApplyCustom = () => {
    if (customRange.from && customRange.to) {
      setSelectedPeriod('custom');
      setIsCalendarOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-[#0094EB] rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold animate-pulse">Atualizando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1">
            Exibindo dados de <span className="text-[#0094EB] font-bold">
              {format(activeInterval.start, "dd 'de' MMM", { locale: ptBR })}
            </span> até <span className="text-[#0094EB] font-bold">
              {format(activeInterval.end, "dd 'de' MMM", { locale: ptBR })}
            </span>
          </p>
        </div>

        <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 gap-1 shadow-sm">
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7', label: '7 dias' },
            { id: '30', label: '30 dias' },
            { id: 'custom', label: 'Personalizado', icon: Calendar },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => p.id === 'custom' ? setIsCalendarOpen(true) : setSelectedPeriod(p.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                selectedPeriod === p.id ? "bg-[#0094EB] text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {p.icon && <p.icon size={14} />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Visualizações" 
          value={dashboardData.totals.views.toLocaleString()} 
          change="+12.5%" 
          icon={Eye} 
        />
        <MetricCard 
          title="Cliques em CTA" 
          value={dashboardData.totals.clicks.toLocaleString()} 
          change="+8.3%" 
          icon={MousePointerClick} 
        />
        <MetricCard 
          title="Conversões" 
          value={dashboardData.totals.sales.toLocaleString()} 
          change="+15.1%" 
          icon={CheckCircle2} 
          isConversion 
        />
        <MetricCard 
          title="Faturamento" 
          value={dashboardData.totals.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          change="+5.4%" 
          icon={ShoppingBag} 
        />
      </div>

      {/* Gráfico e Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800">Fluxo de Visualizações</h3>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="w-3 h-3 bg-[#0094EB] rounded-full"></span>
              Visualizações por dia
            </div>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.flow}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0094EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0094EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                  itemStyle={{fontWeight: 800, fontSize: '12px', color: '#0094EB'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#0094EB" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Performance por Story</h3>
          <div className="space-y-6">
            {dashboardData.stories.map((item, i) => (
              <div key={i} className="flex items-center gap-5 group">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:text-[#0094EB] group-hover:bg-blue-50 transition-all">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate">{item.name}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {item.views.toLocaleString()} views
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{item.ctr}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CTR</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-10 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
            Ver Relatório Completo
          </button>
        </div>
      </div>

      {/* Modal de Calendário Personalizado */}
      <CustomDialog
        isOpen={isCalendarOpen}
        type="form"
        title="Período Personalizado"
        maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)}
        onConfirm={handleApplyCustom}
        confirmText="Aplicar Filtro"
      >
        <div className="flex flex-col items-center">
          <DayPicker
            mode="range"
            selected={customRange}
            onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
            locale={ptBR}
            className="border-none"
            modifiersStyles={{
              selected: { backgroundColor: '#0094EB', color: 'white' }
            }}
          />
          {customRange.from && customRange.to && (
            <div className="mt-4 p-4 bg-blue-50 rounded-2xl w-full text-center">
              <p className="text-xs font-black text-[#0094EB] uppercase tracking-widest">Intervalo Selecionado</p>
              <p className="text-sm font-bold text-slate-700 mt-1">
                {format(customRange.from, 'dd/MM/yyyy')} — {format(customRange.to, 'dd/MM/yyyy')}
              </p>
            </div>
          )}
        </div>
      </CustomDialog>
    </div>
  );
};

const MetricCard = ({ title, value, change, icon: Icon, isConversion = false }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
    <div className="flex items-start justify-between mb-6">
      <div className={cn(
        "p-4 rounded-2xl transition-all group-hover:scale-110",
        isConversion ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-[#0094EB]'
      )}>
        <Icon size={24} />
      </div>
      <span className="text-[11px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">{change}</span>
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h2 className="text-2xl font-black text-slate-900">{value}</h2>
  </div>
);

export default DashboardPage;