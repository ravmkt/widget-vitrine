"use client";

import React, { useCallback, useEffect, useState } from "react";
import { db, SizingModel } from "@/lib/db";
import { Ruler, Plus, Trash2, Edit3 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import CustomDialog from "@/components/CustomDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useTenant } from "@/context/TenantContext";

const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const MedidasPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();

  const [models, setModels] = useState<SizingModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingModel, setEditingModel] = useState<SizingModel | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: "",
    name: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    height: "",
    measures: [] as Array<{ id: string; name: string; value: string }>,
  });

  const loadData = useCallback(async () => {
    try {
      if (!storeId) {
        setModels([]);
        return;
      }

      const list = await db.sizingModels.getAll(storeId);
      setModels(list);
    } catch (error) {
      console.error("Erro ao carregar modelos de medidas:", error);
      showError("Erro ao carregar modelos de medidas.");
    }
  }, [storeId]);

  useEffect(() => {
    if (!tenantLoading) {
      loadData();
    }
  }, [storeId, tenantLoading, loadData]);

  const resetForm = () => {
    setFormData({
      name: "",
      height: "",
      measures: [],
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
      name: model.name || "",
      height:
        model.measures
          ?.find((measure) => measure.name.toLowerCase() === "altura")
          ?.value?.toString() || "",
      measures:
        model.measures
          ?.filter((measure) => measure.name.toLowerCase() !== "altura")
          .map((measure) => ({
            id: generateUUID(),
            name: measure.name,
            value: measure.value.toString(),
          })) || [],
    });

    setIsModalOpen(true);
  };

  const addMeasure = () => {
    setFormData((prev) => ({
      ...prev,
      measures: [
        ...prev.measures,
        {
          id: generateUUID(),
          name: "",
          value: "",
        },
      ],
    }));
  };

  const removeMeasure = (measureId: string) => {
    setFormData((prev) => ({
      ...prev,
      measures: prev.measures.filter((measure) => measure.id !== measureId),
    }));
  };

  const updateMeasure = (
    measureId: string,
    field: "name" | "value",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      measures: prev.measures.map((measure) =>
        measure.id === measureId
          ? {
              ...measure,
              [field]: value,
            }
          : measure
      ),
    }));
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Nome do modelo é obrigatório.");
    }

    if (!formData.height.trim()) {
      errors.push("Altura é obrigatória.");
    }

    if (formData.height && isNaN(Number(formData.height))) {
      errors.push("Altura deve ser um número válido.");
    }

    if (Number(formData.height) <= 0) {
      errors.push("Altura deve ser maior que zero.");
    }

    formData.measures.forEach((measure, index) => {
      if (measure.name.trim() && !measure.value.trim()) {
        errors.push(`Valor da medida "${measure.name}" é obrigatório.`);
      }

      if (!measure.name.trim() && measure.value.trim()) {
        errors.push(`Nome da medida ${index + 1} é obrigatório.`);
      }

      if (measure.value.trim() && isNaN(Number(measure.value))) {
        errors.push(
          `Valor da medida "${measure.name || index + 1}" deve ser numérico.`
        );
      }

      if (measure.value.trim() && Number(measure.value) <= 0) {
        errors.push(
          `Valor da medida "${measure.name || index + 1}" deve ser maior que zero.`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
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
        showError("Não foi possível identificar a loja atual.");
        return;
      }

      const now = new Date().toISOString();

      const measures = [
        {
          name: "Altura",
          value: Number(formData.height),
          unit: "cm" as const,
        },
        ...formData.measures
          .filter((measure) => measure.name.trim() && measure.value.trim())
          .map((measure) => ({
            name: measure.name.trim(),
            value: Number(measure.value),
            unit: "cm" as const,
          })),
      ];

      const modelData: SizingModel = {
        id: editingModel?.id || generateUUID(),
        store_id: storeId,
        name: formData.name.trim(),
        measures,
        created_at: editingModel?.created_at || now,
        updated_at: now,
      };

      await db.sizingModels.save(modelData);

      showSuccess(
        editingModel
          ? "Modelo atualizado com sucesso!"
          : "Modelo criado com sucesso!"
      );

      setIsModalOpen(false);
      setEditingModel(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
      showError("Erro ao salvar modelo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (model: SizingModel) => {
    setDeleteModal({
      isOpen: true,
      id: model.id,
      name: model.name,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.sizingModels.delete(deleteModal.id);

      showSuccess("Modelo removido com sucesso.");

      setDeleteModal((prev) => ({
        ...prev,
        isOpen: false,
      }));

      await loadData();
    } catch (error) {
      console.error("Erro ao excluir modelo:", error);
      showError("Erro ao excluir modelo.");
    }
  };

return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Medidas
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-[#c0c5d4] mt-1">
            Cadastre as medidas corporais das modelos para exibição interativa nos provadores dos vídeos.
          </p>
        </div>

<button
          type="button"
          onClick={openNewModel}
          disabled={!storeId || tenantLoading}
          className="flex items-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus size={16} className="!text-white stroke-[2.5]" />
          Nova modelo
        </button>
              </div>

{/* ── GRID MODULAR DE MODELOS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => {
          const heightMeasure = model.measures?.find(
            (measure) => measure.name.toLowerCase() === "altura"
          );

          const otherMeasures =
            model.measures?.filter(
              (measure) => measure.name.toLowerCase() !== "altura"
            ) || [];

          return (
            <div
              key={model.id}
              className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2.5rem] p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Cabeçalho do Cartão: Título e Ações */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      style={{ backgroundColor: '#ff7a29' }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,122,41,0.4)] shrink-0"
                    >
                      <Ruler size={18} className="!text-white stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">
                        {model.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">
                        Perfil de Medidas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModel(model)}
                      className="p-2 rounded-xl text-slate-400 hover:text-[#0094EB] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                      title="Editar modelo"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(model)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                      title="Excluir modelo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Linhas de Dados de Medidas */}
                <div className="space-y-2.5">
                  {heightMeasure && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0f1220]/70 rounded-2xl border border-slate-100 dark:border-white/5 transition-all">
                      <div className="flex items-center gap-2.5">
                        <Ruler className="text-[#0094EB] dark:text-[#ff7a29]" size={16} />
                        <span className="text-xs font-bold text-slate-700 dark:text-[#c0c5d4]">
                          Altura
                        </span>
                      </div>

                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-[#1a1f35] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5 shadow-xs">
                        {heightMeasure.value} cm
                      </span>
                    </div>
                  )}

                  {otherMeasures.map((measure, index) => (
                    <div
                      key={`${model.id}-${measure.name}-${index}`}
                      className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0f1220]/70 rounded-2xl border border-slate-100 dark:border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0094EB] dark:bg-[#ff7a29]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-[#c0c5d4]">
                          {measure.name}
                        </span>
                      </div>

                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-[#1a1f35] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5 shadow-xs">
                        {measure.value} cm
                      </span>
                    </div>
                  ))}

                  {otherMeasures.length === 0 && !heightMeasure && (
                    <p className="text-center text-slate-400 dark:text-[#8a90a0] text-xs font-semibold py-4">
                      Nenhuma medida cadastrada.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {models.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-[#1a1f35]/60 rounded-[3rem] border border-dashed border-slate-200 dark:border-orange-500/20">
            <Ruler size={40} className="mx-auto text-slate-400 dark:text-[#ff7a29]/60 mb-3" />

            <p className="text-slate-700 dark:text-white font-black text-base">
              Nenhum modelo de medidas cadastrado.
            </p>

            <p className="text-xs text-slate-400 dark:text-[#8a90a0] mt-1">
              Clique em "Nova modelo" para criar o primeiro perfil de medidas da sua loja.
            </p>
          </div>
        )}
      </div>
      
      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingModel ? "Editar Modelo" : "Nova Modelo"}
        maxWidth="max-w-2xl"
        onCancel={() => {
          setIsModalOpen(false);
          setEditingModel(null);
          resetForm();
        }}
        onConfirm={handleSave}
        confirmText={isSaving ? "Salvando..." : "Salvar"}
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Nome do Modelo <span className="text-rose-500">*</span>
            </label>

            <input
              type="text"
              placeholder="Ex: Modelo Padrão Feminino"
              value={formData.name}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  name: event.target.value,
                })
              }
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Altura em cm <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 170"
                value={formData.height}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    height: event.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB] pr-12"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                cm
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Medidas Adicionais
              </label>

              <button
                type="button"
                onClick={addMeasure}
                className="px-3 py-1.5 bg-[#EAF6FF] text-[#0094EB] rounded-lg text-xs font-black flex items-center gap-1 hover:bg-[#0094EB] hover:text-white transition-all"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            {formData.measures.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma medida adicional. Clique em "Adicionar" para incluir.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.measures.map((measure, index) => (
                  <div
                    key={measure.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <span className="text-xs font-bold text-slate-400 w-6 text-center">
                      {index + 1}
                    </span>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Nome da medida, ex: Busto"
                        value={measure.name}
                        onChange={(event) =>
                          updateMeasure(measure.id, "name", event.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Valor em cm"
                          value={measure.value}
                          onChange={(event) =>
                            updateMeasure(
                              measure.id,
                              "value",
                              event.target.value
                            )
                          }
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />

                        <span className="text-slate-400 font-bold text-sm">
                          cm
                        </span>
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
        onCancel={() =>
          setDeleteModal((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  );
};

export default MedidasPage;
