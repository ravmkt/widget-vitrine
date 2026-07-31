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
import { getExternalVideoData } from '@/lib/videoEmbeds';

const EMOJIS = [
  '😎', '👍', '👏', '😱', '🙏', '💪', '🔥', '❤️', '💙',
  '✨', '🎉', '✅', '⭐', '😢', '😡', '🤔', '👀', '😊', '🥰',
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
  try { return JSON.parse(localStorage.getItem('story_video_likes') || '{}'); }
  catch { return {}; }
};

const saveLikes = (likes: LikeMap) => {
  localStorage.setItem('story_video_likes', JSON.stringify(likes));
};

const readMemoryComments = (): StoryComment[] => {
  try { return JSON.parse(localStorage.getItem('story_video_comments') || '[]'); }
  catch { return []; }
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
  return item?.thumbnail_url || item?.thumbnailUrl || item?.poster_url ||
    item?.posterUrl || item?.image_url || item?.imageUrl || '';
};

const getVideoLikeCount = (videoId?: string) => {
  if (!videoId) return 0;
  return readLikes()[videoId]?.count ?? 0;
};

const getCommentVideoId = (comment: StoryComment) =>
  comment.video_id || comment.videoId || '';

const getCommentName = (comment: StoryComment) =>
  comment.user_name || comment.name || 'Cliente';

const getCommentCreatedAt = (comment: StoryComment) =>
  comment.created_at || comment.createdAt || '';

const getAllSafe = async <T,>(collection: any, storeId?: string): Promise<T[]> => {
  if (!collection?.getAll) return [];
  try {
    if (storeId) return await collection.getAll(storeId);
    return await collection.getAll();
  } catch {
    try { return await collection.getAll(); }
    catch { return []; }
  }
};

const getByIdSafe = async <T,>(
  collection: any, id?: string | null, storeId?: string,
): Promise<T | null> => {
  if (!collection?.getById || !id) return null;
  try {
    if (storeId) return await collection.getById(id, storeId);
    return await collection.getById(id);
  } catch {
    try { return await collection.getById(id); }
    catch { return null; }
  }
};

