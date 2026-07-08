import { Button } from "@/components/ui/button";
import { ChevronLeft, Save, Plus, Video, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export default function StoryEditor() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/stories"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Novo Story</h1>
            <p className="text-slate-500 text-sm font-medium">Configure os vídeos e produtos desta campanha.</p>
          </div>
        </div>
        <Button className="rounded-2xl bg-violet-600 hover:bg-violet-700 font-black h-12 px-8 shadow-lg shadow-violet-100">
          <Save className="mr-2 h-5 w-5" /> Salvar Campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900">Sequência de Vídeos</h3>
              <Button variant="outline" className="rounded-xl border-slate-200 font-bold">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Vídeo
              </Button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="aspect-[9/16] rounded-3xl border-4 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                <Video className="h-8 w-8" />
                <span className="text-[10px] font-black uppercase tracking-widest">Selecionar</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-[2.5rem] p-8">
            <h3 className="text-lg font-black text-slate-900 mb-6">Produtos Vinculados</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center py-10">
                <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">Nenhum produto ainda</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Selecione produtos da sua Yampi para exibir no story.</p>
                <Button variant="secondary" className="rounded-xl font-bold w-full bg-white border-slate-100">
                  Importar da Yampi
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}