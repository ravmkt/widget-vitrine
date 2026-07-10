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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 border-2 border-white/20 hover:bg-[#128C7E]"
        aria-label="Suporte via WhatsApp"
      >
        <WhatsAppIcon size={24} />
      </button>
    </div>
  );
};

export default FloatingSupportButton;