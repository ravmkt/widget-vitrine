import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm' | 'form';
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
  maxWidth?: string;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen, type, title, description, confirmText = 'Confirmar', cancelText = 'Cancelar', 
  onConfirm, onCancel, children, maxWidth = 'max-w-md'
}) => {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="w-12 h-12 text-[#10B981]" />,
    error: <XCircle className="w-12 h-12 text-[#EF4444]" />,
    warning: <AlertTriangle className="w-12 h-12 text-[#F59E0B]" />,
    confirm: <HelpCircle className="w-12 h-12 text-[#0094EB]" />,
    form: null
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Overlay: Ocupa toda a tela e borra o fundo */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Card do Modal: Centralizado via Flexbox do pai */}
      <div className={cn(
        "relative w-full bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl flex flex-col animate-fade-in overflow-hidden z-[100000]",
        maxWidth
      )} style={{ maxHeight: 'calc(100vh - 64px)' }}>
        
        {/* Header Fixo */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-100 shrink-0">
          <h3 className="text-xl font-black text-slate-900">{title}</h3>
          <button 
            onClick={onCancel} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-50 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo com Scroll Interno */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white">
          {type !== 'form' && (
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4">{icons[type]}</div>
              {description && <p className="text-sm font-bold text-slate-500 leading-relaxed">{description}</p>}
            </div>
          )}
          {children}
        </div>

        {/* Footer Fixo */}
        <div className="p-6 md:p-8 border-t border-slate-100 flex flex-col sm:flex-row gap-3 bg-slate-50/50 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 font-black text-sm transition-all"
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                "flex-1 py-4 px-6 rounded-2xl font-black text-sm text-white shadow-xl shadow-blue-200 transition-all active:scale-95",
                type === 'error' ? 'bg-[#EF4444] hover:bg-red-600 shadow-red-100' : 
                type === 'warning' ? 'bg-[#F59E0B] hover:bg-amber-600 shadow-amber-100' : 'bg-[#0094EB] hover:bg-[#0E4787]'
              )}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomDialog;