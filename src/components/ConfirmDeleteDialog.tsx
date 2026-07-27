import React from 'react';
import CustomDialog from './CustomDialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  usedInStories?: boolean;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  title,
  itemName,
  onConfirm,
  onCancel,
  isLoading,
  usedInStories = false,
}) => {
  return (
    <CustomDialog
      isOpen={isOpen}
      type="warning"
      title={title}
      maxWidth="max-w-md"
      confirmText={isLoading ? 'Excluindo...' : 'Excluir'}
      cancelText="Cancelar"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <p className="text-xs font-bold text-amber-800 leading-relaxed">
            Esta ação é irreversível. O item{' '}
            <span className="font-black">"{itemName}"</span> será removido
            permanentemente.
            {usedInStories && (
              <>
                <br />
                <span className="block mt-1">
                  Atenção: Este vídeo está sendo usado em um ou mais Stories. Sua
                  exclusão removerá o vínculo desses stories.
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </CustomDialog>
  );
};

export default ConfirmDeleteDialog;
