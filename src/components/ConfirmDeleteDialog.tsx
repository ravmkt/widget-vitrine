import React, { useState, useEffect } from 'react';
import CustomDialog from './CustomDialog';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  title,
  itemName,
  onConfirm,
  onCancel,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when opening
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  const isConfirmed = inputValue === 'excluir';

  return (
    <CustomDialog
      isOpen={isOpen}
      type="warning"
      title={title}
      maxWidth="max-w-md"
      confirmText={isLoading ? "Excluindo..." : "Excluir definitivamente"}
      cancelText="Cancelar"
      onConfirm={isConfirmed ? onConfirm : undefined}
      onCancel={onCancel}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <p className="text-xs font-bold text-amber-800 leading-relaxed">
            Esta ação é irreversível. O item <span className="font-black">"{itemName}"</span> será removido permanentemente.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Para confirmar, digite <span className="text-red-500 underline">excluir</span> abaixo:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite excluir"
            autoFocus
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-red-500 transition-all"
          />
        </div>
      </div>
      
      {/* CSS Injetado para o botão de confirmação do CustomDialog se tornar vermelho */}
      <style>{`
        button.bg-\\[\\#0094EB\\] {
          background-color: ${isConfirmed ? '#DC2626 !important' : '#CBD5E1 !important'};
          cursor: ${isConfirmed ? 'pointer' : 'not-allowed'};
        }
        button.bg-\\[\\#0094EB\\]:hover {
          background-color: ${isConfirmed ? '#B91C1C !important' : '#CBD5E1 !important'};
        }
      `}</style>
    </CustomDialog>
  );
};

export default ConfirmDeleteDialog;