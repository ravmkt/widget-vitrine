"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Video } from '@/lib/db';
import { X, MousePointer2 } from 'lucide-react';

const StoryPreviewPage = () => {
  const { id } = useParams();
  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const stores = await db.stores.getAll();
        const store = stores[0];
        if (!store) return;

        const allStories = await db.stories.getAll(store.id);
        const current = allStories.find(s => s.id === id) || null;
        setStory(current);

        const relations = await db.storyVideos.getAll();
        const storyVideoIds = relations
          .filter(r => r.story_id === id)
          .sort((a, b) => a.position - b.position)
          .map(r => r.video_id);
        const allVideos = await db.videos.getAll();
        const storyVideos = storyVideoIds
          .map(vid => allVideos.find(v => v.id === vid))
          .filter(Boolean) as Video[];
        setVideos(storyVideos);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Carregando...</div>;
  }

  if (!story) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Story não encontrado</div>;
  }

  const activeVideo = videos[activeVideoIdx];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] aspect-[9/16] bg-black rounded-[40px] overflow-hidden relative shadow-2xl">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <span className="text-white font-bold text-sm truncate">{story.title}</span>
          <button
            onClick={() => window.close()}
            className="text-white bg-black/40 rounded-full p-1 hover:bg-black/60"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Vídeo ativo */}
        {activeVideo ? (
          <video
            key={activeVideo.id}
            src={activeVideo.video_url}
            poster={activeVideo.thumbnail_url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            muted
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
            Sem vídeos vinculados
          </div>
        )}

        {/* Miniaturas de navegação */}
        {videos.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex gap-2 justify-center overflow-x-auto px-4">
            {videos.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setActiveVideoIdx(idx)}
                className={`w-12 h-12 rounded-full overflow-hidden border-2 shrink-0 ${
                  idx === activeVideoIdx ? 'border-white' : 'border-transparent opacity-70'
                }`}
              >
                <img src={v.thumbnail_url} className="w-full h-full object-cover" alt={v.title} />
              </button>
            ))}
          </div>
        )}

        {/* Indicador de CTA */}
        {story.cta_enabled && (
          <div className="absolute bottom-20 left-4 right-4 z-10">
            <div className="flex items-center gap-2 text-white text-xs font-bold bg-black/40 rounded-xl px-3 py-2 w-fit">
              <MousePointer2 size={14} />
              {story.cta_text || 'Comprar Agora'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryPreviewPage;