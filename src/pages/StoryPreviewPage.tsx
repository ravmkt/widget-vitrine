"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Story, Video, DisplayLocation } from '@/lib/db';
import { 
  ArrowBack, PlayCircle, Image, CheckCircle2, XCircle, 
  Layout, Layers, MousePointer2, Film, MapPin, Globe 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';

const StoryPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stores = await db.stores.getAll();
        const mainStore = stores[0];
        if (!mainStore) return;

        const storyData = await db.stories.getAll(mainStore.id);
        const currentStory = storyData.find((s: any) => s.id === id);
        if (!currentStory) {
          navigate('/stories');
          return;
        }
        setStory(currentStory);

        const storyVideos = await db.storyVideos.getAll();
        const relations = storyVideos
          .filter((sv: any) => sv.story_id === id)
          .sort((a: any, b: any) => a.position - b.position);
        const videoIds = relations.map((rv: any) => rv.video_id);
        const videosData = await db.videos.getAll(mainStore.id);
        const videosMap = new Map();
        videosData.forEach((v: any) => videosMap.set(v.id, v));
        const videosList = videoIds.map((vid) => videosMap.get(vid) || null).filter(Boolean);
        setVideos(videosList);

        const locations = await db.displayLocations.getAll();
        const locationForStory = locations.find((l: any) => l.story_id === id);
        setLocation(locationForStory || null);
      } catch (error) {
        showSuccess('Erro ao carregar preview.');
        navigate('/stories');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" /></div>;

  if (!story) return null;

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'floating_widget': return 'Widget Fixo';
      case 'carousel': return 'Carrossel';
      case 'grid': return 'Grade';
      default: return format;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
          <ArrowBack size={20} />
        </button>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {story.title}
        </h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Story Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-black text-slate-800">{story.title}</h3>
              <span className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                story.active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-200"
              )}>
                {story.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {story.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-[#0094EB] uppercase tracking-widest">
                <Layout size={14} /> {getFormatLabel(story.format)}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Film size={14} /> {videos.length} {videos.length === 1 ? 'Vídeo' : 'Vídeos'}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <MapPin size={14} /> {location?.selector || 'Página Inicial'}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex gap-8 lg:px-8 border-l border-slate-100 lg:border-slate-100 border-none">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Status</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-[#0094EB]" size={14} />
                <span className="text-lg font-black text-slate-800">{story.active ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Vídeos</p>
              <div className="flex items-center gap-2">
                <Eye className="text-[#0094EB]" size={14} />
                <span className="text-lg font-black text-slate-800">{videos.length}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Cliques</p>
              <div className="flex items-center gap-2">
                <MousePointer2 className="text-violet-500" size={14} />
                <span className="text-lg font-black text-slate-800">{story.click_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Preview */}
        <div className="mt-6">
          {videos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {videos.map((video, idx) => (
                <div key={video.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden border-2 transition-all group">
                  <img src={video.thumbnail_url} className="w-full h-full object-cover" />
                  <div className={cn("absolute inset-0 flex items-center justify-center transition-all", idx === 0 ? "bg-[#0094EB]/20" : "bg-black/20")}>
                    {idx === 0 ? (
                      <div className="bg-[#0094EB] text-white p-1 rounded-full"><CheckCircle2 size={16}/></div>
                    ) : (
                      <PlayCircle size={24} className="text-white" />
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-[9px] font-black text-white truncate">{video.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center bg-slate-950 rounded-[2rem] border border-slate-200">
              <span className="text-white text-sm font-bold">Nenhum vídeo vinculado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryPreviewPage;