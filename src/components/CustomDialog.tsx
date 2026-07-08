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
  isOpen, type, title, description, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel,
}) => {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="w-12 h-12 text-[#10B981]" />,
    error: <XCircle className="w-12 h-12 text-[#EF4444]" />,
    warning: <AlertTriangle className="w-12 h-12 text-[#F59E0B]" />,
    confirm: <HelpCircle className="w-12 h-12 text-[#0094EB]" />,
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2rem] p-8 shadow-2xl relative flex flex-col items-center text-center">
        {onCancel && (
          <button onClick={onCancel} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-50 transition-all">
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="mb-6">
          {icons[type]}
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed px-4">{description}</p>

        <div className="flex gap-3 w-full">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 px-6 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all ${
              type === 'error' ? 'bg-[#EF4444] hover:bg-red-600' : 
              type === 'warning' ? 'bg-[#F59E0B] hover:bg-amber-600' : 'bg-[#0094EB] hover:bg-[#0E4787]'
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