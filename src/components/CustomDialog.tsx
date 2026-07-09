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
    confirm: <HelpCircle className="w-10 h-10 text-[#0094EB]" />,
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
        "relative w-full bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl flex flex-col animate-fade-in overflow-hidden z-[100000]",
        maxWidth
      )} style={{ maxHeight: '92vh' }}>
        
        {/* Header Fixo Menor */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{title}</h3>
          <button 
            onClick={onCancel} 
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Otimizado */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          {type !== 'form' && (
            <div className="flex flex-col items-center text-center mb-4">
              <div className="mb-3">{icons[type]}</div>
              {description && <p className="text-xs font-bold text-slate-500 leading-relaxed">{description}</p>}
            </div>
          )}
          {children}
        </div>

        {/* Footer Otimizado */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 bg-slate-50/50 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-white font-black text-xs transition-all"
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl font-black text-xs text-white shadow-md transition-all active:scale-95",
                type === 'error' ? 'bg-[#EF4444]' : 
                type === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#0094EB]'
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