import { Button } from "@/components/ui/button";
import { Plus, Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function StoriesManager() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meus Stories</h1>
          <p className="text-slate-500 font-medium">Gerencie suas campanhas de vídeo commerce.</p>
        </div>
        <Button asChild className="rounded-2xl bg-violet-600 hover:bg-violet-700 font-black h-12 px-6">
          <Link to="/stories/new"><Plus className="mr-2 h-5 w-5" /> Novo Story</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="group cursor-pointer">
            <div className="aspect-[9/16] bg-slate-200 rounded-[2rem] border-4 border-white shadow-lg overflow-hidden relative mb-3 transition-transform hover:scale-[1.02]">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Play className="h-10 w-10 text-white fill-white" />
              </div>
              <div className="absolute top-4 left-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
            </div>
            <p className="text-sm font-black text-slate-900 truncate px-2">Campanha {i}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">4 Vídeos</p>
          </div>
        ))}
        <Link to="/stories/new" className="aspect-[9/16] rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-violet-300 hover:text-violet-400 transition-all">
          <Plus className="h-8 w-8" />
          <span className="text-[10px] font-black uppercase tracking-widest">Criar Novo</span>
        </Link>
      </div>
    </div>
  );
}