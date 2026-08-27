import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  db,
  Story,
  Video,
  Appearance,
  StoryFormat,
  ScrollDirection,
  DisplayLocation,
  PageRule,
  StoryVideo,
  ConditionType,
  DisplayPosition,
  replaceStoryRelations,
  resolveStoreId,
  generateUuid,
  isValidUuid,
} from '@/lib/db';
import { useTenant } from '@/context/TenantContext';
import {
  ArrowLeft,
  Save,
  X,
  Layout,
  Layers,
  MousePointer2,
  Film,
  MapPin,
  Globe,
  CheckCircle2,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

type PageRuleCondition = 'home' | 'all_pages' | 'url_contains' | 'url_not_contains' | 'url_not_equals';

const PAGE_RULE_OPTIONS: Array<{ label: string; value: PageRuleCondition }> = [
  { label: 'Somente na Home', value: 'home' },
  { label: 'Todas as páginas', value: 'all_pages' },
  { label: 'URL contém', value: 'url_contains' },
  { label: 'URL não contém', value: 'url_not_contains' },
  { label: 'URL diferente', value: 'url_not_equals' },
];

const FORMAT_ICONS = {
  floating_widget: MousePointer2,
  carousel: Layout,
  grid: Layers,
} as const;

const CONDITION_TYPES_WITH_VALUE: PageRuleCondition[] = ['url_contains', 'url_not_contains', 'url_not_equals'];

const POSITION_OPTIONS = [
  { label: 'Acima do elemento', value: 'beforebegin' as const },
  { label: 'Abaixo do elemento', value: 'afterend' as const },
];

const getAllSafe = async <T,>(collection: any, storeId?: string): Promise<T[]> => {
  if (!collection?.getAll) return [];
  try {
    if (storeId) return await collection.getAll(storeId);
    return await collection.getAll();
  } catch {
    try {
      return await collection.getAll();
    } catch {
      return [];
    }
  }
};

const getByIdSafe = async <T,>(collection: any, id?: string, storeId?: string): Promise<T | null> => {
  if (!collection?.getById || !id) return null;
  try {
    if (storeId) return await collection.getById(id, storeId);
    return await collection.getById(id);
  } catch {
    try {
      return await collection.getById(id);
    } catch {
      return null;
    }
  }
};

const deleteSafe = async (collection: any, id: string, storeId?: string) => {
  if (!collection?.delete || !id) return;
  try {
    if (storeId) {
      await collection.delete(id, storeId);
      return;
    }
    await collection.delete(id);
  } catch {
    try {
      await collection.delete(id);
    } catch {
      // ignore
    }
  }
};

const normalizeMediaUrl = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  const url = String(rawUrl).trim();
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `https://wznvecurmisgoaijykbt.supabase.co/storage/v1/object/public/videos/${url}`;
};

const getVideoPosterUrl = (video: Video): string => {
  const item = video as any;
  const raw = item.thumbnail_url || item.thumbnailUrl || item.cover_url || item.coverUrl || item.poster_url || item.posterUrl || item.image_url || item.imageUrl || item.thumbnail || '';
  return normalizeMediaUrl(raw);
};

const getVideoFileUrl = (video: Video): string => {
  const item = video as any;
  const raw = item.video_url || item.videoUrl || item.file_url || item.fileUrl || item.url || item.src || '';
  return normalizeMediaUrl(raw);
};

const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i.test(url);
};

type PageRuleUi = {
  id: string;
  store_id?: string;
  story_id?: string;
  condition_type: PageRuleCondition;
  value: string;
  created_at?: string;
  updated_at?: string;
};

type DisplayLocationUi = DisplayLocation & {
  location?: string | null;
  page_type?: string | null;
};

