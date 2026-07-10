"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Ruler,
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

const getProduct = async (productId?: string | null) => {
  if (!productId) return null;
  const product = await db.products.getById(productId);
  return product || null;
};

const getModel = async (modelId?: string | null) => {
  if (!modelId) return null;
  const model = await db.sizingModels.getById(modelId);
  return model || null;
};

const StoryPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [model, setModel] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [progress, setProgress] = useState(0);
  const [modelModalOpen, setModelModalOpen] = useState(false);

  const currentVideo = videos[activeVideoIdx] || null;
  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);
  const commentCount = useMemo(() => getVideoCommentCount(currentVideo?.id), [currentVideo?.id, comments]);

  const loadLinkedData = async (currentStory: Story | null, currentVideoItem: Video | null) => {
    const relation: any = currentStory ? await (db as any).storyProducts?.getAll?.().then((rels: any[]) => rels?.find((item: any) => item.story_id === currentStory.id && item.video_id === currentVideoItem?.id)) : null;
    const productId = currentVideoItem && ((currentVideoItem as any).product_id || (currentVideoItem as any).productId || relation?.product_id || relation?.productId);
    const modelId = currentVideoItem && ((currentVideoItem as any).model_id || (currentVideoItem as any).modelId || (currentVideoItem as any).measurement_id || relation?.model_id || relation?.modelId);
    const [resolvedProduct, resolvedModel] = await Promise.all([getProduct(productId || null), getModel(modelId || null)]);
    setProduct(resolvedProduct);
    setModel(resolvedModel);
  };

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
    loadLinkedData(story, currentVideo);
  }, [currentVideo?.id]);

  const close = () => window.history.length > 1 ? window.history.back() : navigate('/');

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
    const shareUrl = window.location.href;
    const productName = product?.name || story?.title || 'Story';
    const message = `Olha que lindo esse "${productName}" ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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

  const modelData = model?.measures?.length ? model.measures : [];
  const bodyBottomOffset = product ? 'bottom-44' : 'bottom-24';

  return (
    <div className="fixed inset-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
      <div className="relative h-full w-full max-w-[430px] overflow-hidden bg-black sm:aspect-[9/16] sm:max-h-[90vh] sm:rounded-[36px]">
        <div className="absolute left-4 right-4 top-3 z-[80] flex gap-1.5">
          {videos.map((video, idx) => (
            <div key={video.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className={cn('h-full rounded-full bg-white transition-all', idx < activeVideoIdx ? 'w-full' : idx === activeVideoIdx ? 'bg-violet-400' : 'w-0')}
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

        <div className={`absolute right-4 top-16 z-[90] flex flex-col gap-3 ${bodyBottomOffset}`}>
          <button onClick={handleTogglePlay} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-black/55 p-0 text-white backdrop-blur-md">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={handleToggleMute} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-black/55 p-0 text-white backdrop-blur-md">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="flex flex-col items-center">
            <button onClick={handleLike} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-black/55 p-0 text-white backdrop-blur-md">
              <Heart className={cn('h-5 w-5', liked ? 'fill-rose-500 text-rose-500' : 'text-white')} />
            </button>
            <span className="mt-1 text-[10px] font-black text-white">{likeCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <button onClick={() => setShowComments(true)} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-black/55 p-0 text-white backdrop-blur-md">
              <MessageCircle className="h-5 w-5" />
            </button>
            <span className="mt-1 text-[10px] font-black text-white">{commentCount}</span>
          </div>
          <button onClick={handleShare} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-black/55 p-0 text-white backdrop-blur-md">
            <Share2 className="h-5 w-5" />
          </button>
          <button onClick={handleWhatsApp} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] p-0 text-white backdrop-blur-md">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
              <path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z" />
              <path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z" />
            </svg>
          </button>
          {model && (
            <button onClick={() => setModelModalOpen(true)} className="flex h-[52px] w-[52px] min-h-[52px] min-w-[52px] flex-shrink-0 items-center justify-center rounded-full bg-black/55 p-0 text-white backdrop-blur-md" title="Medidas" aria-label="Medidas">
              <Ruler className="h-5 w-5" />
            </button>
          )}
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
                <button
                  type="button"
                  onClick={() => window.open(product.product_url || '/products', '_blank', 'noopener,noreferrer')}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-4 py-2 text-[11px] font-black text-white"
                >
                  Ver produto <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {showComments && (
          <div className="absolute inset-0 z-[95] bg-black/85 p-4">
            <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-slate-950 p-4 text-white shadow-2xl">
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
                  <button type="button" onClick={() => setShowEmoji((v) => !v)} className="absolute right-3 top-3 text-white">
                    <Smile />
                  </button>
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

        {model && modelModalOpen && (
          <div className="absolute inset-0 z-[96] bg-black/85 p-4">
            <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medidas da modelo</p>
                  <h4 className="text-lg font-black">{model.name}</h4>
                </div>
                <button onClick={() => setModelModalOpen(false)} className="rounded-full bg-slate-100 p-2">
                  <X />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-auto">
                {(modelData || []).map((measure: any, idx: number) => (
                  <div key={`${measure.name}-${idx}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <span className="font-bold text-slate-700">{measure.name}</span>
                    <span className="font-black text-slate-950">{measure.value}{measure.unit || ''}</span>
                  </div>
                ))}
                {(!modelData || modelData.length === 0) && (
                  <p className="text-sm text-slate-500">Sem medidas cadastradas.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StoryPreviewPage;
