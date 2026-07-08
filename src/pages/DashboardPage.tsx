import React, { useEffect, useState, useMemo } from 'react';
import { db, Store } from '@/lib/db';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Eye, MousePointerClick, ShoppingBag, CheckCircle2
} from 'lucide-react';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await db.stores.getAll();
      setLoading(false);
    };
    loadData();
  }, []);

  const metrics = {
    views: 18540,
    clicks: 3940,
    conversions: 2730,
    ctr: '21.2%'
  };

  const chartData = [
    { name: 'Seg', views: 2400 },
    { name: 'Ter', views: 3200 },
    { name: 'Qua', views: 2800 },
    { name: 'Qui', views: 3900 },
    { name: 'Sex', views: 4800 },
    { name: 'Sáb', views: 3800 },
    { name: 'Dom', views: 4100 },
  ];

  if (loading) return null;

  return (
    <div className="space-y-8">
      {/* Título e Filtro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 font-medium mt-1">Bem-vindo ao Vitrine Vídeo. Acompanhe a performance da sua loja.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 shadow-sm self-start md:self-auto">
          Últimos 30 dias
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Visualizações" value={metrics.views.toLocaleString()} change="+12%" icon={Eye} />
        <MetricCard title="Cliques em CTA" value={metrics.clicks.toLocaleString()} change="+8%" icon={MousePointerClick} />
        <MetricCard title="Conversões" value={metrics.conversions.toLocaleString()} change="+15%" icon={CheckCircle2} isConversion />
        <MetricCard title="Faturamento Vídeo" value="R$ 12.450" change="+5%" icon={ShoppingBag} />
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-extrabold text-slate-800">Visualizações Diárias</h3>
             <span className="text-[10px] font-bold text-[#0094EB] uppercase bg-blue-50 px-2 py-1 rounded-md">Tendência</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0094EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0094EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} />
                <Area type="monotone" dataKey="views" stroke="#0094EB" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-extrabold text-slate-800">Stories em Destaque</h3>
             <span className="text-[10px] font-bold text-[#0E4787] uppercase bg-slate-100 px-2 py-1 rounded-md">Top 5</span>
          </div>
          <div className="space-y-4">
            {[
              { name: "Coleção Outono 🍂", views: 4200, ctr: "24%" },
              { name: "Oferta Relâmpago ⚡", views: 3800, ctr: "19%" },
              { name: "Unboxing Vestido Max", views: 3100, ctr: "21%" },
              { name: "Provador Casual", views: 2900, ctr: "15%" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-[#0094EB] transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{item.name}</p>
                  <p className="text-[11px] font-medium text-slate-400">{item.views.toLocaleString()} visualizações</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{item.ctr}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CTR</p>
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
  <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${isConversion ? 'bg-emerald-50 text-[#10B981]' : 'bg-blue-50 text-[#0094EB]'} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <span className="text-[11px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{change}</span>
    </div>
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
    <h2 className="text-2xl font-black text-slate-900">{value}</h2>
  </div>
);

export default DashboardPage;