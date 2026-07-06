import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store } from '@/lib/db';
import { ArrowLeft, Save, Trash2, Play, Eye, Link as LinkIcon, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const StoryDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadStory = async () => {
      if (!id) return;
      try {
        const stores = await db.getStores();
        const mainStore = stores[0];
        if (mainStore) {
          const stories = await db.getStories(mainStore.id);
          const foundStory = stories.find(s => s.id === id);
          if (foundStory) {
            setStory(foundStory);
          } else {
            showError('Story não encontrado.');
            navigate('/stories');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar story:', error);
        showError('Erro ao carregar os detalhes do story.');
      } finally {
        setLoading(false);
      }
    };

    loadStory();
  }, [id, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story) return;

    setSaving(true);
    try {
      await db.saveStory(story);
      showSuccess('Story atualizado com sucesso!');
      navigate('/stories');
    } catch (error) {
      showError('Erro ao salvar as alterações do story.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!story) return;
    if (window.confirm('Tem certeza que deseja excluir este story permanentemente?')) {
      try {
        await db.deleteStory(story.id);
        showSuccess('Story excluído com sucesso!');
        navigate('/stories');
      } catch (error) {
        showError('Erro ao excluir o story.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">Carregando detalhes do story...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600 font-medium">Story não encontrado.</p>
        <Link to="/stories" className="text-violet-600 hover:underline font-semibold">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/stories"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Stories
          </Link>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Story
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Edição */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-800">Editar Detalhes do Story</h3>
              </div>

              <div className="space-y-5">
                {/* Título */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Título do Story
                  </label>
                  <input
                    type="text"
                    required
                    value={story.title}
                    onChange={(e) => setStory({ ...story, title: e.target.value })}
                    placeholder="Ex: Nova Coleção Outono 🍂"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                  />
                </div>

                {/* URL do Vídeo */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL do Vídeo (MP4)
                  </label>
                  <input
                    type="url"
                    required
                    value={story.video_url}
                    onChange={(e) => setStory({ ...story, video_url: e.target.value })}
                    placeholder="https://exemplo.com/video.mp4"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                  />
                </div>

                {/* URL da Thumbnail */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    URL da Imagem de Capa (Thumbnail)
                  </label>
                  <input
                    type="url"
                    required
                    value={story.thumbnail_url}
                    onChange={(e) => setStory({ ...story, thumbnail_url: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                  />
                </div>

                {/* Link de Compra (CTA) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Link de Compra / Redirecionamento (CTA)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={story.cta_link || ''}
                      onChange={(e) => setStory({ ...story, cta_link: e.target.value })}
                      placeholder="https://useanny.com.br/produtos/vestido"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Posição e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Ordem de Exibição (Posição)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={story.position}
                      onChange={(e) => setStory({ ...story, position: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Status de Ativação
                    </label>
                    <button
                      type="button"
                      onClick={() => setStory({ ...story, active: !story.active })}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        story.active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span>{story.active ? 'Ativo no Widget' : 'Inativo / Rascunho'}</span>
                      {story.active ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Preview do Story */}
          <div className="flex flex-col items-center">
            <div className="sticky top-24 w-full max-w-[320px]">
              <div className="text-center mb-4">
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Preview do Player
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">Visualização do Vídeo</h3>
              </div>

              <div className="relative w-full aspect-[9/16] bg-slate-950 rounded-[32px] border-[8px] border-slate-900 shadow-2xl overflow-hidden flex flex-col justify-between p-4">
                {/* Progress Bar */}
                <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden mt-2">
                  <div className="bg-white h-full w-1/3 animate-[pulse_1.5s_infinite]"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between text-white mt-2 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-[10px]">
                      U
                    </div>
                    <span className="text-xs font-bold truncate max-w-[150px]">{story.title || 'Sem título'}</span>
                  </div>
                </div>

                {/* Video Container */}
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  {story.video_url ? (
                    <video
                      key={story.video_url}
                      src={story.video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Play className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Insira uma URL de vídeo válida para visualizar</p>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pb-2 z-10">
                  <button
                    type="button"
                    className="w-full py-2.5 rounded-xl text-white text-xs font-bold shadow-lg hover:opacity-90 transition-opacity bg-violet-600"
                  >
                    Comprar Agora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoryDetailsPage;