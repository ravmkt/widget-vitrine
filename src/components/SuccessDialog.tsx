import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose?: () => void;
  autoCloseTime?: number;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({
  isOpen,
  title = "Salvo com sucesso!",
  description,
  onClose,
  autoCloseTime = 1500
}) => {
  useEffect(() => {
    if (isOpen && autoCloseTime > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Overlay com desfoque e escurecimento */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" />
      
      {/* Card de Sucesso Centralizado */}
      <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-sm font-bold text-slate-500 leading-relaxed">
            {description}
          </p>
        )}

        <div className="mt-6 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[progress_1.5s_linear_forwards]" />
        </div>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SuccessDialog;