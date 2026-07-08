import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Tablet, RefreshCcw } from "lucide-react";

export default function WidgetPreview() {
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Preview do Widget</h1>
          <p className="text-slate-500 text-sm font-medium">Veja como os stories aparecem para seus clientes.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 text-violet-600"><Smartphone className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-400"><Tablet className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-400"><Monitor className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200/50 rounded-[3rem] border-8 border-white shadow-2xl relative overflow-hidden flex items-center justify-center group">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-40 blur-sm" />
        
        <div className="w-[320px] aspect-[9/16] bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-slate-800 relative overflow-hidden z-10 flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center animate-pulse">
                <RefreshCcw className="h-8 w-8 text-white/50" />
            </div>
            <p className="text-[10px] font-black text-white/50 uppercase mt-4 tracking-widest">Carregando Stories...</p>
        </div>
        
        <div className="absolute bottom-10 right-10 z-20">
             <div className="h-20 w-20 rounded-full bg-violet-600 border-4 border-white shadow-xl flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                <div className="h-14 w-14 rounded-full border-2 border-white/30 animate-ping absolute" />
                <span className="font-black text-xs">LIVE</span>
             </div>
        </div>
      </div>
    </div>
  );
}