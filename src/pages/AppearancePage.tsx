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
  Brush
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import WhatsAppIcon from '@/components/WhatsAppIcon';

const INITIAL_APPEARANCE_FORM = {
  name: 'Novo Estilo',
  is_default: false,
  primary_color: '#8B5CF6',
  secondary_color: '#EC4899',
  text_color: '#1e293b',
  background_color: '#f8fafc',
  button_color: '#8B5CF6',
  border_radius: '12px',
  shadow_enabled: true,
  font_family: 'Inter, sans-serif',
  widget_shape: 'rounded' as 'rounded' | 'square' | 'circle',
  widget_size: 'medium' as 'small' | 'medium' | 'large',
  widget_animation: 'bounce' as 'none' | 'fade' | 'slide' | 'bounce',
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
    setFormData({
      name: app.name,
      is_default: app.is_default,
      primary_color: app.primary_color,
      secondary_color: app.secondary_color,
      text_color: app.text_color,
      background_color: app.background_color,
      button_color: app.button_color,
      border_radius: app.border_radius,
      shadow_enabled: app.shadow_enabled,
      font_family: app.font_family,
      widget_shape: app.widget_shape,
      widget_size: app.widget_size,
      widget_animation: app.widget_animation,
      carousel_card_shape: app.carousel_card_shape,
      carousel_visible_items: app.carousel_visible_items,
      carousel_gap: app.carousel_gap,
      show_title: app.show_title,
      show_play_button: app.show_play_button,
      show_product: app.show_product,
      show_like_button: app.show_like_button,
      show_comment_button: app.show_comment_button,
      show_share_button: app.show_share_button,
      show_whatsapp_button: app.show_whatsapp_button,
      show_product_button: app.show_product_button,
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

  const handleDelete = async (id: string) => {
    const target = appearances.find(a => a.id === id);
    if (!target) return;
    
    if (target.is_default) {
      showError('Não é possível excluir o estilo padrão da loja.');
      return;
    }

    if (window.confirm(`Deseja mesmo excluir o estilo "${target.name}"?`)) {
      try {
        await db.appearances.delete(id);
        showSuccess('Estilo excluído com sucesso!');
        loadAppearances();
      } catch (e) {
        showError('Erro ao excluir o estilo.');
      }
    }
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-sm text-slate-400">Carregando módulo de aparência...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Módulo Aparência
            </h1>
            <p className="text-slate-400 mt-1">
              Configure as cores, bordas, botões e comportamento do seu widget para harmonizar com sua marca.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-600/10 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Criar novo template
            </button>
          )}
        </div>

        {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-8 max-h-[85vh] overflow-y-auto scrollbar-none shadow-2xl">
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

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">1. Dados básicos</h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Nome do template</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100"
                    placeholder="Ex: Tema Black Friday..."
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Definir como estilo padrão</p>
                    <p className="text-xs text-slate-400">Este tema será aplicado por padrão nos widgets da loja.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_default ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_default ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">2. Cores</h4>
                <div className="grid grid-cols-2 gap-4">
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
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
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
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
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
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">Cor de Fundo do Player</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5 font-medium">Cor do Botão de Compra</label>
                  <div className="flex gap-2 max-w-xs">
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
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">3. Estilo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Fonte</label>
                    <select
                      value={formData.font_family}
                      onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="'Roboto', sans-serif">Roboto</option>
                      <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                      <option value="system-ui, sans-serif">Sistema Padrão</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Borda Arredondada</label>
                    <select
                      value={formData.border_radius}
                      onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    >
                      <option value="4px">Pequeno (4px)</option>
                      <option value="8px">Médio (8px)</option>
                      <option value="12px">Padrão (12px)</option>
                      <option value="20px">Grande (20px)</option>
                      <option value="9999px">Totalmente Redondo</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Sombra Habilitada</p>
                    <p className="text-xs text-slate-400">Ativa efeito de relevo e profundidade em 3D.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shadow_enabled: !formData.shadow_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.shadow_enabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.shadow_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">4. Widget flutuante</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Formato do Widget</label>
                    <select
                      value={formData.widget_shape}
                      onChange={(e) => setFormData({ ...formData, widget_shape: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    >
                      <option value="circle">Circular (Bolas)</option>
                      <option value="rounded">Quadrado Arredondado</option>
                      <option value="square">Retangular / Quadrado seco</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Tamanho do Widget</label>
                    <select
                      value={formData.widget_size}
                      onChange={(e) => setFormData({ ...formData, widget_size: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    >
                      <option value="small">Pequeno (56px)</option>
                      <option value="medium">Médio (72px)</option>
                      <option value="large">Grande (96px)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-2 font-medium">Animação de Entrada/Destaque</label>
                  <select
                    value={formData.widget_animation}
                    onChange={(e) => setFormData({ ...formData, widget_animation: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                  >
                    <option value="bounce">Bounce (Pulos de atenção)</option>
                    <option value="fade">Pulse (Efeito de respirar)</option>
                    <option value="slide">Slide in</option>
                    <option value="none">Nenhuma animação</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">5. Carrossel de Stories</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Formato dos Cards</label>
                    <select
                      value={formData.carousel_card_shape}
                      onChange={(e) => setFormData({ ...formData, carousel_card_shape: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    >
                      <option value="rounded">Bordas Suaves</option>
                      <option value="square">Quadrado Inteiro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Espaçamento (gap)</label>
                    <input
                      type="number"
                      min="4"
                      max="48"
                      value={formData.carousel_gap}
                      onChange={(e) => setFormData({ ...formData, carousel_gap: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-2 font-medium">Vídeos Visíveis (Desktop)</label>
                    <input
                      type="number"
                      min="2"
                      max="6"
                      value={formData.carousel_visible_items}
                      onChange={(e) => setFormData({ ...formData, carousel_visible_items: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-medium"
                    />
                  </div>
                  <div className="space-y-2 pt-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_title}
                        onChange={(e) => setFormData({ ...formData, show_title: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs text-slate-300">Mostrar Título do Story</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_play_button}
                      onChange={(e) => setFormData({ ...formData, show_play_button: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Mostrar Ícone de Play</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_product}
                      onChange={(e) => setFormData({ ...formData, show_product: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Mostrar Capa do Produto</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-wider">6. Player e Modal</h4>
                <p className="text-xs text-slate-400">Ative ou oculte as ações interativas exibidas nas laterais do story player.</p>
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_like_button}
                      onChange={(e) => setFormData({ ...formData, show_like_button: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Botão de Curtir</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_comment_button}
                      onChange={(e) => setFormData({ ...formData, show_comment_button: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Botão de Comentar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_share_button}
                      onChange={(e) => setFormData({ ...formData, show_share_button: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Botão Compartilhar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_whatsapp_button}
                      onChange={(e) => setFormData({ ...formData, show_whatsapp_button: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Botão WhatsApp</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Estilo'}
                </button>
              </div>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-4">Pré-visualização</h3>
                <div className="flex border-b border-slate-800 mb-4">
                  {(['widget', 'carousel', 'player'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setPreviewTab(tab)}
                      className={`px-4 py-2 text-xs font-bold uppercase transition-all border-b-2 ${
                        previewTab === tab
                          ? 'border-violet-500 text-violet-400'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-950 rounded-2xl p-8 flex items-center justify-center min-h-[300px] border border-slate-800/60">
                  {previewTab === 'widget' && (
                    <div className="flex flex-col items-center">
                      <div
                        className="p-[3px] transition-transform duration-300"
                        style={{
                          background: `linear-gradient(45deg, ${formData.primary_color}, ${formData.secondary_color})`,
                          borderRadius: formData.widget_shape === 'circle' ? '50%' : formData.widget_shape === 'rounded' ? '14px' : '2px',
                          boxShadow: formData.shadow_enabled ? '0 10px 15px -3px rgba(0,0,0,0.3)' : 'none'
                        }}
                      >
                        <div
                          className="bg-slate-950 p-[3px]"
                          style={{
                            borderRadius: formData.widget_shape === 'circle' ? '50%' : formData.widget_shape === 'rounded' ? '12px' : '0px',
                          }}
                        >
                          <div
                            className="overflow-hidden bg-slate-800"
                            style={{
                              width: formData.widget_size === 'small' ? '56px' : formData.widget_size === 'medium' ? '72px' : '96px',
                              height: formData.widget_size === 'small' ? '56px' : formData.widget_size === 'medium' ? '72px' : '96px',
                              borderRadius: formData.widget_shape === 'circle' ? '50%' : formData.widget_shape === 'rounded' ? '10px' : '0px',
                            }}
                          >
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&q=80"
                              alt="thumb"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                      {formData.show_title && (
                        <span className="text-xs text-slate-300 mt-2 font-bold" style={{ fontFamily: formData.font_family }}>
                          Destaque
                        </span>
                      )}
                    </div>
                  )}

                  {previewTab === 'carousel' && (
                    <div className="flex gap-4 overflow-x-auto w-full max-w-sm justify-center">
                      {[1, 2].map(idx => (
                        <div
                          key={idx}
                          className="relative aspect-[9/16] w-[100px] overflow-hidden flex flex-col justify-end p-2 border border-slate-800"
                          style={{
                            borderRadius: formData.carousel_card_shape === 'rounded' ? '12px' : '0px',
                            boxShadow: formData.shadow_enabled ? '0 4px 10px rgba(0,0,0,0.4)' : 'none',
                            fontFamily: formData.font_family
                          }}
                        >
                          <img
                            src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150&q=80"
                            alt="Preview"
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                          {formData.show_title && (
                            <span className="text-[9px] font-bold text-white z-10 truncate">
                              Story #{idx}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {previewTab === 'player' && (
                    <div
                      className="w-full max-w-[240px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl relative border border-slate-800 flex flex-col justify-between p-4"
                      style={{ backgroundColor: formData.background_color, fontFamily: formData.font_family }}
                    >
                      <div className="absolute inset-0 overflow-hidden bg-slate-950">
                        <img
                          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80"
                          alt="Video"
                          className="w-full h-full object-cover opacity-60"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center z-10">
                        <span className="text-[9px] font-bold text-white">Live Preview</span>
                        <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center text-white text-[10px]">&times;</div>
                      </div>

                      <div className="absolute right-3 bottom-16 flex flex-col gap-2 z-10">
                        {formData.show_like_button && (
                          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
                            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                          </div>
                        )}
                        {formData.show_comment_button && (
                          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {formData.show_whatsapp_button && (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white cursor-pointer shadow-md">
                            <WhatsAppIcon size={16} />
                          </div>
                        )}
                      </div>

                      <div className="z-10 mt-auto">
                        <button
                          type="button"
                          className="w-full py-2 rounded-xl text-white text-[10px] font-bold transition-all shadow-lg"
                          style={{ backgroundColor: formData.button_color }}
                        >
                          Comprar Agora
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              <Brush className="w-5 h-5 text-violet-400" /> Modelos Salvos
            </h3>
            <span className="text-xs text-slate-400 font-medium">{appearances.length} estilos configurados</span>
          </div>

          {appearances.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Brush className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="font-bold">Nenhum template de aparência configurado.</p>
              <p className="text-sm text-slate-500 mt-1">Crie um novo para personalizar a experiência dos seus clientes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appearances.map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all relative group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-200">{app.name}</h4>
                      {app.is_default && (
                        <span className="bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-violet-400" /> Padrão
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5 my-4">
                      <span className="w-4 h-4 rounded-full border border-slate-800" style={{ backgroundColor: app.primary_color }} title="Cor Principal"></span>
                      <span className="w-4 h-4 rounded-full border border-slate-800" style={{ backgroundColor: app.secondary_color }} title="Cor Secundária"></span>
                      <span className="w-4 h-4 rounded-full border border-slate-800" style={{ backgroundColor: app.button_color }} title="Botão"></span>
                      <span className="w-4 h-4 rounded-full border border-slate-800" style={{ backgroundColor: app.background_color }} title="Fundo"></span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1.5 border-t border-slate-900 pt-3">
                      <p>Widget: <span className="text-slate-300 font-medium capitalize">{app.widget_shape === 'circle' ? 'Círculo' : 'Quadrado'} ({app.widget_size})</span></p>
                      <p>Carrossel: <span className="text-slate-300 font-medium capitalize">{app.carousel_card_shape === 'rounded' ? 'Arredondado' : 'Reto'} ({app.carousel_visible_items} itens)</span></p>
                      <p>Fonte: <span className="text-slate-300 font-mono text-[10px]">{app.font_family}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-900">
                    <button
                      onClick={() => handleEdit(app)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all flex-1 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>

                    <button
                      onClick={() => handleDuplicate(app)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {!app.is_default && (
                      <button
                        onClick={() => handleSetDefault(app.id)}
                        className="p-2 rounded-lg bg-slate-900 hover:bg-violet-600 text-slate-400 hover:text-white transition-all text-xs font-semibold"
                        title="Definir como padrão"
                      >
                        Padrão
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AppearancePage;