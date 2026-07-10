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

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-fit mb-12">
           <button 
             onClick={() => setTab('script')}
             className={cn("px-8 py-3 rounded-xl text-xs font-black transition-all", tab === 'script' ? "bg-white text-[#0094EB] shadow-md" : "text-slate-400 hover:text-slate-600")}
           >
             Script Direto
           </button>
           <button 
             onClick={() => setTab('gtm')}
             className={cn("px-8 py-3 rounded-xl text-xs font-black transition-all", tab === 'gtm' ? "bg-white text-[#0094EB] shadow-md" : "text-slate-400 hover:text-slate-600")}
           >
             Google Tag Manager
           </button>
        </div>

        {tab === 'script' ? (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <Terminal className="text-[#0094EB]" size={24} />
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Instalação via Script</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed font-bold">
              Copie o código abaixo e cole no cabeçalho (Head) da sua loja (Yampi, Shopify, Nuvemshop...) para ativar a exibição dos stories.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative group overflow-hidden shadow-2xl">
               <pre className="text-xs md:text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                 {scriptCode}
               </pre>
               <button 
                 onClick={() => copy(scriptCode)}
                 className="absolute top-6 right-6 bg-white/10 hover:bg-[#0094EB] p-3 rounded-xl text-white transition-all active:scale-95"
               >
                 <Copy size={18} />
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <Blocks className="text-[#0094EB]" size={24} />
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Google Tag Manager</h3>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative group overflow-hidden shadow-2xl">
               <pre className="text-xs md:text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                 {gtmCode}
               </pre>
               <button 
                 onClick={() => copy(gtmCode)}
                 className="absolute top-6 right-6 bg-white/10 hover:bg-[#0094EB] p-3 rounded-xl text-white transition-all active:scale-95"
               >
                 <Copy size={18} />
               </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
      <div className="p-8 rounded-[2rem] bg-blue-50 border border-blue-100 group hover:scale-105 transition-all">
        <Globe className="text-[#0094EB] mb-4" size={28} />
        <h4 className="font-black text-slate-800 mb-2">Passo 1</h4>
        <p className="text-xs text-slate-500 font-bold leading-relaxed">Acesse sua conta do GTM e selecione o container da sua loja.</p>
      </div>
      <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:scale-105 transition-all">
        <Code className="text-slate-400 mb-4" size={28} />
        <h4 className="font-black text-slate-800 mb-2">Passo 2</h4>
        <p className="text-xs text-slate-500 font-bold leading-relaxed">Crie uma nova tag do tipo HTML personalizado.</p>
      </div>
      <div className="p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 group hover:scale-105 transition-all">
        <CheckCircle2 className="text-emerald-500 mb-4" size={28} />
        <h4 className="font-black text-slate-800 mb-2">Passo 3</h4>
        <p className="text-xs text-slate-500 font-bold leading-relaxed">Cole o código abaixo, configure o acionador para todas as páginas e publique as alterações.</p>
      </div>
    </div>

        <div className="mt-16 p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex gap-5 items-start">
           <AlertTriangle className="text-amber-500 shrink-0" size={24} />
           <p className="text-xs font-black text-amber-800 leading-relaxed">
             Atenção: dependendo da plataforma, a exibição pode levar alguns minutos por causa do cache. Se necessário, limpe o cache da plataforma ou aguarde alguns minutos.
           </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;