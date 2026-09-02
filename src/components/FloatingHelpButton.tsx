import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';

const FloatingHelpButton = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <button
        onClick={() => navigate('/suporte')}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-primary/20 transition-all active:scale-95 border-2 border-white/20 hover:brightness-110"
        aria-label="Ir para o Suporte"
        title="Suporte"
      >
        <LifeBuoy size={26} />
      </button>
    </div>
  );
};

export default FloatingHelpButton;
