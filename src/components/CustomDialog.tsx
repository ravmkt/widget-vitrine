import React from 'react';
import { X, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm';
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  type,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'confirm':
      default:
        return <HelpCircle className="w-12 h-12 text-violet-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950 text-slate-400 hover:text-white transition-all"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="mb-4 p-3 rounded-full bg-slate-950/50 border border-slate-800/40">
          {getIcon()}
        </div>

        <h3 className="text-xl font-extrabold text-slate-100 mb-2 leading-snug">
          {title}
        </h3>

        <p className="text-sm md:text-base text-slate-400 font-medium mb-6 leading-relaxed px-2">
          {description}
        </p>

        <div className="flex gap-3 w-full mt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-bold text-sm md:text-base transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm md:text-base text-white shadow-lg transition-all ${
              type === 'error'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/10'
                : type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-600/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomDialog;