import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void; // Suporte à propriedade utilizada pelas páginas de Stories, Comentários, Medidas e Produtos
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string; // Suporte à propriedade utilizada pela página de Produtos
  itemName?: string;
  usedInStories?: number | boolean; // Suporte ao caso especial de exclusão de vídeos
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  itemName,
  usedInStories,
}) => {
  if (!isOpen) return null;

  // Unifica a ação de fechar (prioriza onCancel que é o mais usado, depois onClose)
  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  // Unifica o texto a ser exibido no balão de aviso
  const textSource = message || description || '';

  // Processa o conteúdo para estilizar o nome em azul (#0091FF) dinamicamente
  let highlightedContent: React.ReactNode = textSource;

  if (usedInStories) {
    // Alerta especial e crítico para exclusão de vídeos que estão em uso ativo
    highlightedContent = (
      <>
        Este vídeo está sendo usado em <span className="text-[#0091ff] dark:text-[#ff7a29] font-extrabold">Stories ativos</span>. Ao excluí-lo, ele será removido de todos os Stories vinculados na sua loja permanentemente.
      </>
    );
  } else if (itemName) {
    highlightedContent = (
      <>
        Esta ação é irreversível. O item <span className="text-[#0091ff] dark:text-[#ff7a29] font-extrabold">"{itemName}"</span> será removido permanentemente.
      </>
    );
  } else if (textSource) {
    // Captura termos entre aspas e destaca em azul dinamicamente
    const match = textSource.match(/"([^"]+)"/);
    if (match) {
      const parts = textSource.split(match[0]);
      highlightedContent = (
        <>
          {parts[0]}
          <span className="text-[#0091ff] dark:text-[#ff7a29] font-extrabold">"{match[1]}"</span>
          {parts[1]}
        </>
      );
    }
  } else {
    // Fallback de texto seguro caso nenhuma informação seja enviada
    highlightedContent = "Esta ação é irreversível e todos os dados vinculados serão removidos de forma definitiva.";
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/40 dark:bg-black/60 flex items-center justify-center px-4 backdrop-blur-[2px] animate-fade-in">
      <div className="relative w-full max-w-[480px] bg-white dark:bg-[#111524] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#ff7a29]/30 overflow-hidden animate-scale-up flex flex-col transition-colors duration-300">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-wider uppercase font-sans">
            {title || 'EXCLUIR REGISTRO'}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-xl text-slate-400 dark:text-slate-500 hover:text-[#0091ff] dark:hover:text-[#ff7a29] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ícone de Alerta Centralizado */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full border border-amber-100 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        {/* Banner de Aviso */}
        <div className="mb-8 p-4 bg-[#FFFDF5] dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-950/90 dark:text-amber-200/90 leading-relaxed text-left">
            {highlightedContent}
          </p>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-2xl bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-[#ff7a29]/30 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a1f35]/70 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              handleClose(); // Garante o fechamento correto após a confirmação
            }}
            className="flex-1 py-3 rounded-2xl bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] text-xs font-extrabold text-white transition-all cursor-pointer text-center shadow-sm"
          >
            Excluir
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