const mapDbRuleToUiRule = (rule: any): PageRuleUi => {
  const legacyRuleType = String(rule.rule_type || '').toLowerCase();
  const legacyMatchType = String(rule.match_type || '').toLowerCase();
  const legacyPageType = String(rule.page_type || '').toLowerCase();
  const legacyUrl = String(rule.page_url || rule.url_pattern || '').trim();
  const storedCondition = String(rule.condition_type || '').trim();
  const storedValue = String(rule.value || '').trim();

  let condition_type: PageRuleCondition = 'all_pages';
  let value = '';

  if (storedCondition) {
    if (storedCondition === 'home' || storedCondition === 'all_pages' || storedCondition === 'url_contains' || storedCondition === 'url_not_contains' || storedCondition === 'url_not_equals') {
      condition_type = storedCondition as PageRuleCondition;
      value = CONDITION_TYPES_WITH_VALUE.includes(condition_type) ? storedValue : '';
    }
  } else if (legacyRuleType === 'contains' || legacyMatchType === 'contains') {
    condition_type = 'url_contains';
    value = legacyUrl;
  } else if (legacyRuleType === 'not_contains' || legacyMatchType === 'not_contains') {
    condition_type = 'url_not_contains';
    value = legacyUrl;
  } else if (legacyRuleType === 'equals' || legacyMatchType === 'equals') {
    condition_type = 'url_not_equals';
    value = legacyUrl;
  } else if (legacyRuleType === 'home' || legacyPageType === 'home') {
    condition_type = 'home';
  } else if (legacyRuleType === 'all_pages' || legacyPageType === 'all_pages') {
    condition_type = 'all_pages';
  }

  return {
    id: rule.id,
    store_id: rule.store_id,
    story_id: rule.story_id,
    condition_type,
    value,
    created_at: rule.created_at,
    updated_at: rule.updated_at,
  };
};


const StoryDetailsPage = () => {
  const { storeId, currentStore, loading: tenantLoading } = useTenant();
  const { id } = useParams();
  const navigate = useNavigate();

  const isCreate = !id || id === 'new';
  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [story, setStory] = useState<Story | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [locations, setLocations] = useState<DisplayLocationUi[]>([]);
  const [pageRules, setPageRules] = useState<PageRuleUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', format: 'carousel' as StoryFormat, scroll_direction: 'horizontal' as ScrollDirection, active: true, appearance_id: '' });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'location' | 'rule'; id: string; name: string }>({ isOpen: false, type: 'location', id: '', name: '' });

  // 🎯 Seletor visual
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [selectorUrl, setSelectorUrl] = useState("");
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [storeRealUrl, setStoreRealUrl] = useState("");

  const [stableStoryId] = useState(() => id && id !== 'new' && id !== 'undefined' ? id : generateUuid());

  const loadStoryData = useCallback(async () => {
    if (tenantLoading) return;
    try {
      setLoading(true);
      const finalStoreId = await resolveStoreId(storeId);
      setResolvedStoreId(finalStoreId);

      // 🎯 Busca a URL REAL da loja (configurada em Configurações) para o preview de simulação
      try {
        const settings = await db.getSettings(finalStoreId);
        setStoreRealUrl(String(settings?.store_url || ''));
      } catch {
        setStoreRealUrl('');
      }

      const [videos, apps] = await Promise.all([getAllSafe<Video>((db as any).videos, finalStoreId), getAllSafe<Appearance>((db as any).appearances, finalStoreId)]);
      setAllVideos(videos);
      setAppearances(apps);

      if (isCreate) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        setPageRules([]);
        setFormData({ title: '', format: 'carousel', scroll_direction: 'horizontal', active: true, appearance_id: '' });
        return;
      }

      if (!id || !isValidUuid(id)) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        setPageRules([]);
        return;
      }

      const currentStory = await getByIdSafe<Story>((db as any).stories, id, finalStoreId);
      if (!currentStory) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        setPageRules([]);
        return;
      }

      setStory(currentStory);
      const [relations, locs, rules] = await Promise.all([getAllSafe<StoryVideo>((db as any).storyVideos, finalStoreId), getAllSafe<DisplayLocationUi>((db as any).displayLocations, finalStoreId), getAllSafe<any>((db as any).pageRules, finalStoreId)]);
      const storyVideoIds = relations.filter((relation: any) => relation.story_id === currentStory.id && (!relation.store_id || relation.store_id === finalStoreId)).sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0)).map((relation: any) => relation.video_id).filter((videoId: any) => videoId && isValidUuid(videoId));
      setSelectedVideoIds(storyVideoIds);
      setLocations(
        locs
          .filter((location: any) => location.story_id === currentStory.id && (!location.store_id || location.store_id === finalStoreId))
          .map((location: any) => ({
            ...location,
            location: location.location || location.position || 'afterend',
            page_type: location.page_type || 'all_pages',
            selector: location.selector || '',
            position: location.position || 'beforeend',
          })),
      );

      setPageRules(
        rules
          .filter((rule: any) => rule.story_id === currentStory.id && (!rule.store_id || rule.store_id === finalStoreId))
          .map(mapDbRuleToUiRule)
          .map((rule: PageRuleUi) => ({
            ...rule,
            condition_type: rule.condition_type || 'all_pages',
            value: rule.value || '',
          })),
      );

      setFormData({ title: currentStory.title || '', format: currentStory.format || 'carousel', scroll_direction: currentStory.scroll_direction || 'horizontal', active: Boolean(currentStory.active), appearance_id: currentStory.appearance_id && isValidUuid(currentStory.appearance_id) ? currentStory.appearance_id : '' });
    } catch (error) {
      console.error('Erro ao carregar Story:', error);
      showError('Erro ao carregar os dados do Story.');
    } finally {
      setLoading(false);
    }
  }, [id, isCreate, storeId, tenantLoading]);

  useEffect(() => {
    loadStoryData();
  }, [loadStoryData]);

  const saveLocationsAndRules = async (targetStoryId: string, targetStoreId: string) => {
    const now = new Date().toISOString();
    const existingLocations = await getAllSafe<DisplayLocationUi>((db as any).displayLocations, targetStoreId);
    const locationsToDelete = existingLocations.filter((location: any) => location.story_id === targetStoryId && (!location.store_id || location.store_id === targetStoreId));
    await Promise.all(locationsToDelete.map((location: any) => deleteSafe((db as any).displayLocations, location.id, targetStoreId)));
    const normalizedLocations = locations.map((location) => ({
      id: isValidUuid(location.id) ? location.id : generateUuid(),
      store_id: targetStoreId,
      story_id: targetStoryId,
      location: location.location || location.position || 'afterend',
      selector: String(location.selector || '').trim(),
      position: location.position || 'beforeend',
      active: true,
      created_at: location.created_at || now,
      updated_at: now,
    }));

    await Promise.all(normalizedLocations.map((location) => (db as any).displayLocations.save(location)));

    const existingRules = await getAllSafe<any>((db as any).pageRules, targetStoreId);
    const rulesToDelete = existingRules.filter((rule: any) => rule.story_id === targetStoryId && (!rule.store_id || rule.store_id === targetStoreId));
    await Promise.all(rulesToDelete.map((rule: any) => deleteSafe((db as any).pageRules, rule.id, targetStoreId)));

    const normalizedRules = pageRules.map((rule) => ({
      id: isValidUuid(rule.id) ? rule.id : generateUuid(),
      store_id: targetStoreId,
      story_id: targetStoryId,
      condition_type: rule.condition_type,
      value: CONDITION_TYPES_WITH_VALUE.includes(rule.condition_type) ? rule.value.trim() : null,
      active: true,
      created_at: rule.created_at || now,
      updated_at: now,
    } as unknown as PageRule & Record<string, any>));

    await Promise.all(normalizedRules.map((rule) => (db as any).pageRules.save(rule)));
  };

  const handleSave = async (event: FormEvent) => {
    event?.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
      if (!formData.title.trim()) {
        showError('Informe o nome do Story.');
        return;
      }
      const now = new Date().toISOString();
      const validSelectedVideoIds = selectedVideoIds.filter((videoId) => isValidUuid(videoId));
      const storyPayload = { 
        ...(story || ({} as Story)), 
        id: stableStoryId, 
        store_id: finalStoreId, 
        title: formData.title.trim(), 
        format: formData.format, 
        scroll_direction: formData.scroll_direction, 
        active: formData.active, 
        appearance_id: formData.appearance_id && isValidUuid(formData.appearance_id) ? formData.appearance_id : null, 
        cta_enabled: story?.cta_enabled ?? false, 
        cta_type: story?.cta_type || 'none', 
        cta_text: story?.cta_text || '', 
        cta_url: story?.cta_url || '', 
        whatsapp_message: story?.whatsapp_message || '', 
        view_count: story?.view_count ?? 0, 
        click_count: story?.click_count ?? 0, 
        created_at: story?.created_at || now, 
        updated_at: now 
      } as Story;
      const savedStory = await (db as any).stories.save(storyPayload);
const newRelations: StoryVideo[] = validSelectedVideoIds.map((videoId, index) => ({
  id: generateUuid(),
  store_id: finalStoreId,
  story_id: savedStory.id,
  video_id: videoId,
  position: index + 1,
  is_cover: index === 0,
  created_at: now,
}));

// ðŸ” DEBUG
console.log('newRelations:', JSON.stringify(newRelations));
console.log('typeof is_cover[0]:', typeof newRelations[0]?.is_cover);
      await replaceStoryRelations('story_videos', finalStoreId, savedStory.id, newRelations);
      await saveLocationsAndRules(savedStory.id, finalStoreId);
      window.dispatchEvent(new Event('storage'));
      setStory(savedStory);
      setSuccessOpen(true);
    } catch (error) {
      console.error('Erro ao salvar Story:', error);
      showError('Erro ao salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVideo = (videoId: string) => {
    if (!isValidUuid(videoId)) return;
    setSelectedVideoIds((prev) => (prev.includes(videoId) ? prev.filter((currentId) => currentId !== videoId) : [...prev, videoId]));
  };

  const handleAddPageRule = () => {
    const now = new Date().toISOString();
    setPageRules((prev) => [...prev, { id: generateUuid(), store_id: resolvedStoreId || '', story_id: story?.id || '', condition_type: 'all_pages', value: '', created_at: now, updated_at: now }]);
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((location) => location.id !== locationId));
  };

  const handleUpdatePageRule = (ruleId: string, patch: Partial<PageRuleUi>) => {
    setPageRules((prev) => prev.map((rule) => rule.id === ruleId ? { ...rule, ...patch, value: patch.condition_type && !CONDITION_TYPES_WITH_VALUE.includes(patch.condition_type) ? '' : patch.value ?? rule.value } : rule));
  };

  const handleDeletePageRule = (ruleId: string) => {
    setPageRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    if (isCreate && story?.id) {
      navigate(`/stories/${story.id}`, { replace: true });
    }
  };

  // ──────────────── DRAG-AND-DROP ──────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === dropIndex) return;

    setSelectedVideoIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

