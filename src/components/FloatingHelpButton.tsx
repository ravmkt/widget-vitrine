import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';

const FloatingHelpButton = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={() => navigate('/suporte')}
        className="group flex h-14 w-14 hover:w-44 items-center justify-start rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all duration-300 ease-in-out active:scale-95 overflow-hidden border border-white/10"
        aria-label="Central de Suporte"
      >
        <div className="flex items-center gap-2 px-4 w-full">
          {/* Ícone fixo no canto esquerdo da expansão */}
          <Headphones size={24} className="flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300" />
          
          {/* Texto que aparece suavemente */}
          <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden text-sm font-semibold tracking-wide whitespace-nowrap">
            Suporte & Ajuda
          </span>
        </div>
      </button>
    </div>
  );
};

export default FloatingHelpButton;
