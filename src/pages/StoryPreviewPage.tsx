"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { db, Story, Video, resolveStoreId, generateUuid } from '@/lib/db';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

/* ═══════════════════ EMOJIS ═══════════════════ */

const EMOJIS = ['😍','🔥','👏','❤️','😂','😱','🙌','💯','✨','😢','🤔','👍','💪','🎉','😊','🥰','😎','🙏','💙','⭐','✅','😡','👀','🤩'];

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

/* ═══════════════════ SVG ICONS (igual produção) ═══════════════════ */

const SvgHeart = ({ filled }: { filled: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const SvgComment = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const SvgShare = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const SvgPlay = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);

const SvgPause = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);

const SvgVolume = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const SvgVolumeOff = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);

const SvgClose = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SvgWhatsApp = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
    <path d="M20.52 3.449C18.28 1.21 15.27 0 12.05 0 5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

const SvgRuler = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="22" x2="22" y2="2"/><circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.5" fill="currentColor" stroke="none"/>
    <line x1="7" y1="20" x2="10" y2="17"/><line x1="17" y1="7" x2="14" y2="10"/>
  </svg>
);

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
  const [muted, setMuted] = useState(false);
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
  const [commentSent, setCommentSent] = useState(false);

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

  /* cores — padrão produção */
  const colors = useMemo(()=>{
    const a=appearance||{};
    return {
      primary: a.primary_color||a.button_color||'#0094EB',
      secondary: a.secondary_color||a.primary_color||'#0094EB',
      text: a.text_color||'#0F172A',
      bg: a.background_color||'#FFFFFF',
      btn: a.button_color||a.primary_color||'#0094EB',
      modalBg: a.background_color||'#FFFFFF',
      modalText: a.text_color||'#0F172A',
      modalBorder: 'rgba(15,23,42,.12)',
      modalMuted: '#64748b',
    };
  },[appearance]);

  const modalCfg = useMemo(()=>{
    const raw=parseJsonSafe((appearance as any)?.modal_config);
    const a=appearance||{};
    return {
      show_title: a.show_title ?? raw.show_title ?? true,
      show_play: a.show_play_button ?? raw.show_play_button ?? true,
      show_product: a.show_product ?? raw.show_product ?? true,
      show_product_btn: a.show_product_button ?? raw.show_product_button ?? true,
      show_like: a.show_like_button ?? raw.show_like_button ?? true,
      show_comment: a.show_comment_button ?? raw.show_comment_button ?? true,
      show_share: a.show_share_button ?? raw.show_share_button ?? true,
      show_whatsapp: a.show_whatsapp_button ?? raw.show_whatsapp_button ?? true,
      show_sizing: a.show_sizing_button ?? raw.show_sizing_button ?? true,
      shadow: raw.shadow_enabled??a.shadow_enabled??true,
      border_color: raw.border_color||'',
      border_width: String(raw.border_width||''),
      border_radius: String(raw.border_radius||''),
    };
  },[appearance]);

  const floatingCfg = useMemo(()=>{
    const a=appearance||{}; const raw=parseJsonSafe(a.floating_config);
    const d=raw?.desktop||raw||{};
    const shape=(d.shape||a.floating_shape||'portrait').toLowerCase();
    const size=Number(d.width||a.floating_size||80);
    const h=shape==='square'||shape==='circle'?size:Math.round(size*16/9);
    const pos=String(d.floating_position||d.position||a.floating_position||'bottom-right').toLowerCase();
    return { shape, width:size, height:h, position:pos };
  },[appearance]);

  const carouselCfg = useMemo(()=>{
    const a=appearance||{}; const raw=parseJsonSafe(a.carousel_config);
    const d=raw?.desktop||raw||{};
    return { visible:Number(d.visible_items)||4, gap:Number(d.spacing)||16, radius:Number(d.border_radius)||12, border:d.border_color||'#0094EB', borderW:Number(d.border_style)||2 };
  },[appearance]);

  const gridCfg = useMemo(()=>{
    const a=appearance||{}; const raw=parseJsonSafe(a.grid_config);
    const d=raw?.desktop||raw||{};
    return { cols:Number(d.visible_items)||4, rows:Number(d.rows)||1, gap:Number(d.spacing)||16, radius:Number(d.border_radius)||12, border:d.border_color||'#0094EB', borderW:Number(d.border_style)||2 };
  },[appearance]);

  /* floating position */
  const floatingPos = useMemo(()=>{
    const p=floatingCfg.position;
    if(p.includes('top-left')) return 'top-4 left-4';
    if(p.includes('top-right')) return 'top-4 right-4';
    if(p.includes('bottom-left')) return 'bottom-4 left-4';
    return 'bottom-4 right-4';
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
    setVideoError(false); setProgress(0); setShowComments(false); setShowEmoji(false); setCommentSent(false);
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

  const goNext = () => { if(!videos.length)return; if(activeIdx<videos.length-1) setActiveIdx(p=>p+1); else setPlayerOpen(false); };
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
      setCommentText(''); setCommentName(''); setShowEmoji(false); setCommentSent(true);
      showSuccess('Comentário enviado!');
    }catch{
      const mem=readLocalComments(); const nm=[...mem,nc]; saveLocalComments(nm);
      setComments(nm.filter(c=>getCommentVid(c)===video.id));
      setCommentText(''); setCommentName(''); setShowEmoji(false); setCommentSent(true);
      showSuccess('Comentário enviado!');
    }
  };

  /* ════════════ LOADING ════════════ */

  if(loading) return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Carregando...</div>;
  if(!story) return <div className="fixed inset-0 flex items-center justify-center bg-black text-white">Story não encontrado</div>;

  const c=colors, mc=modalCfg;
  const thumb0=getVideoPoster(videos[0]||null);
  const productImg=product?.image_url||product?.imageUrl||product?.thumbnail_url||product?.thumbnailUrl||'';
  const productUrl=product?.product_url||product?.productUrl||product?.url||'';
  const productPrice=Number(product?.price||product?.sale_price||0);
  const modalShadow = mc.shadow ? '0 24px 80px rgba(15,23,42,.24)' : 'none';
  const modalBorderStyle: React.CSSProperties = mc.border_color ? { border:`${mc.border_width||'2'}px solid ${mc.border_color}`, borderRadius:mc.border_radius||'36px' } : {};
  const commentCount = comments.length;

  /* ═══════════════════ PLAYER (layout produção) ═══════════════════ */

  const Player = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(15,23,42,.62)'}} onClick={close}>
      <div onClick={e=>e.stopPropagation()}
        className="relative flex w-full flex-col overflow-hidden bg-black sm:aspect-[9/16] sm:h-auto sm:max-h-[90vh] sm:rounded-[36px] sm:max-w-[420px]"
        style={{...modalBorderStyle, boxShadow:modalShadow, background:c.modalBg, color:c.modalText}}
      >
        {/* ═══ Progress Bars ═══ */}
        {videos.length>1 && (
          <div className="absolute top-3 left-0 right-0 z-50 flex gap-1.5 px-4">
            {videos.map((_,i)=>(
              <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className={cn('h-full rounded-full transition-all', i<activeIdx?'w-full':i===activeIdx?'':'w-0')}
                  style={i===activeIdx?{width:`${progress}%`,backgroundColor:c.primary}:i<activeIdx?{backgroundColor:c.primary}:undefined}/>
              </div>
            ))}
          </div>
        )}

        {/* ═══ Header ═══ */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-start justify-between pointer-events-none px-4 pt-5 pb-4"
          style={{background:'linear-gradient(to bottom, rgba(0,0,0,.7), transparent)'}}>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-12 pointer-events-auto">
            {mc.show_title && video?.title && (
              <h3 className="truncate text-[13px] font-extrabold text-white" style={{textShadow:'0 1px 3px rgba(0,0,0,.5)'}}>{video.title}</h3>
            )}
            <p className="text-[10px] font-bold uppercase text-white/65">
              {storeName}{videos.length>1?` • ${activeIdx+1}/${videos.length}`:''}
            </p>
          </div>

          {/* Botões de controle no header (mute, play/pause, close) */}
          <div className="flex items-center gap-2 pointer-events-auto flex-shrink-0">
            {mc.show_play && currentUrl && !videoError && (
              <button onClick={togglePlay} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-xl hover:bg-black/60"
                style={{background:'rgba(0,0,0,.4)'}}>
                {playing ? <SvgPause/> : <SvgPlay/>}
              </button>
            )}
            <button onClick={toggleMute} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-xl hover:bg-black/60"
              style={{background:'rgba(0,0,0,.4)'}}>
              {muted ? <SvgVolumeOff/> : <SvgVolume/>}
            </button>
            <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-xl hover:bg-black/60"
              style={{background:'rgba(0,0,0,.4)'}}>
              <SvgClose/>
            </button>
          </div>
        </div>

        {/* ═══ Body (vídeo) ═══ */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden bg-black">
          {/* Navegação tap */}
          <div className="absolute inset-0 z-30 flex">
            <button onClick={goPrev} className="h-full w-[30%]"/>
            <button onClick={goNext} className="h-full w-[70%]"/>
          </div>

          {/* Vídeo */}
          {currentUrl && !videoError ? (
            <video ref={videoRef} src={currentUrl} poster={posterUrl}
              className="absolute inset-0 h-full w-full object-cover" playsInline muted={muted} autoPlay loop
              onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
              onError={()=>setVideoError(true)} onEnded={goNext}/>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/50 text-sm">
              {videoError?'Erro ao carregar vídeo':'Nenhum vídeo disponível'}
            </div>
          )}

          {/* ═══ Botões Sociais — lado direito, top:61% ═══ */}
          <div className="absolute z-[45] flex flex-col items-center gap-3"
            style={{top:'61%', right:'12px', transform:'translateY(-50%)'}}>

            {/* Like */}
            {mc.show_like && (
              <button onClick={doLike}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-sm hover:bg-black/25"
                style={{background:'rgba(0,0,0,.1)'}}>
                <SvgHeart filled={liked}/>
                {likeCount>0 && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-white" style={{textShadow:'0 1px 2px rgba(0,0,0,.5)'}}>{likeCount}</span>}
              </button>
            )}

            {/* Comentários */}
            {mc.show_comment && (
              <button onClick={()=>setShowComments(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-sm hover:bg-black/25"
                style={{background:'rgba(0,0,0,.1)'}}>
                <SvgComment/>
                {commentCount>0 && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-white" style={{textShadow:'0 1px 2px rgba(0,0,0,.5)'}}>{commentCount}</span>}
              </button>
            )}

            {/* Share */}
            {mc.show_share && (
              <button onClick={doShare}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-sm hover:bg-black/25"
                style={{background:'rgba(0,0,0,.1)'}}>
                <SvgShare/>
              </button>
            )}

            {/* Medidas */}
            {mc.show_sizing && modelData.length>0 && (
              <button onClick={()=>setModelOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-white backdrop-blur-sm hover:bg-black/25"
                style={{background:'rgba(0,0,0,.1)'}}>
                <SvgRuler/>
              </button>
            )}

            {/* WhatsApp flutuante */}
            {mc.show_whatsapp && (
              <button onClick={doWhatsApp}
                className="flex h-9 w-9 items-center justify-center rounded-full border-[#25d366] text-white"
                style={{background:'#25d366'}}>
                <SvgWhatsApp/>
              </button>
            )}
          </div>

          {/* ═══ Footer — Card de Produto ═══ */}
          {mc.show_product && product && (
            <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-4 pt-10"
              style={{background:'linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.5), transparent)'}}>
              <div className="pointer-events-auto flex items-center gap-3 rounded-3xl border p-3"
                style={{borderColor:c.modalBorder, background:c.bg, boxShadow:modalShadow}}>
                {/* Imagem */}
                <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                  {productImg ? <img src={productImg} alt={product.name||'Produto'} className="h-full w-full object-cover"/> :
                    <div className="h-full w-full bg-slate-200"/>}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold" style={{color:c.text}}>{product.name||'Produto'}</p>
                  {productPrice>0 && <p className="mt-1 text-base font-extrabold" style={{color:c.secondary}}>R$ {productPrice.toFixed(2)}</p>}
                  {/* Botões dentro do card */}
                  {(mc.show_product_btn) && (
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {mc.show_product_btn && productUrl && (
                        <a href={productUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white hover:opacity-90 no-underline"
                          style={{background:c.btn}}>
                          Ver Produto
                        </a>
                      )}
                      <button onClick={doWhatsApp}
                        className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white hover:opacity-90"
                        style={{background:'#25d366'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                          <path d="M16.6 13.2c-.3-.2-1.7-.8-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.8 0c-.4-.2-1.4-.5-2.6-1.6-.9-.8-1.6-1.8-1.8-2.2-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8s1.3 3.2 1.5 3.4c.2.2 2.3 3.6 5.6 5.1.8.4 1.5.6 2.1.8.9.3 1.7.3 2.3.2.7-.1 1.7-.7 2-1.3.3-.6.3-1.1.2-1.3-.1-.2-.3-.3-.6-.5z"/>
                        </svg>
                        Comprar pelo WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Painel de Comentários (full overlay) ═══ */}
        {showComments && (
          <div className="absolute inset-2 z-[200] flex flex-col overflow-hidden rounded-[20px] border-2 bg-white shadow-2xl animate-[vlSlideUp_.25s_ease]"
            style={{borderColor:c.primary, boxShadow:'0 12px 30px rgba(0,0,0,.35)'}}>
            {/* Cabeçalho */}
            <div className="flex h-12 min-h-[48px] items-center justify-between border-b border-slate-200 bg-white px-3.5">
              <h3 className="text-base font-bold text-[#111]">Comentários{commentCount>0?` (${commentCount})`:''}</h3>
              <button onClick={()=>{setShowComments(false); setShowEmoji(false);}}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <SvgClose/>
              </button>
            </div>

            {/* Corpo scrollável */}
            <div className="flex-1 overflow-y-auto" style={{WebkitOverflowScrolling:'touch'}}>
              {!commentSent ? (
                /* Lista de comentários */
                comments.length===0 ? (
                  <div className="flex flex-col items-center justify-center px-5 py-10 text-center min-h-[180px]">
                    <div className="opacity-15 mb-3"><SvgComment/></div>
                    <p className="text-[15px] font-bold text-slate-700">Seja o primeiro a comentar</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0 px-[18px] py-2.5">
                    {comments.map((cm,i)=>(
                      <div key={cm.id||`${cm.created_at}-${i}`} className="flex gap-2.5 py-2.5 border-b border-slate-50">
                        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{background:c.primary}}>
                          {getCommentName(cm).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-bold text-slate-900">{getCommentName(cm)}</span>
                            {cm.created_at && <span className="text-[11px] text-slate-400">{new Date(cm.created_at).toLocaleDateString('pt-BR')}</span>}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed break-words">{cm.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Feedback pós-envio */
                <div className="flex flex-col items-center justify-center px-5 py-10 text-center min-h-[180px]">
                  <p className="text-[15px] font-bold text-green-600">Obrigado pelo seu comentário! ❤️</p>
                  <button onClick={()=>{setCommentSent(false); setShowComments(false);}}
                    className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-white hover:opacity-90"
                    style={{background:c.btn}}>Fechar</button>
                </div>
              )}
            </div>

            {/* Rodapé — formulário ou botão */}
            {!commentSent && (
              <div className="border-t border-slate-200 bg-white px-3.5 py-3">
                {!showEmoji ? (
                  /* Botão "Deixe seu comentário" */
                  <button onClick={()=>setShowEmoji(true)}
                    className="w-full h-10 rounded-xl text-sm font-bold text-white hover:opacity-90"
                    style={{background:c.btn}}>
                    Deixe seu comentário
                  </button>
                ) : (
                  /* Formulário */
                  <div className="flex flex-col gap-0">
                    <label className="text-xs font-semibold text-slate-500 mb-1">Seu nome</label>
                    <input value={commentName} onChange={e=>setCommentName(e.target.value)}
                      placeholder="Digite seu nome..." maxLength={80}
                      className="w-full h-10 px-3 rounded-[10px] border-[1.5px] border-slate-200 text-sm text-slate-900 outline-none mb-3 bg-slate-50 focus:border-[#0094EB] focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,148,235,.2)]"
                      style={{fontFamily:'inherit'}}/>

                    <label className="text-xs font-semibold text-slate-500 mb-1">Seu comentário</label>
                    <textarea ref={textareaRef} value={commentText} onChange={e=>setCommentText(e.target.value)}
                      placeholder="Escreva seu comentário..." maxLength={1000} rows={3}
                      className="w-full h-[70px] min-h-[70px] max-h-[70px] px-3 rounded-[10px] border-[1.5px] border-slate-200 text-sm text-slate-900 resize-none outline-none mb-2 bg-slate-50 focus:border-[#0094EB] focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,148,235,.2)]"
                      style={{fontFamily:'inherit'}}/>

                    {/* Emojis */}
                    <div className="flex items-center gap-1.5 mb-1.5 relative">
                      <button type="button" onClick={()=>setShowEmoji(false)}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 text-base flex items-center justify-center">😊</button>
                      <div className="flex flex-wrap gap-1">
                        {EMOJIS.map(e=>(
                          <button key={e} type="button" onClick={()=>{
                            const el=textareaRef.current;
                            if(el){ const s=el.selectionStart,e2=el.selectionEnd; const nx=commentText.slice(0,s)+e+commentText.slice(e2); setCommentText(nx); requestAnimationFrame(()=>{el.focus(); el.setSelectionRange(s+e.length,s+e.length);}); }
                            else setCommentText(p=>p+e);
                          }} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-lg flex items-center justify-center">{e}</button>
                        ))}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 mb-2">{commentText.length}/1000</div>

                    <div className="flex gap-2">
                      <button onClick={()=>setShowEmoji(false)}
                        className="flex-1 h-10 rounded-xl border-[1.5px] border-slate-200 bg-white text-sm font-semibold text-slate-500"
                        style={{fontFamily:'inherit'}}>Voltar</button>
                      <button onClick={submitComment}
                        className="flex-1 h-10 rounded-xl text-sm font-bold text-white hover:opacity-90"
                        style={{background:c.btn, fontFamily:'inherit'}}>Enviar</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ Painel de Medidas ═══ */}
        {modelOpen && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-5"
            style={{background:'rgba(15,23,42,.97)', color:'#fff'}}>
            <button onClick={()=>setModelOpen(false)}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <SvgClose/>
            </button>
            <div className="mb-3"><SvgRuler/></div>
            <h3 className="text-lg font-extrabold mb-5">{model?.name||'Modelo'}</h3>
            {model?.size_name && <p className="text-[13px] text-slate-400 mb-4">Veste tamanho: {model.size_name}</p>}
            {modelData.length>0 ? (
              <table className="w-full max-w-[280px]" style={{borderCollapse:'collapse'}}>
                <tbody>
                  {modelData.map((m:any,i:number)=>(
                    <tr key={`${m.name||m.label||i}-${i}`}>
                      <td className="py-2.5 px-3 border-b border-white/10 font-semibold text-slate-300">{m.name||m.label||`Medida ${i+1}`}</td>
                      <td className="py-2.5 px-3 border-b border-white/10 text-right font-extrabold">{m.value||m.size||'-'}{m.unit?` ${m.unit}`:''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-slate-400 mt-2">Nenhuma medida cadastrada.</p>}
          </div>
        )}
      </div>
    </div>
  );

  /* ═══════════════════ WIDGET FLUTUANTE ═══════════════════ */

  const FloatingWidget = () => (
    <div className={`fixed ${floatingPos} z-40 cursor-pointer group transition-transform hover:scale-105 active:scale-95`}
      style={{width:floatingCfg.width,height:floatingCfg.height}} onClick={()=>openPlayer(0)} title="Clique para abrir o story">
      <div className={`h-full w-full overflow-hidden ${widgetShape} border-2 shadow-xl`} style={{borderColor:c.primary}}>
        {thumb0?<img src={thumb0} alt="Story" className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center bg-black text-white"><SvgPlay/></div>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900"><span className="ml-0.5"><SvgPlay/></span></div>
        </div>
      </div>
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 shadow-lg"/>
    </div>
  );

  /* ═══════════════════ CARROSSEL ═══════════════════ */

  const Carousel = () => (
    <div className="w-full max-w-5xl px-4">
      <button onClick={close} className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><SvgClose/></button>
      <h2 className="mb-6 text-center text-xl font-semibold text-white">{story?.title||'Stories'}</h2>
      {videos.length===0?<p className="text-center text-white/50">Nenhum vídeo.</p>:(
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{gap:`${carouselCfg.gap}px`}}>
          {videos.map((v,i)=>{
            const thumb=getVideoPoster(v);
            const w=Math.round(100/carouselCfg.visible);
            return (
              <button key={v.id||i} onClick={()=>openPlayer(i)}
                className="relative flex-shrink-0 snap-center overflow-hidden transition-all hover:scale-[1.02]"
                style={{width:`${w}%`,minWidth:'140px',aspectRatio:'9/16',borderRadius:`${carouselCfg.radius}px`,border:`${carouselCfg.borderW}px solid ${carouselCfg.border}`}}>
                {thumb?<img src={thumb} alt={v.title||''} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40"><SvgPlay/></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition"><div className="text-white opacity-0 hover:opacity-100 transition"><SvgPlay/></div></div>
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
      <button onClick={close} className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><SvgClose/></button>
      <h2 className="mb-6 text-center text-xl font-semibold text-white">{story?.title||'Stories'}</h2>
      {videos.length===0?<p className="text-center text-white/50">Nenhum vídeo.</p>:(
        <div className="grid" style={{gridTemplateColumns:`repeat(${gridCfg.cols},1fr)`,gap:`${gridCfg.gap}px`}}>
          {videos.map((v,i)=>{
            const thumb=getVideoPoster(v);
            return (
              <button key={v.id||i} onClick={()=>openPlayer(i)}
                className="group relative aspect-[9/16] overflow-hidden transition-all hover:scale-[1.02]"
                style={{borderRadius:`${gridCfg.radius}px`,border:`${gridCfg.borderW}px solid ${gridCfg.border}`}}>
                {thumb?<img src={thumb} alt={v.title||''} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center bg-gray-800 text-white/40"><SvgPlay/></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition"><div className="text-white opacity-0 group-hover:opacity-100 transition"><SvgPlay/></div></div>
                {v.title&&<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4"><p className="text-xs font-medium text-white line-clamp-2">{v.title}</p></div>}
              </button>
            );
          })}
        </div>
      )}
      {videos.length>0&&<p className="mt-4 text-center text-xs text-white/40">Clique em um vídeo para abrir o player</p>}
    </div>
  );

  /* ═══════════════════ LAYOUT ═══════════════════ */

  return (
    <div className="fixed inset-0 bg-[#111] flex items-center justify-center overflow-hidden">
      {!playerOpen && isFloating && <FloatingWidget/>}
      {!playerOpen && isCarousel && <Carousel/>}
      {!playerOpen && isGrid && <Grid/>}
      {playerOpen && <Player/>}

      {/* Animação slideUp dos comentários */}
      <style>{`
        @keyframes vlSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default StoryPreviewPage;
