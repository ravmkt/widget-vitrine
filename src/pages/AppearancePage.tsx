import React, { useEffect, useState } from 'react';
import { db, Appearance, Store } from '@/lib/db';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Star,
  Brush
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

const AppearancePage = () => {
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

  const loadData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];

      if (mainStore) {
        const list = await db.appearances.getAll(mainStore.id);
        setAppearances(list);
      }
    } catch (error) {
      showError('Erro ao carregar estilos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSetDefault = async (id: string) => {
    try {
      const list = [...appearances];
      for (const app of list) {
        await db.appearances.save({ ...app, is_default: app.id === id });
      }
      showSuccess('Estilo padrão atualizado!');
      loadData();
    } catch (e) {
      showError('Erro ao definir padrão.');
    }
  };

  const handleDeleteClick = (app: Appearance) => {
    setDeleteModal({
      isOpen: true,
      id: app.id,
      name: app.name
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.appearances.delete(deleteModal.id);
      showSuccess('Estilo excluído com sucesso.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (e) {
      showError('Erro ao excluir estilo.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Aparência</h1>
          <p className="text-slate-500 font-medium mt-1">
            Customize o design dos widgets e carrosséis de vídeo da sua loja.
          </p>
        </div>
        <button className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center gap-2">
          <Plus size={18} /> Novo Estilo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Brush className="w-5 h-5 text-[#0094EB]" />
          <h3 className="font-extrabold text-slate-800">Estilos Cadastrados</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Template</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Cor Principal</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appearances.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg shadow-sm border border-slate-200" style={{ backgroundColor: app.primary_color }} />
                      <span className="font-bold text-slate-800 text-sm">{app.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{app.primary_color}</td>
                  <td className="px-6 py-4 text-center">
                    {app.is_default ? (
                      <span className="bg-blue-50 text-[#0094EB] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 justify-center w-fit mx-auto">
                        <Star size={12} className="fill-[#0094EB]" /> Padrão
                      </span>
                    ) : (
                      <button onClick={() => handleSetDefault(app.id)} className="text-[10px] font-black text-slate-400 hover:text-[#0094EB] uppercase tracking-wider">Definir Padrão</button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={18} /></button>
                      {!app.is_default && (
                        <button onClick={() => handleDeleteClick(app)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Aparência"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AppearancePage;