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
  const [formData, setFormData] = useState<Appearance & {
    useGlobalAppearance: boolean;
    width: string;
    unit: 'px' | 'percent';
    height: string;
    position: string;
    bottom_spacing: string;
    left_spacing: string;
    cta_text: string;
    cta_size: string;
    cta_duration: string;
    border_style: string;
    color: string;
    show_play_icon: boolean;
    show_product: boolean;
    hide_stories: boolean;
    auto_center: boolean;
    carousel_view_mode: string;
    margin_top: string;
    margin_bottom: string;
    draggable: boolean;
    allow_close: boolean;
    object_fit: string;
    z_index: string;
    desktop_columns: number;
    desktop_rows: number;
    desktop_gap: number;
    mobile_columns: number;
    mobile_rows: number;
    mobile_gap: number;
  } = {
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
    useGlobalAppearance: false,
    width: "",
    unit: "px",
    height: "",
    position: "",
    bottom_spacing: "",
    left_spacing: "",
    cta_text: "",
    cta_size: "",
    cta_duration: "",
    border_style: "",
    color: "",
    show_play_icon: true,
    show_product: true,
    hide_stories: false,
    auto_center: false,
    carousel_view_mode: "preview",
    margin_top: "",
    margin_bottom: "",
    draggable: false,
    allow_close: false,
    object_fit: "cover",
    z_index: "",
  };
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
      useGlobalAppearance: false,
      width: "",
      unit: "px",
      height: "",
      position: "",
      bottom_spacing: "",
      left_spacing: "",
      cta_text: "",
      cta_size: "",
      cta_duration: "",
      border_style: "",
      color: "",
      show_play_icon: true,
      show_product: true,
      hide_stories: false,
      auto_center: false,
      carousel_view_mode: "preview",
      margin_top: "",
      margin_bottom: "",
      draggable: false,
      allow_close: false,
      object_fit: "cover",
      z_index: "",
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

              {/* Toggle: Usar aparência em todos os dispositivos */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Usar aparência em todos os dispositivos</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.useGlobalAppearance}
                    onChange={(e) => setFormData(prev => ({ ...prev, useGlobalAppearance: e.target.checked }))}
                    className="w-5 h-5 rounded-lg bg-gray-50 text-gray-600 focus:ring-2 focus:ring-[#0094EB]"
                  />
                  <span className="text-sm text-slate-500">{formData.useGlobalAppearance ? 'Ativado' : 'Desativado'}</span>
                </div>
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
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>

              {/* CTA (texto) */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">CTA (texto)</label>
                <input
                  type="text"
                  value={formData.cta_text || ""}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>

              {/* Configurações por Dispositivo */}
              <div className="space-y-6">
                {/* Desktop */}
                <div className="space-y-4">
                  <h5 className="text-xs font-black text-slate-400 uppercase">Desktop</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-slate-400 uppercase">Largura</label>
                      <input
                        type="text"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Unidade</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                        className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="px">Px</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Altura</label>
                      <input
                        type="text"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Posição</label>
                      <select
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                        className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      >
                        <option value="">Selecione...</option>
                        <option value="fixed_bottom_right">Flutuante (Direita)</option>
                        <option value="fixed_bottom_left">Flutuante (Esquerda)</option>
                        <option value="after_element">Depois do Seletor</option>
                        <option value="before_element">Antes do Seletor</option>
                        <option value="inside_start">Dentro (Início)</option>
                        <option value="inside_end">Dentro (Fim)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Espaçamento Inferior</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.bottom_spacing}
                        onChange={(e) => setFormData({ ...formData, bottom_spacing: e.target.value })}
                        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-slate-400">Espaçamento Esquerdo</label>
                      <input
                        type="number"
        min="0"
        step="1"
        value={formData.left_spacing}
        onChange={(e) => setFormData({ ...formData, left_spacing: e.target.value })}
        className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
      />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chamada para Ação</label>
        <input
          type="text"
          value={formData.cta_text}
          onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamanho da Chamada para Ação</label>
        <input
          type="text"
          value={formData.cta_size}
          onChange={(e) => setFormData({ ...formData, cta_size: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duração da Chamada para Ação</label>
        <input
          type="text"
          value={formData.cta_duration}
          onChange={(e) => setFormData({ ...formData, cta_duration: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estilo da Borda</label>
        <input
          type="text"
          value={formData.border_style}
          onChange={(e) => setFormData({ ...formData, border_style: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor</label>
        <input
          type="color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mostrar ícone de play</label>
        <input
          type="checkbox"
          checked={formData.show_play_icon}
          onChange={(e) => setFormData({ ...formData, show_play_icon: e.target.checked })}
          className="w-6 h-6 ml-2 text-sm text-slate-400"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exibir produto no carrossel</label>
        <input
          type="checkbox"
          checked={formData.show_product}
          onChange={(e) => setFormData({ ...formData, show_product: e.target.checked })}
          className="w-6 h-6 rounded-lg bg-slate-50 text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ocultar stories</label>
        <input
          type="checkbox"
          checked={formData.hide_stories}
          onChange={(e) => setFormData({ ...formData, hide_stories: e.target.checked })}
          className="w-6 h-6 rounded-lg bg-slate-50 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Centralizar automaticamente</label>
        <input
          type="checkbox"
          checked={formData.auto_center}
          onChange={(e) => setFormData({ ...formData, auto_center: e.target.checked })}
          className="w-6 h-6 rounded-lg bg-slate-50 text-sm font-bold text-slate-400"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modo de visualização do carrossel</label>
        <select
          value={formData.carousel_view_mode}
          onChange={(e) => setFormData({ ...formData, carousel_view_mode: e.target.value as any })}
          className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
        >
          <option value="preview">Preview (vídeo no hover)</option>
          <option value="poster">Poster/imagem apenas</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase">Margem superior</label>
        <input
          type="number"
          min="0"
          step="1"
          value={formData.margin_top}
          onChange={(e) => setFormData({ ...formData, margin_top: e.target.value })}
          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margem inferior</label>
        <input
          type="number"
          min="0"
          step="1"
          value={formData.margin_bottom}
          onChange={(e) => setFormData({ ...formData, margin_bottom: e.target.value })}
          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draggable</label>
        <input
          type="checkbox"
          checked={formData.draggable}
          onChange={(e) => setFormData({ ...formData, draggable: e.target.checked })}
          className="w-5 h-5 rounded-full bg-slate-50 text-sm font-bold text-slate-700"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permitir Fechar</label>
        <input
          type="checkbox"
          checked={formData.allow_close}
          onChange={(e) => setFormData({ ...formData, allow_close: e.target.checked })}
          className="w-6 h-6 rounded-full bg-slate-50 text-sm font-bold text-slate-700"
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exibição do vídeo/imagem</label>
        <select
          value={formData.object_fit}
          onChange={(e) => setFormData({ ...formData, object_fit: e.target.value as any })}
          className="w-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
        >
          <option value="cover">Preencher</option>
          <option value="contain">Contenir</option>
          <option value="contain-fill">Contenir preenchimento</option>
        </select>
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Z-Index</label>
        <input
          type="number"
          min="0"
          value={formData.z_index}
          onChange={(e) => setFormData({ ...formData, z_index: e.target.value })}
          className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
        />
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
            onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })}
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
            value={4}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0) {
                setFormData({ ...formData, mobile: { ...formData.mobile, spacing: val } });
              }
            }}
            className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-400">Itens por linha</label>
          <input
            type="number"
            min="1"
            max="2"
            value={formData.mobile_items_per_row || 1}
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
            value={formData.mobile_items_per_column || 1}
            onChange={(e) => setFormData({ ...formData, mobile: { ...formData.mobile, itemsPerColumn: Number(e.target.value) } })}
            className="w-12 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[#0094EB]"
          />
        </div>
      </div>

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