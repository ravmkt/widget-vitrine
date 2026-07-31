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
