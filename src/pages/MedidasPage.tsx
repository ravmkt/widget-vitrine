import React, { useEffect, useState } from 'react';
import { db, SizingModel } from '@/lib/db';
import { Ruler, Plus, User, Trash2, Edit3, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';

const MedidasPage = () => {
  const [models, setModels] = useState<SizingModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingModel, setEditingModel] = useState<SizingModel | null>(null);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false, id: '', name: ''
  });

  const [formData, setFormData] = useState({
    name: '', image_url: '', measures: [] as any[]
  });

  const loadData = async () => {
    const list = await db.sizingModels.getAll();
    setModels(list);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const data: SizingModel = {
        ...editingModel,
        id: editingModel?.id || Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        name: formData.name,
        image_url: formData.image_url,
        measures: formData.measures
      };
      await db.sizingModels.save(data);
      setShowSuccess(true);
    } catch (e) {
      showError('Erro ao salvar medidas.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveFinished = () => {
    setShowSuccess(false);
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medidas</h1>
        <button onClick={() => { setEditingModel(null); setFormData({name: '', image_url: '', measures: []}); setIsModalOpen(true); }} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2">
          <Plus size={18} /> Adicionar Medidas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {models.map(m => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
             <h3 className="font-black text-lg text-slate-800 mb-4">{m.name}</h3>
             <button onClick={() => { setEditingModel(m); setFormData({name: m.name, image_url: m.image_url||'', measures: m.measures}); setIsModalOpen(true); }} className="w-full bg-slate-50 text-slate-600 py-2.5 rounded-xl font-black text-xs">Editar</button>
          </div>
        ))}
      </div>

      <CustomDialog isOpen={isModalOpen} type="form" title={editingModel ? 'Editar' : 'Novo'} onCancel={() => setIsModalOpen(false)} onConfirm={handleSave} confirmText={isSaving ? "Salvando..." : "Salvar"}>
        <div className="space-y-4">
           <input type="text" placeholder="Nome do Modelo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
        </div>
      </CustomDialog>

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="Excluir Medidas" itemName={deleteModal.name} onConfirm={() => db.sizingModels.delete(deleteModal.id).then(loadData)} onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} />
      <SuccessDialog isOpen={showSuccess} description="Perfil de medidas atualizado." onClose={onSaveFinished} />
    </div>
  );
};

export default MedidasPage;