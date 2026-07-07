import React, { useEffect, useState } from 'react';
import { db, GeneralSettings } from '@/lib/db';
import WhatsAppIcon from './WhatsAppIcon';

const WhatsAppFloatingButton = () => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0]; // Assumindo uma única loja principal

        if (mainStore) {
          const fetchedGeneralSettings = (await db.generalSettings.getAll(mainStore.id))[0];
          setGeneralSettings(fetchedGeneralSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações gerais para o botão flutuante:', error);
      }
    };

    loadSettings();
  }, []);

  if (!generalSettings?.whatsapp_number) {
    return null; // Não renderiza o botão se não houver número configurado
  }

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(generalSettings.whatsapp_default_message || "Olá! Preciso de suporte com o painel Vidlytics Stories.");
    window.open(`https://wa.me/${generalSettings.whatsapp_number}?text=${message}`, "_blank", "noopener,noreferrer");
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