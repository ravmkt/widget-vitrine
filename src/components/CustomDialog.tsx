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
    success: <CheckCircle2 className="w-10 h-10 text-[#10B981]" />,
    error: <XCircle className="w-10 h-10 text-[#EF4444]" />,
    warning: <AlertTriangle className="w-10 h-10 text-[#F59E0B]" />,
    confirm: <HelpCircle className="w-10 h-10 text-[#0091ff]" />,
    form: null
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Overlay Compacto */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Card do Modal Compacto */}
      <div className={cn(
        "relative w-full bg-white dark:bg-[#111524] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden z-[100000] transition-colors duration-300",
        maxWidth
      )} style={{ maxHeight: '92vh' }}>
        
        {/* Header Fixo Menor */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#ff7a29]/20 shrink-0">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-[#0091ff] dark:hover:text-[#ff7a29] hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Otimizado */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-[#111524]">
          {type !== 'form' && (
            <div className="flex flex-col items-center text-center mb-4">
              <div className="mb-3">{icons[type]}</div>
              {description && <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>}
            </div>
          )}
          {children}
        </div>

        {/* Footer Otimizado */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#ff7a29]/20 flex flex-col sm:flex-row gap-2 bg-slate-50/50 dark:bg-[#1a1f35]/50 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1a1f35] font-black text-xs transition-all"
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-2xl font-black text-xs text-white shadow-md transition-all active:scale-95",
                type === 'error' ? 'bg-[#EF4444]' :
                type === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#0091ff] dark:bg-[#ff7a29]'
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