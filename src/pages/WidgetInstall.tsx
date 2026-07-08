import { Card, CardContent } from "@/components/ui/card";
import { Code, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WidgetInstall() {
  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Instalar Widget</h1>
        <p className="text-slate-500 font-medium">Copie o código abaixo e cole no seu site para ativar o Video Commerce.</p>
      </div>

      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <Code className="h-5 w-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Snippet de Integração</span>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold">
              <Copy className="mr-2 h-4 w-4" /> Copiar Código
            </Button>
          </div>
          
          <pre className="p-6 bg-black/40 rounded-2xl text-emerald-400 font-mono text-sm overflow-x-auto border border-white/5">
{`<script src="https://cdn.vidlytics.com/widget.js"></script>
<script>
  Vidlytics.init({
    shopId: 'your-shop-id',
    theme: 'modern-dark'
  });
</script>`}
          </pre>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { t: "Integração Yampi", d: "Funciona nativamente com o checkout da Yampi." },
          { t: "Mobile First", d: "Otimizado para a melhor experiência em smartphones." },
          { t: "Auto-Update", d: "Novos stories aparecem sem precisar mudar o código." },
        ].map(f => (
          <div key={f.t} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <h4 className="text-sm font-black text-slate-900">{f.t}</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}