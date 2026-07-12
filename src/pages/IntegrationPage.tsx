import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';

const IntegrationPage = () => {
  const { storeId } = useTenant();
  const publicUrl = import.meta.env.VITE_WIDGET_PUBLIC_URL || window.location.origin;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const isLocal = publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1');

  const scriptCode = `<script>
window.VIDLYTICS_CONFIG = {
  storeId: "${storeId || ''}",
  supabaseUrl: "${supabaseUrl}",
  supabaseAnonKey: "${supabaseAnonKey}"
};
(function() {
  var script = document.createElement('script');
  script.src = '${publicUrl}/widget.js';
  script.async = true;
  script.charset = 'UTF-8';
  document.head.appendChild(script);
})();
</script>`;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Instalação</h1>
        <p className="text-slate-500 font-medium mt-1">Conecte o Vitrine Vídeo à sua loja virtual via script direto.</p>
      </div>

      {isLocal && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">URL pública ausente</p>
            <p className="opacity-80">Se a URL do widget estiver em localhost, configure uma URL pública de produção na Vercel para a loja conseguir carregar o widget.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative group overflow-hidden shadow-2xl">
          <pre className="text-xs md:text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {scriptCode}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;