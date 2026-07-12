"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, Story, Video, resolveStoreId, generateUuid } from '@/lib/db';
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

const EMOJIS = [
  '😎',
  '👍',
  '👏',
  '😱',
  '🙏',
  '💪',
  '🔥',
  '❤️',
  '💙',
  '✨',
  '🎉',
  '✅',
  '⭐',
  '😢',
  '😡',
  '🤔',
  '👀',
  '😊',
  '🥰',
];

type LikeMap = Record<string, { liked: boolean; count: number }>;

type StoryComment = {
  id?: string;
  store_id?: string;
  story_id?: string;
  video_id?: string;
  videoId?: string;
  user_name?: string;
  name?: string;
  text: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
};

const readLikes = (): LikeMap => {
  try {
    return JSON.parse(localStorage.getItem('story_video_likes') || '{}');
  } catch {
    return {};
  }
};

const saveLikes = (likes: LikeMap) => {
  localStorage.setItem('story_video_likes', JSON.stringify(likes));
};

const readMemoryComments = (): StoryComment[] => {
  try {
    return JSON.parse(localStorage.getItem('story_video_comments') || '[]');
  } catch {
    return [];
  }
};

const saveMemoryComments = (comments: StoryComment[]) => {
  localStorage.setItem('story_video_comments', JSON.stringify(comments));
};

const getVideoUrl = (video?: Video | null) => {
  const item = video as any;
  return item?.video_url || item?.videoUrl || item?.url || '';
};

const getVideoPosterUrl = (video?: Video | null) => {
  const item = video as any;
  return item?.thumbnail_url || item?.thumbnailUrl || item?.poster_url || item?.posterUrl || item?.image_url || item?.imageUrl || '';
};

const getVideoLikeCount = (videoId?: string) => {
  if (!videoId) return 0;
  return readLikes()[videoId]?.count ?? 0;
};

const getCommentVideoId = (comment: StoryComment) => {
  return comment.video_id || comment.videoId || '';
};

const getCommentName = (comment: StoryComment) => {
  return comment.user_name || comment.name || 'Cliente';
};

const getCommentCreatedAt = (comment: StoryComment) => {
  return comment.created_at || comment.createdAt || '';
};

const getAllSafe = async <T,>(collection: any, storeId?: string): Promise<T[]> => {
  if (!collection?.getAll) return [];

  try {
    if (storeId) {
      return await collection.getAll(storeId);
    }

    return await collection.getAll();
  } catch {
    try {
      return await collection.getAll();
    } catch {
      return [];
    }
  }
};

const getByIdSafe = async <T,>(collection: any, id?: string | null, storeId?: string): Promise<T | null> => {
  if (!collection?.getById || !id) return null;

  try {
    if (storeId) {
      return await collection.getById(id, storeId);
    }

    return await collection.getById(id);
  } catch {
    try {
      return await collection.getById(id);
    } catch {
      return null;
    }
  }
};

