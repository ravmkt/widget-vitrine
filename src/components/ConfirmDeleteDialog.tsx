import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  itemName?: string; // Prop opcional para destacar o nome do arquivo em azul como no print
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
}) => {
  if (!isOpen) return null;

  // Lógica inteligente para retrocompatibilidade: 
  // Se houver itemName, renderiza o texto padrão do print.
  // Se não houver, mas a descrição tiver algo entre aspas, destaca o texto entre aspas em azul!
  let highlightedContent: React.ReactNode = description;

  if (itemName) {
    highlightedContent = (
      <>
        Esta ação é irreversível. O item <span className="text-[#0091FF] font-extrabold">"{itemName}"</span> será removido permanentemente.
      </>
    );
  } else if (description) {
    const match = description.match(/"([^"]+)"/);
    if (match) {
      const parts = description.split(match[0]);
      highlightedContent = (
        <>
          {parts[0]}
          <span className="text-[#0091FF] font-extrabold">"{match[1]}"</span>
          {parts[1]}
        </>
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/40 flex items-center justify-center px-4 backdrop-blur-[2px] animate-fade-in">
      <div className="relative w-full max-w-[480px] bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 overflow-hidden animate-scale-up flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase font-sans">
            {title || 'EXCLUIR ARQUIVO'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ícone de Alerta Centralizado */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full border border-amber-100 bg-amber-50/40 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        {/* Banner de Aviso */}
        <div className="mb-8 p-4 bg-[#FFFDF5] border border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-950/90 leading-relaxed text-left">
            {highlightedContent}
          </p>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-[#0091FF] hover:bg-[#0081e0] text-xs font-extrabold text-white transition-all cursor-pointer text-center shadow-sm"
          >
            Excluir
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
