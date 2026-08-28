import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-amber-950/20 flex items-center justify-center px-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#FFFBEB] rounded-2xl p-6 shadow-2xl border border-amber-200 overflow-hidden animate-scale-up">
        
        {/* Botão X de fechar no canto superior direito */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/80 hover:bg-white text-amber-900 shadow-sm border border-amber-100 transition-all cursor-pointer"
          aria-label="Fechar"
        >
          <X size={14} />
        </button>

        {/* Conteúdo Centralizado */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="p-3.5 bg-amber-100 rounded-full mb-3.5 border border-amber-200">
            <AlertTriangle className="h-7 w-7 text-amber-600 animate-pulse" />
          </div>
          <h3 className="text-base font-extrabold text-amber-950 mb-1.5">
            {title}
          </h3>
          <p className="text-xs font-medium text-amber-800/90 leading-relaxed max-w-[280px]">
            {description}
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors shadow-sm cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-sm cursor-pointer text-center"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;