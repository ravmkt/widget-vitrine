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

// Toggle Switch Component
const ToggleSwitch = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 rounded-lg bg-gray-50 text-gray-600 focus:ring-2 focus:ring-[#0094EB]"
      />
      <span className="text-sm font-medium text-slate-400">{label}</span>
      {description && <p className="text-xs text-slate-400">{description}</p>}
    </div>
  );
};

// Color Input Component
const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  };
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center cursor-pointer"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={handleColorChange}
          className="w-8 h-8 rounded-full appearance-none text-transparent cursor-pointer"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-bold text-white outline-none focus:border-[#0094EB]"
      />
    </div>
  );
};

// Device Tabs Component
const DeviceTabs = ({
  activeDevice,
  onChange,
}: {
  activeDevice: 'desktop' | 'mobile';
  onChange: (device: 'desktop' | 'mobile') => void;
}) => {
  return (
    <div className="flex bg-slate-900 rounded-lg p-1">
      <button
        onClick={() => onChange('desktop')}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
          activeDevice === 'desktop'
            ? "bg-[#0094EB] text-white shadow-lg"
            : "text-slate-400 hover:text-white"
        )}
      >
        Desktop
      </button>
      <button
        onClick={() => onChange('mobile')}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
          activeDevice === 'mobile'
            ? "bg-[#0094EB] text-white shadow-lg"
            : "text-slate-400 hover:text-white"
        )}
      >
        Mobile
      </button>
    </div>
  );
};

// Section Card Component
const SectionCard = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("bg-slate-950 rounded-[1.5rem] p-6 space-y-6", className)}>
      <h3 className="text-lg font-black text-white">{title}</h3>
      {children}
    </div>
  );
};

// Form Field Component
const FormField = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
};

