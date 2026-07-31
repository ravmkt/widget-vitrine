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

  /* ═══════════════════ PLAYER ═══════════════════ */

  const Player = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={close}>
      <div onClick={e=>e.stopPropagation()} className="relative flex w-full max-w-[420px] flex-col overflow-hidden bg-black" style={borderStyle}>
        {/* close */}
        <button onClick={close} className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X size={20}/></button>

        {/* video area */}
        <div className="relative aspect-[9/16] w-full bg-black">
          {/* progress */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-1 pt-2">
            {videos.map((_,i)=>(
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full transition-all duration-300" style={{width:i<activeIdx?'100%':i===activeIdx?`${progress}%`:'0%',backgroundColor:c.primary}}/>
              </div>
            ))}
          </div>
          <button onClick={goPrev} className="absolute left-0 top-0 z-10 h-full w-1/3"/>
          <button onClick={goNext} className="absolute right-0 top-0 z-10 h-full w-1/3"/>
          {mc.show_title&&video?.title&&<div className="absolute top-10 left-3 right-3 z-10"><p className="text-sm font-semibold text-white drop-shadow-lg line-clamp-2">{video.title}</p></div>}
          {currentUrl&&!videoError?(
            <video ref={videoRef} src={currentUrl} poster={posterUrl} className="h-full w-full object-cover" playsInline muted={muted} autoPlay onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setVideoError(true)} onEnded={goNext}/>
          ):(
            <div className="flex h-full w-full items-center justify-center text-white/50 text-sm">{videoError?'Erro ao carregar vídeo':'Nenhum vídeo disponível'}</div>
          )}
          {mc.show_play&&currentUrl&&!videoError&&(
            <button onClick={togglePlay} className="absolute inset-0 z-10 flex items-center justify-center">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/40 text-white transition-opacity ${playing?'opacity-0 hover:opacity-100':'opacity-100'}`}>{playing?<Pause size={32}/>:<Play size={32} className="ml-1"/>}</div>
            </button>
          )}
          <button onClick={toggleMute} className="absolute top-4 right-12 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white">{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}</button>
        </div>

        {/* actions + product */}
        <div className="flex items-start gap-3 bg-black px-3 py-2">
          <div className="flex flex-col items-center gap-4 pt-1">
            {mc.show_like&&<button onClick={doLike} className="flex flex-col items-center gap-0.5 text-white"><Heart size={24} fill={liked?'#ef4444':'none'} stroke={liked?'#ef4444':'white'}/><span className="text-[10px]">{likeCount}</span></button>}
            {mc.show_comment&&<button onClick={()=>setShowComments(v=>!v)} className="flex flex-col items-center gap-0.5 text-white"><MessageCircle size={24}/><span className="text-[10px]">{comments.length}</span></button>}
            {mc.show_share&&<button onClick={doShare} className="flex flex-col items-center gap-0.5 text-white"><Share2 size={24}/></button>}
            {modelData.length>0&&<button onClick={()=>setModelOpen(true)} className="flex flex-col items-center gap-0.5 text-white"><Ruler size={24}/></button>}
          </div>
          {mc.show_product&&product&&(
            <div className="flex-1">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 p-2" style={{borderRadius:`${mc.border_radius}px`}}>
                {productImg&&<img src={productImg} alt={product.name||'Produto'} className="h-14 w-14 rounded-lg object-cover"/>}
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white line-clamp-1">{product.name||'Produto'}</p>{productPrice>0&&<p className="text-sm font-bold" style={{color:c.primary}}>R$ {productPrice.toFixed(2)}</p>}</div>
              </div>
              <div className="mt-2 flex gap-2">
                {mc.show_product_btn&&productUrl&&<a href={productUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90" style={{backgroundColor:c.btn}}><ExternalLink size={14}/>Ver produto</a>}
                {mc.show_product_wpp&&<button onClick={doWhatsApp} className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90" style={{backgroundColor:'#25D366'}}>WhatsApp</button>}
              </div>
            </div>
          )}
        </div>

        {/* comments */}
        {showComments&&(
          <div className="border-t border-white/10 bg-black px-3 py-3">
            <div className="mb-3 max-h-40 overflow-y-auto space-y-2">
              {comments.length===0&&<p className="text-center text-xs text-white/50">Nenhum comentário ainda.</p>}
              {comments.map((cm,i)=><div key={cm.id||i} className="rounded-lg bg-white/5 p-2"><p className="text-xs font-semibold text-white/80">{getCommentName(cm)}</p><p className="text-sm text-white">{cm.text}</p></div>)}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <textarea ref={textareaRef} value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Escreva um comentário..." rows={2} className="w-full resize-none rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none"/>
                <button onClick={()=>setShowEmoji(v=>!v)} className="absolute right-2 bottom-2 text-white/60 hover:text-white"><Smile size={16}/></button>
                {showEmoji&&<div className="absolute bottom-full right-0 mb-1 flex flex-wrap gap-1 rounded-lg bg-gray-800 p-2 shadow-lg max-w-[200px]">{EMOJIS.map(e=><button key={e} onClick={()=>insertEmoji(e)} className="text-lg hover:scale-125 transition">{e}</button>)}</div>}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="text" value={commentName} onChange={e=>setCommentName(e.target.value)} placeholder="Seu nome" className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none"/>
              <button onClick={submitComment} className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{backgroundColor:c.primary}}>Enviar</button>
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={()=>setModelOpen(false)}>
        <div className="mx-4 w-full max-w-md rounded-2xl bg-gray-900 p-6 text-white shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">Tabela de Medidas</h3><button onClick={()=>setModelOpen(false)} className="text-white/60 hover:text-white"><X size={20}/></button></div>
          {model?.name&&<p className="mb-3 text-sm text-white/70">{model.name}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-white/20"><th className="py-2 pr-4 font-medium">Tamanho</th>{modelData[0]&&Object.keys(modelData[0]).filter(k=>k!=='size'&&k!=='tamanho'&&k!=='label'&&k!=='name').map(k=><th key={k} className="py-2 pr-4 font-medium capitalize">{k}</th>)}</tr></thead>
              <tbody>{modelData.map((row:any,i:number)=><tr key={i} className="border-b border-white/10"><td className="py-2 pr-4 font-medium">{row.size||row.tamanho||row.label||row.name||'-'}</td>{Object.keys(modelData[0]||{}).filter(k=>k!=='size'&&k!=='tamanho'&&k!=='label'&&k!=='name').map(k=><td key={k} className="py-2 pr-4">{row[k]??'-'}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════ LAYOUT ═══════════════════ */

  return (
    <div className="fixed inset-0 bg-[#111] flex items-center justify-center overflow-hidden">
      {/* NENHUM formato abre o player automaticamente */}
      {!playerOpen && isFloating && <FloatingWidget/>}
      {!playerOpen && isCarousel && <Carousel/>}
      {!playerOpen && isGrid && <Grid/>}
      {playerOpen && <Player/>}
      <MeasuresModal/>
    </div>
  );
};

export default StoryPreviewPage;
