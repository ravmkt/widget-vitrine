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
import CustomDialog from '@/components/CustomDialog';

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
            <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Módulo Aparência
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Configure as cores, bordas, botões e comportamento do seu widget para harmonizar com sua marca.
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

        {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-fade-in">
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
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm md:text-base text-slate-100 font-bold"
                    placeholder="Ex: Tema Especial..."
                  />
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
                    </div>
                  </div>
                </div>
              </div>

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
                  Salvar
                </button>
              </div>
            </form>
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
      />
    </div>
  );
};

export default AppearancePage;