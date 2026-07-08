import { Button } from "@/components/ui/button";
import { Upload, Search, Filter, Grid, List as ListIcon, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function VideoGallery() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Galeria de Vídeos</h1>
          <p className="text-slate-500 font-medium">Sua biblioteca de vídeos para campanhas.</p>
        </div>
        <Button className="rounded-2xl bg-violet-600 hover:bg-violet-700 font-black h-12 px-8 shadow-lg shadow-violet-100">
          <Upload className="mr-2 h-5 w-5" /> Fazer Upload
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-medium" placeholder="Buscar vídeos por nome ou tag..." />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-200 bg-white">
            <Filter className="h-5 w-5" />
          </Button>
          <div className="h-14 bg-slate-100 rounded-2xl p-1 flex">
            <Button variant="ghost" className="h-full px-4 rounded-xl bg-white shadow-sm text-violet-600">
              <Grid className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="h-full px-4 rounded-xl text-slate-400">
              <ListIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="group border-none shadow-sm rounded-[2rem] overflow-hidden bg-white cursor-pointer hover:shadow-xl transition-all">
            <CardContent className="p-0">
              <div className="aspect-[9/16] bg-slate-100 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                    <Play className="h-6 w-6 text-slate-900 fill-slate-900" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/40 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] font-bold text-white w-fit">
                    00:1{i}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs font-black text-slate-900 truncate">Video_Campanha_{i}.mp4</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">2.4 MB • 1080x1920</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}