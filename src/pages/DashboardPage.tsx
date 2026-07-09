import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, MousePointerClick, ShoppingBag, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); 
  const [metrics, setMetrics] = useState({
    views: 18540,
    clicks: 3940,
    conversions: 2730,
    revenue: "12.450"
  });

  useEffect(() => {
    // Simulação de recálculo real baseado no período
    const factor = period === 'today' ? 0.05 : period === '7' ? 0.25 : 1;
    setMetrics({
      views: Math.round(18540 * factor),
      clicks: Math.round(3940 * factor),
      conversions: Math.round(2730 * factor),
      revenue: (12.450 * factor).toLocaleString('pt-BR', { minimumFractionDigits: 3 })
    });
    setLoading(false);
  }, [period]);

  const chartData = [
    { name: 'Seg', views: 2400 }, { name: 'Ter', views: 3200 }, { name: 'Qua', views: 2800 },
    { name: 'Qui', views: 3900 }, { name: 'Sex', views: 4800 }, { name: 'Sáb', views: 3800 },
    { name: 'Dom', views: 4100 },
  ];

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1">Acompanhe a performance da sua loja em tempo real.</p>
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
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                period === p.id ? "bg-[#0094EB] text-white shadow-lg shadow-blue-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {p.icon && <p.icon size={14} />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Visualizações" value={metrics.views.toLocaleString()} change="+12%" icon={Eye} />
        <MetricCard title="Cliques em CTA" value={metrics.clicks.toLocaleString()} change="+8%" icon={MousePointerClick} />
        <MetricCard title="Conversões" value={metrics.conversions.toLocaleString()} change="+15%" icon={CheckCircle2} isConversion />
        <MetricCard title="Faturamento Vídeo" value={`R$ ${metrics.revenue}`} change="+5%" icon={ShoppingBag} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Fluxo de Visualizações</h3>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0094EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0094EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dx={-10} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                  itemStyle={{fontWeight: 800, fontSize: '12px'}}
                />
                <Area type="monotone" dataKey="views" stroke="#0094EB" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Performance por Story</h3>
          <div className="space-y-6">
            {[
              { name: "Coleção Outono 🍂", views: 4200, ctr: "24%" },
              { name: "Oferta Relâmpago ⚡", views: 3800, ctr: "19%" },
              { name: "Unboxing Vestido Max", views: 3100, ctr: "21%" },
              { name: "Provador Casual", views: 2900, ctr: "15%" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-5 group">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:text-[#0094EB] group-hover:bg-blue-50 transition-all">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-800">{item.name}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.views.toLocaleString()} visualizações</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{item.ctr}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CTR</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, change, icon: Icon, isConversion = false }: any) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
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
    <h2 className="text-3xl font-black text-slate-900">{value}</h2>
  </div>
);

export default DashboardPage;