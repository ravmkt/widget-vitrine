import { Card, CardContent } from "@/components/ui/card";
import { Palette, Check } from "lucide-react";

export default function StyleModels() {
  const themes = [
    { name: "Modern Dark", primary: "bg-slate-950", accent: "bg-violet-600" },
    { name: "Glassmorphism", primary: "bg-white/10", accent: "bg-white" },
    { name: "Clean White", primary: "bg-white", accent: "bg-slate-900" },
    { name: "Vibrant Pink", primary: "bg-pink-500", accent: "bg-white" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modelos de Estilo</h1>
        <p className="text-slate-500 font-medium">Personalize a aparência do seu player de vídeo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {themes.map((theme, i) => (
          <Card key={theme.name} className="group border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white cursor-pointer hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className={`aspect-[9/16] ${theme.primary} rounded-[1.8rem] mb-6 border border-slate-100 shadow-inner relative flex items-center justify-center`}>
                <div className={`h-12 w-12 ${theme.accent} rounded-full shadow-lg flex items-center justify-center`}>
                   {i === 0 && <Check className="h-6 w-6 text-white" />}
                </div>
              </div>
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-sm font-black text-slate-900">{theme.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tema Customizado</p>
                </div>
                <div className={`h-4 w-4 rounded-full ${theme.accent.split(' ')[0]}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}