import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db, Video } from '@/lib/db';
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
  Check,
  ExternalLink,
  Send,
  Smile,
  Copy,
  Mail,
  User,
  Trash2
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const EMOJIS = ['😎', '👍', '👏', '😱', '🙏', '💪', '🔥', '❤️', '💙', '✨', '🎉', '✅', '⭐', '😢', '😡', '🤔', '👀', '😊', '🥰'];

const readComments = (): Array<{ videoId: string; name: string; text: string; createdAt: string }> => {
  try {
    return JSON.parse(localStorage.getItem('story_video_comments') || '[]');
  } catch {
    return [];
  }
};

const saveComments = (comments: Array<{ videoId: string; name: string; text: string; createdAt: string }>) => {
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
const getVideoPosterUrl = (video?: Video | null) => video?.thumbnail_url || video?.poster_url || video?.image_url || '';
const getVideoLikeCount = (videoId?: string) => (videoId ? (readLikes()[videoId]?.count ?? 0) : 0);
const getVideoCommentCount = (videoId?: string) => (videoId ? readComments().filter((item) => item.videoId === videoId).length : 0);

export default function StoriesWidgetPage() {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const storyIdParam = searchParams.get('storyId') || searchParams.get('storyid');
  const videoIdParam = searchParams.get('videoId') || searchParams.get('videoid');

  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [stories, setStories] = useState<any[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, Video[]>>(new Map());
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [videoIdx, setVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Array<{ videoId: string; name: string; text: string; createdAt: string }>>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [model, setModel] = useState<any | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [showMeasures, setShowMeasures] = useState(false);

  const story = stories[storyIdx ?? -1] ?? null;
  const currentVideos = story ? storyVideosMap.get(story.id) || [] : [];
  const currentVideo = currentVideos[videoIdx] ?? null;
  const currentUrl = getVideoUrl(currentVideo);
  const posterUrl = getVideoPosterUrl(currentVideo);

  const activeCommentCount = useMemo(() => getVideoCommentCount(currentVideo?.id), [currentVideo?.id, comments]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const storeList = await db.stores.getAll();
      const currentStore = storeId ? storeList.find((store: any) => store.id === storeId) : storeList[0];
      if (!currentStore) {
        if (mounted) setLoading(false);
        return;
      }
      setStoreName(currentStore.name || '');
      const genSettings = (await db.generalSettings.getAll(currentStore.id))[0];
      setSettings(genSettings || null);
      setMuted(genSettings?.muted_by_default ?? true);

      const allStories = await db.stories.getAll(currentStore.id);
      const activeStories = allStories.filter((item: any) => item.active).sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0));
      const filteredStories = storyIdParam ? activeStories.filter((item: any) => item.id === storyIdParam) : activeStories;
      const storyVids = await db.storyVideos.getAll();
      const allVids = await db.videos.getAll();
      const map = new Map<string, Video[]>();
      filteredStories.forEach((st: any) => {
        const relationVideos = storyVids.filter((sv: any) => sv.story_id === st.id).sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0)).map((sv: any) => allVids.find((video: any) => video.id === sv.video_id)).filter(Boolean) as Video[];
        map.set(st.id, relationVideos);
      });
      if (!mounted) return;
      setStories(filteredStories);
      setStoryVideosMap(map);
      if (filteredStories.length > 0) {
        const startStoryIdx = 0;
        const startVideos = map.get(filteredStories[0].id) || [];
        const startVideoIdx = videoIdParam ? Math.max(0, startVideos.findIndex((v) => v.id === videoIdParam)) : 0;
        setStoryIdx(startStoryIdx);
        setVideoIdx(startVideoIdx);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [storeId, storyIdParam, videoIdParam]);

  useEffect(() => {
    if (!story) return;
    const rel = (db as any).storyProducts?.getAll?.();
    Promise.resolve(rel).then(async (rels: any) => {
      const relation = Array.isArray(rels) ? rels.find((item: any) => item.story_id === story.id && item.video_id === currentVideo?.id) : null;
      setProduct(relation?.product_id ? await db.products.getById(relation.product_id) : null);
    });
    setVideoError(false);
    setShowComments(false);
    setShowEmoji(false);
    setShowShare(false);
    setShowMeasures(false);
    setCommentText('');
    setCommentName('');
  }, [story?.id, currentVideo?.id]);

  useEffect(() => {
    if (!currentVideo?.id) return;
    setLikeCount(getVideoLikeCount(currentVideo.id));
    const likes = readLikes();
    setLiked(Boolean(likes[currentVideo.id]?.liked));
    setComments(readComments().filter((item) => item.videoId === currentVideo.id));
  }, [currentVideo?.id]);

  const close = () => window.history.length > 1 ? window.history.back() : (window.location.href = '/');
  const handleTogglePlay = async () => { if (!videoRef.current) return; if (playing) { videoRef.current.pause(); setPlaying(false); } else { await videoRef.current.play(); setPlaying(true); } };
  const handleToggleMute = () => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next; };
  const handleLike = () => { if (!currentVideo?.id) return; const likes = readLikes(); const current = likes[currentVideo.id] || { liked: false, count: 0 }; const nextLiked = !current.liked; const nextCount = Math.max(0, current.count + (nextLiked ? 1 : -1)); likes[currentVideo.id] = { liked: nextLiked, count: nextCount }; saveLikes(likes); setLiked(nextLiked); setLikeCount(nextCount); };
  const goNext = () => { if (!story) return; if (videoIdx < currentVideos.length - 1) setVideoIdx((v) => v + 1); else setVideoIdx(0); };
  const goPrev = () => { if (videoIdx > 0) setVideoIdx((v) => v - 1); };
  const handleCommentSubmit = () => { const name = commentName.trim(); const text = commentText.trim(); if (!name || !text || !currentVideo?.id) return; const next = [...readComments(), { videoId: currentVideo.id, name, text, createdAt: new Date().toISOString() }]; saveComments(next); setComments(next.filter((item) => item.videoId === currentVideo.id)); setCommentText(''); setCommentName(''); showSuccess('Comentário enviado com sucesso.'); };
  const handleShare = async () => { const shareUrl = `${window.location.origin}${window.location.pathname}?storyId=${story?.id || ''}&videoId=${currentVideo?.id || ''}`; const shareText = 'Olha esse produto que lindo'; try { if (navigator.share) { await navigator.share({ title: product?.name || story?.title || 'Story', text: shareText, url: shareUrl }); } else { await navigator.clipboard.writeText(shareUrl); setCopied(true); showSuccess('Link copiado para compartilhar.'); } } catch { showError('Erro ao compartilhar'); } };
  const handleWhatsApp = () => { const phone = String(settings?.whatsapp_number || settings?.whatsapp || '').replace(/\D/g, ''); const message = `Quero mais informações sobre esse produto${product?.name ? `: ${product.name}` : ''}\n${product?.product_url || `${window.location.origin}${window.location.pathname}?storyId=${story?.id || ''}&videoId=${currentVideo?.id || ''}`}`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank'); };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Carregando...</div>;
  if (!story) return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Story não encontrado</div>;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div className="relative h-full w-full max-w-[420px] overflow-hidden bg-black sm:aspect-[9/16] sm:max-h-screen">
        <div className="absolute left-4 right-4 top-3 z-50 flex gap-1.5">
          {currentVideos.map((video, idx) => (
            <div key={video.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div className={cn('h-full rounded-full bg-white transition-all', idx < videoIdx ? 'w-full' : idx === videoIdx ? 'w-full bg-violet-400' : 'w-0')} />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-5 pt-8">
          <div className="min-w-0 pr-16">
            <h3 className="truncate text-sm font-black text-white">{story.title}</h3>
            <p className="text-[10px] font-bold uppercase text-white/65">{storeName} {currentVideos.length > 1 ? `• ${videoIdx + 1}/${currentVideos.length}` : ''}</p>
          </div>
          <button type="button" onClick={close} className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md"><X className="h-5 w-5" /></button>
        </div>

        {currentUrl ? (
          <video ref={videoRef} src={currentUrl} poster={posterUrl || undefined} autoPlay muted={muted} playsInline className="h-full w-full object-cover" onEnded={goNext} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        ) : <div className="flex h-full items-center justify-center text-white/70">Nenhum vídeo vinculado</div>}

        <div className="absolute left-3 top-1/2 z-50 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white" onClick={goPrev}><ChevronLeft className="h-7 w-7" /></div>
        <div className="absolute right-3 top-1/2 z-50 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white" onClick={goNext}><ChevronRight className="h-7 w-7" /></div>

        <div className="absolute right-4 top-24 z-50 flex flex-col gap-3">
          <button onClick={handleTogglePlay} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md">{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
          <button onClick={handleToggleMute} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
          <button onClick={handleLike} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md relative"><Heart className={cn('h-5 w-5', liked ? 'fill-rose-500 text-rose-500' : '')} /><span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">{likeCount}</span></button>
          <button onClick={() => setShowComments(true)} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md relative"><MessageCircle className="h-5 w-5" /><span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">{activeCommentCount}</span></button>
          <button onClick={handleShare} className="rounded-full bg-black/55 p-3 text-white backdrop-blur-md"><Share2 className="h-5 w-5" /></button>
          <button onClick={handleWhatsApp} className="rounded-full bg-[#25D366] p-3 text-white backdrop-blur-md">WA</button>
        </div>

        {product && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10">
            <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/95 p-3">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-200"><img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{product.name}</p><p className="mt-1 text-base font-black text-violet-700">{Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><a href={product.product_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-4 py-2 text-[11px] font-black text-white">Ver produto <ExternalLink className="h-3.5 w-3.5" /></a></div>
            </div>
          </div>
        )}

        {showComments && (
          <div className="absolute inset-0 z-[90] bg-black/85 p-4">
            <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-slate-950 p-4 text-white">
              <div className="mb-3 flex items-center justify-between"><h4 className="text-lg font-black">Comentários</h4><button onClick={() => setShowComments(false)}><X /></button></div>
              <div className="flex-1 space-y-3 overflow-auto">
                {comments.map((item, index) => <div key={index} className="rounded-2xl bg-white/5 p-3"><p className="text-xs font-black text-white/70">{item.name}</p><p className="text-sm text-white">{item.text}</p></div>)}
              </div>
              <div className="mt-4 space-y-2"><input value={commentName} onChange={(e) => setCommentName(e.target.value)} placeholder="Seu nome" className="w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none" /><div className="relative"><textarea ref={textareaRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escreva seu comentário..." className="min-h-24 w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none" /><button type="button" onClick={() => setShowEmoji((v) => !v)} className="absolute right-3 top-3 text-white"><Smile /></button></div>{showEmoji && <div className="grid grid-cols-6 gap-2 rounded-2xl bg-white/10 p-3 text-xl">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => setCommentText((prev) => `${prev}${emoji}`)}>{emoji}</button>)}</div>}<button onClick={handleCommentSubmit} className="w-full rounded-2xl bg-violet-600 p-3 text-sm font-black text-white">Enviar comentário</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
