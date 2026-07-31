"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, Story, Video, resolveStoreId, generateUuid } from '@/lib/db';
import {
  X,
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

/* ═════════════════════════════════════════════════════════════════ */

const EMOJIS = ['😎','👍','👏','😱','🙏','💪','🔥','❤️','💙','✨','🎉','✅','⭐','😢','😡','🤔','👀','😊','🥰'];

type LikeMap = Record<string, { liked: boolean; count: number }>;

type StoryComment = {
  id?: string; store_id?: string; story_id?: string;
  video_id?: string; videoId?: string;
  user_name?: string; name?: string; text: string;
  status?: string; created_at?: string; createdAt?: string; updated_at?: string;
};

/* ═══════════════════ HELPERS ═══════════════════ */

const readLikes = (): LikeMap => { try { return JSON.parse(localStorage.getItem('story_video_likes')||'{}'); } catch { return {}; } };
const saveLikes = (l: LikeMap) => localStorage.setItem('story_video_likes', JSON.stringify(l));
const readLocalComments = (): StoryComment[] => { try { return JSON.parse(localStorage.getItem('story_video_comments')||'[]'); } catch { return []; } };
const saveLocalComments = (c: StoryComment[]) => localStorage.setItem('story_video_comments', JSON.stringify(c));

const getVideoUrl = (v?: Video|null) => { const i=v as any; return i?.video_url||i?.videoUrl||i?.url||''; };
const getVideoPoster = (v?: Video|null) => { const i=v as any; return i?.thumbnail_url||i?.thumbnailUrl||i?.poster_url||i?.posterUrl||i?.image_url||i?.imageUrl||''; };
const getCommentVid = (c: StoryComment) => c.video_id||c.videoId||'';
const getCommentName = (c: StoryComment) => c.user_name||c.name||'Cliente';

const getAllSafe = async <T,>(col: any, sid?: string): Promise<T[]> => {
  if (!col?.getAll) return [];
  try { return sid ? await col.getAll(sid) : await col.getAll(); }
  catch { try { return await col.getAll(); } catch { return []; } }
};
const getByIdSafe = async <T,>(col: any, id?: string|null, sid?: string): Promise<T|null> => {
  if (!col?.getById||!id) return null;
  try { return sid ? await col.getById(id,sid) : await col.getById(id); }
  catch { try { return await col.getById(id); } catch { return null; } }
};

const parseMeasures = (m: any): any[] => {
  if (!m) return [];
  if (Array.isArray(m.measures)) return m.measures;
  if (Array.isArray(m.measurements)) return m.measurements;
  if (typeof m.measures==='string') { try { const p=JSON.parse(m.measures); if (Array.isArray(p)) return p; } catch {} }
  return [];
};

const parseJsonSafe = (v: unknown): Record<string,any> => {
  if (!v) return {};
  if (typeof v==='object' && v!==null) return v as Record<string,any>;
  if (typeof v==='string') { try { return JSON.parse(v); } catch { return {}; } }
  return {};
};

/* ═══════════════════ STORY PREVIEW PAGE ═══════════════════ */

const StoryPreviewPage = () => {
  const { id, storeId: routeStoreId } = useParams<{ id?: string; storeId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryVideoId = searchParams.get('videoId')||searchParams.get('videoid')||'';

  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [story, setStory] = useState<Story|null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [appearance, setAppearance] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  /* player */
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);

  /* social */
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  /* product / model */
  const [product, setProduct] = useState<any>(null);
  const [model, setModel] = useState<any>(null);
  const [modelOpen, setModelOpen] = useState(false);

  const video = videos[activeIdx]||null;
  const currentUrl = getVideoUrl(video);
  const posterUrl = getVideoPoster(video);
  const modelData = useMemo(()=>parseMeasures(model),[model]);

  /* formato */
  const rawFmt = String((story as any)?.format||(story as any)?.display_format||'carousel').toLowerCase().trim();
  const format = rawFmt==='carrossel'?'carousel':rawFmt==='floating'||rawFmt==='floating_widget'?'floating_widget':rawFmt==='grid'?'grid':'carousel';
  const isFloating = format==='floating_widget';
  const isCarousel = format==='carousel';
  const isGrid = format==='grid';

  /* aparência */
  const colors = useMemo(()=>{
    const a=appearance||{};
    return { primary:a.primary_color||'#0094EB', secondary:a.secondary_color||'#0094EB', text:a.text_color||'#0F172A', bg:a.background_color||'#FFFFFF', btn:a.button_color||'#0094EB' };
  },[appearance]);

  const modalCfg = useMemo(()=>{
    const raw=parseJsonSafe((appearance as any)?.modal_config);
    const a=appearance||{};
    return {
      show_title: a.show_title ?? raw.show_title ?? true,
      show_play: a.show_play_button ?? raw.show_play_button ?? true,
      show_product: a.show_product ?? raw.show_product ?? true,
      show_product_btn: a.show_product_button ?? raw.show_product_button ?? true,
      show_product_wpp: a.show_product_whatsapp_button ?? raw.show_product_whatsapp_button ?? raw.show_whatsapp_button ?? true,
      show_like: a.show_like_button ?? raw.show_like_button ?? true,
      show_comment: a.show_comment_button ?? raw.show_comment_button ?? true,
      show_share: a.show_share_button ?? raw.show_share_button ?? true,
      show_whatsapp: a.show_whatsapp_button ?? raw.show_whatsapp_button ?? true,
      border_color: raw.border_color||'#000', border_width: String(raw.border_width||'0'), border_radius: String(raw.border_radius||'0'), shadow: raw.shadow_enabled??a.shadow_enabled??false,
    };
  },[appearance]);

  const floatingCfg = useMemo(()=>{
    const a=appearance||{}; const raw=parseJsonSafe(a.floating_config);
    const d=raw?.desktop||raw||{};
    return { shape:d.shape||'square', width:Number(d.width)||150, height:Number(d.height)||150, position:d.position||'fixed_bottom_right' };
  },[appearance]);

  const carouselCfg = useMemo(()=>{
    const a=appearance||{}; const raw=parseJsonSafe(a.carousel_config);
    const d=raw?.desktop||raw||{};
    return { visible:Number(d.visible_items)||4, gap:Number(d.spacing)||12, radius:Number(d.border_radius)||12, border:d.border_color||'#E2E8F0', borderW:Number(d.border_style)||0 };
  },[appearance]);

  const gridCfg = useMemo(()=>{
    const a=appearance||{}; const raw=parseJsonSafe(a.grid_config);
    const d=raw?.desktop||raw||{};
    return { cols:Number(d.visible_items)||3, rows:Number(d.rows)||2, gap:Number(d.spacing)||16, radius:Number(d.border_radius)||12, border:d.border_color||'#E2E8F0', borderW:Number(d.border_style)||0 };
  },[appearance]);

  /* floating position */
  const floatingPos = useMemo(()=>{
    switch(floatingCfg.position){
      case 'fixed_bottom_left': return 'bottom-4 left-4';
      case 'fixed_bottom_right': return 'bottom-4 right-4';
      case 'fixed_top_left': return 'top-4 left-4';
      case 'fixed_top_right': return 'top-4 right-4';
      case 'fixed_center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default: return 'bottom-4 right-4';
    }
  },[floatingCfg]);

  const widgetShape = floatingCfg.shape==='circle'?'rounded-full':'rounded-2xl';

  /* ════════════ LOAD ════════════ */

  useEffect(()=>{
    let m=true;
    (async()=>{
      try {
        setLoading(true);
        if(!id){ setStory(null); return; }
        const stores=await getAllSafe<any>((db as any).stores);
        const s=routeStoreId?stores.find((x:any)=>x.id===routeStoreId)||stores[0]:stores[0];
        if(!s){ setStory(null); return; }
        const sid=await resolveStoreId(s.id);
        if(!m)return;
        setStoreId(sid); setStoreName(s.name||'');
        const allStories=await getAllSafe<Story>((db as any).stories,sid);
        const story=allStories.find((x:any)=>x.id===id&&(!x.store_id||x.store_id===sid))||allStories.find((x:any)=>x.id===id)||null;
        if(!m)return; setStory(story);
        if(!story){ setVideos([]); return; }
        const [sv,allVids,gs]=await Promise.all([
          getAllSafe<any>((db as any).storyVideos,sid),
          getAllSafe<Video>((db as any).videos,sid),
          getAllSafe<any>((db as any).generalSettings,sid),
        ]);
        if(!m)return; setSettings(gs?.[0]||null);
        /* aparência */
        try {
          const apps=await getAllSafe<any>((db as any).appearances,sid);
          const aid=(story as any)?.appearance_id||gs?.[0]?.default_appearance_id;
          let fnd:any=null;
          if(aid) fnd=apps.find((a:any)=>a.id===aid)||null;
          if(!fnd) fnd=apps.find((a:any)=>a.is_default)||apps[0]||null;
          if(m) setAppearance(fnd);
        }catch{}
        const rels=sv.filter((r:any)=>r.story_id===story.id&&(!r.store_id||r.store_id===sid))
          .sort((a:any,b:any)=>Number(a.position||0)-Number(b.position||0))
          .map((r:any)=>allVids.find((v:any)=>v.id===r.video_id)).filter(Boolean) as Video[];
        if(!m)return; setVideos(rels);
        if(queryVideoId){ const idx=rels.findIndex(v=>v.id===queryVideoId); setActiveIdx(idx>=0?idx:0); }
        else setActiveIdx(0);
      }catch(e){ console.error(e); showError('Erro ao carregar preview.'); }
      finally { if(m) setLoading(false); }
    })();
    return ()=>{ m=false; };
  },[id,routeStoreId,queryVideoId]);

  /* ════════════ EFFECTS ════════════ */

  useEffect(()=>{
    if(!video?.id||!story||!storeId)return;
    setVideoError(false); setProgress(0); setShowComments(false); setShowEmoji(false);
    const likes=readLikes();
    setLiked(Boolean(likes[video.id]?.liked));
    setLikeCount(likes[video.id]?.count??0);
    (async()=>{
      try {
        const all=await getAllSafe<StoryComment>((db as any).comments,storeId);
        const f=all.filter(c=>getCommentVid(c)===video.id&&(!c.store_id||c.store_id===storeId));
        setComments(f);
        const mem=readLocalComments().filter(c=>getCommentVid(c)!==video.id);
        saveLocalComments([...mem,...f]);
      }catch{ setComments(readLocalComments().filter(c=>getCommentVid(c)===video.id)); }
      /* product & model */
      try {
        const rels=await getAllSafe<any>((db as any).storyProducts,storeId);
        const rel=Array.isArray(rels)?rels.find((r:any)=>r.story_id===story.id&&r.video_id===video.id&&(!r.store_id||r.store_id===storeId)):null;
        const va=video as any;
        const pid=va.product_id||va.productId||rel?.product_id||rel?.productId||null;
        const mid=va.model_id||va.modelId||rel?.model_id||rel?.modelId||null;
        const [p,m]=await Promise.all([getByIdSafe((db as any).products,pid,storeId),getByIdSafe((db as any).sizingModels,mid,storeId)]);
        setProduct(p); setModel(m);
      }catch{ setProduct(null); setModel(null); }
    })();
  },[video?.id,story?.id,storeId]);

  useEffect(()=>{
    const el=videoRef.current; if(!el)return;
    const f=()=>{ if(el.duration) setProgress((el.currentTime/el.duration)*100); };
    el.addEventListener('timeupdate',f);
    return ()=>el.removeEventListener('timeupdate',f);
  },[video?.id]);

  /* ════════════ HANDLERS ════════════ */

  const close = () => {
    if (playerOpen) { setPlayerOpen(false); return; }
    if (window.history.length>1) window.history.back(); else navigate('/');
  };

  const openPlayer = (idx: number) => { setActiveIdx(idx); setPlayerOpen(true); };

  const togglePlay = async () => { if(!videoRef.current)return; try { if(playing){ videoRef.current.pause(); setPlaying(false); } else { await videoRef.current.play(); setPlaying(true); } } catch { setPlaying(false); } };
  const toggleMute = () => { const n=!muted; setMuted(n); if(videoRef.current) videoRef.current.muted=n; };

  const doLike = () => {
    if(!video?.id)return;
    const likes=readLikes(); const cur=likes[video.id]||{liked:false,count:0};
    const nl=!cur.liked; const nc=Math.max(0,(cur.count||0)+(nl?1:-1));
    likes[video.id]={liked:nl,count:nc}; saveLikes(likes); setLiked(nl); setLikeCount(nc);
  };

  const goNext = () => { if(!videos.length)return; setActiveIdx(p=>p<videos.length-1?p+1:0); };
  const goPrev = () => { if(!videos.length)return; setActiveIdx(p=>p>0?p-1:videos.length-1); };

  const doShare = async () => {
    const url=window.location.href;
    const msg=`Olha esse produto: "${product?.name||story?.title||'Story'}"\n${url}`;
    if(navigator.share){ try { await navigator.share({title:product?.name||story?.title||'Story',text:msg,url}); return; } catch{} }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
  };

  const doWhatsApp = () => {
    const phone=String(settings?.whatsapp_number||settings?.whatsapp||'').replace(/\D/g,'');
    const link=product?.product_url||product?.url||`${window.location.origin}/stories/preview/${id}?videoId=${video?.id||''}`;
    const msg=`Quero mais informações sobre esse produto${product?.name?`: ${product.name}`:''}\n${link}`;
    window.open(phone?`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
  };

  const submitComment = async () => {
    const n=commentName.trim(), t=commentText.trim();
    if(!n){ showError('Informe seu nome.'); return; }
    if(!t){ showError('Escreva um comentário.'); return; }
    if(!video?.id||!story||!storeId){ showError('Não foi possível identificar o vídeo.'); return; }
    const now=new Date().toISOString();
    const nc: StoryComment = { id:generateUuid(), store_id:storeId, story_id:story.id, video_id:video.id, user_name:n, text:t, status:'pending', created_at:now, updated_at:now };
    try {
      await (db as any).comments.save(nc as any);
      const all=await getAllSafe<StoryComment>((db as any).comments,storeId);
      const f=all.filter(c=>getCommentVid(c)===video.id&&(!c.store_id||c.store_id===storeId));
      setComments(f); saveLocalComments(f);
      setCommentText(''); setCommentName(''); setShowEmoji(false);
      showSuccess('Comentário enviado!');
    }catch{
      const mem=readLocalComments(); const nm=[...mem,nc]; saveLocalComments(nm);
      setComments(nm.filter(c=>getCommentVid(c)===video.id));
      setCommentText(''); setCommentName(''); setShowEmoji(false);
      showSuccess('Comentário enviado!');
    }
  };

  const insertEmoji = (emoji: string) => {
    const el=textareaRef.current;
    if(!el){ setCommentText(p=>p+emoji); return; }
    const s=el.selectionStart, e=el.selectionEnd;
    const nx=commentText.slice(0,s)+emoji+commentText.slice(e);
    setCommentText(nx);
    requestAnimationFrame(()=>{ el.focus(); el.setSelectionRange(s+emoji.length,s+emoji.length); });
  };

  /* ════════════ LOADING ════════════ */

  if(loading) return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Carregando...</div>;
  if(!story) return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Story não encontrado</div>;

  const c=colors, mc=modalCfg;
  const thumb0=getVideoPoster(videos[0]||null);
  const productImg=product?.image_url||product?.imageUrl||product?.thumbnail_url||product?.thumbnailUrl||'';
  const productUrl=product?.product_url||product?.productUrl||product?.url||'';
  const productPrice=Number(product?.price||product?.sale_price||0);
  const borderStyle: React.CSSProperties = { borderColor:mc.border_color, borderWidth:`${mc.border_width}px`, borderRadius:`${mc.border_radius}px`, borderStyle:'solid', boxShadow:mc.shadow?'0 25px 50px -12px rgba(0,0,0,.5)':undefined };

  /* ═══════════════════ PLAYER (layout corrigido) ═══════════════════ */

  const Player = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={close}>
      <div onClick={e=>e.stopPropagation()} className="relative flex w-full max-w-[420px] flex-col overflow-hidden bg-black" style={borderStyle}>
        {/* close button */}
        <button onClick={close} className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"><X size={20}/></button>

        {/* video area */}
        <div className="relative aspect-[9/16] w-full bg-black">
          {/* progress bars */}
          <div className="absolute top-3 z-50 flex gap-1.5 left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))]">
            {videos.map((_,i)=>(
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className={cn('h-full rounded-full transition-all', i<activeIdx?'w-full':i===activeIdx?'':'w-0')} style={i===activeIdx?{width:`${progress}%`,backgroundColor:c.primary}:i<activeIdx?{backgroundColor:c.primary}:undefined}/>
              </div>
            ))}
          </div>

          {/* header com título */}
          <div className="absolute left-0 right-0 top-0 z-40 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent p-5" style={{paddingTop:'max(2rem,env(safe-area-inset-top))'}}>
            {mc.show_title&&video?.title?(
              <div className="min-w-0 pr-16">
                <h3 className="truncate text-sm font-black text-white">{video.title}</h3>
                <p className="text-[10px] font-bold uppercase text-white/65">{storeName}{videos.length>1?` • ${activeIdx+1}/${videos.length}`:''}</p>
              </div>
            ):<div/>}
          </div>

          {/* navegação */}
          <button onClick={goPrev} className="absolute left-0 top-0 z-30 h-full w-[30%]"/>
          <button onClick={goNext} className="absolute right-0 top-0 z-30 h-full w-[70%]"/>

          {/* vídeo */}
          {currentUrl&&!videoError?(
            <video ref={videoRef} src={currentUrl} poster={posterUrl} className="h-full w-full object-cover" playsInline muted={muted} autoPlay onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setVideoError(true)} onEnded={goNext}/>
          ):(
            <div className="flex h-full w-full items-center justify-center text-white/50 text-sm">{videoError?'Erro ao carregar vídeo':'Nenhum vídeo disponível'}</div>
          )}

          {/* ─── Botões de ação NO LADO DIREITO (como no site) ─── */}
          <div className="absolute top-24 z-[60] flex flex-col gap-3" style={{right:'max(0.75rem,env(safe-area-inset-right))'}}>
            {/* Play / Pause */}
            {mc.show_play&&currentUrl&&!videoError&&(
              <button onClick={togglePlay} className="rounded-full p-3 text-white backdrop-blur-md hover:brightness-110" style={{backgroundColor:c.primary}}>
                {playing?<Pause className="h-5 w-5"/>:<Play className="h-5 w-5"/>}
              </button>
            )}

            {/* Mute */}
            <button onClick={toggleMute} className="rounded-full p-3 text-white backdrop-blur-md hover:brightness-110" style={{backgroundColor:c.primary}}>
              {muted?<VolumeX className="h-5 w-5"/>:<Volume2 className="h-5 w-5"/>}
            </button>

            {/* Like com contador */}
            {mc.show_like&&(
              <button onClick={doLike} className="relative rounded-full p-3 text-white backdrop-blur-md hover:brightness-110" style={{backgroundColor:c.primary}}>
                <Heart className={cn('h-5 w-5',liked?'fill-rose-500 text-rose-500':'')}/>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">{likeCount}</span>
              </button>
            )}

            {/* Comentários com contador (ícone de bolha do StoriesWidgetPage) */}
            {(mc.show_comment)&&(
              <button onClick={()=>setShowComments(v=>!v)} className="flex flex-col items-center gap-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md hover:scale-105 transition">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-900" fill="currentColor">
                    <path d="M4.5 3.5h15A2.5 2.5 0 0 1 22 6v9a2.5 2.5 0 0 1-2.5 2.5h-4.2l-2.1 2.1a1.7 1.7 0 0 1-2.4 0l-2.1-2.1H4.5A2.5 2.5 0 0 1 2 15V6a2.5 2.5 0 0 1 2.5-2.5Z"/>
                    <circle cx="8" cy="10.5" r="1" fill="white"/>
                    <circle cx="12" cy="10.5" r="1" fill="white"/>
                    <circle cx="16" cy="10.5" r="1" fill="white"/>
                  </svg>
                </span>
                <span className="text-center text-xs font-bold leading-none text-white">{comments.length}</span>
              </button>
            )}

            {/* Share */}
            {mc.show_share&&(
              <button onClick={doShare} className="rounded-full p-3 text-white backdrop-blur-md hover:brightness-110" style={{backgroundColor:c.primary}}>
                <Share2 className="h-5 w-5"/>
              </button>
            )}

            {/* Medidas */}
            {modelData.length>0&&(
              <button onClick={()=>setModelOpen(true)} className="rounded-full p-3 text-white backdrop-blur-md hover:brightness-110" style={{backgroundColor:c.primary}} title="Medidas">
                <Ruler className="h-5 w-5"/>
              </button>
            )}

            {/* WhatsApp (botão flutuante, fora do card) */}
            {mc.show_whatsapp&&(
              <button onClick={doWhatsApp} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-110">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z"/><path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z"/></svg>
              </button>
            )}
          </div>

          {/* ─── Card de produto NA PARTE INFERIOR (como no site) ─── */}
          {mc.show_product&&product&&(
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10" style={{paddingBottom:'max(1rem,env(safe-area-inset-bottom))'}}>
              <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/95 p-3 shadow-2xl" style={{backgroundColor:c.bg}}>
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                  {productImg?<img src={productImg} alt={product.name||'Produto'} className="h-full w-full object-cover"/>:<div className="h-full w-full bg-slate-200"/>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black" style={{color:c.text}}>{product.name||'Produto'}</p>
                  {productPrice>0&&<p className="mt-1 text-base font-black" style={{color:c.primary}}>R$ {productPrice.toFixed(2)}</p>}

                  {/* Botões dentro do card */}
                  {(mc.show_product_btn||mc.show_product_wpp)&&(
                    <div className={cn('mt-2 flex gap-2', (mc.show_product_btn&&mc.show_product_wpp)?'flex-row':'flex-col')}>
                      {mc.show_product_btn&&productUrl&&(
                        <a href={productUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-black text-white hover:opacity-90" style={{backgroundColor:c.btn}}>
                          <ExternalLink className="h-3.5 w-3.5"/>Ver produto
                        </a>
                      )}
                      {mc.show_product_wpp&&(
                        <button onClick={doWhatsApp} className="flex items-center justify-center gap-1 rounded-full px-3 py-2 text-[11px] font-black text-white hover:opacity-90" style={{backgroundColor:'#25D366'}}>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white"><path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z"/><path d="M20 4A10 10 0 0 0 3.6 16.2L2 22l5.9-1.5A10 10 0 1 0 20 4zm-7.9 15.4c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A8.1 8.1 0 1 1 12.1 19.4z"/></svg>
                          Comprar pelo WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* comments panel (overlay) */}
        {showComments&&(
          <div className="absolute inset-0 z-[90] bg-black/85 p-4">
            <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] bg-slate-950 p-4 text-white shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-black">Comentários</h4>
                <button onClick={()=>setShowComments(false)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5"/></button>
              </div>
              <div className="flex-1 space-y-3 overflow-auto">
                {comments.length===0&&<p className="text-sm text-white/50">Nenhum comentário ainda.</p>}
                {comments.map((cm,i)=><div key={cm.id||`${cm.created_at}-${i}`} className="rounded-2xl bg-white/5 p-3"><p className="text-xs font-black text-white/70">{getCommentName(cm)}</p><p className="whitespace-pre-wrap text-sm text-white">{cm.text}</p></div>)}
              </div>
              <div className="mt-4 space-y-2">
                <input value={commentName} onChange={e=>setCommentName(e.target.value)} placeholder="Seu nome" className="w-full rounded-2xl bg-white/10 p-3 text-sm text-white outline-none placeholder:text-white/40"/>
                <div className="relative">
                  <textarea ref={textareaRef} value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Escreva seu comentário..." className="min-h-24 w-full resize-none rounded-2xl bg-white/10 p-3 pr-12 text-sm text-white outline-none placeholder:text-white/40"/>
                  <button onClick={()=>setShowEmoji(v=>!v)} className="absolute right-3 top-3 text-white"><Smile className="h-5 w-5"/></button>
                </div>
                {showEmoji&&<div className="grid grid-cols-6 gap-2 rounded-2xl bg-white/10 p-3 text-xl">{EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} className="rounded-lg p-1 hover:bg-white/10">{e}</button>)}</div>}
                <button onClick={submitComment} className="w-full rounded-2xl p-3 text-sm font-black text-white hover:opacity-90" style={{backgroundColor:c.btn}}>Enviar comentário</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ═══════════════════ WIDGET FLUTUANTE ═══════════════════ */

  const FloatingWidget = () => (
    <div className={`fixed ${floatingPos} z-40 cursor-pointer group transition-transform hover:scale-105 active:scale-95`}
      style={{width:floatingCfg.width,height:floatingCfg.height}} onClick={()=>openPlayer(0)} title="Clique para abrir o story">
      <div className={`h-full w-full overflow-hidden ${widgetShape} border-2 shadow-xl`} style={{borderColor:c.primary,backgroundColor:c.primary}}>
        {thumb0?<img src={thumb0} alt="Story" className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center text-white"><Play size={32}/></div>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900"><Play size={18} className="ml-0.5"/></div>
        </div>
      </div>
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 shadow-lg"/>
    </div>
  );

  /* ═══════════════════ CARROSSEL ═══════════════════ */

  const Carousel = () => (
    <div className="w-full max-w-5xl px-4">
      <button onClick={close} className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X size={20}/></button>
      <h2 className="mb-6 text-center text-xl font-semibold text-white">{story?.title||'Stories'}</h2>
      {videos.length===0?<p className="text-center text-white/50">Nenhum vídeo.</p>:(
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{gap:`${carouselCfg.gap}px`}}>
          {videos.map((v,i)=>{
            const thumb=getVideoPoster(v);
            const w=Math.round(100/carouselCfg.visible);
            return (
              <button key={v.id||i} onClick={()=>openPlayer(i)}
                className={`relative flex-shrink-0 snap-center overflow-hidden transition-all hover:scale-[1.02]`}
                style={{width:`${w}%`,minWidth:'140px',aspectRatio:'9/16',borderRadius:`${carouselCfg.radius}px`,border:`${carouselCfg.borderW}px solid ${carouselCfg.border}`}}>
                {thumb?<img src={thumb} alt={v.title||''} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40"><Play size={32}/></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition"><Play size={40} className="text-white opacity-0 hover:opacity-100 transition"/></div>
                {v.title&&<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4"><p className="text-xs font-medium text-white line-clamp-2">{v.title}</p></div>}
              </button>
            );
          })}
        </div>
      )}
      {videos.length>0&&<p className="mt-4 text-center text-xs text-white/40">Clique em um vídeo para abrir o player</p>}
    </div>
  );

  /* ═══════════════════ GRID ═══════════════════ */

  const Grid = () => (
    <div className="w-full max-w-4xl px-4">
      <button onClick={close} className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X size={20}/></button>
      <h2 className="mb-6 text-center text-xl font-semibold text-white">{story?.title||'Stories'}</h2>
      {videos.length===0?<p className="text-center text-white/50">Nenhum vídeo.</p>:(
        <div className="grid" style={{gridTemplateColumns:`repeat(${gridCfg.cols},1fr)`,gap:`${gridCfg.gap}px`}}>
          {videos.map((v,i)=>{
            const thumb=getVideoPoster(v);
            return (
              <button key={v.id||i} onClick={()=>openPlayer(i)}
                className="group relative aspect-[9/16] overflow-hidden transition-all hover:scale-[1.02]"
                style={{borderRadius:`${gridCfg.radius}px`,border:`${gridCfg.borderW}px solid ${gridCfg.border}`}}>
                {thumb?<img src={thumb} alt={v.title||''} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40"><Play size={32}/></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition"><Play size={40} className="text-white opacity-0 group-hover:opacity-100 transition"/></div>
                {v.title&&<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4"><p className="text-xs font-medium text-white line-clamp-2">{v.title}</p></div>}
              </button>
            );
          })}
        </div>
      )}
      {videos.length>0&&<p className="mt-4 text-center text-xs text-white/40">Clique em um vídeo para abrir o player</p>}
    </div>
  );

  /* ═══════════════════ MEASURES MODAL ═══════════════════ */

  const MeasuresModal = () => {
    if(!modelOpen) return null;
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4" onClick={()=>setModelOpen(false)}>
        <div className="mx-auto flex max-h-[75vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] bg-white p-5 text-slate-900 shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medidas da modelo</p><h4 className="text-lg font-black">{model?.name||'Modelo'}</h4></div>
            <button onClick={()=>setModelOpen(false)} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X className="h-5 w-5"/></button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto">
            {modelData.length>0?modelData.map((m:any,i:number)=><div key={`${m.name||m.label||i}-${i}`} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-3"><span className="font-bold text-slate-700">{m.name||m.label||`Medida ${i+1}`}</span><span className="text-right font-black text-slate-950">{m.value||m.size||'-'}{m.unit||''}</span></div>):<p className="text-sm text-slate-500">Sem medidas cadastradas.</p>}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════ LAYOUT ═══════════════════ */

  return (
    <div className="fixed inset-0 bg-[#111] flex items-center justify-center overflow-hidden">
      {!playerOpen && isFloating && <FloatingWidget/>}
      {!playerOpen && isCarousel && <Carousel/>}
      {!playerOpen && isGrid && <Grid/>}
      {playerOpen && <Player/>}
      <MeasuresModal/>
    </div>
  );
};

export default StoryPreviewPage;
