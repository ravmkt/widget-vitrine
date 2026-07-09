"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db, Appearance } from "@/lib/db";
import { Save, Loader2 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import CustomDialog from "@/components/CustomDialog";
import { cn } from "@/lib/utils";

const AppearancePage = () => {
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppearance, setEditingAppearance] = useState<Appearance | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    primary_color: string;
    secondary_color: string;
    text_color: string;
    background_color: string;
    button_color: string;
    border_radius: string;
    shadow_enabled: boolean;
    font_family: string;
    widget_shape: string;
    widget_size: string;
    widget_animation: string;
    carousel_card_shape: string;
    carousel_visible_items: number;
    carousel_gap: number;
    show_title: boolean;
    show_play_button: boolean;
    show_product: boolean;
    show_like_button: boolean;
    show_comment_button: boolean;
    show_share_button: boolean;
    show_product_button: boolean;
    desktop: {
      formato: string;
      animacao: string;
      arredondamento: string;
      corBorda: string;
      cta: string;
    };
    mobile: {
      formato: string;
      animacao: string;
      arredondamento: string;
      corBorda: string;
      cta: string;
    };
    carrossel: {
      desktop: {
        espacamento: string;
        quantidadePorLinha: string;
        quantidadePorColuna: string;
      };
      mobile: {
        espacamento: string;
        quantidadePorLinha: string;
        quantidadePorColuna: string;
      };
    };
    grade: {
      desktop: {
        espacamento: string;
        quantidadePorLinha: string;
        quantidadePorColuna: string;
      };
      mobile: {
        espacamento: string;
        quantidadePorLinha: string;
        quantidadePorColuna: string;
      };
    };
  }>({
    name: "",
    primary_color: "",
    secondary_color: "",
    text_color: "",
    background_color: "",
    button_color: "",
    border_radius: "",
    shadow_enabled: false,
    font_family: "",
    widget_shape: "circle",
    widget_size: "medium",
    widget_animation: "none",
    carousel_card_shape: "rounded",
    carousel_visible_items: 4,
    carousel_gap: 16,
    show_title: true,
    show_play_button: true,
    show_product: true,
    show_like_button: true,
    show_comment_button: true,
    show_share_button: true,
    show_product_button: true,
    desktop: {
      formato: "circular",
      animacao: "none",
      arredondamento: "8px",
      corBorda: "#000",
      cta: "",
    },
    mobile: {
      formato: "circular",
      animacao: "none",
      arredondamento: "8px",
      corBorda: "#000",
      cta: "",
    },
    carrossel: {
      desktop: {
        espacamento: "8",
        quantidadePorLinha: "4",
        quantidadePorColuna: "4",
      };
      mobile: {
        espacamento: "8",
        quantidadePorLinha: "2",
        quantidadePorColuna: "2",
      };
    };
    grade: {
      desktop: {
        espacamento: "8",
        quantidadePorLinha: "4",
        quantidadePorColuna: "4",
      };
      mobile: {
        espacamento: "8",
        quantidadePorLinha: "2",
        quantidadePorColuna: "2",
      };
    };
  }>;

  useEffect(() => {
    const load = async () => {
      try {
        const list = await db.appearances.getAll();
        setAppearances(list);
      } catch (e) {
        showError("Erro ao carregar estilos.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      primary_color: "",
      secondary_color: "",
      text_color: "",
      background_color: "",
      button_color: "",
      border_radius: "",
      shadow_enabled: false,
      font_family: "",
      widget_shape: "circle",
      widget_size: "medium",
      widget_animation: "none",
      carousel_card_shape: "rounded",
      carousel_visible_items: 4,
      carousel_gap: 16,
      show_title: true,
      show_play_button: true,
      show_product: true,
      show_like_button: true,
      show_comment_button: true,
      show_share_button: true,
      show_product_button: true,
      desktop: {
        formato: "circular",
        animacao: "none",
        arredondamento: "8",
        corBorda: "#000",
        cta: "",
      },
      mobile: {
        formato: "circular",
        animacao: "none",
        arredondamento: "8",
        corBorda: "#000",
        cta: "",
      },
      carrossel: {
        desktop: {
          espacamento: "8",
          quantidadePorLinha: "4",
          quantidadePorColuna: "4",
        };
        mobile: {
          espacamento: "8",
          quantidadePorLinha: "2",
          quantidadePorColuna: "2",
        };
      };
      grade: {
        desktop: {
          espacamento: "8",
          quantidadePorLinha: "4",
          quantidadePorColuna: "4",
        };
        mobile: {
          espacamento: "8",
          quantidadePorLinha: "2",
          quantidadePorColuna: "2",
        };
      };
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingAppearance(null);
    setIsModalOpen(true);
  };

  const openEditModal = (appearance: Appearance) => {
    setFormData({
      name: appearance.name,
      primary_color: appearance.primary_color,
      secondary_color: appearance.secondary_color,
      text_color: appearance.text_color,
      background_color: appearance.background_color,
      button_color: appearance.button_color,
      border_radius: appearance.border_radius,
      shadow_enabled: appearance.shadow_enabled,
      font_family: appearance.font_family,
      widget_shape: appearance.widget_shape,
      widget_size: appearance.widget_size,
      widget_animation: appearance.widget_animation,
      carousel_card_shape: appearance.carousel_card_shape,
      carousel_visible_items: appearance.carousel_visible_items,
      carousel_gap: appearance.carousel_gap,
      show_title: appearance.show_title,
      show_play_button: appearance.show_play_button,
      show_product: appearance.show_product,
      show_like_button: appearance.show_like_button,
      show_comment_button: appearance.show_comment_button,
      show_share_button: appearance.show_share_button,
      show_product_button: appearance.show_product_button,
      desktop: {
        formato: appearance.desktop?.formato || "circular",
        animacao: appearance.desktop?.animacao || "none",
        arredondamento: appearance.desktop?.arredondamento || "8",
        corBorda: appearance.desktop?.corBorda || "#000",
        cta: appearance.desktop?.cta || "",
      },
      mobile: {
        formato: appearance.mobile?.formato || "circular",
        animacao: appearance.mobile?.animacao || "none",
        arredondamento: appearance.mobile?.arredondamento || "8",
        corBorda: appearance.mobile?.corBorda || "#000",
        cta: appearance.mobile?.cta || "",
      },
      carrossel: {
        desktop: {
          espacamento: appearance.carrossel?.desktop?.espacamento || "8",
          quantidadePorLinha: appearance.carrossel?.desktop?.quantidadePorLinha || "4",
          quantidadePorColuna: appearance.carrossel?.desktop?.quantidadePorColuna || "4",
        };
        mobile: {
          espacamento: appearance.carrossel?.mobile?.espacamento || "8",
          quantidadePorLinha: appearance.carrossel?.mobile?.quantidadePorLinha || "2",
          quantidadePorColuna: appearance.carrossel?.mobile?.quantidadePorColuna || "2",
        };
      };
      grade: {
        desktop: {
          espacamento: appearance.grade?.desktop?.espacamento || "8",
          quantidadePorLinha: appearance.grade?.desktop?.quantidadePorLinha || "4",
          quantidadePorColuna: appearance.grade?.desktop?.quantidadePorColuna || "4",
        };
        mobile: {
          espacamento: appearance.grade?.mobile?.espacamento || "8",
          quantidadePorLinha: appearance.grade?.mobile?.quantidadePorLinha || "2",
          quantidadePorColuna: appearance.grade?.mobile?.quantidadePorColuna || "2",
        };
      };
    });
    setEditingAppearance(appearance);
    setIsModalOpen(true);
  };

  const handleInputChange = (
    field: string,
    value: any,
    subField?: string
  ) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (subField) {
        if (!newData[field]) newData[field] = {};
        newData[field][subField] = value;
      } else {
        newData[field] = value;
      }
      return newData;
    });
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push("Nome do estilo é obrigatório.");
    if (!formData.primary_color) errors.push("Cor principal é obrigatória.");
    if (!formData.secondary_color) errors.push("Cor secundária é obrigatória.");
    if (!formData.text_color) errors.push("Cor de texto é obrigatória.");
    if (!formData.background_color) errors.push("Cor de fundo é obrigatória.");
    if (!formData.button_color) errors.push("Cor do botão é obrigatória.");
    if (!formData.border_radius) errors.push("Arredondamento é obrigatório.");
    if (!formData.widget_shape) errors.push("Formato do widget é obrigatório.");
    if (!formData.widget_size) errors.push("Tamanho do widget é obrigatório.");
    if (!formData.widget_animation) errors.push("Animação do widget é obrigatória.");
    if (!formData.carrossel?.desktop?.quantidadePorColuna) errors.push("Quantidade por coluna (mobile) deve ser preenchida.");
    if (!formData.grade?.desktop?.quantidadePorColuna) errors.push("Quantidade por coluna (mobile) deve ser preenchida.");
    const mobileColuna = Number(formData.grade?.mobile?.quantidadePorColuna);
    if (mobileColuna && (isNaN(mobileColuna) || mobileColuna > 2)) {
      errors.push("No mobile, a quantidade por coluna não pode ser maior que 2.");
    }
    Object.entries(formData).forEach(([key, val]) => {
      if (typeof val === "object" && !Array.isArray(val)) {
        Object.entries(val).forEach(([subKey, subVal]) => {
          if (subKey === "quantidadePorColuna" || subKey === "quantidadePorLinha") {
            const num = Number(subVal);
            if (isNaN(num) || num <= 0) {
              errors.push(`Valor inválido para ${subKey}.`);
            }
          }
        });
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
      const updated: Appearance = {
        ...formData,
        id: editingAppearance?.id || Math.random().toString(36).substr(2, 9),
        updated_at: new Date().toISOString(),
      };
      await db.appearances.save(updated);
      showSuccess(editingAppearance ? "Estilo atualizado com sucesso!" : "Estilo criado com sucesso!");
      setIsModalOpen(false);
      loadAppearances();
    } catch (e) {
      showError("Erro ao salvar estilo.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadAppearances = async () => {
    try {
      const list = await db.appearances.getAll();
      setAppearances(list);
    } catch (e) {
      showError("Erro ao carregar estilos.");
    }
  };

  useEffect(() => {
    loadAppearances();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Aparência</h1>
          <p className="text-slate-500 font-medium mt-1">
            Customize o design dos widgets e carrosséis de vídeo da sua loja.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Novo Estilo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Estilos Cadastrados</h3>
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
                        <Save size={12} className="fill-[#0094EB]" /> Padrão
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(app.id)}
                        className="text-[10px] font-black text-slate-400 hover:text-[#0094EB] uppercase tracking-wider"
                      >
                        Definir Padrão
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(app)}
                        className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(app)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
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
        title="Excluir Estilo"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />

      <CustomDialog
        isOpen={isModalOpen}
        type="form"
        title={editingAppearance ? "Editar Estilo" : "Novo Estilo"}
        maxWidth="max-w-2xl"
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        confirmText={isSaving ? "Salvando..." : "Salvar"}
      >
        <div className="space-y-6">
          {/* Nome */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Estilo</label>
            <input
              type="text"
              placeholder="Ex: Estilo Padrão"
              value={formData.name}
              onChange={e => handleInputChange("name", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Configurações Gerais */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor Principal</label>
            <input
              type="color"
              value={formData.primary_color}
              onChange={e => handleInputChange("primary_color", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor Secundária</label>
            <input
              type="color"
              value={formData.secondary_color}
              onChange={e => handleInputChange("secondary_color", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor de Texto</label>
            <input
              type="color"
              value={formData.text_color}
              onChange={e => handleInputChange("text_color", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor de Fundo</label>
            <input
              type="color"
              value={formData.background_color}
              onChange={e => handleInputChange("background_color", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor do Botão</label>
            <input
              type="color"
              value={formData.button_color}
              onChange={e => handleInputChange("button_color", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Formato e Animação */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato</label>
            <select
              value={formData.widget_shape}
              onChange={e => handleInputChange("widget_shape", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            >
              <option value="circular">Circular</option>
              <option value="square">Quadrado</option>
              <option value="portrait">Retrato</option>
            </select>

            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Animação</label>
            <select
              value={formData.widget_animation}
              onChange={e => handleInputChange("widget_animation", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            >
              <option value="none">Nenhuma</option>
              <option value="fade">Suave</option>
              <option value="pulse">Pulsar</option>
              <option value="zoom">Zoom</option>
              <option value="slide">Deslizar</option>
            </select>
          </div>

          {/* Arredondamento e Cor da Borda */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Arredondamento das Bordas</label>
            <input
              type="text"
              placeholder="Ex: 8px"
              value={formData.border_radius}
              onChange={e => handleInputChange("border_radius", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor da Borda</label>
            <input
              type="color"
              value={formData.border_radius}
              onChange={e => handleInputChange("border_radius", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Configurações por Tipo de Exibição */}
          <div className="space-y-6">
            {["flutuante", "carrossel", "grade"].map(tipo => (
              <div key={tipo} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{tipo}</span>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Desktop</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato</label>
                      <select
                        value={formData[tipo]?.desktop?.formato}
                        onChange={e => handleInputChange(tipo, e.target.value, "desktop.formato")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="circular">Circular</option>
                        <option value="square">Quadrado</option>
                        <option value="portrait">Retrato</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Animação</label>
                      <select
                        value={formData[tipo]?.desktop?.animacao}
                        onChange={e => handleInputChange(tipo, e.target.value, "desktop.animacao")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="none">Nenhuma</option>
                        <option value="fade">Suave</option>
                        <option value="pulse">Pulsar</option>
                        <option value="zoom">Zoom</option>
                        <option value="slide">Deslizar</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arredondamento</label>
                      <input
                        type="text"
                        placeholder="Ex: 8"
                        value={formData[tipo]?.desktop?.arredondamento}
                        onChange={e => handleInputChange(tipo, e.target.value, "desktop.arredondamento")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor da Borda</label>
                      <input
                        type="color"
                        value={formData[tipo]?.desktop?.corBorda}
                        onChange={e => handleInputChange(tipo, e.target.value, "desktop.corBorda")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA</label>
                      <input
                        type="text"
                        placeholder="Ex: Comprar agora"
                        value={formData[tipo]?.desktop?.cta}
                        onChange={e => handleInputChange(tipo, e.target.value, "desktop.cta")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                  </div>
                  {/* Carrossel e Grade extras */}
                  {["carrossel", "grade"].includes(tipo) && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espaçamento</label>
                        <input
                          type="number"
                          placeholder="Ex: 8"
                          value={formData[tipo]?.desktop?.espacamento}
                          onChange={e => handleInputChange(tipo, e.target.value, "desktop.espacamento")}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade por Linha</label>
                        <input
                          type="number"
                          placeholder="Ex: 4"
                          value={formData[tipo]?.desktop?.quantidadePorLinha}
                          onChange={e => handleInputChange(tipo, e.target.value, "desktop.quantidadePorLinha")}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade por Coluna</label>
                        <input
                          type="number"
                          placeholder="Ex: 4"
                          value={formData[tipo]?.desktop?.quantidadePorColuna}
                          onChange={e => handleInputChange(tipo, e.target.value, "desktop.quantidadePorColuna")}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                    </div>
                  )}
                  {/* Mobile specific */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato</label>
                      <select
                        value={formData[tipo]?.mobile?.formato}
                        onChange={e => handleInputChange(tipo, e.target.value, "mobile.formato")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="circular">Circular</option>
                        <option value="square">Quadrado</option>
                        <option value="portrait">Retrato</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Animação</label>
                      <select
                        value={formData[tipo]?.mobile?.animacao}
                        onChange={e => handleInputChange(tipo, e.target.value, "mobile.animacao")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="none">Nenhuma</option>
                        <option value="fade">Suave</option>
                        <option value="pulse">Pulsar</option>
                        <option value="zoom">Zoom</option>
                        <option value="slide">Deslizar</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arredondamento</label>
                      <input
                        type="text"
                        placeholder="Ex: 8"
                        value={formData[tipo]?.mobile?.arredondamento}
                        onChange={e => handleInputChange(tipo, e.target.value, "mobile.arredondamento")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor da Borda</label>
                      <input
                        type="color"
                        value={formData[tipo]?.mobile?.corBorda}
                        onChange={e => handleInputChange(tipo, e.target.value, "mobile.corBorda")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA</label>
                      <input
                        type="text"
                        placeholder="Ex: Comprar agora"
                        value={formData[tipo]?.mobile?.cta}
                        onChange={e => handleInputChange(tipo, e.target.value, "mobile.cta")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                  </div>
                  {/* Mobile quantity limit */}
                  {["carrossel", "grade"].includes(tipo) && (
                    <div className="mt-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Quantidade por Coluna (Mobile) – Máx. 2
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 2"
                        value={formData[tipo]?.mobile?.quantidadePorColuna}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val > 2) {
                            handleInputChange(tipo, "2", "mobile.quantidadePorColuna");
                          } else {
                            handleInputChange(tipo, e.target.value, "mobile.quantidadePorColuna");
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Estilo"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const handleSetDefault = async (id: string) => {
  try {
    const list = [...appearances];
    for (const app of list) {
      await db.appearances.save({ ...app, is_default: app.id === id });
    }
    showSuccess("Estilo padrão atualizado!");
    loadAppearances();
  } catch (e) {
    showError("Erro ao definir padrão.");
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
    showSuccess("Estilo excluído com sucesso.");
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
    loadAppearances();
  } catch (e) {
    showError("Erro ao excluir estilo.");
  }
};

export default AppearancePage;