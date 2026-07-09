import React, { useState } from 'react';
import { Code, Copy, Globe, Terminal, CheckCircle2, AlertTriangle, Blocks } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

const IntegrationPage = () => {
  const [tab, setTab] = useState<'script' | 'gtm'>('script');
  const publicUrl = window.location.origin;
  const licenseId = "11111111";
  
  const scriptCode = `<script src="${publicUrl}/widget.js?licenseId=${licenseId}"></script>`;
  
  const gtmCode = `<!-- GTM Custom HTML Vitrine Vídeo -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${publicUrl}/widget.js?licenseId=${licenseId}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    showSuccess('Código copiado com sucesso!');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Instalação</h1>
        <p className="text-slate-500 font-medium mt-1">Conecte o Vitrine Vídeo à sua loja virtual via script direto ou GTM.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 w-fit mb-8">
           <button 
             onClick={() => setTab('script')}
             className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all", tab === 'script' ? "bg-white text-[#0094EB] shadow-sm" : "text-slate-400 hover:text-slate-600")}
           >
             Script Direto
           </button>
           <button 
             onClick={() => setTab('gtm')}
             className={cn("px-6 py-2.5 rounded-xl text-xs font-bold transition-all", tab === 'gtm' ? "bg-white text-[#0094EB] shadow-sm" : "text-slate-400 hover:text-slate-600")}
           >
             Google Tag Manager
           </button>
        </div>

        {tab === 'script' ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <Terminal className="text-[#0094EB]" size={20} />
              <h3 className="text-xl font-black text-slate-800">Script de Integração</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Copie o código abaixo e cole no cabeçalho (Head) da sua loja (Yampi, Shopify, Nuvemshop...) para ativar a exibição dos stories.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative group overflow-hidden">
               <pre className="text-xs md:text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                 {scriptCode}
               </pre>
               <button 
                 onClick={() => copy(scriptCode)}
                 className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-all"
               >
                 <Copy size={16} />
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <Blocks className="text-[#0094EB]" size={20} />
              <h3 className="text-xl font-black text-slate-800">Instalação via GTM</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Crie uma nova Tag do tipo "HTML Personalizado" no seu container GTM e cole o código abaixo. Acione em "All Pages".
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative group overflow-hidden">
               <pre className="text-xs md:text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                 {gtmCode}
               </pre>
               <button 
                 onClick={() => copy(gtmCode)}
                 className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-all"
               >
                 <Copy size={16} />
               </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
            <Globe className="text-[#0094EB] mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">Passo 1</h4>
            <p className="text-xs text-slate-500 font-medium">Acesse as configurações de scripts da sua loja.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
            <Code className="text-slate-400 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">Passo 2</h4>
            <p className="text-xs text-slate-500 font-medium">Cole o código no campo de "Cabeçalho" (Header).</p>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="text-emerald-500 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">Passo 3</h4>
            <p className="text-xs text-slate-500 font-medium">Cole o código e salve as alterações.</p>
          </div>
        </div>

        <div className="mt-12 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4 items-start">
           <AlertTriangle className="text-amber-500 shrink-0" size={20} />
           <p className="text-xs font-bold text-amber-800 leading-relaxed">
             Atenção: dependendo da plataforma, a exibição pode levar alguns minutos por causa do cache. Se necessário, limpe o cache da plataforma ou aguarde alguns minutos.
           </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;