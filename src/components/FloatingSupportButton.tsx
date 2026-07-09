import React from 'react';
import WhatsAppIcon from './WhatsAppIcon';

const FloatingSupportButton = () => {
  const handleSupportClick = () => {
    const whatsappNum = "5545998370536";
    const defaultMsg = encodeURIComponent("Preciso de ajuda com o Vitrine Vídeo");
    const supportUrl = `https://wa.me/${whatsappNum}?text=${defaultMsg}`;
    window.open(supportUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <button
        onClick={handleSupportClick}
        className="bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center gap-2.5 px-6 py-3.5 rounded-full shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 font-bold text-sm border-2 border-white/20"
        aria-label="Suporte via WhatsApp"
      >
        <WhatsAppIcon size={20} />
        <span>Suporte</span>
      </button>
    </div>
  );
};

export default FloatingSupportButton;