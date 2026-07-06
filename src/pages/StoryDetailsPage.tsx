import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { db, Story, Store } from '@/lib/db';
import { ArrowLeft, ExternalLink, Film, Image, Link as LinkIcon } from 'lucide-react';
import { showError } from '@/utils/toast';

const StoryDetailsPage = () => {
  const { id } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

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
              {story.title}
            </h1>

            <p className="text-slate-500 mt-1">
              Visualize as informações cadastradas para este story.
            </p>
          </div>

          <Link
            to="/stories"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="relative aspect-[9/16] bg-slate-900">
              <img
                src={story.thumbnail_url}
                alt={story.title}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm ${
                    story.active
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-slate-500/90 text-white'
                  }`}
                >
                  {story.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-lg font-bold">{story.title}</p>
                <p className="text-white/70 text-xs mt-1">
                  Posição #{story.position}
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
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {story.active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Posição
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    #{story.position}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Loja
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800 break-all">
                    {store?.name || story.store_id}
                  </p>
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

                  <a
                    href={story.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                  >
                    {story.video_url}
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      URL da Thumbnail
                    </p>
                  </div>

                  <a
                    href={story.thumbnail_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                  >
                    {story.thumbnail_url}
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>

                {story.cta_link && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="w-4 h-4 text-violet-600" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Link de Compra / CTA
                      </p>
                    </div>

                    <a
                      href={story.cta_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 break-all"
                    >
                      {story.cta_link}
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default StoryDetailsPage;