const AppearancePage = () => {
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: "",
    name: "",
  });

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
  }>({
    id: "",
    store_id: "",
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
  });

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
          <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">
                {editingStyle ? "Editar Estilo" : "Criar Novo Estilo"}
              </h2>
              <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Dados Básicos */}
              <SectionCard title="1. Dados Básicos">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Nome do Estilo">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                    />
                  </FormField>
                  <FormField label="Definir como padrão">
                    <ToggleSwitch
                      label="Definir como padrão da loja"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                  </FormField>
                </div>
                <FormField label="Usar aparência em todos os dispositivos">
                  <ToggleSwitch
                    label="Usar aparência em todos os dispositivos"
                    checked={formData.useGlobalAppearance}
                    onChange={(e) => setFormData({ ...formData, useGlobalAppearance: e.target.checked })}
                    description="Quando ativado, a mesma aparência será aplicada no mobile e no desktop."
                  />
                </FormField>
              </SectionCard>

              {/* Configurações */}
              <SectionCard title="2. Configurações">
                <div className="space-y-6">
                  {/* Flutuante */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white">Flutuante</h4>
                    <DeviceTabs
                      activeDevice="desktop"
                      onChange={() => {}}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Forma">
                        <select
                          value={formData.widget_shape}
                          onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="circle">Circular</option>
                          <option value="square">Quadrado</option>
                          <option value="portrait">Retrato</option>
                        </select>
                      </FormField>
                      <FormField label="Tamanho">
                        <input
                          type="text"
                          value={formData.width}
                          onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Raio da borda">
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Posição">
                        <select
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="fixed_bottom_right">Flutuante (Direita)</option>
                          <option value="fixed_bottom_left">Flutuante (Esquerda)</option>
                          <option value="fixed_top_right">Flutuante (Topo Direita)</option>
                          <option value="fixed_top_left">Flutuante (Topo Esquerda)</option>
                        </select>
                      </FormField>
                      <FormField label="Chamada para ação">
                        <input
                          type="text"
                          value={formData.cta_text}
                          onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Cor da borda">
                        <ColorInput
                          label="Cor da borda"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Largura da borda">
                        <input
                          type="text"
                          value={formData.border_style}
                          onChange={(e) => setFormData({ ...formData, border_style: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                    </div>
                  </div>

                  {/* Carrossel */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white">Carrossel</h4>
                    <DeviceTabs
                      activeDevice="desktop"
                      onChange={() => {}}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Espaçamento">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.carousel_gap}
                          onChange={(e) => setFormData({ ...formData, carousel_gap: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Forma">
                        <select
                          value={formData.carousel_card_shape}
                          onChange={(e) => setFormData({ ...formData, carousel_card_shape: e.target.value as any })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="rounded">Arredondado</option>
                          <option value="square">Quadrado</option>
                          <option value="circle">Circular</option>
                          <option value="custom">Personalizado</option>
                        </select>
                      </FormField>
                      <FormField label="Altura">
                        <input
                          type="text"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Largura">
                        <input
                          type="text"
                          value={formData.width}
                          onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Raio da borda">
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Largura da borda">
                        <input
                          type="text"
                          value={formData.border_style}
                          onChange={(e) => setFormData({ ...formData, border_style: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Exibir produto no carrossel">
                        <ToggleSwitch
                          label="Exibir produto no carrossel"
                          checked={formData.show_product}
                          onChange={(e) => setFormData({ ...formData, show_product: e.target.checked })}
                        />
                      </FormField>
                      <FormField label="Mostrar botão play">
                        <ToggleSwitch
                          label="Mostrar botão play"
                          checked={formData.show_play_icon}
                          onChange={(e) => setFormData({ ...formData, show_play_icon: e.target.checked })}
                        />
                      </FormField>
                      <FormField label="Margem superior">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.margin_top}
                          onChange={(e) => setFormData({ ...formData, margin_top: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Margem inferior">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.margin_bottom}
                          onChange={(e) => setFormData({ ...formData, margin_bottom: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Modo de visualização do carrossel">
                        <select
                          value={formData.carousel_view_mode}
                          onChange={(e) => setFormData({ ...formData, carousel_view_mode: e.target.value as any })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="preview">Preview (vídeo no hover)</option>
                          <option value="poster">Poster/imagem apenas</option>
                          <option value="custom">Personalizado</option>
                        </select>
                      </FormField>
                    </div>
                  </div>

                  {/* Grade */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white">Grade</h4>
                    <DeviceTabs
                      activeDevice="desktop"
                      onChange={() => {}}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Colunas">
                        <input
                          type="number"
                          min="1"
                          value={formData.desktop_columns}
                          onChange={(e) => setFormData({ ...formData, desktop_columns: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Linhas">
                        <input
                          type="number"
                          min="1"
                          value={formData.desktop_rows}
                          onChange={(e) => setFormData({ ...formData, desktop_rows: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Espaçamento">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.desktop_gap}
                          onChange={(e) => setFormData({ ...formData, desktop_gap: Number(e.target.value) })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Forma">
                        <select
                          value={formData.widget_shape}
                          onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="circle">Circular</option>
                          <option value="square">Quadrado</option>
                          <option value="portrait">Retrato</option>
                        </select>
                      </FormField>
                      <FormField label="Altura">
                        <input
                          type="text"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Largura">
                        <input
                          type="text"
                          value={formData.width}
                          onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Raio da borda">
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Chamada para ação">
                        <input
                          type="text"
                          value={formData.cta_text}
                          onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Largura da borda">
                        <input
                          type="text"
                          value={formData.border_style}
                          onChange={(e) => setFormData({ ...formData, border_style: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                      <FormField label="Exibir produto">
                        <ToggleSwitch
                          label="Exibir produto"
                          checked={formData.show_product}
                          onChange={(e) => setFormData({ ...formData, show_product: e.target.checked })}
                        />
                      </FormField>
                      <FormField label="Mostrar botão play">
                        <ToggleSwitch
                          label="Mostrar botão play"
                          checked={formData.show_play_icon}
                          onChange={(e) => setFormData({ ...formData, show_play_icon: e.target.checked })}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Cores e Tipografia */}
              <SectionCard title="3. Cores e Tipografia">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Cor principal">
                    <ColorInput
                      label="Cor principal"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value, secondary_color: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Cor secundária">
                    <ColorInput
                      label="Cor secundária"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Cor do texto">
                    <ColorInput
                      label="Cor do texto"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Cor do botão">
                    <ColorInput
                      label="Cor do botão"
                      value={formData.button_color}
                      onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Fonte de texto">
                    <select
                      value={formData.font_family}
                      onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                      <option value="Lato, sans-serif">Lato</option>
                    </select>
                  </FormField>
                  <FormField label="Tamanho do texto">
                    <input
                      type="text"
                      value={formData.border_radius}
                      onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                    />
                  </FormField>
                </div>
              </SectionCard>

              {/* Player Interativo e Modal */}
              <SectionCard title="4. Player Interativo e Modal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label="Mostrar botão curtir">
                    <ToggleSwitch
                      label="Mostrar botão curtir"
                      checked={formData.show_like_button}
                      onChange={(e) => setFormData({ ...formData, show_like_button: e.target.checked })}
                    />
                  </FormField>
                  <FormField label="Mostrar botão WhatsApp">
                    <ToggleSwitch
                      label="Mostrar botão WhatsApp"
                      checked={formData.show_whatsapp_button}
                      onChange={(e) => setFormData({ ...formData, show_whatsapp_button: e.target.checked })}
                    />
                  </FormField>
                  <FormField label="Mostrar botão produto">
                    <ToggleSwitch
                      label="Mostrar botão produto"
                      checked={formData.show_product}
                      onChange={(e) => setFormData({ ...formData, show_product: e.target.checked })}
                    />
                  </FormField>
                  <FormField label="Mostrar botão compartilhar">
                    <ToggleSwitch
                      label="Mostrar botão compartilhar"
                      checked={formData.show_share_button}
                      onChange={(e) => setFormData({ ...formData, show_share_button: e.target.checked })}
                    />
                  </FormField>
                  <FormField label="Mostrar botão comentários">
                    <ToggleSwitch
                      label="Mostrar botão comentários"
                      checked={formData.show_comment_button}
                      onChange={(e) => setFormData({ ...formData, show_comment_button: e.target.checked })}
                    />
                  </FormField>
                </div>
              </SectionCard>
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