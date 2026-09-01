"use client";

import React, { useCallback, useEffect, useState } from "react";
import { db, SizingModel } from "@/lib/db";
import { logPanelActivity } from "@/lib/activityLog";
import { Plus, Trash2, Edit3, User, Package, X } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import CustomDialog from "@/components/CustomDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";

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
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
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
    type: "humano" as "humano" | "objeto",
    name: "",
    height: "",
    width: "",
    length: "",
    measures: [] as Array<{ id: string; name: string; value: string }>,
  });

  // Função para inferir o tipo do perfil com base nas medidas existentes
  const inferModelType = (model: SizingModel): "humano" | "objeto" => {
    if ((model as any).type) return (model as any).type;
    
    const hasWidthOrLength = model.measures?.some((m: any) =>
      ["largura", "comprimento"].includes(m.name.toLowerCase())
    );
    
    return hasWidthOrLength ? "objeto" : "humano";
  };

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
      type: "humano",
      name: "",
      height: "",
      width: "",
      length: "",
      measures: [],
    });
  };

  const handleOpenSelection = () => {
    setEditingModel(null);
    resetForm();
    setIsSelectionModalOpen(true);
  };

  const handleSelectType = (type: "humano" | "objeto") => {
    setFormData((prev) => ({ ...prev, type }));
    setIsSelectionModalOpen(false);
    setIsModalOpen(true);
  };

  const openEditModel = (model: any) => {
    setEditingModel(model);

    // Infere dinamicamente o tipo para evitar o bug do banco de dados
    const modelType = inferModelType(model);
    
    const altura = model.measures?.find((m: any) => m.name.toLowerCase() === "altura")?.value?.toString() || "";
    const largura = model.measures?.find((m: any) => m.name.toLowerCase() === "largura")?.value?.toString() || "";
    const comprimento = model.measures?.find((m: any) => m.name.toLowerCase() === "comprimento")?.value?.toString() || "";

    const baseNames = modelType === "objeto" 
      ? ["altura", "largura", "comprimento"] 
      : ["altura"];

    const additionalMeasures = model.measures
      ?.filter((m: any) => !baseNames.includes(m.name.toLowerCase()))
      .map((m: any) => ({
        id: generateUUID(),
        name: m.name,
        value: m.value.toString(),
      })) || [];

    setFormData({
      type: modelType,
      name: model.name || "",
      height: altura,
      width: largura,
      length: comprimento,
      measures: additionalMeasures,
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
      errors.push(formData.type === "humano" ? "Nome do modelo é obrigatório." : "Nome do objeto é obrigatório.");
    }

    if (formData.type === "humano") {
      if (!formData.height.trim()) {
        errors.push("Altura é obrigatória.");
      }
      if (formData.height && isNaN(Number(formData.height))) {
        errors.push("Altura deve ser um número válido.");
      }
      if (Number(formData.height) <= 0) {
        errors.push("Altura deve ser maior que zero.");
      }
    } else {
      const checkNumber = (val: string, label: string) => {
        if (val.trim()) {
          if (isNaN(Number(val))) {
            errors.push(`${label} deve ser um número válido.`);
          } else if (Number(val) <= 0) {
            errors.push(`${label} deve ser maior que zero.`);
          }
        }
      };
      checkNumber(formData.height, "Altura");
      checkNumber(formData.width, "Largura");
      checkNumber(formData.length, "Comprimento");
    }

    formData.measures.forEach((measure, index) => {
      if (measure.name.trim() && !measure.value.trim()) {
        errors.push(`Valor do campo "${measure.name}" é obrigatório.`);
      }

      if (!measure.name.trim() && measure.value.trim()) {
        errors.push(`Nome do campo ${index + 1} é obrigatório.`);
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
      const measures: Array<{ name: string; value: any; unit: "cm" }> = [];

      if (formData.type === "humano") {
        measures.push({
          name: "Altura",
          value: Number(formData.height),
          unit: "cm",
        });
      } else {
        if (formData.height.trim()) {
          measures.push({
            name: "Altura",
            value: Number(formData.height),
            unit: "cm",
          });
        }
        if (formData.width.trim()) {
          measures.push({
            name: "Largura",
            value: Number(formData.width),
            unit: "cm",
          });
        }
        if (formData.length.trim()) {
          measures.push({
            name: "Comprimento",
            value: Number(formData.length),
            unit: "cm",
          });
        }
      }

      formData.measures
        .filter((measure) => measure.name.trim() && measure.value.trim())
        .forEach((measure) => {
          const rawVal = measure.value.trim();
          const parsedNum = Number(rawVal);
          
          measures.push({
            name: measure.name.trim(),
            value: isNaN(parsedNum) || rawVal === "" ? rawVal : parsedNum,
            unit: "cm",
          });
        });

      const modelData: SizingModel & { type?: string } = {
        id: editingModel?.id || generateUUID(),
        store_id: storeId,
        name: formData.name.trim(),
        type: formData.type,
        measures,
        created_at: editingModel?.created_at || now,
        updated_at: now,
      };

      await db.sizingModels.save(modelData as SizingModel);
      logPanelActivity(editingModel ? 'model.updated' : 'model.created', formData.name.trim(), storeId);

      showSuccess(
        editingModel
          ? "Medida atualizada com sucesso!"
          : "Medida criada com sucesso!"
      );

      setIsModalOpen(false);
      setEditingModel(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar medida:", error);
      showError("Erro ao salvar medida.");
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
      logPanelActivity('model.deleted', deleteModal.name);
      showSuccess("Medida removida com sucesso.");
      setDeleteModal((prev) => ({ ...prev, isOpen: false }));
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir medida:", error);
      showError("Erro ao excluir medida.");
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
            Cadastre as medidas para exibição interativa nos vídeos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenSelection}
          disabled={!storeId || tenantLoading}
          className="flex items-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus size={16} className="!text-white stroke-[2.5]" />
          Novo
        </button>
      </div>

      {/* ── GRID MODULAR DE MEDIDAS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => {
          const modelType = inferModelType(model);
          const isObject = modelType === "objeto";
          const mappedMeasures = model.measures || [];

          return (
            <div
              key={model.id}
              className="bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md border border-slate-200 dark:border-orange-500/15 rounded-[2.5rem] p-6 sm:p-7 shadow-sm hover:shadow-lg dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Cabeçalho do Cartão */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Ícones de Categoria no Card */}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.4)] shrink-0">
                      {isObject ? (
                        <Package size={18} className="!text-white stroke-[2.5]" />
                      ) : (
                        <User size={18} className="!text-white stroke-[2.5]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">
                        {model.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">
                        {isObject ? "Dimensões do Objeto" : "Perfil do Humano"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModel(model)}
                      className="p-2 rounded-xl text-slate-400 hover:text-[#0094EB] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                      title="Editar medidas"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(model)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                      title="Excluir perfil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Linhas de Dados */}
                <div className="space-y-2.5">
                  {mappedMeasures.map((measure, index) => {
                    const isBaseMeasure = ["altura", "largura", "comprimento"].includes(measure.name.toLowerCase());
                    
                    return (
                      <div
                        key={`${model.id}-${measure.name}-${index}`}
                        className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0f1220]/70 rounded-2xl border border-slate-100 dark:border-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Sem régua na frente de altura, marcador padronizado */}
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0094EB] dark:bg-[#ff7a29]" />
                          <span className="text-xs font-bold text-slate-700 dark:text-[#c0c5d4]">
                            {measure.name}
                          </span>
                        </div>

                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-[#1a1f35] px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5 shadow-xs">
                          {measure.value} {isBaseMeasure ? "cm" : ""}
                        </span>
                      </div>
                    );
                  })}

                  {mappedMeasures.length === 0 && (
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
            <Package size={40} className="mx-auto text-slate-400 dark:text-[#ff7a29]/60 mb-3" />

            <p className="text-slate-700 dark:text-white font-black text-base">
              Nenhum perfil de medidas cadastrado.
            </p>

            <p className="text-xs text-slate-400 dark:text-[#8a90a0] mt-1">
              Clique em "Novo" para criar o primeiro perfil de medidas da sua loja.
            </p>
          </div>
        )}
      </div>

      {/* ── PASSO 1: DECIDIR HUMANO OU OBJETO ── */}
      <CustomDialog
        isOpen={isSelectionModalOpen}
        type="confirm"
        title="O que você deseja cadastrar?"
        maxWidth="max-w-md"
        onCancel={() => setIsSelectionModalOpen(false)}
        hideFooter={true}
      >
        <div className="grid grid-cols-1 gap-4 pt-2">
          {/* Card Humano */}
          <button
            type="button"
            onClick={() => handleSelectType("humano")}
            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 dark:border-white/5 hover:border-[#0094EB] dark:hover:border-[#ff7a29] bg-slate-50/50 dark:bg-[#0f1220]/40 hover:bg-blue-50/20 dark:hover:bg-orange-500/5 text-left transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-[#0094EB] dark:bg-orange-500/10 dark:text-[#ff7a29] group-hover:scale-110 transition-transform">
              <User size={24} className="stroke-[2]" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                Perfil Humano
              </h4>
              <p className="text-xs font-medium text-slate-400 dark:text-[#8a90a0] mt-1">
                Ideal para roupas, calçados e provador de modelos.
              </p>
            </div>
          </button>

          {/* Card Objeto */}
          <button
            type="button"
            onClick={() => handleSelectType("objeto")}
            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 dark:border-white/5 hover:border-[#0094EB] dark:hover:border-[#ff7a29] bg-slate-50/50 dark:bg-[#0f1220]/40 hover:bg-blue-50/20 dark:hover:bg-orange-500/5 text-left transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-[#0094EB] dark:bg-orange-500/10 dark:text-[#ff7a29] group-hover:scale-110 transition-transform">
              <Package size={24} className="stroke-[2]" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                Dimensões do Objeto
              </h4>
              <p className="text-xs font-medium text-slate-400 dark:text-[#8a90a0] mt-1">
                Ideal para canecas, eletrônicos, móveis ou embalagens.
              </p>
            </div>
          </button>
        </div>
      </CustomDialog>

      {/* ── PASSO 2: MODAL DE FORMULÁRIO (HUMANO OU OBJETO) ── */}
      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingModel ? `Editar ${formData.type === "humano" ? "Humano" : "Objeto"}` : `Novo ${formData.type === "humano" ? "Humano" : "Objeto"}`}
        maxWidth="max-w-xl"
        onCancel={() => {
          setIsModalOpen(false);
          setEditingModel(null);
          resetForm();
        }}
        onConfirm={handleSave}
        confirmText={isSaving ? "Salvando..." : "Salvar"}
      >
        <div className="space-y-6">
          {/* Nome */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {formData.type === "humano" ? "Nome do Modelo" : "Nome do Objeto"} <span className="text-rose-500">*</span>
            </label>

            <input
              type="text"
              placeholder={formData.type === "humano" ? "Ex: Modelo Padrão Feminino" : "Ex: Caneca Cerâmica 350ml"}
              value={formData.name}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  name: event.target.value,
                })
              }
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB] dark:bg-[#0f1220] dark:border-white/5 dark:text-white"
            />
          </div>

          {/* Inputs Condicionais (Humano ou Objeto) */}
          {formData.type === "objeto" ? (
            <div className="grid grid-cols-3 gap-3">
              {/* Altura */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Altura
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 50"
                    value={formData.height}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        height: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#0094EB] pr-8 dark:bg-[#0f1220] dark:border-white/5 dark:text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">
                    cm
                  </span>
                </div>
              </div>

              {/* Largura */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Largura
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 30"
                    value={formData.width}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        width: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#0094EB] pr-8 dark:bg-[#0f1220] dark:border-white/5 dark:text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">
                    cm
                  </span>
                </div>
              </div>

              {/* Comprimento */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Comprimento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 20"
                    value={formData.length}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        length: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#0094EB] pr-8 dark:bg-[#0f1220] dark:border-white/5 dark:text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">
                    cm
                  </span>
                </div>
              </div>
            </div>
          ) : (
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB] pr-12 dark:bg-[#0f1220] dark:border-white/5 dark:text-white"
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  cm
                </span>
              </div>
            </div>
          )}

          {/* Campos Adicionais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Campos Adicionais
              </label>

              <button
                type="button"
                onClick={addMeasure}
                className="px-3 py-1.5 bg-[#EAF6FF] text-[#0094EB] rounded-lg text-xs font-black flex items-center gap-1 hover:bg-[#0094EB] hover:text-white transition-all cursor-pointer"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            {formData.measures.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4 bg-slate-50 dark:bg-[#0f1220] rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                Nenhum campo adicional. Clique em "Adicionar" para incluir.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.measures.map((measure, index) => (
                  <div
                    key={measure.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#0f1220] rounded-xl border border-slate-100 dark:border-white/5"
                  >
                    <span className="text-xs font-bold text-slate-400 w-6 text-center">
                      {index + 1}
                    </span>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder={formData.type === "humano" ? "Nome, ex: Manequim ou Peso" : "Nome, ex: Peso ou Volume"}
                        value={measure.name}
                        onChange={(event) =>
                          updateMeasure(measure.id, "name", event.target.value)
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB] dark:text-white"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={formData.type === "humano" ? "Valor, ex: 38 ou 65kg" : "Valor, ex: 2kg ou 350ml"}
                          value={measure.value}
                          onChange={(event) =>
                            updateMeasure(
                              measure.id,
                              "value",
                              event.target.value
                            )
                          }
                          className="flex-1 px-3 py-2 bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB] dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMeasure(measure.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remover campo"
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
        title="EXCLUIR PERFIL"
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
