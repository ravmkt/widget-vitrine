import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Video, resolveStoreId } from '@/lib/db';
import {
  getFloatingConfig,
  getCarouselConfig,
  getGridConfig,
  normalizeModalAppearanceConfig,
  getPrimaryColor,
  getSecondaryColor,
  getTextColor,
  getBackgroundColor,
  getButtonColor,
  getFontFamily,
  getFontSize,
  normalizeStoryFormat,
  type StoryFormat,
  type ModalAppearanceConfig,
  px,
} from '@/lib/storyAppearanceHelpers';
import {
  X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2,
  Volume2, VolumeX, Play, Pause, ExternalLink, Ruler,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractYouTubeId, isVideoPlayableNatively } from '@/lib/videoEmbeds';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

type CommentItem = {
  id?: string; text: string; name?: string; user_name?: string;
  created_at?: string;
};

// ═══════════════════════════════════════════════════════
// HELPERS DE VÍDEO
// ═══════════════════════════════════════════════════════

const getVideoUrl = (v?: Video | null): string => {
  const i = v as any;
  return i?.video_url || i?.videoUrl || i?.url || '';
};

const getVideoThumb = (v?: Video | null): string => {
  const i = v as any;
  return i?.thumbnail_url || i?.thumbnailUrl || i?.poster_url || i?.posterUrl || i?.image_url || i?.imageUrl || '';
};

// ═══════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════

