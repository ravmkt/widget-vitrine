import { Card, CardContent } from "@/components/ui/card";
import { Copy, CheckCircle2, Globe, AlertTriangle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

export default function WidgetInstall() {
  const [copied, setCopied] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const { storeId } = useTenant();

  const publicUrl =
    import.meta.env.VITE_WIDGET_PUBLIC_URL || window.location.origin;

  const isLocal =
    publicUrl.includes("localhost") || publicUrl.includes("127.0.0.1");

  const displayUrl = isLocal
    ? "https://seu-dominio-publico.com"
    : publicUrl;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  const widgetConfig = {
    storeId: storeId || "",
    supabaseUrl,
    supabaseAnonKey,
  };

  const scriptCode = `<script>
window.VIDLYTICS_CONFIG = ${JSON.stringify(widgetConfig, null, 2)};

(function() {
  var script = document.createElement('script');
  script.src = ${JSON.stringify(`${displayUrl}/widget.js`)};
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;

  const trackingScriptCode = `<script>
(function() {
  var script = document.createElement('script');
  script.src = ${JSON.stringify(`${displayUrl}/yampi-tracking.js`)};
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;

  const handleCopy = async () => {
    if (!storeId) {
      showError("Não foi possível identificar a loja. Recarregue a página e tente novamente.");
      return;
    }

    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      showSuccess("Script copiado com sucesso!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Não foi possível copiar o script.");
    }
  };

  const handleCopyTracking = async () => {
    try {
      await navigator.clipboard.writeText(trackingScriptCode);
      setCopiedTracking(true);
      showSuccess("Script de rastreamento copiado!");
      setTimeout(() => setCopiedTracking(false), 2000);
    } catch {
      showError("Não foi possível copiar o script.");
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Instalar Integração
        </h1>
        <p className="text-slate-500 font-medium">
          Siga os passos abaixo para integrar o Vidlytics com sua loja Yampi.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#0094EB] text-white rounded-full flex items-center justify-center font-black">1</div>
            <h2 className="text-xl font-black text-slate-800">Passo 1: Carregar o Widget</h2>
          </div>
          
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-violet-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Script Principal (Widget)
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!storeId}
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold disabled:opacity-40"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>

              <div className="relative">
                <pre className="p-6 bg-black/40 rounded-2xl text-emerald-400 font-mono text-xs overflow-x-auto border border-white/5 leading-relaxed">
                  {scriptCode}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black">2</div>
            <h2 className="text-xl font-black text-slate-800">Passo 2: Rastrear Vendas (Receita)</h2>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 mb-4">
            <p className="text-sm text-emerald-800 font-medium leading-relaxed">
              Para ver quanto cada vídeo está gerando em vendas (R$), instale este segundo script.
              Ele captura o valor da compra no checkout da Yampi e atribui ao vídeo que o cliente assistiu.
            </p>
          </div>
          
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Script de Rastreamento de Vendas (Yampi)
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTracking}
                  className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copiedTracking ? "Copiado!" : "Copiar"}
                </Button>
              </div>

              <div className="relative">
                <pre className="p-6 bg-black/40 rounded-2xl text-emerald-400 font-mono text-xs overflow-x-auto border border-white/5 leading-relaxed">
                  {trackingScriptCode}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="text-emerald-500 h-6 w-6" />
          Onde instalar no painel da Yampi?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <p className="text-sm text-slate-600 font-medium">
              1. Acesse <strong>Configurações</strong> no menu lateral.<br/>
              2. Clique em <strong>Pixel / Scripts Personalizados</strong>.<br/>
              3. No campo <strong>Scripts personalizados</strong>, cole os dois códigos acima.<br/>
              4. Salve e publique as alterações.
            </p>
          </div>
          <div className="bg-slate-50 rounded-3xl p-6 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-center">Importante</p>
            <p className="text-xs text-slate-500 text-center font-medium leading-relaxed italic">
              "A instalação correta dos dois scripts garante que o Vidlytics carregue os vídeos e que você saiba exatamente o lucro gerado por cada story."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
