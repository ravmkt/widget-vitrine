import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, MousePointerClick, ShoppingBag, CheckCircle2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CustomDialog from '@/components/CustomDialog';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7' | '30' | 'custom'>('30');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const activeInterval = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === 'today') return { start: startOfDay(now), end: endOfDay(now) };
    if (selectedPeriod === '7') return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    if (selectedPeriod === '30') return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    return { start: startOfDay(customRange.from || subDays(now, 7)), end: endOfDay(customRange.to || now) };
  }, [selectedPeriod, customRange]);

  const dashboardData = useMemo(() => {
    const days = eachDayOfInterval({ start: activeInterval.start, end: activeInterval.end });
    
    const flow = days.map(day => {
      const seed = day.getDate() + day.getMonth();
      const views = Math.floor(500 + Math.random() * 1000 + seed * 10);
      const clicks = Math.floor(views * (0.15 + Math.random() * 0.1));
      const sales = Math.floor(clicks * (0.05 + Math.random() * 0.05));
      
      return {
        name: format(day, 'dd/MM', { locale: ptBR }),
        views, clicks, sales,
        revenue: sales * 89.9
      };
    });

    const totals = flow.reduce((acc, curr) => ({
      views: acc.views + curr.views,
      clicks: acc.clicks + curr.clicks,
      sales: acc.sales + curr.sales,
      revenue: acc.revenue + curr.revenue
    }), { views: 0, clicks: 0, sales: 0, revenue: 0 });

    // Performance por Story com Médias e Comparativos
    const stories = [
      { name: "Coleção Outono 🍂", viewsWeight: 0.35, avgViews: 870, ctr: 24.5, avgCtr: 18.2 },
      { name: "Oferta Relâmpago ⚡", viewsWeight: 0.25, avgViews: 870, ctr: 18.2, avgCtr: 22.0 },
      { name: "Unboxing Vestido Max", viewsWeight: 0.20, avgViews: 870, ctr: 21.0, avgCtr: 15.5 },
      { name: "Provador Casual", viewsWeight: 0.15, avgViews: 870, ctr: 14.8, avgCtr: 14.0 },
    ].map(s => {
      const currentViews = Math.floor(totals.views * s.viewsWeight);
      const viewDiff = ((currentViews - s.avgViews) / s.avgViews) * 100;
      const ctrDiff = ((s.ctr - s.avgCtr) / s.avgCtr) * 100;

      return {
        ...s,
        views: currentViews,
        viewDiff,
        ctrDiff
      };
    });

    return { flow, totals, stories };
  }, [activeInterval]);

  useEffect(() => {
    const init = async () => {
      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1">
            Performance de <span className="text-[#0094EB] font-bold">{format(activeInterval.start, "dd/MM")}</span> até <span className="text-[#0094EB] font-bold">{format(activeInterval.end, "dd/MM")}</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Visualizações" value={dashboardData.totals.views.toLocaleString()} change="+12.5%" icon={Eye} />
        <MetricCard title="Cliques em CTA" value={dashboardData.totals.clicks.toLocaleString()} change="+8.3%" icon={MousePointerClick} />
        <MetricCard title="Conversões" value={dashboardData.totals.sales.toLocaleString()} change="+15.1%" icon={CheckCircle2} isConversion />
        <MetricCard title="Faturamento" value={dashboardData.totals.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} change="+5.4%" icon={ShoppingBag} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Fluxo de Visualizações</h3>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.flow}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0094EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#0094EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dx={-10} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}} />
                <Area type="monotone" dataKey="views" stroke="#0094EB" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-800 mb-8">Performance por Story</h3>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {dashboardData.stories.map((item, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:border-[#0094EB]/30 transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-800 truncate">{item.name}</p>
                  <span className="text-[10px] font-black text-slate-400">RANK #{i+1}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualizações</p>
                    <p className="text-sm font-black text-slate-900">{item.views.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">Média: {item.avgViews}</span>
                      <span className={cn("text-[9px] font-bold flex items-center", item.viewDiff >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {item.viewDiff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(item.viewDiff).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa (CTR)</p>
                    <p className="text-sm font-black text-slate-900">{item.ctr}%</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className={cn("text-[9px] font-bold flex items-center", item.ctrDiff >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {item.ctrDiff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(item.ctrDiff).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Média: {item.avgCtr}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => navigate('/stories/report')}
            className="w-full mt-8 py-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
          >
            Ver Relatório Completo
          </button>
        </div>
      </div>

      <CustomDialog
        isOpen={isCalendarOpen} type="form" title="Período Personalizado" maxWidth="max-w-md"
        onCancel={() => setIsCalendarOpen(false)} onConfirm={() => { if(customRange.from && customRange.to) { setSelectedPeriod('custom'); setIsCalendarOpen(false); } }}
        confirmText="Aplicar Filtro"
      >
        <div className="flex flex-col items-center">
          <DayPicker mode="range" selected={customRange} onSelect={(r) => setCustomRange({ from: r?.from, to: r?.to })} locale={ptBR} className="border-none" modifiersStyles={{ selected: { backgroundColor: '#0094EB', color: 'white' } }} />
          {customRange.from && customRange.to && (
            <div className="mt-4 p-4 bg-blue-50 rounded-2xl w-full text-center">
              <p className="text-xs font-black text-[#0094EB] uppercase tracking-widest">Intervalo Selecionado</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{format(customRange.from, 'dd/MM/yyyy')} — {format(customRange.to, 'dd/MM/yyyy')}</p>
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
      <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110", isConversion ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-[#0094EB]')}>
        <Icon size={24} />
      </div>
      <span className="text-[11px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">{change}</span>
    </div>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h2 className="text-2xl font-black text-slate-900">{value}</h2>
  </div>
);

export default DashboardPage;