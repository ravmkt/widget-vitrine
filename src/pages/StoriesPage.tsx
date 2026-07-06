import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { db, Story, Store } from '@/lib/supabase';
import { Plus, Trash2, Edit2, Eye, EyeOff, ArrowUp, ArrowDown, Film, Sparkles, Check, X } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const StoriesPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do Formulário de Criação/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    thumbnail_url: '',
    active: true,
    position: 0,
  });

  const loadStories = async () => {
    try {
      const stores = await db.getStores();
      const mainStore = stores[0];
      setStore(mainStore);

      if (mainStore) {
        const fetchedStories = await db.getStories(mainStore.id);
        setStories(fetchedStories);
      }
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingStory(null);
    setFormData({
      title: '',
      video_url: '',
      thumbnail_url: '',
      active: true,
      position: stories.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (story: Story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      video_url: story.video_url,
      thumbnail_url: story.thumbnail_url,
      active: story.active,
      position: story.position,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (story: Story) => {
    try {
      const updated = { ...story, active: !story.active };
      await db.saveStory(updated);
      showSuccess(`Story ${updated.active ? 'ativado' : 'desativado'} com sucesso!`);
      loadStories();
    } catch (error) {
      showError('Erro ao atualizar status do story.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este story?')) {
      try {
        await db.deleteStory(id);
        showSuccess('Story excluído com sucesso!');
        loadStories();
      } catch (error) {
        showError('Erro ao excluir story.');
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newStories = [...stories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newStories.length) return;

    // Trocar posições
    const temp = newStories[index].position;
    newStories[index].position = newStories[targetIndex].position;
    newStories[targetIndex].position = temp;

    try {
      await Promise.all([
        db.saveStory(newStories[index]),
        db.saveStory(newStories[targetIndex])
      ]);
      showSuccess('Ordenação atualizada!');
      loadStories();
    } catch (error) {
      showError('Erro ao reordenar stories.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    try {
      const storyData: Story = {
        id: editingStory ? editingStory.id : Math.random().toString(36).substr(2, 9),
        store_id: store.id,
        title: formData.title,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url,
        active: formData.active,
        position: formData.position,
      };

      await db.saveStory(storyData);
      showSuccess(editingStory ? 'Story atualizado!' : 'Story criado com sucesso!');
      setIsModalOpen(false);
      loadStories();
    } catch (error) {
      showError('Erro ao salvar story.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gerenciar Stories</h1>
            <p className="text-slate-500 mt-1">
              Crie, edite e ordene os stories em vídeo exibidos na sua loja virtual.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar Story
          </button>
        </div>

        {/* Lista de Stories */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          </div>
        ) : stories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="bg-violet-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-violet-600">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Nenhum story cadastrado</h3>
            <p className="text-slate-500 mt-2">
              Comece adicionando seu primeiro vídeo de story para engajar seus clientes na Useanny.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-6 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Story
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Posição</th>
                    <th className="py-4 px-6">Thumbnail</th>
                    <th className="py-4 px-6">Título</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {stories.map((story, index) => (
                    <tr key={story.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Posição / Ordenação */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-6">{story.position}</span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleMove(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMove(index, 'down')}
                              disabled={index === stories.length - 1}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Thumbnail */}
                      <td className="py-4 px-6">
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative">
                          <img
                            src={story.thumbnail_url}
                            alt={story.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Título */}
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {story.title}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleActive(story)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            story.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {story.active ? (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Ativo
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Inativo
                            </>
                          )}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(story)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(story.id)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
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

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingStory ? 'Editar Story' : 'Adicionar Novo Story'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Título do Story
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Nova Coleção Outono 🍂"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  URL do Vídeo (MP4)
                </label>
                <input
                  type="url"
                  required
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://exemplo.com/video.mp4"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dica: Use links diretos de vídeos MP4 hospedados no Supabase Storage, Shopify, ou similares.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  URL da Thumbnail (Imagem)
                </label>
                <input
                  type="url"
                  required
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                />
                <label htmlFor="active" className="text-sm font-semibold text-slate-700">
                  Ativar story imediatamente
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                >
                  {editingStory ? 'Salvar Alterações' : 'Criar Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesPage;