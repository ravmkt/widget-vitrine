import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Eye, MousePointer2, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const stats = [
    { title: "Stories Ativos", value: "12", icon: PlayCircle, color: "text-violet-600", bg: "bg-violet-50" },
    { title: "Visualizações", value: "1.4k", icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Cliques no CTA", value: "342", icon: MousePointer2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Taxa de Conv.", value: "4.2%", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium">Bem-vindo de volta! Aqui está o resumo da sua operação de vídeo hoje.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`h-14 w-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm rounded-[2rem] p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-black text-slate-900">Performance de Stories</CardTitle>
          </CardHeader>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold italic">
            Gráfico de Performance em Tempo Real
          </div>
        </Card>
        
        <Card className="border-none shadow-sm rounded-[2rem] p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-black text-slate-900">Últimas Atividades</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-slate-100" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Story "Coleção Verão" publicado</p>
                  <p className="text-xs text-slate-400 font-medium">Há {i * 15} minutos</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}