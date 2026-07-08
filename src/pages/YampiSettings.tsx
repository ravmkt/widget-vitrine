import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, ShieldCheck, Key, Database } from "lucide-react";

export default function YampiSettings() {
  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuração Yampi</h1>
        <p className="text-slate-500 font-medium">Conecte sua loja para importar produtos diretamente nos Stories.</p>
      </div>

      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-violet-600 rounded-xl flex items-center justify-center text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-black">Credenciais de API</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Alias da Loja</Label>
              <div className="relative">
                <Database className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input className="h-12 pl-12 rounded-xl border-slate-200" placeholder="ex: minha-loja" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">User Token</Label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input className="h-12 pl-12 rounded-xl border-slate-200" type="password" placeholder="••••••••••••••••" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Secret Key</Label>
              <div className="relative">
                <Settings className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input className="h-12 pl-12 rounded-xl border-slate-200" type="password" placeholder="••••••••••••••••" />
              </div>
            </div>
          </div>

          <Button className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 font-black text-lg mt-4 shadow-lg shadow-violet-100">
            Salvar e Testar Conexão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}