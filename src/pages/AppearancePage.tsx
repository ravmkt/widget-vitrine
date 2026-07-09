"use client";

import React, { useEffect, useState } from "react";
import { db, Appearance, Store } from "@/lib/db";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Star,
  Brush,
  X,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import CustomDialog from "@/components/CustomDialog";
import { cn } from "@/lib/utils";

interface StyleFormData {
  name: string;
  cta: string;
  animation: string;
  format: "floating" | "carousel" | "grid";
  borderRadius: string;
  borderColor: string;
  ctaText: string;
  desktop: {
    shape: string;
    animation: string;
    borderRadius: string;
    borderColor: string;
    ctaText: string;
  };
  mobile: {
    shape: string;
    animation: string;
    borderRadius: string;
    borderColor: string;
    ctaText: string;
    spacing: number;
    itemsPerRow: number;
    itemsPerColumn: number;
  };
}

const AppearancePage = () => {
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: "",
    name: "",
  });

  // ==================== NEW STATE FOR STYLE FORM ====================
  const [showModal, setShowModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<StyleFormData | null>(null);
  const [formData, setFormData] = useState<StyleFormData>({
    name: "",
    cta: "",
    animation: "",
    format: "floating",
    borderRadius: "12px",
    borderColor: "#0094EB",
    ctaText: "",
    desktop: {
      shape: "circle",
      animation: "none",
      borderRadius: "12px",
      borderColor: "#0094EB",
      ctaText: "",
    },
    mobile: {
      shape: "circle",
      animation: "none",
      borderRadius: "12px",
      borderColor: "#0094EB",
      ctaText: "",
      spacing: 8,
      itemsPerRow: 1,
      itemsPerColumn: 1,
    },
  });
  // =================================================================

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      if (mainStore) {
        const list = await db.appearances.getAll(mainStore.id);
        setAppearances(list);
      }
    } catch (error) {
      showError("Erro ao carregar estilos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetDefault = async (id: string) => {
    try {
      const styles = [...appearances];
      for (const style of styles) {
        await db.appearances.save({ ...style, is_default: style.id === id });
      }
      showSuccess("Estilo padrão atualizado!");
      loadData();
    } catch (e) {
      showError("Erro ao definir padrão.");
    }
  };

  const handleDeleteClick = (app: Appearance) => {
    setDeleteModal({ isOpen: true, id: app.id, name: app.name });
  };

  const handleConfirmDelete = async () => {
    try {
      await db.appearances.delete(deleteModal.id);
      showSuccess("Estilo excluído com sucesso.");
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      loadData();
    } catch (e) {
      showError("Erro ao excluir estilo.");
    }
  };

  // ==================== NEW STYLE FORM HANDLERS ====================
  const handleNewStyle = () => {
    setEditingStyle(null);
    setFormData({
      name: "",
      cta: "",
      animation: "",
      format: "floating",
      borderRadius: "12px",
      borderColor: "#0094EB",
      ctaText: "",
      desktop: {
        shape: "circle",
        animation: "none",
        borderRadius: "12px",
        borderColor: "#0094EB",
        ctaText: "",
      },
      mobile: {
        shape: "circle",
        animation: "none",
        borderRadius: "12px",
        borderColor: "#0094EB",
        ctaText: "",
        spacing: 8,
        itemsPerRow: 1,
        itemsPerColumn: 1,
      },
    });
    setShowModal(true);
  };

  const handleEditStyle = (style: Appearance) => {
    setEditingStyle(style);
    setFormData({
      name: style.name,
      cta: style.cta,
      animation: style.animation,
      format: style.format,
      borderRadius: style.borderRadius,
      borderColor: style.borderColor,
      ctaText: style.ctaText,
      desktop: {
        shape: style.desktop.shape,
        animation: style.desktop.animation,
        borderRadius: style.desktop.borderRadius,
        borderColor: style.desktop.borderColor,
        ctaText: style.desktop.ctaText,
      },
      mobile: {
        shape: style.mobile.shape,
        animation: style.mobile.animation,
        borderRadius: style.mobile.borderRadius,
        borderColor: style.mobile.borderColor,
        ctaText: style.mobile.ctaText,
        spacing: style.mobile.spacing,
        itemsPerRow: style.mobile.itemsPerRow,
        itemsPerColumn: style.mobile.itemsPerColumn,
      },
    });
    setShowModal(true);
  };

  const handleSaveStyle = async () => {
    if (!formData.name.trim()) {
      showError("Nome do estilo é obrigatório.");
      return;
    }

    const newStyle: Appearance = {
      id: Date.now().toString(),
      store_id: "11111111-1111-1111-1111-111111111111",
      name: formData.name,
      is_default: editingStyle ? editingStyle.is_default : false,
      primary_color: formData.borderColor,
      secondary_color: formData.borderColor,
      text_color: "#0F172A",
      background_color: "#FFFFFF",
      button_color: formData.borderColor,
      border_radius: formData.borderRadius,
      shadow_enabled: true,
      font_family: "Inter, sans-serif",
      widget_shape: formData.format as any,
      widget_size: "medium",
      widget_animation: formData.animation,
      carousel_card_shape: "rounded",
      carousel_visible_items: 4,
      carousel_gap: 16,
      show_title: true,
      show_play_button: true,
      show_product: true,
      show_like_button: true,
      show_comment_button: true,
      show_share_button: true,
      show_whatsapp_button: true,
      show_product_button: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await db.appearances.save(newStyle);
      showSuccess(editingStyle ? "Estilo atualizado com sucesso!" : "Estilo criado com sucesso!");
      setShowModal(false);
      setEditingStyle(null);
      loadData();
    } catch (e) {
      showError("Erro ao salvar estilo.");
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingStyle(null);
  };
  // ==============================================================

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
        <button
          onClick={handleNewStyle}
          className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg flex items-center gap-2"
        >
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
                      <button
                        onClick={() => handleEditStyle(app)}
                        className="text-[10px] font-black text-slate-400 hover:text-[#0094EB] uppercase tracking-wider"
                      >
                        Definir Padrão
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditStyle(app)}
                        className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(app)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== NEW MODAL FOR STYLE FORM ==================== */}
      <CustomDialog
        isOpen={showModal}
        type="confirm"
        title={editingStyle ? "Editar Estilo" : "Criar Novo Estilo"}
        maxWidth="max-w-3xl"
        onCancel={handleCancel}
        onConfirm={handleSaveStyle}
        confirmText={editingStyle ? "Salvar Alterações" : "Salvar Estilo"}
      >
        <div className="space-y-6">
          {/* Nome */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Estilo <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA (texto do botão)</label>
            <input
              type="text"
              value={formData.cta}
              onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Animação */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Animação</label>
            <select
              value={formData.animation}
              onChange={(e) => setFormData({ ...formData, animation: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            >
              <option value="">Selecione...</option>
              <option value="none">Nenhuma</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>

          {/* Formato Visual */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Formato Visual</label>
            <select
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            >
              <option value="floating">Flutuante</option>
              <option value="carousel">Carrossel</option>
              <option value="grid">Grade</option>
            </select>
          </div>

          {/* Arredondamento */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Arredondamento</label>
            <input
              type="text"
              placeholder="Ex: 12px"
              value={formData.borderRadius}
              onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Cor da Borda */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor da Borda</label>
            <input
              type="color"
              value={formData.borderColor}
              onChange={(e) => setFormData({ ...formData, borderColor: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA (texto)</label>
            <input
              type="text"
              value={formData.ctaText}
              onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
            />
          </div>

          {/* Configurações por Formato */}
          <div className="space-y-6">
            {/* Flutuante */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-800 uppercase">Flutuante</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Desktop */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-400 uppercase">Desktop</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Formato</label>
                    <select
                      value={formData.desktop.shape}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, shape: e.target.value as any } })}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="circle">Círculo</option>
                      <option value="square">Quadrado</option>
                      <option value="portrait">Retrato</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Animação</label>
                    <select
                      value={formData.desktop.animation}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, animation: e.target.value as any } })}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="">Selecione...</option>
                      <option value="none">Nenhuma</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="bounce">Bounce</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.desktop.borderColor}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, borderColor: e.target.value } })}
                      className="w-16 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.desktop.borderRadius}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, borderRadius: e.target.value } })}
                      className="w-16 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">CTA</label>
                    <input
                      type="text"
                      value={formData.desktop.ctaText}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, ctaText: e.target.value } })}
                      className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-400">Mobile</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Formato</label>
                    <select
                      value={formData.mobile.shape}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, shape: e.target.value as any } })}
                      className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="circle">Círculo</option>
                      <option value="square">Quadrado</option>
                      <option value="portrait">Retrato</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Animação</label>
                    <select
                      value={formData.mobile.animation}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, animation: e.target.value as any } })}
                      className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="">Selecione...</option>
                      <option value="none">Nenhuma</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="bounce">Bounce</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.mobile.borderColor}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, borderColor: e.target.value } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.mobile.borderRadius}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, borderRadius: e.target.value } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.mobile.spacing}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, spacing: Number(e.target.value) } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      value={formData.mobile.itemsPerRow}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 2) {
                          setFormData({ ...formData, mobile: { ...formData.mobile, itemsPerRow: val } });
                        }
                      }
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Itens por coluna</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.mobile.itemsPerColumn}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, itemsPerColumn: Number(e.target.value) } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                </div>
              </div>

              {/* Carrossel */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase">Carrossel</h4>
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-400 uppercase">Desktop</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Formato</label>
                    <select
                      value={formData.desktop.shape}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, shape: e.target.value as any } })}
                      className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="circle">Círculo</option>
                      <option value="square">Quadrado</option>
                      <option value="portrait">Retrato</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Animação</label>
                    <select
                      value={formData.desktop.animation}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, animation: e.target.value as any } })}
                      className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="">Selecione...</option>
                      <option value="none">Nenhuma</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="bounce">Bounce</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.desktop.borderColor}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, borderColor: e.target.value } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.desktop.borderRadius}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, borderRadius: e.target.value } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.desktop.spacing}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, spacing: Number(e.target.value) } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      value={formData.desktop.itemsPerRow}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 2) {
                          setFormData({ ...formData, desktop: { ...formData.desktop, itemsPerRow: val } });
                        }
                      }
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Itens por coluna</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.desktop.itemsPerColumn}
                      onChange={(e) => setFormData({ ...formData, desktop: { ...formData.desktop, itemsPerColumn: Number(e.target.value) } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-4">
                  <h5 className="text-xs font-black text-slate-400">Mobile</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Formato</label>
                    <select
                      value={formData.mobile.shape}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, shape: e.target.value as any } })}
                      className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="circle">Círculo</option>
                      <option value="square">Quadrado</option>
                      <option value="portrait">Retrato</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Animação</label>
                    <select
                      value={formData.mobile.animation}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, animation: e.target.value as any } })}
                      className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    >
                      <option value="">Selecione...</option>
                      <option value="none">Nenhuma</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="bounce">Bounce</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.mobile.borderColor}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, borderColor: e.target.value } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Borda</label>
                    <input
                      type="text"
                      value={formData.mobile.borderRadius}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, borderRadius: e.target.value } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.mobile.spacing}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, spacing: Number(e.target.value) } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      value={formData.mobile.itemsPerRow}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 2) {
                          setFormData({ ...formData, mobile: { ...formData.mobile, itemsPerRow: val } });
                        }
                      }}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">Itens por coluna</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.mobile.itemsPerColumn}
                      onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, itemsPerColumn: Number(e.target.value) } })}
                      className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CustomDialog>
      {/* =========================================================== */}
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