const parseMeasures = (model: any): any[] => {
  if (!model) return [];
  if (Array.isArray(model.measures)) return model.measures;
  if (Array.isArray(model.measurements)) return model.measurements;
  if (Array.isArray(model.items)) return model.items;
  if (typeof model.measures === 'string') {
    try { const p = JSON.parse(model.measures); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
};

const parseJsonSafe = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object' && value !== null) return value as Record<string, any>;
  if (typeof value === 'string') {
    try { return JSON.parse(value); }
    catch { return {}; }
  }
  return {};
};

/* ─── Mapeia posição do floating para classes Tailwind ─── */
const getFloatingPositionClasses = (position?: string) => {
  switch (position) {
    case 'fixed_bottom_left':  return 'bottom-4 left-4';
    case 'fixed_bottom_right': return 'bottom-4 right-4';
    case 'fixed_top_left':     return 'top-4 left-4';
    case 'fixed_top_right':    return 'top-4 right-4';
    case 'fixed_center':       return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    default:                   return 'bottom-4 right-4';
  }
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

  /* ─── NOVO: controle do widget flutuante no preview ─── */
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [appearance, setAppearance] = useState<any>(null);

  const currentVideo = videos[activeVideoIdx] || null;
  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);

  const rawStoryFormat = String(
    (story as any)?.format ||
    (story as any)?.display_format ||
    (story as any)?.displayFormat ||
    (story as any)?.visual_style ||
    (story as any)?.visualStyle ||
    'carousel',
  ).toLowerCase().trim();

  /* ─── CORRIGIDO: reconhece "floating_widget" ─── */
  const storyFormat =
    rawStoryFormat === 'carrossel' ? 'carousel'
    : rawStoryFormat === 'floating' || rawStoryFormat === 'floating_widget' ? 'floating_widget'
    : rawStoryFormat === 'grid' ? 'grid'
    : 'carousel';

  const isGridLayout = storyFormat === 'grid';
  const isFloatingLayout = storyFormat === 'floating_widget';
  const isCarouselLayout = storyFormat === 'carousel';

  const commentCount = useMemo(() => comments.length, [comments]);
  const modelData = useMemo(() => parseMeasures(model), [model]);

  /* ─── Cores ─── */
  const appearanceColors = useMemo(() => {
    const a = appearance || {};
    return {
      primary: a.primary_color || '#0094EB',
      secondary: a.secondary_color || '#0094EB',
      text: a.text_color || '#0F172A',
      background: a.background_color || '#FFFFFF',
      button: a.button_color || '#0094EB',
    };
  }, [appearance]);

  /* ─── Config do modal (player) ─── */
  const modalConfig = useMemo(() => {
    const raw = parseJsonSafe((appearance as any)?.modal_config);
    const a = appearance || {};
    return {
      show_title: a.show_title ?? raw.show_title ?? true,
      show_play_button: a.show_play_button ?? raw.show_play_button ?? true,
      show_product: a.show_product ?? raw.show_product ?? true,
      show_product_button: a.show_product_button ?? raw.show_product_button ?? true,
      show_product_whatsapp_button: a.show_product_whatsapp_button ?? raw.show_product_whatsapp_button ?? raw.show_whatsapp_button ?? true,
      show_like_button: a.show_like_button ?? raw.show_like_button ?? true,
      show_comment_button: a.show_comment_button ?? raw.show_comment_button ?? true,
      show_share_button: a.show_share_button ?? raw.show_share_button ?? true,
      // visuais do player
      border_color: raw.border_color || '#000000',
      border_width: String(raw.border_width || '0'),
      border_radius: String(raw.border_radius || '0'),
      shadow_enabled: raw.shadow_enabled ?? a.shadow_enabled ?? false,
    };
  }, [appearance]);

  /* ─── Config do floating widget ─── */
  const floatingConfig = useMemo(() => {
    const a = appearance || {};
    const raw = parseJsonSafe(a.floating_config);
    return raw?.desktop || raw?.mobile || raw || {};
  }, [appearance]);

  /* ─── Config do carousel/grid (mantido para referência) ─── */
  const layoutConfig = useMemo(() => {
    const a = appearance || {};
    const carouselRaw = parseJsonSafe(a.carousel_config);
    const gridRaw = parseJsonSafe(a.grid_config);
    return {
      carousel: carouselRaw?.desktop || carouselRaw || {},
      grid: gridRaw?.desktop || gridRaw || {},
    };
  }, [appearance]);

  /* ─── Widget: tamanho e forma ─── */
  const widgetSize = useMemo(() => {
    const w = Number(floatingConfig.width) || 150;
    const h = Number(floatingConfig.height) || 150;
    return { width: w, height: h };
  }, [floatingConfig]);

  const widgetShapeClass = useMemo(() => {
    const shape = floatingConfig.shape || appearance?.widget_shape || 'square';
    return shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  }, [floatingConfig, appearance]);

  const widgetPositionClass = useMemo(
    () => getFloatingPositionClasses(floatingConfig.position),
    [floatingConfig.position],
  );

  /* ─── Comentários ─────────────────────────────────────── */

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

  const loadLinkedData = async (
    currentStory: Story | null, currentVideoItem: Video | null, storeId: string,
  ) => {
    try {
      if (!currentStory || !currentVideoItem) { setProduct(null); setModel(null); return; }
      const relations = await getAllSafe<any>((db as any).storyProducts, storeId);
      const relation = Array.isArray(relations)
        ? relations.find((item: any) =>
            item.story_id === currentStory.id &&
            item.video_id === currentVideoItem.id &&
            (!item.store_id || item.store_id === storeId))
        : null;
      const videoAny = currentVideoItem as any;
      const productId = videoAny.product_id || videoAny.productId ||
        relation?.product_id || relation?.productId || null;
      const modelId = videoAny.model_id || videoAny.modelId ||
        videoAny.measurement_id || videoAny.measurementId ||
        relation?.model_id || relation?.modelId ||
        relation?.measurement_id || relation?.measurementId || null;
      const [resolvedProduct, resolvedModel] = await Promise.all([
        getByIdSafe<any>((db as any).products, productId, storeId),
        getByIdSafe<any>((db as any).sizingModels, modelId, storeId),
      ]);
      setProduct(resolvedProduct);
      setModel(resolvedModel);
    } catch { setProduct(null); setModel(null); }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        if (!id) { setStory(null); return; }
        const stores = await getAllSafe<any>((db as any).stores);
        const selectedStore = routeStoreId
          ? stores.find((s: any) => s.id === routeStoreId) || stores[0]
          : stores[0];
        if (!selectedStore) { setStory(null); return; }
        const finalStoreId = await resolveStoreId(selectedStore.id);
        if (!mounted) return;
        setResolvedStoreId(finalStoreId);
        setStoreName(selectedStore.name || '');

        const allStories = await getAllSafe<Story>((db as any).stories, finalStoreId);
        const currentStory =
          allStories.find((item: any) => item.id === id && (!item.store_id || item.store_id === finalStoreId)) ||
          allStories.find((item: any) => item.id === id) || null;
        if (!mounted) return;
        setStory(currentStory);
        if (!currentStory) { setVideos([]); return; }

        const storyVideos = await getAllSafe<any>((db as any).storyVideos, finalStoreId);
        const allVideos = await getAllSafe<Video>((db as any).videos, finalStoreId);
        const generalSettings = await getAllSafe<any>((db as any).generalSettings, finalStoreId);
        if (!mounted) return;
        setSettings(generalSettings?.[0] || null);

        /* ─── Carrega aparência ─── */
        try {
          const allAppearances = await getAllSafe<any>((db as any).appearances, finalStoreId);
          const storyAppearanceId = (currentStory as any)?.appearance_id;
          const defaultAppearanceId = generalSettings?.[0]?.default_appearance_id;
          const targetId = storyAppearanceId || defaultAppearanceId;
          let found: any = null;
          if (targetId) found = allAppearances.find((a: any) => a.id === targetId) || null;
          if (!found) found = allAppearances.find((a: any) => a.is_default) || allAppearances[0] || null;
          if (mounted) setAppearance(found);
        } catch { /* sem aparência, usa fallback */ }

        const relationVideos = storyVideos
          .filter((rel: any) => rel.story_id === currentStory.id && (!rel.store_id || rel.store_id === finalStoreId))
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
          .map((rel: any) => allVideos.find((v: any) => v.id === rel.video_id))
          .filter(Boolean) as Video[];

        if (!mounted) return;
        setVideos(relationVideos);
        if (queryVideoId) {
          const idx = relationVideos.findIndex((v) => v.id === queryVideoId);
          setActiveVideoIdx(idx >= 0 ? idx : 0);
        } else { setActiveVideoIdx(0); }
      } catch (error) {
        console.error(error);
        showError('Erro ao carregar preview do story.');
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
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
    const onTime = () => { if (el.duration) setProgress((el.currentTime / el.duration) * 100); };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [currentVideo?.id]);

  const close = () => {
    // Se o widget estiver aberto, fecha o widget (volta pro floating)
    if (isFloatingLayout && widgetOpen) {
      setWidgetOpen(false);
      return;
    }
    if (window.history.length > 1) window.history.back();
    else navigate('/');
  };

  const handleTogglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (playing) { videoRef.current.pause(); setPlaying(false); }
      else { await videoRef.current.play(); setPlaying(true); }
    } catch { setPlaying(false); }
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
    const nextCount = Math.max(0, Number(current.count || 0) + (nextLiked ? 1 : -1));
    likes[currentVideo.id] = { liked: nextLiked, count: nextCount };
    saveLikes(likes);
    setLiked(nextLiked);
    setLikeCount(nextCount);
  };

  const goNext = () => {
    if (!videos.length) return;
    if (activeVideoIdx < videos.length - 1) setActiveVideoIdx((v) => v + 1);
    else setActiveVideoIdx(0);
  };

  const goPrev = () => {
    if (!videos.length) return;
    if (activeVideoIdx > 0) setActiveVideoIdx((v) => v - 1);
    else setActiveVideoIdx(videos.length - 1);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const productName = product?.name || story?.title || 'Story';
    const message = `Olha esse produto: "${productName}"\n${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: productName, text: message, url: shareUrl }); return; }
      catch { /* fallback */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    const rawPhone = String(settings?.whatsapp_number || settings?.whatsapp || settings?.phone || '');
    const phone = rawPhone.replace(/\D/g, '');
    const link = product?.product_url || product?.url ||
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
    if (!name) { showError('Informe seu nome.'); return; }
    if (!text) { showError('Escreva um comentário.'); return; }
    if (!currentVideo?.id || !story || !resolvedStoreId) {
      showError('Não foi possível identificar o vídeo.'); return;
    }
    const now = new Date().toISOString();
    const newComment: StoryComment = {
      id: generateUuid(), store_id: resolvedStoreId, story_id: story.id,
      video_id: currentVideo.id, user_name: name, text, status: 'pending',
      created_at: now, updated_at: now,
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
      setCommentText(''); setCommentName(''); setShowEmoji(false);
      showSuccess('Comentário enviado com sucesso.');
    } catch (error) {
      console.error(error);
      const memory = readMemoryComments();
      const nextMemory = [...memory, newComment];
      saveMemoryComments(nextMemory);
      setComments(nextMemory.filter((item) => getCommentVideoId(item) === currentVideo.id));
      setCommentText(''); setCommentName(''); setShowEmoji(false);
      showSuccess('Comentário enviado com sucesso.');
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) { setCommentText((prev) => prev + emoji); return; }
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
    product?.image_url || product?.imageUrl || product?.thumbnail_url || product?.thumbnailUrl || '';
  const productUrl = product?.product_url || product?.productUrl || product?.url || '';
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

  const c = appearanceColors;
  const mc = modalConfig;
  const fc = floatingConfig;

  /* ─── Thumbnail do widget (primeiro vídeo) ─── */
  const widgetThumb = getVideoPosterUrl(videos[0] || null);

  /* ─── Estilo inline da borda do player (do modal_config) ─── */
  const playerBorderStyle: React.CSSProperties = {
    borderColor: mc.border_color,
    borderWidth: `${mc.border_width}px`,
    borderRadius: `${mc.border_radius}px`,
    borderStyle: 'solid',
    boxShadow: mc.shadow_enabled ? '0 25px 50px -12px rgba(0,0,0,0.5)' : undefined,
  };
  /* ─── Estado do player (aberto/fechado) ─── */
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    // Carousel já abre direto no player
    if (isCarouselLayout) setPlayerOpen(true);
  }, [isCarouselLayout]);

  const close = () => {
    // Se o player estiver aberto num layout que não é carousel, volta pro widget/grid
    if (playerOpen && !isCarouselLayout) {
      setPlayerOpen(false);
      return;
    }
    if (window.history.length > 1) window.history.back();
    else navigate('/');
  };

  const openPlayerForVideo = (idx: number) => {
    setActiveVideoIdx(idx);
    setPlayerOpen(true);
  };

  /* ─── Renderização do player modal (compartilhado por todos os layouts) ─── */
  const renderPlayer = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Botão fechar */}
      <button
        onClick={close}
        className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        aria-label="Fechar"
      >
        <X size={20} />
      </button>

      {/* Container do player com borda da aparência */}
      <div
        className="relative flex w-full max-w-[420px] flex-col overflow-hidden bg-black"
        style={playerBorderStyle}
      >
        {/* Área do vídeo */}
        <div className="relative aspect-[9/16] w-full bg-black">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-1 pt-2">
            {videos.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: i < activeVideoIdx ? '100%' : i === activeVideoIdx ? `${progress}%` : '0%',
                    backgroundColor: c.primary,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Navegação: toque nas bordas */}
          <button onClick={goPrev} className="absolute left-0 top-0 z-10 h-full w-1/3" aria-label="Anterior" />
          <button onClick={goNext} className="absolute right-0 top-0 z-10 h-full w-1/3" aria-label="Próximo" />

          {/* Título (se habilitado) */}
          {mc.show_title && currentVideo?.title && (
            <div className="absolute top-10 left-3 right-3 z-10">
              <p className="text-sm font-semibold text-white drop-shadow-lg line-clamp-2">
                {currentVideo.title}
              </p>
            </div>
          )}

          {/* Vídeo */}
          {currentUrl && !videoError ? (
            <video
              ref={videoRef}
              src={currentUrl}
              poster={posterUrl}
              className="h-full w-full object-cover"
              playsInline
              muted={muted}
              autoPlay
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setVideoError(true)}
              onEnded={goNext}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/50 text-sm">
              {videoError ? 'Erro ao carregar vídeo' : 'Nenhum vídeo disponível'}
            </div>
          )}

          {/* Botão play/pause central (se habilitado) */}
          {mc.show_play_button && currentUrl && !videoError && (
            <button
              onClick={handleTogglePlay}
              className="absolute inset-0 z-10 flex items-center justify-center"
              aria-label={playing ? 'Pausar' : 'Reproduzir'}
            >
              <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/40 text-white transition-opacity ${playing ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                {playing ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </div>
            </button>
          )}

          {/* Botão mudo */}
          <button
            onClick={handleToggleMute}
            className="absolute top-4 right-12 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Barra de ações + card de produto */}
        <div className="flex items-start gap-3 bg-black px-3 py-2">
          {/* Ações à esquerda */}
          <div className="flex flex-col items-center gap-4 pt-1">
            {/* Like */}
            {mc.show_like_button && (
              <button onClick={handleLike} className="flex flex-col items-center gap-0.5 text-white">
                <Heart size={24} fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : 'white'} />
                {showSocialCounts && <span className="text-[10px]">{likeCount}</span>}
              </button>
            )}

            {/* Comentário */}
            {mc.show_comment_button && (
              <button onClick={() => setShowComments((v) => !v)} className="flex flex-col items-center gap-0.5 text-white">
                <MessageCircle size={24} />
                {showSocialCounts && <span className="text-[10px]">{commentCount}</span>}
              </button>
            )}

            {/* Compartilhar */}
            {mc.show_share_button && (
              <button onClick={handleShare} className="flex flex-col items-center gap-0.5 text-white">
                <Share2 size={24} />
              </button>
            )}

            {/* Tabela de medidas */}
            {modelData.length > 0 && (
              <button
                onClick={() => setModelModalOpen(true)}
                className="flex flex-col items-center gap-0.5 text-white"
                title="Tabela de medidas"
              >
                <Ruler size={24} />
              </button>
            )}
          </div>

          {/* Card de produto */}
          {mc.show_product && product && (
            <div className="flex-1">
              <div
                className="flex items-center gap-3 rounded-xl bg-white/10 p-2"
                style={{ borderRadius: `${mc.border_radius}px` }}
              >
                {productImage && (
                  <img
                    src={productImage}
                    alt={product.name || 'Produto'}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white line-clamp-1">{product.name || 'Produto'}</p>
                  {productPrice > 0 && (
                    <p className="text-sm font-bold" style={{ color: c.primary }}>
                      R$ {productPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2 flex gap-2">
                {mc.show_product_button && productUrl && (
                  <a
                    href={productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: c.button }}
                  >
                    <ExternalLink size={14} />
                    Ver produto
                  </a>
                )}
                {mc.show_product_whatsapp_button && (
                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Painel de comentários */}
        {showComments && (
          <div className="border-t border-white/10 bg-black px-3 py-3">
            <div className="mb-3 max-h-40 overflow-y-auto space-y-2">
              {comments.length === 0 && (
                <p className="text-center text-xs text-white/50">Nenhum comentário ainda.</p>
              )}
              {comments.map((comment, i) => (
                <div key={comment.id || i} className="rounded-lg bg-white/5 p-2">
                  <p className="text-xs font-semibold text-white/80">{getCommentName(comment)}</p>
                  <p className="text-sm text-white">{comment.text}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  className="w-full resize-none rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none"
                />
                <button
                  onClick={() => setShowEmoji((v) => !v)}
                  className="absolute right-2 bottom-2 text-white/60 hover:text-white"
                >
                  <Smile size={16} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full right-0 mb-1 flex flex-wrap gap-1 rounded-lg bg-gray-800 p-2 shadow-lg max-w-[200px]">
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => insertEmoji(emoji)} className="text-lg hover:scale-125 transition">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Seu nome"
                className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none"
              />
              <button
                onClick={handleCommentSubmit}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: c.primary }}
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Renderização do widget flutuante ─── */
  const renderFloatingWidget = () => (
    <div
      className={`fixed ${widgetPositionClass} z-40 cursor-pointer group transition-transform hover:scale-105 active:scale-95`}
      style={{
        width: widgetSize.width,
        height: widgetSize.height,
      }}
      onClick={() => openPlayerForVideo(0)}
      title="Clique para abrir o story"
    >
      {/* Borda da aparência */}
      <div
        className={`h-full w-full overflow-hidden ${widgetShapeClass} border-2 shadow-xl`}
        style={{
          borderColor: c.primary,
          backgroundColor: c.primary,
        }}
      >
        {widgetThumb ? (
          <img
            src={widgetThumb}
            alt="Story preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white">
            <Play size={32} />
          </div>
        )}

        {/* Overlay com ícone de play */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900">
            <Play size={18} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* Indicador visual sutil */}
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 shadow-lg" />
    </div>
  );

  /* ─── Renderização do grid ─── */
  const renderGrid = () => (
    <div className="w-full max-w-4xl px-4">
      {/* Botão fechar */}
      <button
        onClick={close}
        className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        aria-label="Fechar"
      >
        <X size={20} />
      </button>

      {/* Título */}
      <h2 className="mb-6 text-center text-xl font-semibold text-white">
        {story?.title || 'Stories'}
      </h2>

      {/* Grid de thumbnails */}
      {videos.length === 0 ? (
        <p className="text-center text-white/50">Nenhum vídeo neste story.</p>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${layoutConfig.grid?.columns || 3}, 1fr)`,
            gap: `${layoutConfig.grid?.gap || 16}px`,
          }}
        >
          {videos.map((video, idx) => {
            const thumb = getVideoPosterUrl(video);
            const isActive = idx === activeVideoIdx;
            return (
              <button
                key={video.id || idx}
                onClick={() => openPlayerForVideo(idx)}
                className="group relative aspect-[9/16] overflow-hidden rounded-xl border-2 transition-all hover:scale-[1.02]"
                style={{
                  borderColor: isActive ? c.primary : 'transparent',
                  borderRadius: `${layoutConfig.grid?.border_radius || 12}px`,
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={video.title || ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40">
                    <Play size={32} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                  <Play size={40} className="text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
                {video.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4">
                    <p className="text-xs font-medium text-white line-clamp-2">{video.title}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Instrução */}
      {videos.length > 0 && (
        <p className="mt-4 text-center text-xs text-white/40">
          Clique em um vídeo para abrir o player
        </p>
      )}
    </div>
  );

  /* ─── Modal de tabela de medidas ─── */
  const renderMeasureModal = () => {
    if (!modelModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={() => setModelModalOpen(false)}>
        <div
          className="mx-4 w-full max-w-md rounded-2xl bg-gray-900 p-6 text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Tabela de Medidas</h3>
            <button onClick={() => setModelModalOpen(false)} className="text-white/60 hover:text-white">
              <X size={20} />
            </button>
          </div>
          {model?.name && <p className="mb-3 text-sm text-white/70">{model.name}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-2 pr-4 font-medium">Tamanho</th>
                  {modelData[0] && Object.keys(modelData[0])
                    .filter((k) => k !== 'size' && k !== 'tamanho' && k !== 'label' && k !== 'name')
                    .map((key) => (
                      <th key={key} className="py-2 pr-4 font-medium capitalize">{key}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {modelData.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-2 pr-4 font-medium">{row.size || row.tamanho || row.label || row.name || '-'}</td>
                    {Object.keys(modelData[0] || {})
                      .filter((k) => k !== 'size' && k !== 'tamanho' && k !== 'label' && k !== 'name')
                      .map((key) => (
                        <td key={key} className="py-2 pr-4">{row[key] ?? '-'}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Layout final ─── */
  return (
    <div className="fixed inset-0 bg-[#111] flex items-center justify-center overflow-hidden">
      {/* Floating: widget na tela preta */}
      {isFloatingLayout && !playerOpen && renderFloatingWidget()}

      {/* Grid: grade de thumbnails */}
      {isGridLayout && !playerOpen && renderGrid()}

      {/* Player modal: abre quando necessário */}
      {(playerOpen || isCarouselLayout) && renderPlayer()}

      {/* Modal de medidas (sempre acessível quando o player está aberto) */}
      {renderMeasureModal()}
    </div>
  );
};

export default StoryPreviewPage;
