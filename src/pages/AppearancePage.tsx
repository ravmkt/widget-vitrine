import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, Appearance, Store } from '@/lib/db';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Star,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Volume2,
  Brush,
  Palette,
  EyeOff,
  Laptop,
  Maximize2
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const INITIAL_APPEARANCE_FORM = {
  name: 'Novo Estilo',
  is_default: false,
  primary_color: '#8B5CF6',
  secondary_color: '#EC4899',
  text_color: '#FFFFFF',
  background_color: '#0F172A',
  button_color: '#8B5CF6',
  border_radius: '16px',
  shadow_enabled: true,
  font_family: 'Inter, sans-serif',
  widget_shape: 'circle' as 'circle' | 'rounded' | 'rectangle',
  widget_size: 'medium' as 'small' | 'medium' | 'large',
  widget_animation: 'bounce' as 'none' | 'fade' | 'slide' | 'bounce' | 'pulse',
  carousel_card_shape: 'rounded' as 'rounded' | 'square',
  carousel_visible_items: 3,
  carousel_gap: 16,
  show_title: true,
  show_play_button: true,
  show_product: true,
  show_like_button: true,
  show_comment_button: true,
  show_share_button: true,
  show_whatsapp_button: true,
  show_product_button: true,
};

const AppearancePage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_APPEARANCE_FORM);
  
  const [previewTab, setPreviewTab] = useState<'widget' | 'carousel' | 'player'>('widget');
  const [animTriggerKey, setAnimTriggerKey] = useState(0); // For restarting animation preview simulation

  // Custom Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const loadAppearances = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const list = await db.appearances.getAll(mainStore.id);
        setAppearances(list);
      }
    } catch (error) {
      console.error('Erro ao carregar aparências:', error);
      showError('Erro ao carregar a lista de estilos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppearances();
  }, []);

  // Trigger animation restart on change
  useEffect(() => {
    setAnimTriggerKey(prev => prev + 1);
  }, [formData.widget_animation, formData.widget_shape, formData.widget_size]);

  const handleCreateNew = () => {
    setFormData({
      ...INITIAL_APPEARANCE_FORM,
      is_default: appearances.length === 0,
    });
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (app: Appearance) => {
    // Normalizing shapes
    let shape = app.widget_shape;
    if (shape !== 'circle' && shape !== 'rounded' && shape !== 'rectangle') {
      shape = 'circle';
    }
    
    // Normalizing animations
    let anim = app.widget_animation as any;
    if (anim !== 'none' && anim !== 'fade' && anim !== 'slide' && anim !== 'bounce' && anim !== 'pulse') {
      anim = 'bounce';
    }

    setFormData({
      name: app.name,
      is_default: app.is_default,
      primary_color: app.primary_color || '#8B5CF6',
      secondary_color: app.secondary_color || '#EC4899',
      text_color: app.text_color || '#FFFFFF',
      background_color: app.background_color || '#0F172A',
      button_color: app.button_color || '#8B5CF6',
      border_radius: app.border_radius || '16px',
      shadow_enabled: app.shadow_enabled !== false,
      font_family: app.font_family || 'Inter, sans-serif',
      widget_shape: shape as any,
      widget_size: app.widget_size || 'medium',
      widget_animation: anim,
      carousel_card_shape: app.carousel_card_shape || 'rounded',
      carousel_visible_items: app.carousel_visible_items || 3,
      carousel_gap: app.carousel_gap || 16,
      show_title: app.show_title !== false,
      show_play_button: app.show_play_button !== false,
      show_product: app.show_product !== false,
      show_like_button: app.show_like_button !== false,
      show_comment_button: app.show_comment_button !== false,
      show_share_button: app.show_share_button !== false,
      show_whatsapp_button: app.show_whatsapp_button !== false,
      show_product_button: app.show_product_button !== false,
    });
    setEditingId(app.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = async (app: Appearance) => {
    if (!store) return;
    try {
      const duplicated: Appearance = {
        ...app,
        id: Math.random().toString(36).substr(2, 9),
        name: `${app.name} (Cópia)`,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.appearances.save(duplicated);
      showSuccess('Estilo duplicado com sucesso!');
      loadAppearances();
    } catch (e) {
      showError('Erro ao duplicar estilo.');
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!store) return;
    try {
      const list = [...appearances];
      for (const app of list) {
        const updated = {
          ...app,
          is_default: app.id === id,
        };
        await db.appearances.save(updated);
      }
      showSuccess('Estilo padrão atualizado!');
      loadAppearances();
    } catch (e) {
      showError('Erro ao definir como padrão.');
    }
  };

  const handleDelete = (id: string) => {
    const target = appearances.find(a => a.id === id);
    if (!target) return;
    
    if (target.is_default) {
      showError('Não é possível excluir o estilo padrão da loja.');
      return;
    }

    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Estilo Visual?',
      description: `Deseja mesmo excluir o template de estilo "${target.name}"? Stories associados a ele reverterão para o padrão.`,
      onConfirm: async () => {
        try {
          await db.appearances.delete(id);
          showSuccess('Estilo excluído com sucesso!');
          setDialog(prev => ({ ...prev, isOpen: false }));
          loadAppearances();
        } catch (e) {
          showError('Erro ao excluir o estilo.');
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    try {
      const appData: Appearance = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        store_id: store.id,
        ...formData,
      };

      if (formData.is_default) {
        const others = appearances.filter(a => a.id !== appData.id);
        for (const other of others) {
          if (other.is_default) {
            await db.appearances.save({ ...other, is_default: false });
          }
        }
      }

      await db.appearances.save(appData);
      showSuccess(editingId ? 'Estilo atualizado com sucesso!' : 'Novo estilo criado com sucesso!');
      setShowForm(false);
      setEditingId(null);
      loadAppearances();
    } catch (error) {
      showError('Erro ao salvar as configurações de aparência.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-sm text-slate-400 font-semibold font-mono">Carregando painel de estilos...</p>
      </div>
    );
  }

  // Define scale sizing classes
  const getWidgetSizeClasses = () => {
    switch (formData.widget_size) {
      case 'small': return 'w-14 h-14';
      case 'large': return 'w-24 h-24';
      case 'medium':
      default:
        return 'w-20 h-20';
    }
  };

  // Define layout shape classes for preview
  const getWidgetShapeClasses = () => {
    switch (formData.widget_shape) {
      case 'rounded':
        return 'rounded-[20px] aspect-square';
      case 'rectangle':
        return 'rounded-[16px] aspect-[9/14] w-[90px] h-[140px]';
      case 'circle':
      default:
        return 'rounded-full aspect-square';
    }
  };

  // Custom simulation animation helper inside live preview
  const getWidgetAnimationClasses = () => {
    switch (formData.widget_animation) {
      case 'bounce': return 'animate-[bounce_2s_infinite]';
      case 'pulse': return 'animate-[pulse_1.5s_infinite]';
      case 'fade': return 'animate-[pulse_3s_infinite] opacity-80';
      case 'slide': return 'animate-[pulse_2s_infinite] translate-y-1';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      {/* Embedded CSS for custom dynamic transitions & fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Montserrat:wght@600;800&family=Playfair+Display:wght@700&family=Roboto+Mono:wght@700&display=swap');
        
        .custom-preview-font {
          font-family: ${formData.font_family || 'sans-serif'};
        }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Módulo Aparência
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Customize cores, botões, tamanhos e efeitos do widget de vídeo para embutir na sua Yampi.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-3 rounded-2xl font-bold text-sm md:text-base shadow-lg transition-all self-start sm:self-auto"
            >
              <Plus className="w-5 h-5" />
              Criar novo template
            </button>
          )}
        </div>

        {showForm ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 animate-fade-in">
            
            {/* COLUMN 1: EDIT FORM (7 COLS) */}
            <form onSubmit={handleSave} className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-8 max-h-[85vh] overflow-y-auto scrollbar-none shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-bold">
                    {editingId ? 'Editar Template de Aparência' : 'Criar Novo Template'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* SECTION 1: NOME */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">1. Dados básicos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Nome do template</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm md:text-base text-slate-100 font-bold"
                      placeholder="Ex: Tema Verão"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl h-fit self-end">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Definir como Padrão</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Aplica este estilo a todos os novos stories.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        formData.is_default ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_default ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CORES & FONTES */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">2. Cores & Tipografia</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Cor Principal</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Cor Secundária</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Cor do Texto</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.text_color}
                        onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={formData.text_color}
                        onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Cor do Botão</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.button_color}
                        onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={formData.button_color}
                        onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Fonte do Texto</label>
                    <select
                      value={formData.font_family}
                      onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none"
                    >
                      <option value="Inter, sans-serif">Inter (Moderna)</option>
                      <option value="'Montserrat', sans-serif">Montserrat (Esportiva / Negrito)</option>
                      <option value="'Playfair Display', serif">Playfair (Sofisticada / Luxo)</option>
                      <option value="'Roboto Mono', monospace">Roboto Mono (Tech / Digital)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Arredondamento das Bordas</label>
                    <select
                      value={formData.border_radius}
                      onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none"
                    >
                      <option value="0px">Quadrado Reto (0px)</option>
                      <option value="8px">Levemente Arredondado (8px)</option>
                      <option value="16px">Arredondado Moderno (16px)</option>
                      <option value="28px">Super Arredondado (28px)</option>
                      <option value="9999px">Oval / Cápsula (Total)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: WIDGET FLUTUANTE */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">3. Aparência do Widget Flutuante</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Formato do Widget</label>
                    <select
                      value={formData.widget_shape}
                      onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-200"
                    >
                      <option value="circle">Circular</option>
                      <option value="rounded">Quadrado Arredondado</option>
                      <option value="rectangle">Retangular / Retrato</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Tamanho do Widget</label>
                    <select
                      value={formData.widget_size}
                      onChange={(e) => setFormData({ ...formData, widget_size: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-200"
                    >
                      <option value="small">Pequeno (56px)</option>
                      <option value="medium">Médio (80px)</option>
                      <option value="large">Grande (96px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Animação de Destaque</label>
                    <select
                      value={formData.widget_animation}
                      onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-200"
                    >
                      <option value="none">Sem Animação (Estático)</option>
                      <option value="bounce">Bounce (Pulo Suave)</option>
                      <option value="pulse">Pulse (Aura Piscando)</option>
                      <option value="fade">Fade (Surgimento)</option>
                      <option value="slide">Slide (Deslocamento)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CARROSSEL DE STORIES */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">4. Carrossel de Stories</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Espaçamento / Gap (px)</label>
                    <input
                      type="number"
                      min="4"
                      max="48"
                      value={formData.carousel_gap}
                      onChange={(e) => setFormData({ ...formData, carousel_gap: Number(e.target.value) || 16 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-100 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Itens Visíveis no Desktop</label>
                    <select
                      value={formData.carousel_visible_items}
                      onChange={(e) => setFormData({ ...formData, carousel_visible_items: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-200"
                    >
                      <option value={2}>2 Vídeos</option>
                      <option value={3}>3 Vídeos</option>
                      <option value={4}>4 Vídeos</option>
                      <option value={5}>5 Vídeos</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl h-fit self-end">
                    <span className="text-xs font-semibold text-slate-200">Mostrar Botão Play</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, show_play_button: !formData.show_play_button })}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0 ${
                        formData.show_play_button ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        formData.show_play_button ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Exibir Título nos Balões</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Mostra nome do story abaixo da bolinha.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, show_title: !formData.show_title })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        formData.show_title ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.show_title ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Sombra Projetada</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Aplica efeito 3D de relevo no widget.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shadow_enabled: !formData.shadow_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                        formData.shadow_enabled ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.shadow_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 5: MODAL PLAYER & COMPARTILHAR */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">5. Player Interativo & Modal</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Botão de Curtir</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Mostra o botão de coração no player.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, show_like_button: !formData.show_like_button })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.show_like_button ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.show_like_button ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Caixa de Comentários</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Permite ao cliente enviar perguntas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, show_comment_button: !formData.show_comment_button })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.show_comment_button ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.show_comment_button ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Botão Compartilhar *</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Mostra o botão de copiar link no player.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, show_share_button: !formData.show_share_button })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.show_share_button ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.show_share_button ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200">Atalho WhatsApp</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Inicia conversa direta de vendas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, show_whatsapp_button: !formData.show_whatsapp_button })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.show_whatsapp_button ? 'bg-violet-600' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.show_whatsapp_button ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SAVE FORM ACTIONS */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  Salvar Estilo
                </button>
              </div>
            </form>

            {/* COLUMN 2: REAL-TIME INTERACTIVE LIVE PREVIEW (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative flex flex-col justify-between min-h-[580px]">
                
                {/* PREVIEW TAB SELECTOR */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-black uppercase text-slate-400">Live Preview Real-time</span>
                  </div>

                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-black uppercase px-2 py-0.5 rounded-md">Ativo</span>
                </div>

                <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 mb-6">
                  {(['widget', 'carousel', 'player'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPreviewTab(tab)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                        previewTab === tab
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {tab === 'widget' ? 'Widget Fixo' : tab === 'carousel' ? 'Carrossel' : 'Player Modal'}
                    </button>
                  ))}
                </div>

                {/* DYNAMIC SCREEN SIMULATION CANVAS */}
                <div className="flex-1 bg-slate-950 rounded-2xl p-6 flex flex-col justify-center items-center border border-slate-850 overflow-hidden relative">
                  
                  {/* TAB 1: WIDGET FLUTUANTE PREVIEW */}
                  {previewTab === 'widget' && (
                    <div key={animTriggerKey} className="flex flex-col items-center justify-center space-y-4 text-center custom-preview-font">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Simulação do Balão Flutuante</p>
                      
                      <div
                        className={cn(
                          "relative p-[3px] transition-all duration-300 flex items-center justify-center shrink-0",
                          getWidgetSizeClasses(),
                          getWidgetShapeClasses(),
                          getWidgetAnimationClasses()
                        )}
                        style={{
                          background: `linear-gradient(45deg, ${formData.primary_color}, ${formData.secondary_color})`,
                          boxShadow: formData.shadow_enabled ? '0 10px 25px -3px rgba(0, 0, 0, 0.4)' : 'none'
                        }}
                      >
                        <div
                          className={cn(
                            "w-full h-full border-[3px] border-slate-950 overflow-hidden relative bg-slate-800",
                            getWidgetShapeClasses()
                          )}
                          style={{ borderRadius: formData.widget_shape === 'circle' ? '9999px' : formData.widget_shape === 'rounded' ? '18px' : '12px' }}
                        >
                          <img
                            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80"
                            alt="Preview thumb"
                            className="w-full h-full object-cover"
                          />
                          {formData.show_play_button && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white opacity-90" />
                            </div>
                          )}
                        </div>
                      </div>

                      {formData.show_title && (
                        <span className="text-xs font-extrabold block truncate max-w-[120px] transition-colors" style={{ color: formData.text_color }}>
                          Vestido Verão 🌴
                        </span>
                      )}

                      <div className="pt-4 border-t border-slate-900 w-full mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setAnimTriggerKey(p => p + 1)}
                          className="text-[9px] text-violet-400 font-black uppercase hover:underline"
                        >
                          Simular Entrada novamente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CARROSSEL PREVIEW */}
                  {previewTab === 'carousel' && (
                    <div className="w-full space-y-4 custom-preview-font">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">Preview do Carrossel de Stories (Horizontal)</p>
                      
                      {/* Grid representation adapting dynamically to user gap and visible count values */}
                      <div
                        className="flex overflow-hidden pb-4 justify-center"
                        style={{ gap: `${formData.carousel_gap}px` }}
                      >
                        {Array.from({ length: formData.carousel_visible_items }).map((_, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center shrink-0"
                          >
                            <div
                              className="w-14 h-14 p-[2px] transition-all"
                              style={{
                                background: `linear-gradient(45deg, ${formData.primary_color}, ${formData.secondary_color})`,
                                borderRadius: formData.carousel_card_shape === 'rounded' ? '16px' : '0px',
                                boxShadow: formData.shadow_enabled ? '0 4px 10px rgba(0,0,0,0.2)' : 'none'
                              }}
                            >
                              <div
                                className="w-full h-full bg-slate-900 overflow-hidden relative"
                                style={{
                                  borderRadius: formData.carousel_card_shape === 'rounded' ? '14px' : '0px'
                                }}
                              >
                                <img
                                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&q=80"
                                  alt="Thumb"
                                  className="w-full h-full object-cover"
                                />
                                {formData.show_play_button && (
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <Play className="w-4 h-4 text-white fill-white opacity-85" />
                                  </div>
                                )}
                              </div>
                            </div>
                            {formData.show_title && (
                              <span className="text-[9px] font-bold text-slate-400 mt-1 max-w-[50px] truncate text-center block">Story #{idx + 1}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl space-y-1.5 text-[11px] text-slate-400 text-center">
                        <p>Gap configurado: <span className="font-mono text-violet-400 font-bold">{formData.carousel_gap}px</span></p>
                        <p>Cards visíveis no desktop: <span className="font-mono text-violet-400 font-bold">{formData.carousel_visible_items} itens</span></p>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PLAYER / MODAL PREVIEW */}
                  {previewTab === 'player' && (
                    <div className="w-full max-w-[240px] aspect-[9/16] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative flex flex-col justify-between p-4 custom-preview-font">
                      {/* Top Header */}
                      <div className="flex items-center justify-between z-10 text-white">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center text-[8px] font-bold">U</div>
                          <span className="text-[9px] font-bold text-slate-200">Useanny</span>
                        </div>
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Mock background content representing playing video */}
                      <div className="absolute inset-0 -z-10 bg-slate-900">
                        <img
                          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=350&q=80"
                          alt="Video playing mock"
                          className="w-full h-full object-cover opacity-60"
                        />
                      </div>

                      {/* Vertical Action Buttons layout with toggle items */}
                      <div className="absolute right-3 bottom-16 z-20 flex flex-col gap-2.5">
                        
                        {formData.show_like_button && (
                          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-black/60 transition-all">
                            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                          </div>
                        )}

                        {formData.show_comment_button && (
                          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-black/60 transition-all">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                        )}

                        {/* REACTIVE TO SHOW_SHARE_BUTTON OPTION */}
                        {formData.show_share_button && (
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-md cursor-pointer hover:scale-105 transition-all">
                            <Share2 className="w-4 h-4" />
                          </div>
                        )}

                        {formData.show_whatsapp_button && (
                          <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 transition-all">
                            <WhatsAppIcon size={18} />
                          </div>
                        )}

                      </div>

                      {/* Bottom Call to action link representation */}
                      {formData.show_product && (
                        <div
                          className="w-full py-2 px-3 bg-white text-slate-900 rounded-xl text-center shadow-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          style={{ backgroundColor: formData.button_color }}
                        >
                          <span style={{ color: formData.text_color }}>Comprar Agora</span>
                        </div>
                      )}

                    </div>
                  )}

                </div>

              </div>
            </div>

          </div>
        ) : (
          /* TEMPLATE LIST VIEW */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-850 flex items-center gap-2">
              <Brush className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-bold text-base text-slate-100">Estilos Cadastrados ({appearances.length})</h3>
                <p className="text-xs text-slate-400">Modelos Visuais de carrosséis e widgets salvos no banco de dados.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] md:text-xs tracking-wider">
                    <th className="p-4 pl-6">Nome do Estilo</th>
                    <th className="p-4 text-center">Cor Principal</th>
                    <th className="p-4 text-center">Formato Widget</th>
                    <th className="p-4 text-center">Animação</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {appearances.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 border border-slate-800 shadow-md"
                            style={{ background: `linear-gradient(135deg, ${app.primary_color}, ${app.secondary_color || '#EC4899'})` }}
                          />
                          <div>
                            <span className="text-slate-100 font-bold block text-sm md:text-base">{app.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-medium block">ID: {app.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono text-xs text-slate-400">
                        {app.primary_color}
                      </td>

                      <td className="p-4 text-center font-bold text-slate-200 capitalize">
                        {app.widget_shape === 'rounded' ? 'Quadrado Arredondado' : app.widget_shape === 'rectangle' ? 'Retangular' : 'Circular'}
                      </td>

                      <td className="p-4 text-center font-mono text-xs text-violet-400 uppercase font-bold">
                        {app.widget_animation || 'none'}
                      </td>

                      <td className="p-4 text-center">
                        {app.is_default ? (
                          <span className="inline-flex items-center gap-1.5 bg-violet-600/10 text-violet-400 border border-violet-500/20 px-2.5 py-1 rounded-full text-xs font-black uppercase">
                            <Star className="w-3 h-3 fill-violet-400" /> Padrão da Loja
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(app.id)}
                            className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hover:text-slate-300 transition-colors"
                          >
                            Tornar Padrão
                          </button>
                        )}
                      </td>

                      <td className="p-4 pr-6 text-right space-x-1 whitespace-nowrap">
                        <div className="inline-flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                          <button
                            onClick={() => handleEdit(app)}
                            className="p-1.5 rounded-lg hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"
                            title="Editar Template"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(app)}
                            className="p-1.5 rounded-lg hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"
                            title="Duplicar Template"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText="Confirmar"
        cancelText="Voltar"
      />
    </div>
  );
};

export default AppearancePage;