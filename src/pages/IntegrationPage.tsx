import React from 'react';
import { Code, Copy, Globe, Terminal, CheckCircle2 } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const IntegrationPage = () => {
  const publicUrl = window.location.origin;
  const script = `<script src="${publicUrl}/widget.js?licenseId=11111111"></script>`;

  const copy = () => {
    navigator.clipboard.writeText(script);
    showSuccess('Script copiado!');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Instalação</h1>
        <p className="text-[#64748B] font-medium mt-1">Conecte o Vitrine Vídeo à sua loja virtual via script direto.</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0094EB]">
            <Terminal size={20} />
          </div>
          <h3 className="text-xl font-black text-[#0F172A]">Script de Integração</h3>
        </div>

        <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
          Copie o código abaixo e cole no cabeçalho (Head) da sua loja (Yampi, Shopify ou Nuvemshop) para ativar a exibição dos stories.
        </p>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 relative group">
           <pre className="text-xs md:text-sm font-mono text-[#0F172A] overflow-x-auto whitespace-pre-wrap">
             {script}
           </pre>
           <button 
             onClick={copy}
             className="absolute top-4 right-4 bg-white border border-[#E2E8F0] p-2 rounded-lg text-[#64748B] hover:text-[#0094EB] hover:border-[#0094EB] transition-all shadow-sm"
           >
             <Copy size={16} />
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-2xl bg-[#EAF6FF] border border-[#0094EB]/10">
            <Globe className="text-[#0094EB] mb-3" />
            <h4 className="font-bold text-[#0F172A] mb-1">Passo 1</h4>
            <p className="text-xs text-[#64748B] font-medium">Acesse o painel da sua loja.</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <Code className="text-[#64748B] mb-3" />
            <h4 className="font-bold text-[#0F172A] mb-1">Passo 2</h4>
            <p className="text-xs text-[#64748B] font-medium">Vá em configurações de script.</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <CheckCircle2 className="text-[#10B981] mb-3" />
            <h4 className="font-bold text-[#0F172A] mb-1">Passo 3</h4>
            <p className="text-xs text-[#64748B] font-medium">Salve e publique as alterações.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;