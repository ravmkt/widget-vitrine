import React, { useEffect, useState } from 'react';
import { db, SizingModel } from '@/lib/db';
import { Ruler, Plus, User, Trash2, Edit3, X, Upload } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

const MedidasPage = () => {
  const [models, setModels] = useState<SizingModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<SizingModel | null>(null);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    measures: [] as { name: string, value: number, unit: 'cm' | 'm' }[]
  });

  const loadData = async () => {
    const list = await db.sizingModels.getAll();
    setModels(list);
  };

  useEffect(() => { loadData(); }, []);

  const handleEdit = (m: SizingModel) => {
    setEditingModel(m);
    setFormData({
      name: m.name,
      image_url: m.image_url || '',
      measures: m.measures || []
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const data: SizingModel = {
      ...editingModel,
      id: editingModel?.id || Math.random().toString(36).substr(2, 9),
      store_id: '11111111-1111-1111-1111-111111111111',
      name: formData.name,
      image_url: formData.image_url,
      measures: formData.measures
    };
    await db.sizingModels.save(data);
    showSuccess('Modelo salvo com sucesso!');
    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteClick = (model: SizingModel) => {
    setDeleteModal({
      isOpen: true,
      id: model.id,
      name: model.name
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.sizingModels.delete(deleteModal.id);
      showSuccess('Perfil de medidas removido.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (e) {
      showError('Erro ao excluir perfil.');
    }
  };

  const addMeasure = () => {
    setFormData({...formData, measures: [...formData.measures, { name: '', value: 0, unit: 'cm' }]});
  };

  const removeMeasure = (index: number) => {
    setFormData({...formData, measures: formData.measures.filter((_, i) => i !== index)});
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medidas</h1>
          <p className="text-slate-500 font-medium mt-1">Configure o perfil das modelos e as especificações de tamanho.</p>
        </div>
        <button onClick={() => { setEditingModel(null); setFormData({name: '', image_url: '', measures: []}); setIsModalOpen(true); }} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center gap-2">
          <Plus size={18} /> Adicionar Medidas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {models.map(m => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all">
             <div className="flex items-center gap-5 mb-8">
                <div className="h-16 w-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0094EB] overflow-hidden">
                   {m.image_url ? <img src={m.image_url} className="w-full h-full object-cover" /> : <User size={30} />}
                </div>
                <div>
                   <h3 className="font-black text-lg text-slate-800">{m.name}</h3>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil Ativo</span>
                </div>
             </div>
             <div className="space-y-3 mb-8">
                {m.measures.map((item, i) => (
                  <div key={i} className="flex justify-between py-3 border-b border-slate-50 text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{item.name}</span>
                    <span className="text-slate-800 font-black">{item.value} {item.unit}</span>
                  </div>
                ))}
             </div>
             <div className="flex gap-3">
                <button onClick={() => handleEdit(m)} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl text-xs font-black hover:bg-blue-50 hover:text-[#0094EB] transition-all">Editar</button>
                <button onClick={() => handleDeleteClick(m)} className="p-3 border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={18} /></button>
             </div>
          </div>
        ))}
      </div>

      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingModel ? 'Editar Medidas' : 'Adicionar Medidas'}
        maxWidth="max-w-xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSave}
      >
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
             <div className="h-24 w-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <Upload className="text-slate-300" />}
             </div>
             <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Modelo</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none" />
             </div>
          </div>
          <div className="pt-8 border-t border-slate-100">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-slate-800">Especificações</h4>
                <button onClick={addMeasure} className="text-[#0094EB] text-xs font-black flex items-center gap-1 hover:underline"><Plus size={14} /> Adicionar Linha</button>
             </div>
             <div className="space-y-3">
                {formData.measures.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input placeholder="Ex: Cintura" value={m.name} onChange={e => {
                       const next = [...formData.measures];
                       next[idx].name = e.target.value;
                       setFormData({...formData, measures: next});
                    }} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                    <input type="number" placeholder="0" value={m.value} onChange={e => {
                       const next = [...formData.measures];
                       next[idx].value = Number(e.target.value);
                       setFormData({...formData, measures: next});
                    }} className="w-20 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                    <button onClick={() => removeMeasure(idx)} className="p-2 text-slate-300 hover:text-red-500"><X size={16} /></button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Medidas"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default MedidasPage;