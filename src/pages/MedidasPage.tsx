"use client";

import React, { useEffect, useState } from 'react';
import { db, SizingModel } from '@/lib/db';
import { Ruler, Plus, User, Trash2, Edit3, Loader2, Save, X, Image, AlertCircle, CheckCircle2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';

const MedidasPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();
  const [models, setModels] = useState<SizingModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    measures: [] as Array<{ id: string; name: string; value: string }>
  });

  const loadData = async () => {
    try {
      if (!storeId) {
        setModels([]);
        return;
      }
      const list = await db.sizingModels.getAll(storeId);
      setModels(list);
    } catch (e) {
      showError('Erro ao carregar modelos de medidas.');
    }
  };

  useEffect(() => { if (!tenantLoading) loadData(); }, [storeId, tenantLoading]);

  const resetForm = () => {
    setFormData({
      name: '',
      image_url: '',
      image_file: null,
      image_error: '',
      height: '',
      measures: []
    });
  };

  const openNewModel = () => {
    setEditingModel(null);
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
      height: model.measures.find(m => m.name.toLowerCase() === 'altura')?.value?.toString() || '',
      measures: model.measures
        .filter(m => m.name.toLowerCase() !== 'altura')
        .map(m => ({ id: m.name, name: m.name, value: m.value.toString() }))
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 350 * 1024) {
      setFormData(prev => ({ ...prev, image_error: 'A imagem deve ter no máximo 350 KB.', image_file: null, image_url: '' }));
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormData(prev => ({ ...prev, image_error: 'Formato inválido. Use JPG, PNG ou WEBP.', image_file: null, image_url: '' }));
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
      measures: [...prev.measures, { id: Date.now().toString(), name: '', value: '' }]
    }));
  };

  const removeMeasure = (measureId: string) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.filter(m => m.id !== measureId)
    }));
  };

  const updateMeasure = (measureId: string, field: 'name' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.map(m => m.id === measureId ? { ...m, [field]: value } : m)
    }));
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) errors.push('Nome do modelo é obrigatório.');
    if (!formData.height.trim()) errors.push('Altura é obrigatória.');
    if (formData.height && isNaN(Number(formData.height))) errors.push('Altura deve ser um número válido.');
    if (formData.image_error) errors.push(formData.image_error);
    
    formData.measures.forEach((m, idx) => {
      if (m.name.trim() && !m.value.trim()) {
        errors.push(`Valor da medida "${m.name}" é obrigatório.`);
      }
      if (!m.name.trim() && m.value.trim()) {
        errors.push(`Nome da medida ${idx + 1} é obrigatório.`);
      }
      if (m.value.trim() && isNaN(Number(m.value))) {
        errors.push(`Valor da medida "${m.name || idx + 1}" deve ser numérico.`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    const { isValid, errors } = validateForm();
    if (!isValid) {
      errors.forEach(showError);
      return;
    }

    try {
      setIsSaving(true);
      if (!storeId) {
        showError('Não foi possível identificar a loja atual.');
        return;
      }
      
      const measures = [
        { name: 'Altura', value: Number(formData.height), unit: 'cm' as const },
        ...formData.measures
          .filter(m => m.name.trim() && m.value.trim())
          .map(m => ({ name: m.name.trim(), value: Number(m.value), unit: 'cm' as const }))
      ];

      const modelData: SizingModel = {
        id: editingModel?.id || Math.random().toString(36).substr(2, 9),
        store_id: storeId,
        name: formData.name.trim(),
        image_url: formData.image_url || undefined,
        measures,
        created_at: editingModel?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.sizingModels.save({ ...modelData, store_id: storeId });
      showSuccess(editingModel ? 'Modelo atualizado com sucesso!' : 'Modelo criado com sucesso!');
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      showError('Erro ao salvar modelo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (model: SizingModel) => {
    setDeleteModal({ isOpen: true, id: model.id, name: model.name });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.sizingModels.delete(deleteModal.id);
      showSuccess('Modelo removido com sucesso.');
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (e) {
      showError('Erro ao excluir modelo.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medidas</h1>
        <button onClick={openNewModel} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2">
          <Plus size={18} /> Nova modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => {
          const heightMeasure = model.measures.find(m => m.name.toLowerCase() === 'altura');
          const otherMeasures = model.measures.filter(m => m.name.toLowerCase() !== 'altura');
          
          return (
            <div key={model.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-lg text-slate-800 truncate pr-4">{model.name}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEditModel(model)} className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit3 size={18} /></button>
                  <button onClick={() => handleDeleteClick(model)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={18} /></button>
                </div>
              </div>

              {model.image_url && (
                <div className="mb-6">
                  <img src={model.image_url} alt={model.name} className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                </div>
              )}

              <div className="space-y-3">
                {heightMeasure && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Ruler className="text-[#0094EB]" size={18} />
                      <span className="font-bold text-slate-700">Altura</span>
                    </div>
                    <span className="font-black text-slate-900">{heightMeasure.value} cm</span>
                  </div>
                )}

                {otherMeasures.map((measure, idx) => (
                  <div key={`${model.id}-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">{measure.name}</span>
                    <span className="font-black text-slate-900">{measure.value} cm</span>
                  </div>
                ))}

                {otherMeasures.length === 0 && !heightMeasure && (
                  <p className="text-center text-slate-400 text-sm py-4">Nenhuma medida cadastrada</p>
                )}
              </div>
            </div>
          );
        })}

        {models.length === 0 && (
          <div className="col-span-full p-12 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
            <Ruler size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Nenhum modelo de medidas cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Nova modelo" para começar.</p>
          </div>
        )}
      </div>

      {/* Modal Nova/Editar Modelo */}
      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingModel ? 'Editar Modelo' : 'Nova Modelo'}
        maxWidth="max-w-2xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        confirmText={isSaving ? "Salvando..." : "Salvar"}
      >
        <div className="space-y-6">
          {/* Foto */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto do Modelo (máx. 350 KB)</label>
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
                {formData.image_error && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500">
                    <AlertCircle size={12} />
                    {formData.image_error}
                  </div>
                )}
                {formData.image_file && !formData.image_error && (
                  <p className="text-xs text-slate-500">{formData.image_file.name} ({(formData.image_file.size/1024).toFixed(1)} KB)</p>
                )}
              </div>
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Modelo <span className="text-rose-500">*</span></label>
            <input
              type="text"
              placeholder="Ex: Modelo Padrão Feminino"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Altura */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (cm) <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 170"
                value={formData.height}
                onChange={e => setFormData({...formData, height: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB] pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">cm</span>
            </div>
          </div>

          {/* Medidas Adicionais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Medidas Adicionais</label>
              <button
                type="button"
                onClick={addMeasure}
                className="px-3 py-1.5 bg-[#EAF6FF] text-[#0094EB] rounded-lg text-xs font-black flex items-center gap-1 hover:bg-[#0094EB] hover:text-white transition-all"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {formData.measures.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma medida adicional. Clique em "Adicionar" para incluir.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.measures.map((measure, idx) => (
                  <div key={measure.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                    
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Nome da medida (ex: Busto)"
                        value={measure.name}
                        onChange={e => updateMeasure(measure.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Valor em cm"
                          value={measure.value}
                          onChange={e => updateMeasure(measure.id, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                        <span className="text-slate-400 font-bold text-sm">cm</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeMeasure(measure.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remover medida"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="EXCLUIR MODELO"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default MedidasPage;