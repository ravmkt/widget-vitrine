import { Card, CardContent } from "@/components/ui/card";
import { Copy, CheckCircle2, Globe, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

export default function WidgetInstall() {
  const [copied, setCopied] = useState(false);
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

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Instalar Widget
        </h1>
        <p className="text-slate-500 font-medium">
          Copie o código abaixo e cole no cabeçalho da sua loja Yampi.
        </p>
      </div>

      {isLocal && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Aviso de Ambiente Local</p>
            <p className="opacity-80">
              Detectamos que você está em localhost. Para a Yampi acessar o widget,
              configure a variável{" "}
              <code className="bg-amber-100 px-1 rounded">
                VITE_WIDGET_PUBLIC_URL
              </code>{" "}
              com seu domínio de produção.
            </p>
          </div>
        </div>
      )}

      {!storeId && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-bold">Loja não identificada</p>
            <p className="opacity-80">
              O script ainda não pode ser copiado porque o ID da loja não foi carregado.
            </p>
          </div>
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-bold">Supabase não configurado</p>
            <p className="opacity-80">
              O snippet precisa das credenciais públicas para carregar stories e vídeos reais do Supabase.
            </p>
          </div>
        </div>
      )}

      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Script de Integração Yampi
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!storeId}
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copiado!" : "Copiar Código"}
            </Button>
          </div>

          <div className="relative">
            <pre className="p-6 bg-black/40 rounded-2xl text-emerald-400 font-mono text-xs md:text-sm overflow-x-auto border border-white/5 leading-relaxed">
              {scriptCode}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            t: "Configuração Yampi",
            d: "Vá em Configurações > Scripts e cole no campo de cabeçalho.",
          },
          {
            t: "Domínio Seguro",
            d: "Certifique-se de usar HTTPS para evitar bloqueios de segurança.",
          },
          {
            t: "Acesso Público",
            d: "O arquivo widget.js está na pasta /public e é acessível sem login.",
          },
        ].map((f) => (
          <div
            key={f.t}
            className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col gap-2"
          >
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <h4 className="text-sm font-black text-slate-900">{f.t}</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {f.d}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
