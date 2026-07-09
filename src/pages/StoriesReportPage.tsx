import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Users, MousePointer2, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const StoriesReportPage = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30');

  const reportData = [
    { name: "Coleção Outono 🍂", views: 1240, avgViews: 870, clicks: 96, avgClicks: 64, conv: 7.7, avgConv: 5.2 },
    { name: "Oferta Relâmpago ⚡", views: 980, avgViews: 870, clicks: 48, avgClicks: 64, conv: 4.9, avgConv: 5.2 },
    { name: "Unboxing Vestido Max", views: 820, avgViews: 870, clicks: 112, avgClicks: 64, conv: 13.6, avgConv: 5.2 },
    { name: "Provador Casual", views: 650, avgViews: 870, clicks: 32, avgClicks: 64, conv: 4.9, avgConv: 5.2 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relatório de Stories</h1>
            <p className="text-slate-500 font-medium">Análise profunda de engajamento e conversão.</p>
          </div>
        </div>
        
        <div className="flex bg-white border border-slate-200 rounded-2xl p-1.5 gap-1 shadow-sm">
          {['7', '30', '90'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all",
                period === p ? "bg-[#0094EB] text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Últimos {p} dias
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reportData.map((story, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800">{story.name}</h3>
              <span className="text-xs font-black text-[#0094EB] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                Desempenho Geral
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ReportMetric 
                label="Visualizações" 
                value={story.views} 
                avg={story.avgViews} 
                suffix="" 
              />
              <ReportMetric 
                label="Cliques" 
                value={story.clicks} 
                avg={story.avgClicks} 
                suffix="" 
              />
              <ReportMetric 
                label="Taxa de Conversão" 
                value={story.conv} 
                avg={story.avgConv} 
                suffix="%" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportMetric = ({ label, value, avg, suffix }: any) => {
  const diff = ((value - avg) / avg) * 100;
  const isUp = diff >= 0;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-black text-slate-900">{value}{suffix}</h4>
        <span className={cn(
          "text-xs font-black px-2 py-0.5 rounded-lg",
          isUp ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50"
        )}>
          {isUp ? '+' : ''}{diff.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold">
        <span className="text-slate-400">Média: {avg}{suffix}</span>
        <span className={isUp ? "text-emerald-500" : "text-rose-500"}>
          {isUp ? 'Acima da média' : 'Abaixo da média'}
        </span>
      </div>
    </div>
  );
};

export default StoriesReportPage;