import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Store } from '@/lib/db';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const StoriesWidgetPage = () => {
  const { storeId } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedStory =
    selectedIndex !== null ? stories[selectedIndex] : null;

  const loadWidgetData = async () => {
    try {
      if (!storeId) return;

      const stores = await db.getStores();
      const currentStore = stores.find((item) => item.id === storeId) || null;

      setStore(currentStore);

      if (!currentStore) {
        setStories([]);
        return;
      }

      const fetchedStories = await db.getStories(currentStore.id);

      const activeStories = fetchedStories
        .filter((story) => story.active)
        .sort((a, b) => a.position - b.position);

      setStories(activeStories);
    } catch (error) {
      console.error('Erro ao carregar widget de stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgetData();
  }, [storeId]);

  const handlePrevious = () => {
    if (selectedIndex === null) return;

    if (selectedIndex === 0) {
      setSelectedIndex(stories.length - 1);
      return;
    }

    setSelectedIndex(selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;

    if (selectedIndex === stories.length - 1) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex(selectedIndex + 1);
  };

  if (loading) {
    return (
      <div className="w-full min-h-[120px] flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!store || stories.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-transparent">
      <div className="w-full overflow-x-auto">
        <div className="flex items-start gap-4 px-4 py-3">
          {stories.map((story, index) => (
            <button
              key={story.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-orange-400 shadow-sm">
                <div className="w-full h-full rounded-full bg-white p-[3px]">
                  <img
                    src={story.thumbnail_url}
                    alt={story.title}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </div>

              <span className="max-w-[88px] text-xs font-semibold text-slate-700 truncate">
                {story.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedStory && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            aria-label="Fechar story"
          >
            <X className="w-5 h-5" />
          </button>

          {stories.length > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              aria-label="Story anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl">
            <video
              key={selectedStory.id}
              src={selectedStory.video_url}
              poster={selectedStory.thumbnail_url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
              <p className="text-white font-bold text-sm">
                {selectedStory.title}
              </p>
              <p className="text-white/60 text-xs">
                {store.name}
              </p>
            </div>

            {selectedStory.cta_link && (
              <div className="absolute bottom-5 left-5 right-5">
                <a
                  href={selectedStory.cta_link}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all"
                >
                  Comprar agora
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {stories.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              aria-label="Próximo story"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StoriesWidgetPage;
