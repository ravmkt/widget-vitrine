"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, Story, Video } from '@/lib/db';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ExternalLink,
  Smile,
  Check,
  Send,
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

const EMOJIS = ['😎', '👍', '👏', '😱', '🙏', '💪', '🔥', '❤️', '💙', '✨', '🎉', '✅', '⭐', '😢', '😡', '🤔', '👀', '😊', '🥰'];

declare global {
  interface Window {
    __STORY_LIKES__?: Record<string, { liked: boolean; count: number }>;
    __STORY_COMMENTS__?: Array<{ videoId: string; name: string; text: string; createdAt: string }>;
  }
}

const readComments = () => window.__STORY_COMMENTS__ || [];
const saveComments = (comments: Array<{ videoId: string; name: string; text: string; createdAt: string }>) => {
  window.__STORY_COMMENTS__ = comments;
};
const readLikes = () => window.__STORY_LIKES__ || {};
const saveLikes = (likes: Record<string, { liked: boolean; count: number }>) => {
  window.__STORY_LIKES__ = likes;
};

const getVideoUrl = (video?: Video | null) => video?.video_url || '';
const getVideoPosterUrl = (video?: Video | null) => video?.thumbnail_url || video?.poster_url || video?.image_url || '';
const getVideoLikeCount = (videoId?: string) => (videoId ? (readLikes()[videoId]?.count ?? 0) : 0);
const getVideoCommentCount = (videoId?: string) => (videoId ? readComments().filter((item) => item.videoId === videoId).length : 0);

