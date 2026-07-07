import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store } from '@/lib/db';
import { ArrowLeft, ExternalLink, Film, Image, Link as LinkIcon, Save, X, Edit3, ToggleLeft, ToggleRight, Eye as EyeIcon, MousePointerClick } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    video_url: "",
    thumbnail_url: "",
    cta_link: "",
    active: true,
    position: 1,
    view_count: 0,
    click_count: 0,
  });

  const loadStoryDetails = async () => {
    try {
      const stores = await db.getStores();
      const mainStore = stores[0];

      setStore(mainStore);

      if (!mainStore) {
        setStory(null);
        return;
      }

      const fetchedStories = await db.getStories(mainStore.id);
      const currentStory = fetchedStories.find((item) => item.id === id);

      setStory(currentStory || null);

      if (currentStory) {
        setFormData({
          title: currentStory.title,
          video_url: currentStory.video_url,
          thumbnail_url: currentStory.thumbnail_url,
          cta_link: currentStory.cta_link || "",
          active: currentStory.active,
          position: currentStory.position,
          view_count: currentStory.view_count || 0,
          click_count: currentStory.click_count || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do story:', error);
      showError('Erro ao carregar os detalhes do story.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoryDetails();
  }, [id]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch (e) {
      return false;
    }
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!story || isSaving) return;

    if (!formData.title.trim()) {
      showError('Por favor, preencha o título do story.');
      return;
    }
    if (!formData.video_url.trim() || !isValidUrl(formData.video_url)) {
      showError('Por favor, forneça uma URL de vídeo válida (começando com http/https).');
      return;
    }
    if (!formData.thumbnail_url.trim() || !isValidUrl(formData.thumbnail_url)) {
      showError('Por favor, forneça uma URL de thumbnail válida (começando com http/https).');
      return;
    }
    if (formData.cta_link.trim() && !isValidUrl(formData.cta_link)) {
      showError('Por favor, forneça uma URL de CTA válida (começando com http/https) ou deixe em branco.');
      return;
    }

    try {
      setIsSaving(true);

      const updatedStory: Story = {
        ...story,
        title: formData.title,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url,
        cta_link: formData.cta_link || undefined,
        active: formData.active,
        position: formData.position,
        view_count: formData.view_count,
        click_count: formData.click_count,
        updated_at: new Date().toISOString(),
      };

      await db.saveStory(updatedStory);
      showSuccess('Story atualizado com sucesso!');
      setIsEditing(false);
      await loadStoryDetails(); // Recarrega os dados para atualizar a UI
    } catch (error) {
      console.error("Erro ao salvar story:", error);
      showError("Erro ao salvar alterações do story.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (story) {
      setFormData({
        title: story.title,
        video_url: story.video_url,
        thumbnail_url: story.thumbnail_url,
        cta_link: story.cta_link || "",
        active: story.active,
        position: story.position,
        view_count: story.view_count || 0,
        click_count: story.click_count || 0,
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-sm text-slate-500 font-medium">
          Carregando detalhes do story...
        </p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-4" />

            <h1 className="text-2xl font-bold text-slate-900">
              Story não encontrado
            </h1>

            <p className="text-slate-500 text-sm mt-2 mb-6">
              Não encontramos nenhum story com este identificador.
            </p>

            <Link
              to="/stories"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Stories
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-violet-600">
              Detalhes do Story
            </p>

            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-transparent border-b border-slate-200 focus:outline-none focus:border-violet-500 text-3xl font-bold text-slate-900"
                />
              ) : (
                story.title
              )}
            </h1>

            <p className="text-slate-500 mt-1">
              {isEditing ? "Edite as informações do story abaixo." : "Visualize as informações cadastradas para este story."}
            </p>
          </div>

          <div className="flex gap-3 self-start sm:self-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all"
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSaveStory}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-100 transition-all"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all self-start sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar Story
                </button>
                <Link
                  to="/stories"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all self-start sm:self-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="relative aspect-[9/16] bg-slate-900">
              <img
                src={isEditing ? formData.thumbnail_url : story.thumbnail_url}
                alt={isEditing ? formData.title : story.title}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

              <div className="absolute top-4 right-4">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm transition-all ${
                      formData.active
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                    }`}
                  >
                    {formData.active ? 'Ativo' : 'Inativo'}
                  </button>
                ) : (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm ${
                      story.active
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-500/90 text-white'
                    }`}
                  >
                    {story.active ? 'Ativo' : 'Inativo'}
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-lg font-bold">{isEditing ? formData.title : story.title}</p>
                <p className="text-white/70 text-xs mt-1">
                  Posição #{isEditing ? formData.position : story.position}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">
                Informações principais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    ID
                  </p>
                  <p className="mt-2 text-sm font-mono text-slate-800 break-all">
                    {story.id}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  {isEditing ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          formData.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <span>{formData.active ? 'Ativo' : 'Inativo'}</span>
                        {formData.active ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.active ? 'Ativo' : 'Inativo'}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Posição
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: Number(e.target.value) }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      #{story.position}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Loja
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800 break-all">
                    {store?.name || story.store_id}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Visualizações
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={formData.view_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, view_count: Number(e.target.value) }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.view_count || 0}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cliques no CTA
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      value={formData.click_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, click_count: Number(e.target.value) }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-medium text-slate-800"
                    />
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {story.click_count || 0}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">
                Links cadastrados
              </h2>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Film className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      URL do Vídeo
                    </p>
                  </div>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://example.com/video.mp4"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                    />
                  ) : (
                    <a
                      href={story.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                    >
                      {story.video_url}
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      URL da Thumbnail
                    </p>
                  </div>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                      placeholder="https://example.com/thumbnail.jpg"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                    />
                  ) : (
                    <a
                      href={story.thumbnail_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                    >
                      {story.thumbnail_url}
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Link de Compra / CTA
                    </p>
                  </div>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.cta_link}
                      onChange={(e) => setFormData(prev => ({ ...prev, cta_link: e.target.value }))}
                      placeholder="https://example.com/product"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-mono text-slate-800"
                    />
                  ) : story.cta_link ? (
                    <a
                      href={story.cta_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                    >
                      {story.cta_link}
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">Nenhum link de CTA cadastrado.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StoryDetailsPage;