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
  readAppearanceValue,
  type StoryFormat,
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

const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

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
  const [carouselOffset, setCarouselOffset] = useState(0);

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
  const [shareCopied, setShareCopied] = useState(false);
  const [sizingModel, setSizingModel] = useState<any>(null);
  const [showSizing, setShowSizing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Drag state (carrossel com transform) ───
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragCarousel = useRef({ isDown: false, startX: 0, startOffset: 0, moved: false });

  // ─── getAllSafe ───
  const getAllSafe = async <T,>(collection: any, sid?: string): Promise<T[]> => {
    if (!collection?.getAll) return [];
    try {
      if (sid) return await collection.getAll(sid);
      return await collection.getAll();
    } catch {
      try { return await collection.getAll(); } catch { return []; }
    }
  };

  // ─── Carregar dados ───
  useEffect(() => {
    let active = true;
    (async () => {
      if (!storyId) return;
      setLoading(true);
      try {
        const storeId = await resolveStoreId();
        const [allStories, stores, allSettings, allAppearances, storyRelations, allVideos] = await Promise.all([
          getAllSafe<any>(db.stories, storeId),
          getAllSafe<any>(db.stores, storeId),
          getAllSafe<any>(db.generalSettings, storeId),
          getAllSafe<any>(db.appearances, storeId),
          getAllSafe<any>(db.storyVideos, storeId),
          getAllSafe<Video>(db.videos, storeId),
        ]);

        const found = allStories.find((s: any) => s.id === storyId);
        if (!active || !found) { if (active) setLoading(false); return; }
        setStory(found);
        if (stores[0]?.name) setStoreName(stores[0].name);
        if (allSettings[0]) setSettings(allSettings[0]);

        const resolvedAppearance = found.appearance_id
          ? allAppearances.find((a: any) => a.id === found.appearance_id) : null;
        const finalAppearance = resolvedAppearance
          || allAppearances.find((a: any) => a.is_default)
          || allAppearances[0] || {};
        if (active) setAppearance(finalAppearance as Record<string, any>);

        const relations = (storyRelations || [])
          .filter((sv: any) => sv.story_id === storyId && (!sv.store_id || sv.store_id === storeId))
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));
        const storyVideos = relations
          .map((r: any) => allVideos.find((v: any) => v.id === r.video_id))
          .filter((v): v is Video => !!v);
        if (active) { setVideos(storyVideos); setCarouselOffset(0); }
      } catch (e) {
        console.error('[StoryPreview] Erro:', e);
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
      const productId = currentVideo.product_id || currentVideo.productId;
      if (productId) {
        try { const storeId = await resolveStoreId(); const p = await db.products.getAll(storeId); setProduct(p.find(x => x.id === productId) || null); }
        catch { setProduct(null); }
      } else setProduct(null);

      const modelId = currentVideo.model_id || currentVideo.modelId;
      if (modelId) {
        try { const storeId = await resolveStoreId(); const m = await db.sizingModels.getAll(storeId); setSizingModel(m.find(x => x.id === modelId) || null); }
        catch { setSizingModel(null); }
      } else setSizingModel(null);

      try {
        const storeId = await resolveStoreId();
        const all = await db.comments.getAll(storeId);
        setComments(all.filter((c: any) => c.video_id === currentVideo.id && c.status !== 'rejected')
          .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) as CommentItem[]);
      } catch { setComments([]); }

      try {
        const raw = localStorage.getItem('story_video_likes');
        const likes = raw ? JSON.parse(raw) : {};
        setLiked(!!likes[currentVideo.id]?.liked);
        setLikeCount(likes[currentVideo.id]?.count || 0);
      } catch { /* ignore */ }
    })();
  }, [playerOpen, videoIdx, videos]);

  // ─── Derived config ───
  const storyFormat: StoryFormat = useMemo(() => normalizeStoryFormat(String(story?.format || 'floating_widget')), [story]);
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
  const openPlayer = (idx = 0) => { setVideoIdx(idx); setPlayerOpen(true); setPlaying(true); setMuted(true); setProgress(0); };
  const closePlayer = () => { setPlayerOpen(false); setPlaying(false); setShowComments(false); setShowSizing(false); };
  const goNext = () => { if (videoIdx < videos.length - 1) { setVideoIdx(v => v + 1); setPlaying(true); setProgress(0); } else closePlayer(); };
  const goPrev = () => { if (videoIdx > 0) { setVideoIdx(v => v - 1); setPlaying(true); setProgress(0); } };
  const togglePlay = () => { if (!videoRef.current) return; if (playing) videoRef.current.pause(); else videoRef.current.play().catch(() => {}); };
  const toggleMute = () => { const n = !muted; setMuted(n); if (videoRef.current) videoRef.current.muted = n; };

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
      setLiked(nextLiked); setLikeCount(nextCount);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/stories/preview/${storyId}?videoId=${currentVideo?.id || ''}`;
    try {
      if (navigator.share) await navigator.share({ title: story?.title || 'Story', url });
      else { await navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }
    } catch { /* cancelled */ }
  };

  const submitComment = () => {
    const name = commentName.trim() || 'Anônimo';
    const text = commentText.trim();
    if (!text) return;
    setComments(prev => [...prev, { id: `${Date.now()}`, text, name, user_name: name, created_at: new Date().toISOString() }]);
    setCommentText('');
  };

  // ═══════════════════════════════════════════════════════
  // DRAG DO CARROSSEL (transform: translateX)
  // ═══════════════════════════════════════════════════════

  const getCarouselDragConfig = () => {
    const { visibleItems, size, spacing } = carouselCfg;
    const isCircle = carouselCfg.shape === 'circle';
    const circlePad = isCircle ? Math.round(size * 0.15) : 0;
    const padX = circlePad + 4;

    const cardStep = size + spacing;
    const viewportW = visibleItems * size + (visibleItems - 1) * spacing + 2 * padX;
    const totalW = videos.length * size + (videos.length - 1) * spacing + 2 * padX;
    const maxOffset = Math.max(0, totalW - viewportW);

    return { padX, cardStep, viewportW, maxOffset };
  };

  const snapToNearestCard = (offset: number) => {
    const { padX, cardStep, maxOffset } = getCarouselDragConfig();
    const rawIdx = (offset + padX) / cardStep;
    const idx = Math.round(rawIdx);
    return Math.max(0, Math.min(maxOffset, idx * cardStep - padX));
  };

  const handleCarouselDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragCarousel.current = { isDown: true, startX: clientX, startOffset: carouselOffset, moved: false };
  };

  const handleCarouselMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragCarousel.current.isDown) return;
    const { maxOffset } = getCarouselDragConfig();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const dx = dragCarousel.current.startX - clientX;
    const newOffset = Math.max(0, Math.min(maxOffset, dragCarousel.current.startOffset + dx));
    setCarouselOffset(newOffset);
    if (Math.abs(dx) > 5) dragCarousel.current.moved = true;
  };

  const handleCarouselUp = () => {
    if (!dragCarousel.current.isDown) return;
    dragCarousel.current.isDown = false;
    if (dragCarousel.current.moved) {
      const snapped = snapToNearestCard(carouselOffset);
      setCarouselOffset(snapped);
    }
  };

  // ─── Loading ───
  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-slate-950"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>;
  if (!story) return <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-white">Story não encontrado</div>;

  // ═══════════════════════════════════════════════════════
  // FLOATING WIDGET
  // ═══════════════════════════════════════════════════════
  const renderFloating = () => {
    const f = floatCfg;
    const firstVideo = videos[0];
    const thumb = getVideoThumb(firstVideo);
    const videoUrl = getVideoUrl(firstVideo);

    return (
      <div style={{ position: 'fixed', top: f.top, right: f.right, bottom: f.bottom, left: f.left, zIndex: f.zIndex }}>
        <div onClick={() => openPlayer(0)} style={{ width: f.width, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <div style={{ position: 'relative', width: f.width, height: f.height }}>
            <div style={{ width: f.width, height: f.height, borderRadius: f.radius, padding: f.borderWidth, background: f.borderColor || `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: '0 12px 30px rgba(15,23,42,.18)', overflow: 'hidden' }}>
              <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: f.innerRadius, overflow: 'hidden', background: '#000' }}>
                {isVideoFile(videoUrl) ? (
                  <video src={videoUrl} poster={thumb || undefined} className="absolute inset-0 h-full w-full" style={{ objectFit: f.objectFit as any }} muted loop autoPlay playsInline />
                ) : thumb ? (
                  <img src={thumb} alt={story.title || ''} className="absolute inset-0 h-full w-full" style={{ objectFit: f.objectFit as any }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-800"><Play size={20} className="text-white/60" /></div>
                )}
                {f.showPlayButton && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full" style={{ background: 'rgba(15,23,42,.62)' }}><Play size={15} className="text-white ml-0.5" /></div>
                  </div>
                )}
              </div>
            </div>
            {f.allowClose && (
              <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="absolute -top-3.5 -right-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow" style={{ pointerEvents: 'auto' }}>
                <X size={14} className="text-slate-800" />
              </button>
            )}
          </div>
          {f.showTitle && (
            <span className="block truncate text-center text-[11px] font-bold" style={{ width: f.width, maxWidth: f.width, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>{story.title || ''}</span>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // INLINE WIDGET (Carousel or Grid)
  // ═══════════════════════════════════════════════════════
  const renderInlineWidget = (isGrid: boolean) => {
    const cfg = isGrid ? gridCfg : carouselCfg;

    const isCircle = cfg.shape === 'circle';
    const columns = isGrid ? (cfg as any).columns : (cfg as any).visibleItems;
    const size = cfg.size;

    const circlePad = isCircle && !isGrid ? Math.round(size * 0.15) : 0;
    const padX = circlePad + 4;

    const cardSize = `${size}px`;
    const borderRadius = isCircle ? '50%' : `${cfg.borderRadius}px`;

    // ── Viewport: centralizado, tamanho exato para N cards ──
    const viewportW = isGrid
      ? columns * size + (columns - 1) * cfg.spacing
      : columns * size + (columns - 1) * cfg.spacing + 2 * padX;

    return (
      <div style={{
        width: '100%',
        maxWidth: '100%',
        margin: '20px auto',
        padding: '0 4px',
        fontFamily,
        clear: 'both',
        overflow: 'visible',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          width: `${viewportW}px`,
          maxWidth: '100%',
          overflow: isGrid ? 'visible' : 'hidden',
          flexShrink: 0,
        }}>
          <div
            ref={sliderRef}
            onMouseDown={!isGrid ? (e) => handleCarouselDown(e) : undefined}
            onMouseMove={!isGrid ? (e) => handleCarouselMove(e) : undefined}
            onMouseUp={!isGrid ? handleCarouselUp : undefined}
            onMouseLeave={!isGrid ? handleCarouselUp : undefined}
            onTouchStart={!isGrid ? (e) => handleCarouselDown(e) : undefined}
            onTouchMove={!isGrid ? (e) => handleCarouselMove(e) : undefined}
            onTouchEnd={!isGrid ? handleCarouselUp : undefined}
            className="flex"
            style={{
              flexWrap: isGrid ? 'wrap' : 'nowrap',
              gap: `${cfg.spacing}px`,
              padding: isGrid ? '0 4px' : `0 ${padX}px`,
              width: isGrid ? '100%' : 'max-content',
              justifyContent: 'center',
              cursor: isGrid ? 'auto' : 'grab',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              transform: isGrid ? undefined : `translateX(-${carouselOffset}px)`,
              transition: dragCarousel.current.isDown ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            } as CSSProperties}
          >
            {videos.map((video, idx) => {
              const thumb = getVideoThumb(video);
              const videoUrl = getVideoUrl(video);
              return (
                <button
                  key={video.id || idx}
                  onClick={() => { if (!dragCarousel.current.moved) openPlayer(idx); }}
                  className="group relative"
                  style={{
                    all: 'unset',
                    flex: `0 0 ${cardSize}`,
                    minWidth: 0,
                    maxWidth: cardSize,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                  } as CSSProperties}
                >
                  <div className="relative w-full overflow-hidden" style={{
                    aspectRatio: cfg.aspectRatio,
                    borderRadius,
                    border: `${cfg.borderWidth}px solid ${cfg.borderColor}`,
                    background: '#000',
                  }}>
                    {isVideoFile(videoUrl) ? (
                      <video src={videoUrl} poster={thumb || undefined} className="absolute inset-0 h-full w-full pointer-events-none" style={{ objectFit: cfg.objectFit as any }} muted loop autoPlay playsInline />
                    ) : thumb ? (
                      <img src={thumb} alt="" className="absolute inset-0 h-full w-full pointer-events-none" style={{ objectFit: cfg.objectFit as any }} loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800 text-white/40"><Play size={18} /></div>
                    )}
                    {(cfg as any).showPlayButton && (
                      <div className="absolute inset-0 flex items-center justify-center transition group-hover:scale-110" style={{ pointerEvents: 'none' }}>
                        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.6)' }}><Play size={18} className="text-white ml-0.5" /></div>
                      </div>
                    )}
                  </div>
                  {cfg.showTitle && (
                    <span className="mt-2 w-full truncate px-1 text-center text-xs font-semibold" style={{ color: textColor }}>
                      {story.title || video.title || 'Ver vídeo'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // MODAL PLAYER
  // ═══════════════════════════════════════════════════════
  const renderPlayer = () => {
    if (!playerOpen || !currentVideo) return null;
    const m = modalCfg;
    const modalBorderWidth = parseInt(m.border_width || '0', 10);
    const modalBorderRadius = parseInt(m.border_radius || '0', 10);
    const modalBackground = readAppearanceValue(appearance, ['modal_background_color', 'modalBackgroundColor', 'background_color', 'backgroundColor']) || bgColor;
    const modalText = readAppearanceValue(appearance, ['modal_text_color', 'modalTextColor', 'text_color', 'textColor']) || textColor;
    const modalBorder = readAppearanceValue(appearance, ['modal_border_color', 'modalBorderColor']) || 'rgba(15,23,42,.12)';
    const shadow = m.shadow_enabled !== false ? '0 24px 80px rgba(15,23,42,.24)' : 'none';
    const ytId = !isVideoPlayableNatively(currentVideo as any) ? extractYouTubeId(currentUrl) : '';
    const whatsappNumber = String(settings?.whatsapp_number || settings?.whatsappNumber || '').replace(/\D/g, '');

    const ctrlBtn: CSSProperties = {
      width: '32px', height: '32px', borderRadius: '999px', background: 'rgba(0,0,0,.4)',
      backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: '#fff', border: '1px solid rgba(255,255,255,.8)', flexShrink: 0, padding: 0,
    };
    const socialBtn: CSSProperties = {
      width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', borderRadius: '999px',
      border: '1px solid rgba(255,255,255,.8)', background: 'rgba(0,0,0,.1)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', flexShrink: 0, padding: 0,
    };

    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ fontFamily, background: 'rgba(15,23,42,.62)', fontSize: `${fontSize}px` }} onClick={(e) => { if (e.target === e.currentTarget) closePlayer(); }}>
        <div data-vl-modal className="relative flex flex-col overflow-hidden" style={{ width: '100%', maxWidth: '420px', height: '100%', maxHeight: '100vh', background: modalBackground, color: modalText, boxShadow: shadow, border: `${modalBorderWidth}px solid ${m.border_color || 'transparent'}`, borderRadius: `${modalBorderRadius}px` } as CSSProperties}>
          <style>{`@media(min-width:640px){[data-vl-modal]{height:auto!important;aspect-ratio:9/16!important;max-height:90vh!important;border-radius:${modalBorderRadius > 0 ? modalBorderRadius : 36}px!important;}}`}</style>

          {/* Progress bars */}
          {videos.length > 1 && (
            <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, zIndex: 50, display: 'flex', gap: '6px', padding: '0 16px' }}>
              {videos.map((_, idx) => (
                <div key={idx} style={{ height: '2px', flex: 1, borderRadius: '999px', background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '999px', background: primaryColor, transition: 'width .3s ease', width: idx < videoIdx ? '100%' : idx === videoIdx ? `${progress}%` : '0%' }} />
                </div>
              ))}
            </div>
          )}

          {/* Header: MUTE | PLAY | CLOSE */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 16px 16px', background: 'linear-gradient(to bottom, rgba(0,0,0,.7), transparent)', pointerEvents: 'none' }}>
            {m.show_title ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1, paddingRight: '48px', pointerEvents: 'auto' }}>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{story.title || ''}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase' }}>{storeName}{videos.length > 1 ? ` • ${videoIdx + 1}/${videos.length}` : ''}</span>
              </div>
            ) : <div />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexShrink: 0 }}>
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} style={ctrlBtn}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} style={ctrlBtn}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
              <button onClick={(e) => { e.stopPropagation(); closePlayer(); }} style={ctrlBtn}><X size={18} /></button>
            </div>
          </div>

          {/* Video body */}
          <div style={{ position: 'relative', display: 'block', flex: '1 1 auto', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', background: '#000' }}>
            {ytId ? (
              <iframe key={currentVideo.id} src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title={story.title || 'Story'} />
            ) : currentUrl ? (
              <video key={currentVideo.id} ref={videoRef} src={currentUrl} poster={currentThumb || undefined} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted={muted} playsInline loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => { const el = e.currentTarget; if (el.duration) setProgress((el.currentTime / el.duration) * 100); }} onEnded={goNext} />
            ) : currentThumb ? (
              <img src={currentThumb} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)' }}>Nenhum vídeo</div>}

            {/* Nav arrows */}
            {videos.length > 1 && (<>
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }} style={{ position: 'absolute', left: '10px', top: '42%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '999px', background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 35, border: '1px solid rgba(255,255,255,.35)' }}><ChevronLeft size={18} className="text-white" /></button>
              <button onClick={(e) => { e.stopPropagation(); goNext(); }} style={{ position: 'absolute', right: '10px', top: '42%', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '999px', background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 35, border: '1px solid rgba(255,255,255,.35)' }}><ChevronRight size={18} className="text-white" /></button>
            </>)}
          </div>

          {/* Social buttons */}
          <div style={{ position: 'absolute', top: 'calc(42% + 180px)', right: '12px', transform: 'translateY(-50%)', zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {m.show_like_button && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button onClick={(e) => { e.stopPropagation(); handleLike(); }} style={socialBtn}><Heart size={18} className={cn(liked ? 'fill-rose-500 text-rose-500' : 'text-white')} /></button>
                {likeCount > 0 && <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)', marginTop: '4px' }}>{likeCount}</span>}
              </div>
            )}
            {m.show_comment_button && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} style={socialBtn}><MessageCircle size={18} className="text-white" /></button>
                {comments.length > 0 && <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)', marginTop: '4px' }}>{comments.length}</span>}
              </div>
            )}
            {m.show_share_button && <button onClick={(e) => { e.stopPropagation(); handleShare(); }} style={socialBtn}><Share2 size={18} className="text-white" /></button>}
            {m.show_sizing_button && sizingModel && <button onClick={(e) => { e.stopPropagation(); setShowSizing(true); }} style={socialBtn}><Ruler size={18} className="text-white" /></button>}
          </div>

          {/* Product footer */}
          {m.show_product && product && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.5), transparent)', padding: '40px 16px 16px', pointerEvents: 'none' }}>
              <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '24px', border: `1px solid ${modalBorder}`, padding: '12px', background: bgColor, boxShadow: shadow }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: '#e2e8f0', flex: '0 0 auto', overflow: 'hidden' }}>
                  {product.image_url && <img src={product.image_url} alt={product.name || 'Produto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 800, fontSize: '13px', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name || 'Produto'}</p>
                  {product.price != null && Number(product.price) > 0 && <p style={{ marginTop: '4px', fontWeight: 800, fontSize: '16px', color: secondaryColor }}>R$ {Number(product.price).toFixed(2).replace('.', ',')}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {m.show_product_button && (
                      <a href={product.product_url || product.url || '#'} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '999px', padding: '6px 12px', background: buttonColor, color: '#fff', fontSize: '11px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}><ExternalLink size={12} /> Ver no site</a>
                    )}
                    {m.show_product_whatsapp_button && whatsappNumber && (
                      <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${product.name || ''}`)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '999px', padding: '6px 12px', background: '#25d366', color: '#fff', fontSize: '11px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>WhatsApp</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments panel */}
          {showComments && (
            <div style={{ position: 'absolute', inset: '8px', zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', border: `2px solid ${primaryColor}`, borderRadius: '20px', boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: '48px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>Comentários</h3>
                <button onClick={() => setShowComments(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={20} className="text-slate-600" /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
                {comments.length === 0 && <p style={{ fontSize: '14px', color: '#334155', textAlign: 'center', padding: '40px 10px' }}>Nenhum comentário ainda.</p>}
                {comments.map((c, i) => (
                  <div key={c.id || i} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '34px', height: '34px', minWidth: '34px', borderRadius: '50%', background: primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>{(c.user_name || c.name || 'A').charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{c.user_name || c.name || 'Anônimo'}</span>
                      <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Seu nome" style={{ width: '100%', height: '40px', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#0f172a', outline: 'none', background: '#f8fafc' }} />
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Escreva seu comentário..." style={{ width: '100%', minHeight: '70px', maxHeight: '70px', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#0f172a', outline: 'none', resize: 'none', background: '#f8fafc' }} />
                <button onClick={submitComment} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '12px', background: buttonColor, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Enviar comentário</button>
              </div>
            </div>
          )}

          {/* Sizing panel */}
          {showSizing && sizingModel && (
            <div style={{ position: 'absolute', zIndex: 70, display: 'flex', flexDirection: 'column', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'calc(100% - 40px)', maxWidth: '340px', maxHeight: '62%', overflow: 'hidden', background: '#fff', borderRadius: '24px', boxShadow: '0 18px 50px rgba(0,0,0,.32)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: primaryColor }}>Medidas da modelo</span>
                <button onClick={() => setShowSizing(false)} style={{ width: '36px', height: '36px', borderRadius: '999px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}><X size={20} className="text-slate-600" /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>
                {Array.isArray(sizingModel.measures) && sizingModel.measures.length > 0 ? (
                  sizingModel.measures.map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', background: '#f6f8fb', borderRadius: '14px', marginBottom: '9px' }}>
                      <span style={{ fontWeight: 800, color: '#475569' }}>{item.name || item.label || `Medida ${i + 1}`}</span>
                      <span style={{ fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{item.value || item.size || '-'}{item.unit || ''}</span>
                    </div>
                  ))
                ) : <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', padding: '20px' }}>Sem medidas cadastradas.</p>}
              </div>
            </div>
          )}

          {/* Share toast */}
          {shareCopied && <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 70, borderRadius: '999px', background: '#fff', padding: '8px 16px', fontSize: '14px', fontWeight: 700, color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,.2)' }}>Link copiado!</div>}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ fontFamily, background: '#f1f5f9' }}>
      <div className="mx-auto max-w-[1200px] p-4">
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>{(storeName || 'L').charAt(0)}</div>
            <div>
              <p className="text-sm font-bold text-slate-800">{storeName || 'Loja'}</p>
              <p className="text-[10px] text-slate-400">Preview do Story • {storyFormat === 'floating_widget' ? 'Flutuante' : storyFormat === 'carousel' ? 'Carrossel' : 'Grade'}</p>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">← Voltar</button>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-white/60" />)}
        </div>
      </div>

      {storyFormat === 'floating_widget' && videos.length > 0 && renderFloating()}
      {storyFormat === 'carousel' && videos.length > 0 && renderInlineWidget(false)}
      {storyFormat === 'grid' && videos.length > 0 && renderInlineWidget(true)}

      {videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Play size={48} className="mb-4 opacity-30" />
          <p className="font-bold">Nenhum vídeo vinculado a este story.</p>
        </div>
      )}

      {renderPlayer()}
    </div>
  );
}
