import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, Video, resolveStoreId, generateUuid } from '@/lib/db';
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
import { showSuccess, showError } from '@/utils/toast';
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

type CommentItem = {
  id?: string;
  store_id?: string;
  story_id?: string;
  video_id?: string;
  videoId?: string;
  name?: string;
  user_name?: string;
  text: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
};

const readLocalComments = (): CommentItem[] => {
  try {
    return JSON.parse(localStorage.getItem('story_video_comments') || '[]');
  } catch {
    return [];
  }
};

const saveLocalComments = (comments: CommentItem[]) => {
  localStorage.setItem('story_video_comments', JSON.stringify(comments));
};

const readLikes = (): Record<string, { liked: boolean; count: number }> => {
  try {
    return JSON.parse(localStorage.getItem('story_video_likes') || '{}');
  } catch {
    return {};
  }
};

const saveLikes = (likes: Record<string, { liked: boolean; count: number }>) => {
  localStorage.setItem('story_video_likes', JSON.stringify(likes));
};

const getVideoUrl = (video?: Video | null) => video?.video_url || '';

const getVideoPosterUrl = (video?: Video | null) =>
  video?.thumbnail_url || video?.poster_url || video?.image_url || '';

const getVideoLikeCount = (videoId?: string) =>
  videoId ? readLikes()[videoId]?.count ?? 0 : 0;

const getCommentVideoId = (comment: CommentItem) =>
  comment.video_id || comment.videoId || '';

const getCommentName = (comment: CommentItem) =>
  comment.user_name || comment.name || 'Visitante';

const getVideoCommentCount = (videoId?: string, comments: CommentItem[] = []) => {
  if (!videoId) return 0;

  return comments.filter(item => getCommentVideoId(item) === videoId).length;
};

export default function StoriesWidgetPage() {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();

  const storyIdParam = searchParams.get('storyId') || searchParams.get('storyid');
  const videoIdParam = searchParams.get('videoId') || searchParams.get('videoid');

  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [stories, setStories] = useState<any[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, Video[]>>(new Map());
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [videoIdx, setVideoIdx] = useState(0);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  const [product, setProduct] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [model, setModel] = useState<any | null>(null);
  const [showMeasures, setShowMeasures] = useState(false);

  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  const story = stories[storyIdx ?? -1] ?? null;
  const currentVideos = story ? storyVideosMap.get(story.id) || [] : [];
  const currentVideo = currentVideos[videoIdx] ?? null;
  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);

  const activeCommentCount = useMemo(
    () => getVideoCommentCount(currentVideo?.id, comments),
    [currentVideo?.id, comments],
  );

  const modelData = model?.measures?.length ? model.measures : [];

  const loadComments = async (videoId: string, currentStoreId: string) => {
    try {
      const dbComments = await db.comments.getAll(currentStoreId);

      const filtered = (dbComments || []).filter(
        (item: any) => item.video_id === videoId || item.videoId === videoId,
      ) as CommentItem[];

      setComments(filtered);
      saveLocalComments(filtered);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);

      const localComments = readLocalComments().filter(
        item => getCommentVideoId(item) === videoId,
      );

      setComments(localComments);
    }
  };

  const loadLinkedData = async (
    currentStory: any,
    currentVideoItem: Video | null,
    currentStoreId: string,
  ) => {
    try {
      if (!currentStory || !currentVideoItem) {
        setProduct(null);
        setModel(null);
        return;
      }

      const relations = await (db as any).storyProducts?.getAll?.(currentStoreId);

      const relation = Array.isArray(relations)
        ? relations.find(
            (item: any) =>
              item.story_id === currentStory.id &&
              item.video_id === currentVideoItem.id,
          )
        : null;

      const productId =
        (currentVideoItem as any).product_id ||
        (currentVideoItem as any).productId ||
        relation?.product_id ||
        relation?.productId ||
        null;

      const modelId =
        (currentVideoItem as any).model_id ||
        (currentVideoItem as any).modelId ||
        (currentVideoItem as any).measurement_id ||
        null;

      const [resolvedProduct, resolvedModel] = await Promise.all([
        productId ? db.products.getById(productId, currentStoreId) : null,
        modelId ? db.sizingModels.getById(modelId, currentStoreId) : null,
      ]);

      setProduct(resolvedProduct || null);
      setModel(resolvedModel || null);
    } catch (error) {
      console.error('Erro ao carregar produto/modelo:', error);
      setProduct(null);
      setModel(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const currentStoreId = await resolveStoreId(storeId);
        const storeList = await db.stores.getAll();
        const currentStore =
          storeList.find((store: any) => store.id === currentStoreId) ||
          storeList.find((store: any) => store.id === storeId) ||
          storeList[0];

        if (!currentStore) {
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        setResolvedStoreId(currentStoreId);
        setStoreName(currentStore.name || '');

        const genSettings = (await db.generalSettings.getAll(currentStoreId))[0];

        if (!mounted) return;

        setSettings(genSettings || null);
        setMuted(genSettings?.muted_by_default ?? true);

        const allStories = await db.stories.getAll(currentStoreId);

        const activeStories = allStories
          .filter((item: any) => item.active !== false)
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));

        const filteredStories = storyIdParam
          ? activeStories.filter((item: any) => item.id === storyIdParam)
          : activeStories;

        const storyVids = await db.storyVideos.getAll(currentStoreId);
        const allVids = await db.videos.getAll(currentStoreId);

        const map = new Map<string, Video[]>();

        filteredStories.forEach((st: any) => {
          const relationVideos = storyVids
            .filter((sv: any) => sv.story_id === st.id)
            .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
            .map((sv: any) => allVids.find((video: any) => video.id === sv.video_id))
            .filter(Boolean) as Video[];

          map.set(st.id, relationVideos);
        });

        if (!mounted) return;

        setStories(filteredStories);
        setStoryVideosMap(map);

        if (filteredStories.length > 0) {
          const startStoryIdx = 0;
          const startVideos = map.get(filteredStories[0].id) || [];
          const foundVideoIdx = videoIdParam
            ? startVideos.findIndex(video => video.id === videoIdParam)
            : 0;

          setStoryIdx(startStoryIdx);
          setVideoIdx(foundVideoIdx >= 0 ? foundVideoIdx : 0);
        }
      } catch (error) {
        console.error('Erro ao carregar widget de Stories:', error);
        showError('Erro ao carregar Stories.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [storeId, storyIdParam, videoIdParam]);

  useEffect(() => {
    if (!story || !currentVideo?.id || !resolvedStoreId) return;

    setVideoError(false);
    setShowComments(false);
    setShowEmoji(false);
    setShowMeasures(false);
    setCommentText('');
    setCommentName('');
    setProgress(0);

    loadLinkedData(story, currentVideo, resolvedStoreId);
  }, [story?.id, currentVideo?.id, resolvedStoreId]);

  useEffect(() => {
    if (!currentVideo?.id || !resolvedStoreId) return;

    setLikeCount(getVideoLikeCount(currentVideo.id));

    const likes = readLikes();

    setLiked(Boolean(likes[currentVideo.id]?.liked));

    loadComments(currentVideo.id, resolvedStoreId);
  }, [currentVideo?.id, resolvedStoreId]);

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
      window.location.href = '/';
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
    } catch (error) {
      console.error('Erro ao controlar vídeo:', error);
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
    const current = likes[currentVideo.id] || {
      liked: false,
      count: 0,
    };

    const nextLiked = !current.liked;
    const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1));

    likes[currentVideo.id] = {
      liked: nextLiked,
      count: nextCount,
    };

    saveLikes(likes);
    setLiked(nextLiked);
    setLikeCount(nextCount);
  };

  const goNext = () => {
    if (!story || currentVideos.length === 0) return;

    if (videoIdx < currentVideos.length - 1) {
      setVideoIdx(value => value + 1);
    } else {
      setVideoIdx(0);
    }
  };

  const goPrev = () => {
    if (videoIdx > 0) {
      setVideoIdx(value => value - 1);
    }
  };

  const handleCommentSubmit = async () => {
    const name = commentName.trim();
    const text = commentText.trim();

    if (!name || !text || !currentVideo?.id || !story || !resolvedStoreId) return;

    try {
      const now = new Date().toISOString();

      const newComment = {
        id: generateUuid(),
        store_id: resolvedStoreId,
        video_id: currentVideo.id,
        story_id: story.id,
        user_name: name,
        text,
        status: 'pending' as const,
        created_at: now,
        updated_at: now,
      };

      await db.comments.save(newComment as any);

      const next = await db.comments.getAll(resolvedStoreId);

      const filtered = (next || []).filter(
        (item: any) => item.video_id === currentVideo.id || item.videoId === currentVideo.id,
      ) as CommentItem[];

      setComments(filtered);
      saveLocalComments(filtered);
      setCommentText('');
      setCommentName('');
      setShowEmoji(false);

      showSuccess('Comentário enviado com sucesso.');
    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      showError('Erro ao enviar comentário.');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?storyId=${
      story?.id || ''
    }&videoId=${currentVideo?.id || ''}`;

    const shareText = `Olha esse produto que lindo${product?.name ? `: ${product.name}` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name || story?.title || 'Story',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('Link copiado para compartilhar.');
      }
    } catch {
      showError('Erro ao compartilhar.');
    }
  };

  const handleWhatsApp = () => {
    const phone = String(settings?.whatsapp_number || settings?.whatsapp || '').replace(/\D/g, '');

    const link =
      product?.product_url ||
      `${window.location.origin}${window.location.pathname}?storyId=${
        story?.id || ''
      }&videoId=${currentVideo?.id || ''}`;

    const message = `Quero mais informações sobre esse produto${
      product?.name ? `: ${product.name}` : ''
    }\n${link}`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;

    if (!el) {
      setCommentText(prev => `${prev}${emoji}`);
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
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div className="relative h-full w-full max-w-[420px] overflow-hidden bg-black sm:aspect-[9/16] sm:max-h-screen">
        <div className="absolute left-4 right-4 top-3 z-50 flex gap-1.5">
          {currentVideos.map((video, idx) => (
            <div key={video.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className={cn(
                  'h-full rounded-full bg-white transition-all',
                  idx < videoIdx ? 'w-full' : idx === videoIdx ? 'bg-violet-400' : 'w-0',
                )}
                style={idx === videoIdx ? { width: `${progress}%` } : undefined}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-5 pt-8">
          <div className="min-w-0 pr-16">
            <h3 className="truncate text-sm font-black text-white">{story.title}</h3>
            <p className="text-[10px] font-bold uppercase text-white/65">
              {storeName}
              {currentVideos.length > 1 ? ` • ${videoIdx + 1}/${currentVideos.length}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentUrl && !videoError ? (
          <video
            ref={videoRef}
            src={currentUrl}
            poster={posterUrl || undefined}
            autoPlay
            muted={muted}
            playsInline
            className="h-full w-full object-cover"
            onEnded={goNext}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setVideoError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/70">
            Nenhum vídeo vinculado
          </div>
        )}

        <button
          type="button"
          className="absolute left-3 top-1/2 z-50 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white"
          onClick={goPrev}
        >
          <ChevronLeft className="h-7 w-7" />
        </button>

        <button
          type="button"
          className="absolute right-3 top-1/2 z-50 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white"
          onClick={goNext}
        >
          <ChevronRight className="h-7 w-7" />
        </button>

        <div className="absolute right-4 top-24 z-50 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={handleLike}
            className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md relative"
          >
            <Heart className={cn('h-5 w-5', liked ? 'fill-rose-500 text-rose-500' : '')} />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">
              {likeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md relative"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">
              {activeCommentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md"
          >
            <Share2 className="h-5 w-5" />
          </button>

          {model && (
            <button
              type="button"
              onClick={() => setShowMeasures(true)}
              className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md"
              title="Medidas"
              aria-label="Medidas"
            >
              <Ruler className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="rounded-full bg-[#25D366] px-3 py-3 text-xs font-black text-white backdrop-blur-md"
          >
            WA
          </button>
        </div>

        {product && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10">
            <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/95 p-3">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-200">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{product.name}</p>
                <p className="mt-1 text-base font-black text-violet-700">
                  {Number(product.price || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>

                <a
                  href={product.product_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-4 py-2 text-[11px] font-black text-white"
                >
                  Ver produto <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {showComments && (
          <div className="absolute inset-0 z-[90] bg-black/85 p-4">
            <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-slate-950 p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-black">Comentários</h4>
                <button type="button" onClick={() => setShowComments(false)}>
                  <X />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-auto">
                {comments.length === 0 && (
                  <p className="text-sm text-white/50">Nenhum comentário ainda.</p>
                )}

                {comments.map((item, index) => (
                  <div key={item.id || index} className="rounded-2xl bg-white/5 p-3">
                    <p className="text-xs font-black text-white/70">{getCommentName(item)}</p>
                    <p className="text-sm text-white">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <input
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none placeholder:text-white/40"
                />

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Escreva seu comentário..."
                    className="min-h-24 w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none placeholder:text-white/40"
                  />

                  <button
                    type="button"
                    onClick={() => setShowEmoji(value => !value)}
                    className="absolute right-3 top-3 text-white"
                  >
                    <Smile />
                  </button>
                </div>

                {showEmoji && (
                  <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white/10 p-3 text-xl">
                    {EMOJIS.map(emoji => (
                      <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}>
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

        {model && showMeasures && (
          <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black/85 p-4">
            <div className="mx-auto flex max-h-[75vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Medidas da modelo
                  </p>
                  <h4 className="text-lg font-black">{model.name}</h4>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMeasures(false)}
                  className="rounded-full bg-slate-100 p-2"
                >
                  <X />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-auto">
                {(modelData || []).map((measure: any, idx: number) => (
                  <div
                    key={`${measure.name}-${idx}`}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"
                  >
                    <span className="font-bold text-slate-700">{measure.name}</span>
                    <span className="font-black text-slate-950">
                      {measure.value}
                      {measure.unit || ''}
                    </span>
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
}
