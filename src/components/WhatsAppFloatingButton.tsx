import React, { useEffect, useState } from 'react';
import { db, WidgetSettings } from '@/lib/db';
import WhatsAppIcon from './WhatsAppIcon';

const WhatsAppFloatingButton = () => {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    const loadWhatsappNumber = async () => {
      try {
        const stores = await db.getStores();
        const mainStore = stores[0]; // Assumindo uma única loja principal

        if (mainStore) {
          const settings: WidgetSettings = await db.getSettings(mainStore.id);
          if (settings?.whatsapp_number) {
            const rawNumber = settings.whatsapp_number;
            let number = String(rawNumber).replace(/\D/g, "");
            if (number.length >= 10 && number.length <= 11 && !number.startsWith("55")) {
              number = `55${number}`;
            }
            setWhatsappNumber(number);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar número de WhatsApp para o botão flutuante:', error);
      }
    };

    loadWhatsappNumber();
  }, []);

  if (!whatsappNumber) {
    return null; // Não renderiza o botão se não houver número configurado
  }

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Olá! Preciso de suporte com o painel Vidlytics Stories.");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 z-50 flex items-center justify-center"
      aria-label="Suporte via WhatsApp"
      title="Suporte via WhatsApp"
    >
      <WhatsAppIcon size={24} />
    </button>
  );
};

export default WhatsAppFloatingButton;