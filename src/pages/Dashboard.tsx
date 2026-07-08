import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Eye, MousePointer2, TrendingUp, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const stats = [
    { title: "Visualizações Totais", value: "24.8k", change: "+12%", icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Cliques no CTA", value: "1.240", change: "+18%", icon: MousePointer2, color: "text-violet-600", bg: "bg-violet-50" },
    { title: "Conversão de Vídeo", value: "4.2%", change: "+2%", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Vendas Geradas", value: "R$ 12.4k", change: "+5%", icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Visão Geral</h1>
        <p className="text-slate-500 font-medium">Acompanhe o impacto dos seus vídeos nas vendas hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-8 flex items-center gap-6">
              <div className={`h-16 w-16 ${stat.bg} rounded-[1.5rem] flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</h3>
                  <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                    <ArrowUpRight className="h-3 w-3" /> {stat.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2.5rem] p-8 bg-white">
          <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black text-slate-900">Engajamento Semanal</CardTitle>
            <Badge variant="secondary" className="rounded-lg font-bold">Últimos 7 dias</Badge>
          </CardHeader>
          <div className="h-80 flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold italic group">
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:animate-bounce">
              <TrendingUp className="h-6 w-6 text-violet-400" />
            </div>
            Gráfico de Performance em Tempo Real
          </div>
        </Card>
        
        <Card className="border-none shadow-sm rounded-[2.5rem] p-8 bg-white">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-black text-slate-900">Top Stories</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {[
              { name: "Coleção Verão", views: "1.2k", conv: "5.2%" },
              { name: "Oferta Tech", views: "850", conv: "3.8%" },
              { name: "Unboxing Novo", views: "640", conv: "4.5%" }
            ].map((story, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-violet-100 transition-colors cursor-pointer">
                <div className="h-12 w-9 bg-slate-900 rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
                   <div className="absolute inset-0 bg-violet-600/20" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{story.name}</p>
                  <div className="flex gap-3 text-[10px] font-bold text-slate-400 uppercase">
                    <span>{story.views} views</span>
                    <span className="text-emerald-500">{story.conv} conv</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}