export default function StoryPreviewPage() {
  const { id: storyId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [appearance, setAppearance] = useState<Record<string, any>>({});
  const [videos, setVideos] = useState<Video[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [storeName, setStoreName] = useState('');
  const [settings, setSettings] = useState<any>(null);

  // Player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [videoIdx, setVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Social state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentName, setCommentName] = useState('');

  // Panels
  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sizingModel, setSizingModel] = useState<any>(null);
  const [showSizing, setShowSizing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Carregar dados ───
  useEffect(() => {
    let active = true;
    (async () => {
      if (!storyId) return;
      setLoading(true);
      try {
        const storeId = await resolveStoreId();

        // Carregar story
        const allStories = await db.stories.getAll(storeId);
        const found = allStories.find(s => s.id === storyId);
        if (!active || !found) return;
        setStory(found);

        // Store name
        const stores = await db.stores.getAll(storeId);
        if (stores[0]?.name) setStoreName(stores[0].name);

        // Settings
        const allSettings = await db.generalSettings.getAll(storeId);
        if (allSettings[0]) setSettings(allSettings[0]);

        // Appearance (do story ou default)
        const allAppearances = await db.appearances.getAll(storeId);
        const resolvedAppearance = found.appearance_id
          ? allAppearances.find(a => a.id === found.appearance_id)
          : null;
        const finalAppearance = resolvedAppearance
          || allAppearances.find(a => a.is_default)
          || allAppearances[0]
          || {};
        if (active) setAppearance(finalAppearance as Record<string, any>);

        // Videos do story
        const allStoryVideos = await db.storyVideos.getAll(storeId);
        const allVideos = await db.videos.getAll(storeId);
        const relations = allStoryVideos
          .filter(sv => sv.story_id === storyId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        const storyVideos = relations
          .map(r => allVideos.find(v => v.id === r.video_id))
          .filter((v): v is Video => !!v);
        if (active) setVideos(storyVideos);

        // Likes
        try {
          const likesRaw = localStorage.getItem('story_video_likes');
          const likes = likesRaw ? JSON.parse(likesRaw) : {};
          const firstVideoId = storyVideos[0]?.id;
          if (firstVideoId) {
            setLiked(!!likes[firstVideoId]?.liked);
            setLikeCount(likes[firstVideoId]?.count || 0);
          }
        } catch { /* ignore */ }
      } catch (e) {
        console.error('Erro ao carregar preview:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [storyId]);

  // ─── Load linked data when video changes ───
  useEffect(() => {
    if (!playerOpen || !videos[videoIdx]) return;
    const currentVideo = videos[videoIdx] as any;
    (async () => {
      // Product
      const productId = currentVideo.product_id || currentVideo.productId;
      if (productId) {
        try {
          const storeId = await resolveStoreId();
          const products = await db.products.getAll(storeId);
          setProduct(products.find(p => p.id === productId) || null);
        } catch { setProduct(null); }
      } else {
        setProduct(null);
      }

      // Sizing model
      const modelId = currentVideo.model_id || currentVideo.modelId;
      if (modelId) {
        try {
          const storeId = await resolveStoreId();
          const models = await db.sizingModels.getAll(storeId);
          setSizingModel(models.find(m => m.id === modelId) || null);
        } catch { setSizingModel(null); }
      } else {
        setSizingModel(null);
      }

      // Comments
      try {
        const storeId = await resolveStoreId();
        const allComments = await db.comments.getAll(storeId);
        const filtered = allComments
          .filter((c: any) => c.video_id === currentVideo.id && c.status !== 'rejected')
          .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        setComments(filtered as CommentItem[]);
      } catch { setComments([]); }

      // Likes
      try {
        const likesRaw = localStorage.getItem('story_video_likes');
        const likes = likesRaw ? JSON.parse(likesRaw) : {};
        setLiked(!!likes[currentVideo.id]?.liked);
        setLikeCount(likes[currentVideo.id]?.count || 0);
      } catch { /* ignore */ }
    })();
  }, [playerOpen, videoIdx, videos]);

  // ─── Derived config ───
  const storyFormat: StoryFormat = useMemo(
    () => normalizeStoryFormat(String(story?.format || 'floating_widget')),
    [story],
  );

  const floatCfg = useMemo(() => getFloatingConfig(appearance), [appearance]);
  const carouselCfg = useMemo(() => getCarouselConfig(appearance), [appearance]);
  const gridCfg = useMemo(() => getGridConfig(appearance), [appearance]);
  const modalCfg = useMemo(() => normalizeModalAppearanceConfig(appearance), [appearance]);

  const primaryColor = getPrimaryColor(appearance);
  const secondaryColor = getSecondaryColor(appearance);
  const textColor = getTextColor(appearance);
  const bgColor = getBackgroundColor(appearance);
  const buttonColor = getButtonColor(appearance);
  const fontFamily = getFontFamily(appearance);
  const fontSize = getFontSize(appearance);

  const currentVideo = videos[videoIdx] || null;
  const currentUrl = getVideoUrl(currentVideo);
  const currentThumb = getVideoThumb(currentVideo);

  // ─── Handlers ───
  const openPlayer = (idx = 0) => {
    setVideoIdx(idx);
    setPlayerOpen(true);
    setPlaying(true);
    setMuted(true);
    setProgress(0);
  };

  const closePlayer = () => {
    setPlayerOpen(false);
    setPlaying(false);
    setShowComments(false);
    setShowShare(false);
    setShowSizing(false);
  };

  const goNext = () => {
    if (videoIdx < videos.length - 1) {
      setVideoIdx(v => v + 1);
      setPlaying(true);
      setProgress(0);
    } else {
      closePlayer();
    }
  };

  const goPrev = () => {
    if (videoIdx > 0) {
      setVideoIdx(v => v - 1);
      setPlaying(true);
      setProgress(0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); }
    else { videoRef.current.play().catch(() => {}); }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const handleLike = () => {
    if (!currentVideo?.id) return;
    try {
      const raw = localStorage.getItem('story_video_likes');
      const likes = raw ? JSON.parse(raw) : {};
      const cur = likes[currentVideo.id] || { liked: false, count: 0 };
      const nextLiked = !cur.liked;
      const nextCount = Math.max(0, cur.count + (nextLiked ? 1 : -1));
      likes[currentVideo.id] = { liked: nextLiked, count: nextCount };
      localStorage.setItem('story_video_likes', JSON.stringify(likes));
      setLiked(nextLiked);
      setLikeCount(nextCount);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/stories/preview/${storyId}?videoId=${currentVideo?.id || ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: story?.title || 'Story', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch { /* user cancelled */ }
  };

  const submitComment = async () => {
    const name = commentName.trim() || 'Anônimo';
    const text = commentText.trim();
    if (!text) return;
    const newComment: CommentItem = {
      id: `${Date.now()}`,
      text, name, user_name: name,
      created_at: new Date().toISOString(),
    };
    setComments(prev => [...prev, newComment]);
    setCommentText('');
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-white">
        Story não encontrado
      </div>
    );
  }

  // ─── Floating Widget ───
  const renderFloating = () => {
    const f = floatCfg;
    const firstVideo = videos[0];
    const thumb = getVideoThumb(firstVideo);
    const videoUrl = getVideoUrl(firstVideo);
    const isVideo = videoUrl && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(videoUrl);

    const posStyle: CSSProperties = {
      position: 'fixed',
      top: f.top, right: f.right, bottom: f.bottom, left: f.left,
      zIndex: f.zIndex,
    };

    return (
      <div style={posStyle}>
        <div
          onClick={() => openPlayer(0)}
          style={{
            width: f.width,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          {/* Ring with border */}
          <div style={{ position: 'relative', width: f.width, height: f.height }}>
            <div
              style={{
                width: f.width, height: f.height,
                borderRadius: f.radius,
                padding: f.borderWidth,
                background: f.borderColor || `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: '0 12px 30px rgba(15,23,42,.18)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'relative', width: '100%', height: '100%',
                  borderRadius: f.innerRadius, overflow: 'hidden', background: '#000',
                }}
              >
                {isVideo ? (
                  <video
                    src={videoUrl} poster={thumb || undefined}
                    className="absolute inset-0 h-full w-full"
                    style={{ objectFit: f.objectFit as any }}
                    muted loop autoPlay playsInline
                  />
                ) : thumb ? (
                  <img src={thumb} alt={story.title || ''} className="absolute inset-0 h-full w-full" style={{ objectFit: f.objectFit as any }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-800">
                    <Play size={20} className="text-white/60" />
                  </div>
                )}

                {f.showPlayButton && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full" style={{ background: 'rgba(15,23,42,.62)' }}>
                      <Play size={15} className="text-white ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {f.allowClose && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                className="absolute -top-3.5 -right-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow"
                style={{ pointerEvents: 'auto' }}
              >
                <X size={14} className="text-slate-800" />
              </button>
            )}
          </div>

          {f.showTitle && (
            <span
              className="block truncate text-center text-[11px] font-bold"
              style={{ width: f.width, maxWidth: f.width, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.8)' }}
            >
              {story.title || ''}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ─── Carousel ───
  const renderCarousel = () => {
    const c = carouselCfg;
    const cardWidthVw = `${c.size}vw`;
    const borderRadius = c.shape === 'circle' ? '50%' : `${c.borderRadius}px`;

    return (
      <div style={{ maxWidth: 'min(100vw, calc(100% - 32px))', margin: '20px auto', fontFamily }} className="relative">
        <button onClick={() => navigate(-1)} className="absolute -top-3 right-0 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white">
          <X size={18} />
        </button>

        <div
          className="flex gap-0 overflow-x-auto pb-2"
          style={{ gap: `${c.spacing}px`, scrollSnapType: 'x mandatory', scrollbarWidth: 'none', padding: '0 4px' }}
        >
          {videos.map((video, idx) => {
            const thumb = getVideoThumb(video);
            const videoUrl = getVideoUrl(video);
            const isVideo = videoUrl && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(videoUrl);
            return (
              <button
                key={video.id || idx}
                onClick={() => openPlayer(idx)}
                className="group relative flex flex-col items-center"
                style={{
                  flex: `0 0 ${cardWidthVw}`, minWidth: '40px',
                  scrollSnapAlign: 'start',
                }}
              >
                <div
                  className="relative w-full overflow-hidden transition-transform group-hover:-translate-y-0.5"
                  style={{
                    aspectRatio: c.aspectRatio,
                    borderRadius,
                    border: `${c.borderWidth}px solid ${c.borderColor}`,
                    background: '#000',
                  }}
                >
                  {isVideo ? (
                    <video src={videoUrl} poster={thumb || undefined}
                      className="absolute inset-0 h-full w-full" style={{ objectFit: c.objectFit as any }}
                      muted loop autoPlay playsInline />
                  ) : thumb ? (
                    <img src={thumb} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: c.objectFit as any }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800 text-white/40">
                      <Play size={18} />
                    </div>
                  )}

                  {c.showPlayButton && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:scale-110 transition" style={{ pointerEvents: 'none' }}>
                      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.6)' }}>
                        <Play size={18} className="text-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {c.showTitle && (
                  <span className="mt-2 w-full truncate px-1 text-center text-xs font-semibold" style={{ color: textColor }}>
                    {story.title || video.title || 'Ver vídeo'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Grid ───
  const renderGrid = () => {
    const g = gridCfg;
    const borderRadius = g.shape === 'circle' ? '50%' : `${g.borderRadius}px`;

    return (
      <div style={{ maxWidth: '100%', margin: '20px auto', padding: '0 16px', fontFamily }} className="relative">
        <button onClick={() => navigate(-1)} className="absolute -top-3 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white">
          <X size={18} />
        </button>

        <div className="grid" style={{ gridTemplateColumns: `repeat(${g.columns}, minmax(0, 1fr))`, gap: `${g.spacing}px` }}>
          {videos.map((video, idx) => {
            const thumb = getVideoThumb(video);
            const videoUrl = getVideoUrl(video);
            const isVideo = videoUrl && /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(videoUrl);
            return (
              <button
                key={video.id || idx}
                onClick={() => openPlayer(idx)}
                className="group relative flex flex-col items-center"
              >
                <div
                  className="relative w-full overflow-hidden transition-transform group-hover:-translate-y-0.5"
                  style={{
                    aspectRatio: g.aspectRatio,
                    borderRadius,
                    border: `${g.borderWidth}px solid ${g.borderColor}`,
                    background: '#000',
                  }}
                >
                  {isVideo ? (
                    <video src={videoUrl} poster={thumb || undefined}
                      className="absolute inset-0 h-full w-full" style={{ objectFit: g.objectFit as any }}
                      muted loop autoPlay playsInline />
                  ) : thumb ? (
                    <img src={thumb} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: g.objectFit as any }} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-800 text-white/40">
                      <Play size={16} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:scale-110 transition" style={{ pointerEvents: 'none' }}>
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.6)' }}>
                      <Play size={16} className="text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {g.showTitle && (
                  <span className="mt-2 w-full truncate px-1 text-center text-xs font-semibold" style={{ color: textColor }}>
                    {video.title || story.title || ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Modal Player ───
  const renderPlayer = () => {
    if (!playerOpen || !currentVideo) return null;
    const m = modalCfg;
    const borderW = parseInt(m.border_width || '0', 10);
    const borderRad = m.border_radius ? `${m.border_radius}px` : '0px';
    const ytId = !isVideoPlayableNatively(currentVideo as any) ? extractYouTubeId(currentUrl) : '';

    const whatsappNumber = String(settings?.whatsapp_number || settings?.whatsappNumber || '').replace(/\D/g, '');

    return (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95"
        style={{ fontFamily }}
        onClick={(e) => { if (e.target === e.currentTarget) closePlayer(); }}
      >
        <div
          className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-black sm:h-[94vh] sm:rounded-2xl"
          style={{
            borderColor: borderW > 0 ? (m.border_color || primaryColor) : 'transparent',
            borderWidth: borderW > 0 ? `${borderW}px` : '0px',
            borderStyle: borderW > 0 ? 'solid' : 'none',
            borderRadius: borderRad,
            boxShadow: m.shadow_enabled ? '0 20px 60px rgba(0,0,0,.5)' : undefined,
          }}
        >
          {/* Progress bars */}
          {videos.length > 1 && (
            <div className="absolute left-3 right-3 top-3 z-50 flex gap-1.5">
              {videos.map((_, idx) => (
                <div key={idx} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: idx < videoIdx ? '100%' : idx === videoIdx ? `${progress}%` : '0%',
                      backgroundColor: primaryColor,
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div className="absolute left-0 right-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-4 pt-5">
            {m.show_title ? (
              <div className="min-w-0 pr-12">
                <h3 className="truncate text-sm font-bold text-white">{story.title || 'Story'}</h3>
                <p className="text-[10px] font-bold uppercase text-white/60">
                  {storeName}{videos.length > 1 ? ` • ${videoIdx + 1}/${videos.length}` : ''}
                </p>
              </div>
            ) : <div />}
            <div className="flex items-center gap-2">
              {/* Mute */}
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60">
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              {/* Play/Pause */}
              {m.show_play_button && (
                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60">
                  {playing ? <Pause size={20} /> : <Play size={20} />}
                </button>
              )}
              {/* Close */}
              <button onClick={(e) => { e.stopPropagation(); closePlayer(); }} className="rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Video */}
          <div className="relative flex-1 bg-black">
            {ytId ? (
              <iframe
                key={currentVideo.id}
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={story.title || 'Story'}
              />
            ) : currentUrl ? (
              <video
                key={currentVideo.id}
                ref={videoRef}
                src={currentUrl}
                poster={currentThumb || undefined}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted={muted}
                playsInline
                loop
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  if (el.duration) setProgress((el.currentTime / el.duration) * 100);
                }}
                onEnded={goNext}
              />
            ) : currentThumb ? (
              <img src={currentThumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/50">Nenhum vídeo</div>
            )}
          </div>

          {/* Nav arrows */}
          {videos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60">
                <ChevronLeft size={24} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60">
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Social buttons */}
          <div className="absolute right-3 z-30 flex flex-col gap-3" style={{ bottom: product && m.show_product ? '120px' : '16px' }}>
            {m.show_like_button && (
              <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition hover:brightness-110" style={{ backgroundColor: primaryColor }}>
                  <Heart size={20} className={cn(liked ? 'fill-rose-500 text-rose-500' : 'text-white')} />
                </span>
                {likeCount > 0 && <span className="text-[10px] font-bold text-white">{likeCount}</span>}
              </button>
            )}
            {m.show_comment_button && (
              <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-105">
                  <MessageCircle size={22} className="text-slate-900" />
                </span>
                {comments.length > 0 && <span className="text-[10px] font-bold text-white">{comments.length}</span>}
              </button>
            )}
            {m.show_share_button && (
              <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur transition hover:brightness-110" style={{ backgroundColor: primaryColor }}>
                <Share2 size={20} />
              </button>
            )}
            {m.show_sizing_button && sizingModel && (
              <button onClick={(e) => { e.stopPropagation(); setShowSizing(true); }} className="flex h-11 w-11 items-center justify-center rounded-full text-white backdrop-blur transition hover:brightness-110" style={{ backgroundColor: primaryColor }}>
                <Ruler size={20} />
              </button>
            )}
            {m.show_whatsapp_button && (
              <a
                href={whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#'}
                target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:brightness-110"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.53 4.04 11.815 11.815 0 0 0 12.05 0z" />
                </svg>
              </a>
            )}
          </div>

          {/* Product card */}
          {m.show_product && product && (
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10">
              <div className="flex items-center gap-3 rounded-2xl border border-white/20 p-3 shadow-2xl" style={{ backgroundColor: bgColor }}>
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name || 'Produto'} className="h-full w-full object-cover" />
                  ) : <div className="h-full w-full bg-slate-200" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" style={{ color: textColor }}>{product.name || 'Produto'}</p>
                  {product.price != null && Number(product.price) > 0 && (
                    <p className="text-sm font-extrabold" style={{ color: primaryColor }}>
                      R$ {Number(product.price).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <div className="mt-1.5 flex gap-2">
                    {m.show_product_button && (
                      <a
                        href={product.product_url || product.url || '#'}
                        target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: buttonColor }}
                      >
                        <ExternalLink size={12} /> Ver no site
                      </a>
                    )}
                    {m.show_product_whatsapp_button && whatsappNumber && (
                      <a
                        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name || ''}`)}`}
                        target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments panel */}
          {showComments && (
            <div className="absolute inset-0 z-[60] flex flex-col bg-black/95 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-bold text-white">Comentários</h4>
                <button onClick={() => setShowComments(false)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {comments.length === 0 && <p className="text-sm text-white/50">Nenhum comentário ainda.</p>}
                {comments.map((c, i) => (
                  <div key={c.id || i} className="rounded-xl bg-white/5 p-3">
                    <p className="text-xs font-bold text-white/70">{c.user_name || c.name || 'Anônimo'}</p>
                    <p className="whitespace-pre-wrap text-sm text-white">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <input
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-xl bg-white/10 p-2.5 text-sm text-white outline-none placeholder:text-white/40"
                />
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl bg-white/10 p-2.5 text-sm text-white outline-none placeholder:text-white/40"
                  />
                  <button
                    onClick={submitComment}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ backgroundColor: buttonColor }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sizing panel */}
          {showSizing && sizingModel && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setShowSizing(false)}>
              <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={e => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medidas</p>
                    <h4 className="text-lg font-bold text-slate-900">{sizingModel.name || 'Modelo'}</h4>
                  </div>
                  <button onClick={() => setShowSizing(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  {Array.isArray(sizingModel.measures) && sizingModel.measures.length > 0 ? (
                    sizingModel.measures.map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                        <span className="font-semibold text-slate-700">{m.name || m.label || `Medida ${i + 1}`}</span>
                        <span className="font-bold text-slate-900">{m.value || m.size || '-'}{m.unit || ''}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sem medidas cadastradas.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Share toast */}
          {shareCopied && (
            <div className="absolute bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-lg">
              Link copiado!
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Return ───
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ fontFamily, background: '#f1f5f9' }}>
      {/* Simulated store page */}
      <div className="mx-auto max-w-[1200px] p-4">
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
              {(storeName || 'L').charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{storeName || 'Loja'}</p>
              <p className="text-[10px] text-slate-400">Preview do Story • {storyFormat === 'floating_widget' ? 'Flutuante' : storyFormat === 'carousel' ? 'Carrossel' : 'Grade'}</p>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
            ← Voltar
          </button>
        </div>

        {/* Placeholder store content */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white/60" />
          ))}
        </div>
      </div>

      {/* Display mode — only the one matching story.format */}
      {storyFormat === 'floating_widget' && videos.length > 0 && renderFloating()}
      {storyFormat === 'carousel' && videos.length > 0 && renderCarousel()}
      {storyFormat === 'grid' && videos.length > 0 && renderGrid()}

      {videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Play size={48} className="mb-4 opacity-30" />
          <p className="font-bold">Nenhum vídeo vinculado a este story.</p>
        </div>
      )}

      {/* Modal Player */}
      {renderPlayer()}
    </div>
  );
}