const parseMeasures = (model: any): any[] => {
  if (!model) return [];

  if (Array.isArray(model.measures)) return model.measures;
  if (Array.isArray(model.measurements)) return model.measurements;
  if (Array.isArray(model.items)) return model.items;

  if (typeof model.measures === 'string') {
    try {
      const parsed = JSON.parse(model.measures);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const StoryPreviewPage = () => {
  const { id, storeId: routeStoreId } = useParams<{ id?: string; storeId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryVideoId = searchParams.get('videoId') || searchParams.get('videoid') || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [storeName, setStoreName] = useState('');

  const [story, setStory] = useState<Story | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState<StoryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  const [product, setProduct] = useState<any | null>(null);
  const [model, setModel] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [modelModalOpen, setModelModalOpen] = useState(false);

  const currentVideo = videos[activeVideoIdx] || null;
  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);

  const commentCount = useMemo(() => comments.length, [comments]);
  const modelData = useMemo(() => parseMeasures(model), [model]);

  const loadComments = async (videoId: string, storeId: string) => {
    try {
      const allComments = await getAllSafe<StoryComment>((db as any).comments, storeId);

      const filtered = allComments.filter((item) => {
        const sameVideo = getCommentVideoId(item) === videoId;
        const sameStore = !item.store_id || item.store_id === storeId;
        return sameVideo && sameStore;
      });

      setComments(filtered);

      const memory = readMemoryComments();
      const memoryWithoutCurrent = memory.filter((item) => getCommentVideoId(item) !== videoId);
      saveMemoryComments([...memoryWithoutCurrent, ...filtered]);
    } catch {
      const memory = readMemoryComments().filter((item) => getCommentVideoId(item) === videoId);
      setComments(memory);
    }
  };

  const loadLinkedData = async (currentStory: Story | null, currentVideoItem: Video | null, storeId: string) => {
    try {
      if (!currentStory || !currentVideoItem) {
        setProduct(null);
        setModel(null);
        return;
      }

      const relations = await getAllSafe<any>((db as any).storyProducts, storeId);

      const relation = Array.isArray(relations)
        ? relations.find((item) => {
            return (
              item.story_id === currentStory.id &&
              item.video_id === currentVideoItem.id &&
              (!item.store_id || item.store_id === storeId)
            );
          })
        : null;

      const videoAny = currentVideoItem as any;

      const productId =
        videoAny.product_id ||
        videoAny.productId ||
        relation?.product_id ||
        relation?.productId ||
        null;

      const modelId =
        videoAny.model_id ||
        videoAny.modelId ||
        videoAny.measurement_id ||
        videoAny.measurementId ||
        relation?.model_id ||
        relation?.modelId ||
        relation?.measurement_id ||
        relation?.measurementId ||
        null;

      const [resolvedProduct, resolvedModel] = await Promise.all([
        getByIdSafe<any>((db as any).products, productId, storeId),
        getByIdSafe<any>((db as any).sizingModels, modelId, storeId),
      ]);

      setProduct(resolvedProduct);
      setModel(resolvedModel);
    } catch {
      setProduct(null);
      setModel(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        if (!id) {
          setStory(null);
          return;
        }

        const stores = await getAllSafe<any>((db as any).stores);
        const selectedStore = routeStoreId
          ? stores.find((store) => store.id === routeStoreId) || stores[0]
          : stores[0];

        if (!selectedStore) {
          setStory(null);
          return;
        }

        const finalStoreId = await resolveStoreId(selectedStore.id);

        if (!mounted) return;

        setResolvedStoreId(finalStoreId);
        setStoreName(selectedStore.name || '');

        const allStories = await getAllSafe<Story>((db as any).stories, finalStoreId);

        const currentStory =
          allStories.find((item: any) => item.id === id && (!item.store_id || item.store_id === finalStoreId)) ||
          allStories.find((item: any) => item.id === id) ||
          null;

        if (!mounted) return;

        setStory(currentStory);

        if (!currentStory) {
          setVideos([]);
          return;
        }

        const storyVideos = await getAllSafe<any>((db as any).storyVideos, finalStoreId);
        const allVideos = await getAllSafe<Video>((db as any).videos, finalStoreId);

        const relationVideos = storyVideos
          .filter((relation: any) => {
            const sameStory = relation.story_id === currentStory.id;
            const sameStore = !relation.store_id || relation.store_id === finalStoreId;
            return sameStory && sameStore;
          })
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
          .map((relation: any) => {
            return allVideos.find((video: any) => video.id === relation.video_id);
          })
          .filter(Boolean) as Video[];

        if (!mounted) return;

        setVideos(relationVideos);

        if (queryVideoId) {
          const idx = relationVideos.findIndex((video) => video.id === queryVideoId);
          setActiveVideoIdx(idx >= 0 ? idx : 0);
        } else {
          setActiveVideoIdx(0);
        }

        const generalSettings = await getAllSafe<any>((db as any).generalSettings, finalStoreId);

        if (!mounted) return;

        setSettings(generalSettings?.[0] || null);
      } catch (error) {
        console.error(error);
        showError('Erro ao carregar preview do story.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id, routeStoreId, queryVideoId]);

  useEffect(() => {
    if (!currentVideo?.id || !story || !resolvedStoreId) return;

    setVideoError(false);
    setProgress(0);

    const likes = readLikes();
    setLiked(Boolean(likes[currentVideo.id]?.liked));
    setLikeCount(getVideoLikeCount(currentVideo.id));

    loadComments(currentVideo.id, resolvedStoreId);
    loadLinkedData(story, currentVideo, resolvedStoreId);
  }, [currentVideo?.id, story?.id, resolvedStoreId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTime = () => {
      if (el.duration) {
        setProgress((el.currentTime / el.duration) * 100);
      }
    };

    el.addEventListener('timeupdate', onTime);

    return () => {
      el.removeEventListener('timeupdate', onTime);
    };
  }, [currentVideo?.id]);

  const close = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const handleTogglePlay = async () => {
    if (!videoRef.current) return;

    try {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        await videoRef.current.play();
        setPlaying(true);
      }
    } catch {
      setPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);

    if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  const handleLike = () => {
    if (!currentVideo?.id) return;

    const likes = readLikes();
    const current = likes[currentVideo.id] || { liked: false, count: 0 };

    const nextLiked = !current.liked;
    const nextCount = Math.max(0, Number(current.count || 0) + (nextLiked ? 1 : -1));

    likes[currentVideo.id] = {
      liked: nextLiked,
      count: nextCount,
    };

    saveLikes(likes);

    setLiked(nextLiked);
    setLikeCount(nextCount);
  };

  const goNext = () => {
    if (!videos.length) return;

    if (activeVideoIdx < videos.length - 1) {
      setActiveVideoIdx((value) => value + 1);
    } else {
      setActiveVideoIdx(0);
    }
  };

  const goPrev = () => {
    if (!videos.length) return;

    if (activeVideoIdx > 0) {
      setActiveVideoIdx((value) => value - 1);
    } else {
      setActiveVideoIdx(videos.length - 1);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const productName = product?.name || story?.title || 'Story';
    const message = `Olha esse produto: "${productName}"\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: message,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback para WhatsApp
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    const rawPhone = String(settings?.whatsapp_number || settings?.whatsapp || settings?.phone || '');
    const phone = rawPhone.replace(/\D/g, '');

    const link =
      product?.product_url ||
      product?.url ||
      `${window.location.origin}/stories/preview/${id}?storyId=${id}&videoId=${currentVideo?.id || ''}`;

    const message = `Quero mais informações sobre esse produto${product?.name ? `: ${product.name}` : ''}\n${link}`;

    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCommentSubmit = async () => {
    const name = commentName.trim();
    const text = commentText.trim();

    if (!name) {
      showError('Informe seu nome.');
      return;
    }

    if (!text) {
      showError('Escreva um comentário.');
      return;
    }

    if (!currentVideo?.id || !story || !resolvedStoreId) {
      showError('Não foi possível identificar o vídeo.');
      return;
    }

    const now = new Date().toISOString();

    const newComment: StoryComment = {
      id: generateUuid(),
      store_id: resolvedStoreId,
      story_id: story.id,
      video_id: currentVideo.id,
      user_name: name,
      text,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    try {
      await (db as any).comments.save(newComment as any);

      const allComments = await getAllSafe<StoryComment>((db as any).comments, resolvedStoreId);

      const filtered = allComments.filter((item) => {
        const sameVideo = getCommentVideoId(item) === currentVideo.id;
        const sameStore = !item.store_id || item.store_id === resolvedStoreId;
        return sameVideo && sameStore;
      });

      setComments(filtered);
      saveMemoryComments(filtered);

      setCommentText('');
      setCommentName('');
      setShowEmoji(false);

      showSuccess('Comentário enviado com sucesso.');
    } catch (error) {
      console.error(error);

      const memory = readMemoryComments();
      const nextMemory = [...memory, newComment];

      saveMemoryComments(nextMemory);

      setComments(nextMemory.filter((item) => getCommentVideoId(item) === currentVideo.id));

      setCommentText('');
      setCommentName('');
      setShowEmoji(false);

      showSuccess('Comentário enviado com sucesso.');
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;

    if (!el) {
      setCommentText((prev) => prev + emoji);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;

    const next = commentText.slice(0, start) + emoji + commentText.slice(end);

    setCommentText(next);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const productImage =
    product?.image_url ||
    product?.imageUrl ||
    product?.thumbnail_url ||
    product?.thumbnailUrl ||
    '';

  const productUrl =
    product?.product_url ||
    product?.productUrl ||
    product?.url ||
    '';

  const productPrice = Number(product?.price || product?.sale_price || product?.salePrice || 0);

  const showSocialCounts = false;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        Carregando...
      </div>
    );
  }

  if (!story) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        Story não encontrado
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-neutral-950">
      <div className="story-viewer story-modal-content relative h-full w-full max-w-[420px] overflow-hidden bg-black sm:aspect-[9/16] sm:max-h-[90vh] sm:rounded-[36px]">
        <div className="progress-bars story-progress absolute left-4 right-4 top-3 z-[80] flex gap-1.5">
          {videos.length > 0 ? (
            videos.map((video, idx) => (
              <div key={video.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className={cn(
                    'h-full rounded-full bg-white transition-all',
                    idx < activeVideoIdx ? 'w-full' : idx === activeVideoIdx ? 'bg-violet-400' : 'w-0'
                  )}
                  style={idx === activeVideoIdx ? { width: `${progress}%` } : undefined}
                />
              </div>
            ))
          ) : (
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20" />
          )}
        </div>

        <div className="absolute left-0 right-0 top-0 z-[80] flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent p-4 pt-4">
          <div className="story-title min-w-0 pr-28">
            <h3 className="truncate text-sm font-black text-white">{story.title}</h3>
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-white/60">
              {storeName}
              {videos.length > 1 ? ` • ${activeVideoIdx + 1}/${videos.length}` : ''}
            </p>
          </div>
        </div>

        <div className="top-actions absolute right-3 top-4 z-[90] flex items-center gap-1.5">
          <button
            type="button"
            className="top-action-button only-top-control flex h-[32px] w-[32px] min-h-[32px] min-w-[32px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/20 p-0 text-white backdrop-blur-sm"
            onClick={handleToggleMute}
            aria-label={muted ? 'Ativar som' : 'Desativar som'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            className="top-action-button only-top-control flex h-[32px] w-[32px] min-h-[32px] min-w-[32px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/20 p-0 text-white backdrop-blur-sm"
            onClick={handleTogglePlay}
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            type="button"
            className="top-action-button only-top-control flex h-[32px] w-[32px] min-h-[32px] min-w-[32px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/20 p-0 text-white backdrop-blur-sm"
            onClick={close}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {currentUrl && !videoError ? (
          <video
            key={currentVideo?.id}
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
            onError={() => setVideoError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-white/70">
            Nenhum vídeo vinculado
          </div>
        )}

        {videos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="nav-left nav-button absolute left-3 top-1/2 z-[85] flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-black/15 text-white backdrop-blur-sm"
              aria-label="Vídeo anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goNext}
              className="nav-right nav-button absolute right-3 top-1/2 z-[85] flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-black/15 text-white backdrop-blur-sm"
              aria-label="Próximo vídeo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="social-actions absolute right-4 top-[61%] z-[90] flex -translate-y-1/2 flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleLike}
            className="social-button flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/10 p-0 text-white backdrop-blur-sm"
            aria-label="Curtir"
          >
            <Heart className={cn('h-[20px] w-[20px]', liked ? 'fill-rose-500 text-rose-500' : 'text-white')} />
          </button>

          {showSocialCounts && (
            <span className="text-[10px] font-black text-white drop-shadow">{likeCount}</span>
          )}

          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="social-button flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/10 p-0 text-white backdrop-blur-sm"
            aria-label="Comentários"
          >
            <MessageCircle className="h-[20px] w-[20px]" />
          </button>

          {showSocialCounts && (
            <span className="text-[10px] font-black text-white drop-shadow">{commentCount}</span>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="social-button flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/10 p-0 text-white backdrop-blur-sm"
            aria-label="Compartilhar"
          >
            <Share2 className="h-[20px] w-[20px]" />
          </button>

          {model && (
            <button
              type="button"
              onClick={() => setModelModalOpen(true)}
              className="social-button flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-black/10 p-0 text-white backdrop-blur-sm"
              title="Medidas"
              aria-label="Medidas"
            >
              <Ruler className="h-[20px] w-[20px]" />
            </button>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="whatsapp-button flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] p-0 text-white backdrop-blur-sm"
            aria-label="WhatsApp"
          >
            <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] fill-white" aria-hidden="true">
              <path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z" />
              <path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z" />
            </svg>
          </button>
        </div>

        {product && (
          <div className="product-card absolute bottom-[17px] left-[13px] z-[55] flex h-[72px] w-[238px] min-h-[72px] max-h-[72px] gap-[9px] rounded-[16px] bg-white/95 p-[10px_10px] shadow-lg backdrop-blur-sm">
            <div className="product-image h-[55px] w-[55px] shrink-0 overflow-hidden rounded-[2px] bg-slate-200">
              {productImage ? (
                <img src={productImage} alt={product.name || 'Produto'} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-slate-200" />
              )}
            </div>

            <div className="product-info min-w-0 flex-1">
              <p className="product-name truncate text-sm font-medium text-slate-900">
                {product.name || 'Produto'}
              </p>

              <p className="product-price mt-[2px] text-sm font-medium text-slate-900">
                {productPrice.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>

              <button
                type="button"
                onClick={() => {
                  if (productUrl) {
                    window.open(productUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="product-button mt-1 inline-flex h-[18px] items-center gap-1 rounded-full bg-emerald-500 px-[9px] text-[9px] font-bold text-white"
              >
                Ver produto <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {showComments && (
          <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
            <div className="mx-auto flex max-h-[70vh] w-[calc(100%-48px)] max-w-[380px] flex-col overflow-hidden rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900">Comentários</h4>

                <button
                  type="button"
                  onClick={() => setShowComments(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-700"
                  aria-label="Fechar comentários"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Nenhum comentário ainda.
                  </p>
                ) : (
                  comments.map((item, index) => (
                    <div key={item.id || `${getCommentCreatedAt(item)}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black text-slate-500">{getCommentName(item)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                <input
                  value={commentName}
                  onChange={(event) => setCommentName(event.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Escreva seu comentário..."
                    className="min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowEmoji((value) => !value)}
                    className="absolute right-3 top-3 rounded-full bg-white p-1 text-slate-600 shadow-sm"
                    aria-label="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>

                {showEmoji && (
                  <div className="grid grid-cols-6 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xl">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="rounded-lg bg-white p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCommentSubmit}
                  className="w-full rounded-2xl bg-violet-600 p-3 text-sm font-black text-white"
                >
                  Enviar comentário
                </button>
              </div>
            </div>
          </div>
        )}

        {model && modelModalOpen && (
          <div className="absolute inset-0 z-[96] flex items-center justify-center bg-black/85 p-4">
            <div className="mx-auto flex max-h-[70vh] w-[calc(100%-48px)] max-w-[380px] flex-col overflow-hidden rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Medidas da modelo
                  </p>
                  <h4 className="text-lg font-black">{model.name || 'Modelo'}</h4>
                </div>

                <button
                  type="button"
                  onClick={() => setModelModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2"
                  aria-label="Fechar medidas"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-auto">
                {modelData.length > 0 ? (
                  modelData.map((measure: any, idx: number) => (
                    <div key={`${measure.name || measure.label || idx}-${idx}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                      <span className="font-bold text-slate-700">
                        {measure.name || measure.label || `Medida ${idx + 1}`}
                      </span>
                      <span className="font-black text-slate-950">
                        {measure.value || measure.size || '-'}
                        {measure.unit || ''}
                      </span>
                    </div>
                  ))
                ) : (
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
