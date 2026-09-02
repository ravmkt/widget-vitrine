import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';

const FloatingHelpButton = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={() => navigate('/suporte')}
        className="group flex h-14 w-14 hover:w-44 items-center justify-start rounded-full bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] text-white shadow-xl shadow-blue-500/20 dark:shadow-orange-500/10 transition-all duration-300 ease-in-out active:scale-95 overflow-hidden border border-white/10"
        aria-label="Central de Suporte"
        title="Suporte & Ajuda"
      >
        <div className="flex items-center gap-2 px-4 w-full">
          {/* Ícone fixo perfeitamente centralizado no tamanho padrão */}
          <Headphones size={24} className="flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300" />
          
          {/* Texto que surge suavemente ao expandir */}
          <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden text-sm font-semibold tracking-wide whitespace-nowrap">
            Suporte
          </span>
        </div>
      </button>
    </div>
  );
};

export default FloatingHelpButton;
