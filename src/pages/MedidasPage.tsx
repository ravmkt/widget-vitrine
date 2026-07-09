"use client";

import React, { useEffect, useState } from 'react';
import { db, SizingModel, SizeMeasure } from '@/lib/db';
import { Ruler, Plus, Trash2, Edit3, Loader2, X, Image, Save, Trash2 as TrashIcon } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const MedidasPage = () => {
  const [models, setModels] = useState<SizingModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingModel, setEditingModel] = useState<SizingModel | null>(null);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false, id: '', name: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    image_file: null as File | null,
    image_error: '',
    height: '',
    measures: [] as { id: string; name: string; value: string; unit: 'cm' | 'm' }[]
  });

  const loadData = async () => {
    const list = await db.sizingModels.getAll();
    setModels(list);
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      image_url: '',
      image_file: null,
      image_error: '',
      height: '',
      measures: [{ id: Date.now().toString(), name: '', value: '', unit: 'cm' }]
    });
    setEditingModel(null);
  };

  const openNewModel = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModel = (model: SizingModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      image_url: model.image_url || '',
      image_file: null,
      image_error: '',
      height: model.size_name || '',
      measures: model.measures.map(m => ({
        id: m.name + m.value,
        name: m.name,
        value: String(m.value),
        unit: m.unit
      })).length > 0 ? model.measures.map(m => ({
        id: m.name + m.value,
        name: m.name,
        value: String(m.value),
        unit: m.unit
      })) : [{ id: Date.now().toString(), name: '', value: '', unit: 'cm' }]
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 350 * 1024) {
      setFormData(prev => ({ ...prev, image_error: 'A imagem deve ter no máximo 350 KB.', image_file: null }));
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormData(prev => ({ ...prev, image_error: 'Formato inválido. Use JPG, PNG ou WEBP.', image_file: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, image_file: file, image_url: reader.result as string, image_error: '' }));
    };
    reader.readAsDataURL(file);
  };

  const addMeasure = () => {
    setFormData(prev => ({
      ...prev,
      measures: [...prev.measures, { id: Date.now().toString(), name: '', value: '', unit: 'cm' }]
    }));
  };

  const removeMeasure = (id: string) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.filter(m => m.id !== id)
    }));
  };

  const updateMeasure = (id: string, field: 'name' | 'value' | 'unit', val: string) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.map(m => m.id === id ? { ...m, [field]: val } : m)
    }));
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Nome da modelo é obrigatório.');
    if (!formData.height.trim()) errors.push('Altura é obrigatória.');
    if (formData.image_error) errors.push(formData.image_error);
    
    const validMeasures = formData.measures.filter(m => m.name.trim() && m.value.trim());
    if (validMeasures.length === 0) {
      errors.push('Adicione pelo menos uma medida (nome e valor).');
    }
    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const { isValid, errors } = validateForm();
    if (!isValid) {
      errors.forEach(showError);
      return;
    }

    try {
      setIsSaving(true);

      const measuresToSave: SizeMeasure[] = formData.measures
        .filter(m => m.name.trim() && m.value.trim())
        .map(m => ({
          name: m.name.trim(),
          value: parseFloat(m.value.replace(',', '.')),
          unit: m.unit
        }));

      const modelData: SizingModel = {
        ...editingModel,
        id: editingModel?.id || Math.random().toString(36).substr(2, 9),
        store_id: '11111111-1111-1111-1111-111111111111',
        name: formData.name.trim(),
        image_url: formData.image_url,
        size_name: formData.height.trim(),
        measures: measuresToSave,
        created_at: editingModel?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.sizingModels.save(modelData);
      setShowSuccessModal(true);
    } catch (e) {
      showError('Erro ao salvar medidas.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveFinished = () => {
    setShowSuccessModal(false);
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
      showSuccess('Medidas excluídas com sucesso.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (e) {
      showError('Erro ao excluir medidas.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medidas</h1>
        <button onClick={openNewModel} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2">
          <Plus size={18} /> Adicionar Medidas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(m => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg text-slate-800 truncate">{m.name}</h3>
                {m.size_name && (
                  <p className="text-xs font-bold text-slate-500 mt-1">Altura: {m.size_name}</p>
                )}
              </div>
              {m.image_url && (
                <img src={m.image_url} alt={m.name} className="h-16 w-16 rounded-xl object-cover shrink-0 border border-slate-200" />
              )}
            </div>
            
            <div className="space-y-2 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
              {m.measures.map((measure, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600 capitalize">{measure.name}</span>
                  <span className="font-black text-slate-900">{measure.value}{measure.unit}</span>
                </div>
              ))}
              {m.measures.length === 0 && (
                <p className="text-sm text-slate-400 italic">Nenhuma medida cadastrada</p>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => openEditModel(m)}
                className="flex-1 bg-slate-50 text-slate-600 py-2.5 rounded-xl font-black text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit3 size={14} /> Editar
              </button>
              <button 
                onClick={() => handleDeleteClick(m)}
                className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                title="Excluir"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}

        {models.length === 0 && (
          <div className="col-span-full p-12 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <Ruler className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-bold">Nenhuma modelo de medidas cadastrada.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Adicionar Medidas" para começar.</p>
          </div>
        )}
      </div>

      {/* Modal Adicionar/Editar Medidas */}
      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingModel ? 'Editar Modelo de Medidas' : 'Nova Modelo de Medidas'}
        maxWidth="max-w-2xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        confirmText={isSaving ? "Salvando..." : "Salvar"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto da Modelo (máx. 350 KB)</label>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                {formData.image_url ? (
                  <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <Image className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-black file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                />
                {formData.image_error && <p className="text-xs text-rose-500">{formData.image_error}</p>}
                {formData.image_file && <p className="text-xs text-slate-500">{formData.image_file.name} ({(formData.image_file.size/1024).toFixed(1)} KB)</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Modelo</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Maria Silva"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura</label>
              <input
                type="text"
                value={formData.height}
                onChange={e => setFormData({...formData, height: e.target.value})}
                placeholder="Ex: 1.75m ou 175cm"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Medidas Personalizadas</label>
              <button
                type="button"
                onClick={addMeasure}
                className="text-xs font-black text-[#0094EB] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar medida
              </button>
            </div>

            <div className="space-y-3">
              {formData.measures.map((measure, idx) => (
                <div key={measure.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <input
                    type="text"
                    value={measure.name}
                    onChange={e => updateMeasure(measure.id, 'name', e.target.value)}
                    placeholder="Nome (ex: busto, cintura, quadril)"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                  />
                  <input
                    type="text"
                    value={measure.value}
                    onChange={e => updateMeasure(measure.id, 'value', e.target.value)}
                    placeholder="Valor"
                    className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB] text-center"
                  />
                  <select
                    value={measure.unit}
                    onChange={e => updateMeasure(measure.id, 'unit', e.target.value as 'cm' | 'm')}
                    className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                  >
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMeasure(measure.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remover"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              ))}
            </div>

            {formData.measures.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma medida adicionada. Clique em "Adicionar medida" para começar.</p>
            )}
          </div>
        </form>
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Modelo de Medidas"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
      <SuccessDialog isOpen={showSuccessModal} description="Modelo de medidas salvo com sucesso." onClose={onSaveFinished} />
    </div>
  );
};

export default MedidasPage;