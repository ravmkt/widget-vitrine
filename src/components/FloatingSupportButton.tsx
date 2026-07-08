import React, { useEffect, useState } from 'react';
import { db, GeneralSettings } from '@/lib/db';
import WhatsAppIcon from './WhatsAppIcon';
import CustomDialog from './CustomDialog';

const FloatingSupportButton = () => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        if (mainStore) {
          const fetchedGeneralSettings = (await db.generalSettings.getAll(mainStore.id))[0];
          setGeneralSettings(fetchedGeneralSettings || null);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações para suporte:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSupportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const whatsappNum = generalSettings?.whatsapp_number;

    if (!whatsappNum || whatsappNum.trim() === '') {
      setIsAlertOpen(true);
      return;
    }

    const defaultMsg = encodeURIComponent("Olá! Preciso de ajuda com o aplicativo Vidlytics Stories.");
    const supportUrl = `https://wa.me/${whatsappNum.replace(/\D/g, "")}?text=${defaultMsg}`;
    window.open(supportUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999] group flex items-center gap-3">
        {/* Tooltip Lateral */}
        <span className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-slate-900 border border-slate-800 text-[13px] text-slate-100 font-bold px-3.5 py-2 rounded-xl shadow-xl whitespace-nowrap">
          💬 Suporte Online
        </span>

        {/* Botão de Suporte Flutuante */}
        <button
          onClick={handleSupportClick}
          className="relative bg-gradient-to-tr from-emerald-500 to-green-400 hover:from-emerald-600 hover:to-green-500 text-white p-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center gap-2 justify-center border border-emerald-400/20 font-bold text-sm md:text-base px-5 py-3.5"
          aria-label="Suporte via WhatsApp"
          title="Falar com o Suporte"
        >
          {/* Efeito de pulso de atenção em modo dark */}
          <span className="absolute -inset-1 rounded-2xl bg-emerald-500/30 animate-ping pointer-events-none -z-10"></span>
          <WhatsAppIcon size={22} />
          <span>Suporte</span>
        </button>
      </div>

      {/* Alerta Dark de Suporte Não Configurado */}
      <CustomDialog
        isOpen={isAlertOpen}
        type="warning"
        title="WhatsApp Não Configurado"
        description="O número de WhatsApp da loja para atendimento de suporte ainda não foi cadastrado no sistema. Acesse a página de Configurações para preencher as informações de suporte técnico da loja."
        confirmText="Ir para Configurações"
        cancelText="Fechar"
        onConfirm={() => {
          setIsAlertOpen(false);
          window.location.href = '/settings';
        }}
        onCancel={() => setIsAlertOpen(false)}
      />
    </>
  );
};

export default FloatingSupportButton;