// 🎯 Função do seletor visual corrigida para usar o ID estável
const handleOpenSelector = async () => {
  const url = selectorUrl.trim();
  if (!url) return;

  const token = "sel_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

  // ✅ CORREÇÃO: Usamos o stableStoryId para garantir que novas stories também funcionem no seletor
  const storyIdParam = `&widgetSelectStoryId=${stableStoryId}`;
  const sep = url.includes("?") ? "&" : "?";
  const finalUrl = url + sep + "widgetSelectToken=" + token + storyIdParam;

  window.open(finalUrl, "_blank");
  setSelectorLoading(true);
  setSelectorModalOpen(false);

let tentativas = 0;
const polling = setInterval(async () => {
  tentativas++;

  try {
    const response = await fetch(
      `https://wznvecurmisgoaijykbt.supabase.co/functions/v1/widget-selector?token=${encodeURIComponent(token)}`
    );
    const result = await response.json();
    
    // ✅ DEBUG (remova depois)
    console.log('[Vidlytics Debug Polling]', result);

    // Busca o seletor em diferentes formatos de resposta
    const data = result.data;
    const selectorCss = 
      (data && typeof data === 'object' && !Array.isArray(data)) ? data.selector 
      : (Array.isArray(data) && data[0]) ? data[0].selector 
      : null;

    if (result.success && selectorCss) {
      clearInterval(polling);

      // ① Atualiza o estado imediatamente (campo preenche na hora)
      const baseLocation = locations[0];
      const locId = isValidUuid(baseLocation?.id) ? baseLocation.id : generateUuid();

      setLocations((prev) => {
        const base = prev[0] || {
          id: locId,
          store_id: resolvedStoreId || '',
          story_id: stableStoryId,
          position: 'beforeend',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [{ ...base, selector: selectorCss }];
      });

      // ② Persiste no banco real (display_locations) para sobreviver ao loadStoryData
      try {
        const resolvedStore = resolvedStoreId || result.data?.store_id;
        const resolvedStory = stableStoryId || result.data?.story_id;

        if (resolvedStore && resolvedStory) {
          await (db as any).displayLocations.save({
            id: locId,
            store_id: resolvedStore,
            story_id: resolvedStory,
            location: baseLocation?.location || baseLocation?.position || 'afterend',
            selector: selectorCss,
            position: baseLocation?.position || 'beforeend',
            active: true,
            created_at: baseLocation?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          console.log('[Vidlytics] Seletor persistido no banco ✔', selectorCss);
        }
      } catch (saveErr) {
        console.error('[Vidlytics] Erro ao persistir seletor:', saveErr);
      }

      setSelectorLoading(false);
      setSelectorUrl("");

      // ③ Recarrega os dados para refletir o banco atualizado
      loadStoryData();
    }
  } catch (err) {
    // ignora falhas de rede no polling
  }

  if (tentativas > 150) {
    clearInterval(polling);
    setSelectorLoading(false);
  }
}, 2000);
};

  // ──────────────── GALLERY MODAL ────────────────
  const GalleryModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Selecionar Vídeos</h3>
          <button type="button" onClick={() => setIsGalleryOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {allVideos.map((video) => {
              const selected = selectedVideoIds.includes(video.id);
              const posterUrl = getVideoPosterUrl(video);
              const fileUrl = getVideoFileUrl(video);
              const isPosterVideo = isVideoUrl(posterUrl) || (!posterUrl && Boolean(fileUrl));
              const mediaSource = posterUrl || fileUrl;

              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleToggleVideo(video.id)}
                  className={cn(
                    'group relative aspect-[9/16] overflow-hidden rounded-2xl border-2 bg-slate-900 transition-all text-left',
                    selected ? 'border-[#0094EB] shadow-lg shadow-blue-100 ring-2 ring-[#0094EB]/30' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  {isPosterVideo ? (
                    <video
                      src={mediaSource}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  ) : posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={video.title || 'Vídeo'}
                      className="h-full w-full object-cover pointer-events-none"
                      onError={(e) => {
                        if (fileUrl) {
                          e.currentTarget.style.display = 'none';
                          const fallbackVideo = e.currentTarget.nextElementSibling as HTMLVideoElement;
                          if (fallbackVideo) fallbackVideo.style.display = 'block';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <Film size={24} />
                    </div>
                  )}

                  {/* Fallback de streaming invisível para caso a tag img falhe */}
                  {fileUrl && !isPosterVideo && (
                    <video
                      src={fileUrl}
                      preload="metadata"
                      muted
                      playsInline
                      style={{ display: 'none' }}
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  )}

                  <div className={cn('absolute inset-0 flex items-center justify-center transition-all pointer-events-none', selected ? 'bg-[#0094EB]/25' : 'bg-black/10 group-hover:bg-black/20')}>
                    {selected && <div className="rounded-full bg-[#0094EB] p-1.5 text-white shadow-md"><CheckCircle2 size={16} /></div>}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pointer-events-none">
                    <p className="truncate text-[10px] font-black text-white">{video.title || 'Sem título'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate('/videos/new')} className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]">Criar novo vídeo</button>
          <button type="button" onClick={() => setIsGalleryOpen(false)} className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]">
            Adicionar {selectedVideoIds.length} vídeo(s) ao Story
          </button>
        </div>
      </div>
    </div>
  );

// ðŸ†• Modal do seletor visual
const SelectorModal = () => {
  if (!selectorModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">
            Selecionar elemento na loja
          </h3>
          <button
            type="button"
            onClick={() => setSelectorModalOpen(false)}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            URL da página da loja
          </label>
          <input
            type="url"
            value={selectorUrl}
            onChange={(e) => setSelectorUrl(e.target.value)}
            placeholder="https://www.sualoja.com.br/pagina-exemplo"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#0094EB]"
          />
          <p className="text-xs text-slate-500">
            Uma nova aba abrirá. Clique no elemento onde o widget deve aparecer
            e pressione <b>Enter</b>.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setSelectorModalOpen(false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleOpenSelector}
            disabled={!selectorUrl.trim()}
            className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787] disabled:opacity-50"
          >
            Abrir seletor
          </button>
        </div>
      </div>
    </div>
  );
};

  if (loading || tenantLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#0094EB]" /></div>;

  if (!isCreate && !story) return <div className="space-y-6 animate-fade-in"><button type="button" onClick={() => navigate('/stories')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50"><ArrowLeft size={18} />Voltar</button><div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm"><h1 className="text-xl font-black text-slate-900">Story não encontrado</h1><p className="mt-2 text-sm font-bold text-slate-500">Não foi possível localizar esse Story para a loja atual.</p></div></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/stories')} className="rounded-xl border border-slate-200 bg-white p-2.5 transition-all hover:bg-slate-50"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{isCreate ? 'Novo Story' : 'Editar Story'}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{isCreate ? 'Criar novo story' : formData.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mr-4 hidden items-center gap-2 sm:flex">
            <span className={cn('text-[10px] font-black uppercase tracking-widest', formData.active ? 'text-emerald-500' : 'text-slate-400')}>{formData.active ? 'Status: Ativo' : 'Status: Inativo'}</span>
            <button type="button" onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))} className={cn('h-6 w-12 rounded-full p-1 transition-all duration-300', formData.active ? 'bg-emerald-500' : 'bg-slate-300')}><div className={cn('h-4 w-4 rounded-full bg-white transition-all duration-300', formData.active ? 'translate-x-6' : 'translate-x-0')} /></button>
          </div>
{!isCreate ? (
          <div className="hidden items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1 md:flex">
            <input
              type="url"
              // ✅ Agora exibe a URL real da loja ativa apenas como exemplo (placeholder) em cinza claro
              placeholder={storeRealUrl || currentStore?.url ? `Ex: ${storeRealUrl || currentStore?.url}` : "Cole a URL de teste (ex: link de um produto)..."}
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="w-64 bg-transparent px-3 py-1 text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => {
                // ✅ Se o usuário não digitou nada no input, assume o fallback automático da URL real da loja
                let targetUrl = previewUrl.trim() || storeRealUrl.trim() || currentStore?.url?.trim() || "";
                if (!targetUrl) {
                  alert("Por favor, configure a URL da sua loja nas Configurações ou digite uma URL de teste.");
                  return;
                }
                if (!/^https?:\/\//i.test(targetUrl)) {
                  targetUrl = "https://" + targetUrl;
                }
                const connector = targetUrl.includes("?") ? "&" : "?";
                const finalPreviewUrl = targetUrl + connector + "vidlytics_preview_story_id=" + stableStoryId;
                window.open(finalPreviewUrl, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
            >
              🚀 Simular Preview
            </button>
          </div>
        ) : (
          <div className="hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 md:block">
            💾 Salve para habilitar o preview
          </div>
        )}

<button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-[#0E4787] disabled:opacity-60">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{isSaving ? 'Salvando...' : 'Salvar Alterações'}</button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-8">
            {/* ── DESIGN E FORMATO ── */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6"><Layout className="text-[#0094EB]" size={20} /><h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Design e Formato</h3></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Story</label>
                  <input type="text" value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none focus:border-[#0094EB]" placeholder="Ex: Lançamentos" />
                </div>

                {/* Bloco de Formatos Corrigido e Responsivo */}
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layout de Exibição</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {[
                      { id: 'floating_widget', label: 'Flutuante' },
                      { id: 'carousel', label: 'Carrossel' },
                      { id: 'grid', label: 'Grade' },
                      { id: 'dynamic_carousel', label: 'Carrossel Dinâmico' },
                    ].map((format) => {
                      const Icon = FORMAT_ICONS[format.id as keyof typeof FORMAT_ICONS] ?? Layout;
                      const isDynamic = format.id === 'dynamic_carousel';
                      const isDisabled = isDynamic && selectedVideoIds.length < 3;

                      return (
                        <button
                          key={format.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setFormData((prev) => ({ ...prev, format: format.id as StoryFormat }))}
                          className={cn(
                            'flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-6 transition-all min-h-[140px]',
                            isDisabled
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 opacity-60'
                              : formData.format === format.id
                                ? 'border-[#0094EB] bg-blue-50 text-[#0094EB]'
                                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                          )}
                        >
                          <Icon size={24} strokeWidth={1.7} />
                          <span className="text-[10px] font-black uppercase tracking-wider">{format.label}</span>
                          {isDynamic && (
                            <span className="text-center text-[9px] font-bold leading-tight text-slate-400 mt-1">
                              {isDisabled ? 'Adicione 3 vídeos' : `${selectedVideoIds.length} selecionados`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Alerta informativo do Carrossel Dinâmico */}
                  {formData.format === 'dynamic_carousel' && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 text-xs font-semibold text-slate-600 transition-all flex flex-col gap-2">
                      <div>
                        ⚠️ <strong className="text-amber-700">Carrossel Dinâmico:</strong> Este formato requer no mínimo <strong>3 vídeos ativos</strong> selecionados abaixo para funcionar corretamente na sua loja.
                      </div>
                      <div>
                        💡 Recomendamos o uso de <strong>6 ou mais vídeos</strong> para a melhor experiência de rolagem infinita.
                      </div>
                    </div>
                  )}
                </div>
                </div>
                <div className="space-y-2 pt-4"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direção de Rolagem</label><select value={formData.scroll_direction} onChange={(event) => setFormData((prev) => ({ ...prev, scroll_direction: event.target.value as ScrollDirection }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></div>
                <div className="space-y-2 pt-4"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estilo Visual / Aparência</label><select value={formData.appearance_id} onChange={(event) => setFormData((prev) => ({ ...prev, appearance_id: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none"><option value="">Seguir Padrão do App</option>{appearances.filter((app) => app.id && isValidUuid(app.id)).map((app) => (<option key={app.id} value={app.id}>{app.name} {app.is_default ? '(Padrão)' : ''}</option>))}</select></div>
              </div>

            {/* ── CONTEÚDO SELECIONADO (COM DRAG-AND-DROP) ── */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  <Film className="text-[#0094EB]" size={20} />
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Conteúdo selecionado</h3>
                    {selectedVideoIds.length > 0 && (
                      <p className="text-[10px] font-bold text-slate-400">Arraste para reordenar os vídeos</p>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setIsGalleryOpen(true)} className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]">
                  + Adicionar Vídeos
                </button>
              </div>

              {selectedVideoIds.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {selectedVideoIds.map((videoId, index) => {
                    const video = allVideos.find((item) => item.id === videoId);
                    if (!video) return null;
                    const posterUrl = getVideoPosterUrl(video);
                    const isDragging = dragIndex === index;
                    return (
                      <div
                        key={video.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'group relative aspect-[9/16] cursor-grab overflow-hidden rounded-2xl border-2 transition-all active:cursor-grabbing',
                          isDragging ? 'scale-105 border-[#0094EB] opacity-70 shadow-2xl' : 'border-[#0094EB] shadow-lg shadow-blue-100',
                        )}
                      >
{/* Poster / Fallback de Streaming */}
                        {isVideoUrl(posterUrl) || (!posterUrl && Boolean(getVideoFileUrl(video))) ? (
                          <video
                            src={posterUrl || getVideoFileUrl(video)}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover pointer-events-none"
                          />
                        ) : posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={video.title || 'Vídeo'}
                            className="h-full w-full object-cover pointer-events-none"
                            onError={(e) => {
                              const fileUrl = getVideoFileUrl(video);
                              if (fileUrl) {
                                e.currentTarget.style.display = 'none';
                                const fallbackVideo = e.currentTarget.nextElementSibling as HTMLVideoElement;
                                if (fallbackVideo) fallbackVideo.style.display = 'block';
                              }
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <Film size={24} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Sem capa</span>
                            </div>
                          </div>
                        )}

                        {getVideoFileUrl(video) && !isVideoUrl(posterUrl) && posterUrl && (
                          <video
                            src={getVideoFileUrl(video)}
                            preload="metadata"
                            muted
                            playsInline
                            style={{ display: 'none' }}
                            className="h-full w-full object-cover pointer-events-none"
                          />
                        )}

                        {/* Indicador de ordem (badge numerado) */}
                        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#0094EB] px-2 py-0.5 text-[10px] font-black text-white shadow-md">
                          <GripVertical size={10} />
                          {index + 1}
                        </div>

                        {/* Botão de remover (hover) */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleToggleVideo(video.id); }}
                          className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-all hover:bg-red-500 group-hover:opacity-100"
                          title="Remover vídeo"
                        >
                          <X size={14} />
                        </button>

                        {/* Título do vídeo */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="truncate text-[9px] font-black text-white">{video.title || 'Sem título'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <Film size={28} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-400">Nenhum vídeo selecionado</p>
                  <button
                    type="button"
                    onClick={() => setIsGalleryOpen(true)}
                    className="mt-3 rounded-xl bg-[#0094EB] px-5 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]"
                  >
                    + Adicionar Vídeos
                  </button>
                </div>
              )}
            </div>

            {/* ── LOCAL DE EXIBIÃ‡ÃƒO ── */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><MapPin className="text-[#0094EB]" size={18} /><h4 className="text-sm font-black uppercase text-slate-800">Local de exibição</h4></div></div>
              <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-end">
<div className="space-y-2">
  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
    SELETOR CSS
  </label>
  <div className="flex gap-2">
    <input
      type="text"
      value={locations[0]?.selector || ''}
      onChange={(event) =>
        setLocations((prev) => [
          {
            ...(prev[0] || {
              id: generateUuid(),
              store_id: resolvedStoreId || '',
              story_id: story?.id || '',
              position: 'beforeend',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
            selector: event.target.value,
          },
        ])
      }
      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
      placeholder=".breadcrumbs"
    />
        <button
      type="button"
      onClick={() => setSelectorModalOpen(true)}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-[#0094EB] hover:bg-blue-50 transition-colors"
    >
      🎯 Selecionar
    </button>
      </div>
</div>
                            <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    POSIÇÃO
                  </label>
                  <select
                    value={locations[0]?.position || 'beforeend'}
                    onChange={(event) =>
                      setLocations((prev) => [
                        {
                          ...(prev[0] || {
                            id: generateUuid(),
                            store_id: resolvedStoreId || '',
                            story_id: story?.id || '',
                            selector: '',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          }),
                          position: event.target.value as DisplayPosition,
                        },
                      ])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                  >
                    {POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ──── REGRAS DE PÁGINA ──── */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><Globe className="text-[#0094EB]" size={18} /><h4 className="text-sm font-black uppercase text-slate-800">Qual página irá aparecer?</h4></div></div>
              <div className="space-y-4">
                {pageRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">REGRA</label><select value={rule.condition_type} onChange={(event) => handleUpdatePageRule(rule.id, { condition_type: event.target.value as PageRuleCondition })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none">{PAGE_RULE_OPTIONS.map((ruleOption) => (<option key={ruleOption.value} value={ruleOption.value}>{ruleOption.label}</option>))}</select></div>
                      <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">VALOR</label>{CONDITION_TYPES_WITH_VALUE.includes(rule.condition_type) ? <div className="flex items-center gap-2"><input type="text" value={rule.value} onChange={(event) => handleUpdatePageRule(rule.id, { value: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none" placeholder="/colecao, /produto/nome-do-produto ou trecho da URL" />{pageRules.length > 1 && <button type="button" onClick={() => handleDeletePageRule(rule.id)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all hover:border-rose-200 hover:text-rose-500">X</button>}</div> : <div className="h-[34px] rounded-xl border border-dashed border-slate-200 bg-slate-50" />}</div>
                      <div className="flex items-end justify-end"><button type="button" onClick={() => handleDeletePageRule(rule.id)} className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 shadow-sm transition-all hover:bg-rose-50">Remover</button></div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={handleAddPageRule} className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]">+ Adicionar página</button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {isGalleryOpen && <GalleryModal />}
      {selectorModalOpen && <SelectorModal />}

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="Confirmar Exclusão" itemName={deleteModal.name} onConfirm={() => { if (deleteModal.type === 'location') handleDeleteLocation(deleteModal.id); else handleDeletePageRule(deleteModal.id); setDeleteModal((prev) => ({ ...prev, isOpen: false })); }} onCancel={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))} />
      <SuccessDialog isOpen={successOpen} description={isCreate ? 'Story criado com sucesso.' : 'Story atualizado com sucesso.'} onClose={handleSuccessClose} />
    </div>
  );
};

export default StoryDetailsPage;
