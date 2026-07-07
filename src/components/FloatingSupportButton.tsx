import React from 'react';
import WhatsAppIcon from './WhatsAppIcon';

const FloatingSupportButton = () => {
  const whatsappNumber = "5545998370536";
  const defaultMessage = encodeURIComponent("Olá! Preciso de suporte com o app Video Commerce.");
  const supportUrl = `https://wa.me/${whatsappNumber}?text=${defaultMessage}`;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] group flex items-center gap-3">
      {/* Tooltip Lateral */}
      <span className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-slate-900 border border-slate-800 text-xs text-slate-100 font-bold px-3 py-2 rounded-xl shadow-xl whitespace-nowrap">
        💬 Suporte Técnico Online
      </span>

      {/* Botão de Suporte Flutuante */}
      <a
        href={supportUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative bg-gradient-to-tr from-emerald-500 to-green-400 hover:from-emerald-600 hover:to-green-500 text-white p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center border border-emerald-400/20"
        aria-label="Suporte via WhatsApp"
        title="Falar com o Suporte"
      >
        {/* Efeito de pulso de atenção em modo dark */}
        <span className="absolute -inset-1 rounded-2xl bg-emerald-500/30 animate-ping pointer-events-none -z-10"></span>
        
        <WhatsAppIcon size={24} />
      </a>
    </div>
  );
};

export default FloatingSupportButton;