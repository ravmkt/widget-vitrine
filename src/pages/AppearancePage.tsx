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
import { cn } from "@/lib/utils";

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
  const [editingStyle, setEditingStyle] = useState<Appearance | null>(null);
  const [formData, setFormData] = useState<Appearance>({
    id: "",
    store_id: "",
    name: "",
    is_default: false,
    primary_color: "",
    secondary_color: "",
    text_color: "",
    background_color: "",
    button_color: "",
    border_radius: "",
    shadow_enabled: true,
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
    show_whatsapp_button: true,
    show_product_button: true,
    created_at: "",
    updated_at: "",
  });
  // =================================================================

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
      id: "",
      store_id: "11111111-1111-1111-1111-111111111111",
      name: "",
      is_default: false,
      primary_color: "#0094EB",
      secondary_color: "#0094EB",
      text_color: "#0F172A",
      background_color: "#FFFFFF",
      button_color: "#0094EB",
      border_radius: "12px",
      shadow_enabled: true,
      font_family: "Inter, sans-serif",
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
      show_whatsapp_button: true,
      show_product_button: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setShowModal(true);
  };

  const handleEditStyle = (style: Appearance) => {
    setEditingStyle(style);
    setFormData({ ...style });
    setShowModal(true);
  };

  const handleSaveStyle = async () => {
    if (!formData.name.trim()) {
      showError("Nome do estilo é obrigatório.");
      return;
    }

    const styleToSave: Appearance = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingStyle) {
        await db.appearances.save(styleToSave);
        showSuccess("Estilo atualizado com sucesso!");
      } else {
        const newStyle: Appearance = {
          ...styleToSave,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
        };
        await db.appearances.save(newStyle);
        showSuccess("Estilo criado com sucesso!");
      }
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
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">{editingStyle ? "Editar Estilo" : "Criar Novo Estilo"}</h2>
              <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form className="flex-1 overflow-y-auto p-6 space-y-6">
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

              {/* CTA (texto do botão) */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA (texto do botão)</label>
                <input
                  type="text"
                  value={formData.button_color ? formData.button_color : ""}
                  onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>

              {/* Animação */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Animação</label>
                <select
                  value={formData.widget_animation}
                  onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                  value={formData.widget_shape}
                  onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                >
                  <option value="circle">Círculo</option>
                  <option value="square">Quadrado</option>
                  <option value="portrait">Retrato</option>
                </select>
              </div>

              {/* Arredondamento */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Arredondamento</label>
                <input
                  type="text"
                  placeholder="Ex: 12px"
                  value={formData.border_radius}
                  onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>

              {/* Cor da Borda */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor da Borda</label>
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>

              {/* CTA (texto) */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA (texto)</label>
                <input
                  type="text"
                  value={formData.show_title ? "Sim" : "Não"} // This is a placeholder, but we don't have a direct CTA text field in the Appearance interface. We'll use show_title as a proxy for now.
                  onChange={(e) => setFormData({ ...formData, show_title: e.target.value === "Sim" })}
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
                          value={formData.widget_shape}
                          onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
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
                          value={formData.widget_animation}
                          onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                          className="w-16 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Borda</label>
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-16 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">CTA</label>
                        <input
                          type="text"
                          value={formData.show_title ? "Sim" : "Não"}
                          onChange={(e) => setFormData({ ...formData, show_title: e.target.value === "Sim" })}
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
                          value={formData.widget_shape}
                          onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
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
                          value={formData.widget_animation}
                          onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Borda</label>
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={4} // Placeholder, we don't have spacing in the Appearance interface
                          onChange={(e) => { /* We don't have a field for spacing, so we ignore */ }}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                        <input
                          type="number"
                          min="1"
                          max="2"
                          value={1} // Placeholder
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= 2) {
                              // We don't have a field for itemsPerRow, so we ignore
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
                          value={1} // Placeholder
                          onChange={(e) => { /* We don't have a field for itemsPerColumn, so we ignore */ }}
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
                          value={formData.widget_shape}
                          onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
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
                          value={formData.widget_animation}
                          onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Borda</label>
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={4} // Placeholder
                          onChange={(e) => { /* We don't have a field for spacing, so we ignore */ }}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                        <input
                          type="number"
                          min="1"
                          max="2"
                          value={4} // Placeholder
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= 2) {
                              // We don't have a field for itemsPerRow, so we ignore
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
                          value={4} // Placeholder
                          onChange={(e) => { /* We don't have a field for itemsPerColumn, so we ignore */ }}
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
                          value={formData.widget_shape}
                          onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
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
                          value={formData.widget_animation}
                          onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Borda</label>
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={4} // Placeholder
                          onChange={(e) => { /* We don't have a field for spacing, so we ignore */ }}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                        <input
                          type="number"
                          min="1"
                          max="2"
                          value={4} // Placeholder
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= 2) {
                              // We don't have a field for itemsPerRow, so we ignore
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
                          value={4} // Placeholder
                          onChange={(e) => { /* We don't have a field for itemsPerColumn, so we ignore */ }}
                          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grade */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase">Grade</h4>
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-400 uppercase">Desktop</h5>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Formato</label>
                      <select
                        value={formData.widget_shape}
                        onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
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
                        value={formData.widget_animation}
                        onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Borda</label>
                      <input
                        type="text"
                        value={formData.border_radius}
                        onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={4} // Placeholder
                        onChange={(e) => { /* We don't have a field for spacing, so we ignore */ }}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                      <input
                        type="number"
                        min="1"
                        max="2"
                        value={4} // Placeholder
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 1 && val <= 2) {
                            // We don't have a field for itemsPerRow, so we ignore
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
                        value={4} // Placeholder
                        onChange={(e) => { /* We don't have a field for itemsPerColumn, so we ignore */ }}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-slate-400">Mobile</h5>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Formato</label>
                      <select
                        value={formData.widget_shape}
                        onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
                        className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="circle">Círculo</option>
                        <option value="square">Quadrado</option
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Animação</label>
                      <select
                        value={formData.widget_animation}
                        onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
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
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })} // Assuming primary and secondary are the same for border
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Borda</label>
                      <input
                        type="text"
                        value={formData.border_radius}
                        onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Espaçamento</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={4} // Placeholder
                        onChange={(e) => { /* We don't have a field for spacing, so we ignore */ }}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
                      <input
                        type="number"
                        min="1"
                        max="2"
                        value={4} // Placeholder
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 1 && val <= 2) {
                            // We don't have a field for itemsPerRow, so we ignore
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
                        value={4} // Placeholder
                        onChange={(e) => { /* We don't have a field for itemsPerColumn, so we ignore */ }}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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