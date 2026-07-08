import { Button } from "@/components/ui/button";
import { Plus, Play, MoreVertical, Eye, BarChart3, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function StoriesManager() {
  const stories = [
    { id: 1, title: "Coleção Outono/Inverno", videos: 5, views: "1.2k", status: "Ativo", color: "bg-orange-500" },
    { id: 2, title: "Ofertas Relâmpago", videos: 3, views: "850", status: "Pausado", color: "bg-red-500" },
    { id: 3, title: "Lançamento Tech", videos: 8, views: "3.4k", status: "Ativo", color: "bg-blue-500" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meus Stories</h1>
          <p className="text-slate-500 font-medium">Gerencie suas campanhas de vídeo verticais.</p>
        </div>
        <Button asChild className="rounded-2xl bg-violet-600 hover:bg-violet-700 font-black h-12 px-6 shadow-lg shadow-violet-200">
          <Link to="/stories/new">
            <Plus className="mr-2 h-5 w-5" /> Criar Novo Story
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        <Link to="/stories/new" className="aspect-[9/16] rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-all bg-white group">
          <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="h-8 w-8" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Adicionar Campanha</span>
        </Link>

        {stories.map((story) => (
          <div key={story.id} className="group relative">
            <div className="aspect-[9/16] bg-slate-900 rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden relative transition-transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
              
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <Badge className={`${story.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-500'} border-none font-bold`}>
                  {story.status}
                </Badge>
              </div>

              <div className="absolute top-6 right-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl font-bold">
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Duplicar</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500">Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8 space-y-2">
                <h3 className="text-white font-black text-lg leading-tight line-clamp-2">{story.title}</h3>
                <div className="flex items-center gap-4 text-white/70 text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Play className="h-3 w-3" /> {story.videos} vids</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {story.views} views</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
              <Button variant="secondary" size="sm" className="rounded-xl font-bold h-9 bg-white shadow-sm border border-slate-100">
                <BarChart3 className="h-4 w-4 mr-2" /> Analytics
              </Button>
              <Button variant="secondary" size="sm" className="rounded-xl font-bold h-9 bg-white shadow-sm border border-slate-100">
                <Settings2 className="h-4 w-4 mr-2" /> Config
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}