const StoryPreviewPage = () => {
  console.log('RENDERING_PUBLIC_STORY_PREVIEW_NEW_VIEWER');

  const { id } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Array<{ videoId: string; name: string; text: string; createdAt: string }>>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [progress, setProgress] = useState(0);

  const currentVideo = videos[activeVideoIdx] || null;
  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);
  const commentCount = useMemo(() => getVideoCommentCount(currentVideo?.id), [currentVideo?.id, comments]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!id) return;
        const stores = await db.stores.getAll();
        const store = stores[0];
        if (!store) return;

        const allStories = await db.stories.getAll(store.id);
        const current = allStories.find((s) => s.id === id) || null;
        if (mounted) setStory(current);

        const storyVideos = await db.storyVideos.getAll();
        const allVideos = await db.videos.getAll();
        const relationVideos = storyVideos
          .filter((r) => r.story_id === id)
          .sort((a, b) => a.position - b.position)
          .map((r) => allVideos.find((v) => v.id === r.video_id))
          .filter(Boolean) as Video[];

        if (mounted) setVideos(relationVideos);
        if (mounted) setActiveVideoIdx(0);

        const genSettings = (await db.generalSettings.getAll(store.id))[0];
        if (mounted) setSettings(genSettings || null);

        const rels = await (db as any).storyProducts?.getAll?.();
        const relation = Array.isArray(rels) ? rels.find((item: any) => item.story_id === id && item.video_id === relationVideos[0]?.id) : null;
        if (relation?.product_id) {
          const prod = await db.products.getById(relation.product_id);
          if (mounted) setProduct(prod || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!currentVideo?.id) return;
    setLikeCount(getVideoLikeCount(currentVideo.id));
    const likes = readLikes();
    setLiked(Boolean(likes[currentVideo.id]?.liked));
    setComments(readComments().filter((item) => item.videoId === currentVideo.id));
    setProgress(0);
  }, [currentVideo?.id]);

  const close = () => window.history.length > 1 ? window.history.back() : (window.location.href = '/');

  const handleTogglePlay = async () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      await videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const handleLike = () => {
    if (!currentVideo?.id) return;
    const likes = readLikes();
    const current = likes[currentVideo.id] || { liked: false, count: 0 };
    const nextLiked = !current.liked;
    const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));
    likes[currentVideo.id] = { liked: nextLiked, count: nextCount };
    saveLikes(likes);
    setLiked(nextLiked);
    setLikeCount(nextCount);
  };

  const goNext = () => {
    if (activeVideoIdx < videos.length - 1) setActiveVideoIdx((v) => v + 1);
    else setActiveVideoIdx(0);
  };

  const goPrev = () => {
    if (activeVideoIdx > 0) setActiveVideoIdx((v) => v - 1);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/stories/preview/${id}?storyId=${id}&videoId=${currentVideo?.id || ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: story?.title || 'Story', text: 'Olha esse produto que lindo', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('Link copiado para compartilhar.');
      }
    } catch {
      showError('Erro ao compartilhar');
    }
  };

  const handleWhatsApp = () => {
    const phone = String(settings?.whatsapp_number || settings?.whatsapp || '').replace(/\D/g, '');
    const link = product?.product_url || `${window.location.origin}/stories/preview/${id}?storyId=${id}&videoId=${currentVideo?.id || ''}`;
    const message = `Quero mais informações sobre esse produto${product?.name ? `: ${product.name}` : ''}\n${link}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCommentSubmit = () => {
    const name = commentName.trim();
    const text = commentText.trim();
    if (!name || !text || !currentVideo?.id) return;
    const next = [...readComments(), { videoId: currentVideo.id, name, text, createdAt: new Date().toISOString() }];
    saveComments(next);
    setComments(next.filter((item) => item.videoId === currentVideo.id));
    setCommentText('');
    setCommentName('');
    showSuccess('Comentário enviado com sucesso.');
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = commentText.slice(0, start) + emoji + commentText.slice(end);
    setCommentText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [currentVideo?.id]);

  if (loading) {
    return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Carregando...</div>;
  }

  if (!story) {
    return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Story não encontrado</div>;
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-black flex items-center justify-center overflow-hidden">
      <div className="fixed left-0 top-0 z-[999999] bg-red-600 px-3 py-3 text-white text-[16px] font-black">
        NEW_STORY_VIEWER_ACTIVE_ROUTE_PREVIEW
      </div>
      <div className="relative h-full w-full max-w-[390px] overflow-hidden bg-black sm:aspect-[9/16] sm:max-h-[100dvh]">
        <div className="absolute left-4 right-4 top-3 z-[80] flex gap-1.5">
          {videos.map((video, idx) => (
            <div key={video.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className={cn(
                  'h-full rounded-full bg-white transition-all',
                  idx < activeVideoIdx ? 'w-full' : idx === activeVideoIdx ? 'bg-violet-400' : 'w-0'
                )}
                style={idx === activeVideoIdx ? { width: `${progress}%` } : undefined}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 top-0 z-[80] flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-5 pt-8">
          <div className="min-w-0 pr-16">
            <h3 className="truncate text-sm font-black text-white">{story.title}</h3>
            <p className="text-[10px] font-bold uppercase text-white/65">
              {story.title} • {activeVideoIdx + 1}/{videos.length || 1}
            </p>
          </div>
          <button type="button" onClick={close} className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentUrl ? (
          <video
            ref={videoRef}
            src={currentUrl}
            poster={posterUrl || undefined}
            autoPlay
            playsInline
            muted={muted}
            className="h-full w-full object-cover"
            onEnded={goNext}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/70">Nenhum vídeo vinculado</div>
        )}

        <button
          type="button"
          onClick={goPrev}
          className="absolute left-3 top-1/2 z-[85] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute right-3 top-1/2 z-[85] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
        >
          <ChevronRight className="h-7 w-7" />
        </button>

        <div className="absolute right-4 top-24 z-[90] flex flex-col gap-3">
          <button onClick={handleTogglePlay} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={handleToggleMute} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button onClick={handleLike} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md relative">
            <Heart className={cn('h-5 w-5', liked ? 'fill-rose-500 text-rose-500' : '')} />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">{likeCount}</span>
          </button>
          <button onClick={() => setShowComments(true)} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md relative">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">{commentCount}</span>
          </button>
          <button onClick={handleShare} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md">
            <Share2 className="h-5 w-5" />
          </button>
          <button onClick={handleWhatsApp} className="rounded-full bg-[#25D366] p-3 text-white backdrop-blur-md">
            WA
          </button>
        </div>

        {product && (
          <div className="absolute bottom-0 left-0 right-0 z-[80] bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10">
            <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/95 p-3">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-200">
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{product.name}</p>
                <p className="mt-1 text-base font-black text-violet-700">
                  {Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <a href={product.product_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-4 py-2 text-[11px] font-black text-white">
                  Ver produto <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {showComments && (
          <div className="absolute inset-0 z-[95] bg-black/85 p-4">
            <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-slate-950 p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-black">Comentários</h4>
                <button onClick={() => setShowComments(false)}>
                  <X />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-auto">
                {comments.map((item, index) => (
                  <div key={index} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-xs font-black text-white/70">{item.name}</p>
                    <p className="text-sm text-white">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <input value={commentName} onChange={(e) => setCommentName(e.target.value)} placeholder="Seu nome" className="w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none" />
                <div className="relative">
                  <textarea ref={textareaRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escreva seu comentário..." className="min-h-24 w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none" />
                  <button type="button" onClick={() => setShowEmoji((v) => !v)} className="absolute right-3 top-3 text-white"><Smile /></button>
                </div>
                {showEmoji && (
                  <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white/10 p-3 text-xl">
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}
                <button onClick={handleCommentSubmit} className="w-full rounded-2xl bg-violet-600 p-3 text-sm font-black text-white">
                  Enviar comentário
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2 left-3 z-[999999] text-[10px] font-black text-white/60">
          NEW_STORY_VIEWER_ACTIVE_ROUTE_PREVIEW
        </div>
      </div>
    </div>
  );
};

export default StoryPreviewPage;
