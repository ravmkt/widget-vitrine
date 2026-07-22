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
  Plus,
  Loader2,
  Play,
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

const CONDITION_TYPES_WITH_VALUE: PageRuleCondition[] = ['url_contains', 'url_not_contains', 'url_not_equals'];

const POSITION_OPTIONS = [
  { label: 'Acima do elemento', value: 'beforebegin' as const },
  { label: 'Abaixo do elemento', value: 'afterend' as const },
  { label: 'Dentro do elemento, no início', value: 'afterbegin' as const },
  { label: 'Dentro do elemento, no final', value: 'beforeend' as const },
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

const getVideoPosterUrl = (video: Video) => {
  const item = video as any;
  return (
    item.cover_url ||
    item.coverUrl ||
    item.thumbnail_url ||
    item.thumbnailUrl ||
    item.poster_url ||
    item.posterUrl ||
    item.image_url ||
    item.imageUrl ||
    item.thumbnail ||
    ''
  );
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

type DisplayLocationUi = DisplayLocation;

const mapDbRuleToUiRule = (rule: any): PageRuleUi => ({
  id: rule.id,
  store_id: rule.store_id,
  story_id: rule.story_id,
  condition_type: (rule.condition_type as PageRuleCondition) || 'all_pages',

  value: rule.value || '',
  created_at: rule.created_at,
  updated_at: rule.updated_at,
});

const mapUiRuleToDbRule = (rule: PageRuleUi, targetStoreId: string, targetStoryId: string, now: string) => ({
  id: isValidUuid(rule.id) ? rule.id : generateUuid(),
  store_id: targetStoreId,
  story_id: targetStoryId,
  condition_type: rule.condition_type,
  value: CONDITION_TYPES_WITH_VALUE.includes(rule.condition_type) ? rule.value || '' : null,
  created_at: rule.created_at || now,
  updated_at: now,
} as unknown as PageRule & Record<string, any>);

const StoryDetailsPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();
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
  const [pageRuleMode, setPageRuleMode] = useState<PageRuleCondition>('home');
  const [pageRuleValue, setPageRuleValue] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: '',
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'location' | 'rule'; id: string; name: string }>({
    isOpen: false,
    type: 'location',
    id: '',
    name: '',
  });

  const selectedVideosCount = useMemo(() => selectedVideoIds.length, [selectedVideoIds]);

  const loadStoryData = useCallback(async () => {
    if (tenantLoading) return;

    try {
      setLoading(true);
      const finalStoreId = await resolveStoreId(storeId);
      setResolvedStoreId(finalStoreId);

      const [videos, apps] = await Promise.all([
        getAllSafe<Video>((db as any).videos, finalStoreId),
        getAllSafe<Appearance>((db as any).appearances, finalStoreId),
      ]);

      setAllVideos(videos);
      setAppearances(apps);

      if (isCreate) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        setPageRules([]);
        setFormData({
          title: '',
          format: 'carousel',
          scroll_direction: 'horizontal',
          active: true,
          appearance_id: '',
        });
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

      const [relations, locs, rules] = await Promise.all([
        getAllSafe<StoryVideo>((db as any).storyVideos, finalStoreId),
        getAllSafe<DisplayLocationUi>((db as any).displayLocations, finalStoreId),
        getAllSafe<any>((db as any).pageRules, finalStoreId),
      ]);

      const storyVideoIds = relations
        .filter((relation: any) => relation.story_id === currentStory.id && (!relation.store_id || relation.store_id === finalStoreId))
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
        .map((relation: any) => relation.video_id)
        .filter((videoId: any) => videoId && isValidUuid(videoId));

      setSelectedVideoIds(storyVideoIds);
      setLocations(
        locs.filter((location: any) => location.story_id === currentStory.id && (!location.store_id || location.store_id === finalStoreId)),
      );
      setPageRules(
        rules
          .filter((rule: any) => rule.story_id === currentStory.id && (!rule.store_id || rule.store_id === finalStoreId))
          .map(mapDbRuleToUiRule),
      );

      setFormData({
        title: currentStory.title || '',
        format: currentStory.format || 'carousel',
        scroll_direction: currentStory.scroll_direction || 'horizontal',
        active: Boolean(currentStory.active),
        appearance_id: currentStory.appearance_id && isValidUuid(currentStory.appearance_id) ? currentStory.appearance_id : '',
      });
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
      selector: String(location.selector || '').trim(),
      position: location.position,
      created_at: location.created_at || now,
      updated_at: now,
    }));

    await Promise.all(normalizedLocations.map((location) => (db as any).displayLocations.save(location)));

    const existingRules = await getAllSafe<any>((db as any).pageRules, targetStoreId);
    const rulesToDelete = existingRules.filter((rule: any) => rule.story_id === targetStoryId && (!rule.store_id || rule.store_id === targetStoreId));
    await Promise.all(rulesToDelete.map((rule: any) => deleteSafe((db as any).pageRules, rule.id, targetStoreId)));

    const normalizedRules = pageRules.map((rule) => mapUiRuleToDbRule(rule, targetStoreId, targetStoryId, now));
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
        id: story?.id && isValidUuid(story.id) ? story.id : generateUuid(),
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
        updated_at: now,
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

  const handleAddLocation = () => {
    const now = new Date().toISOString();
    setLocations((prev) => [
      ...prev,
      {
        id: generateUuid(),
        store_id: resolvedStoreId || '',
        story_id: story?.id || '',
        selector: '',
        position: 'beforeend',
        created_at: now,
        updated_at: now,
      },
    ]);
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((location) => location.id !== locationId));
  };

  const handleAddPageRule = () => {
    const now = new Date().toISOString();
    setPageRules((prev) => [
      ...prev,
      {
        id: generateUuid(),
        store_id: resolvedStoreId || '',
        story_id: story?.id || '',
        condition_type: pageRuleMode,
        value: CONDITION_TYPES_WITH_VALUE.includes(pageRuleMode) ? pageRuleValue : '',
        created_at: now,
        updated_at: now,
      },
    ]);
  };

  const handleUpdatePageRule = (ruleId: string, patch: Partial<PageRuleUi>) => {
    setPageRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...patch,
              value: patch.condition_type && !CONDITION_TYPES_WITH_VALUE.includes(patch.condition_type)
                ? ''
                : patch.value ?? rule.value,
            }
          : rule,
      ),
    );
  };

  const handleDeletePageRule = (ruleId: string) => {
    setPageRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const handleSuccessClose = () => {
    navigate('/stories');
  };

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0094EB]" />
      </div>
    );
  }

  if (!isCreate && !story) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button type="button" onClick={() => navigate('/stories')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50">
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Story não encontrado</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">Não foi possível localizar esse Story para a loja atual.</p>
        </div>
      </div>
    );
  }

  const GalleryModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Galeria de Vídeos</h3>
          <button type="button" onClick={() => setIsGalleryOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/videos/new')} className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]">
            Fazer upload de um novo vídeo
          </button>
          <button type="button" onClick={() => navigate('/videos/new')} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800">
            Criar um novo vídeo
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {allVideos.map((video) => {
              const selected = selectedVideoIds.includes(video.id);
              const posterUrl = getVideoPosterUrl(video);
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleToggleVideo(video.id)}
                  className={cn(
                    'group relative aspect-[9/16] overflow-hidden rounded-2xl border-2 transition-all',
                    selected ? 'border-[#0094EB] shadow-lg shadow-blue-100' : 'border-slate-200',
                  )}
                >
                  {posterUrl ? (
                    <img src={posterUrl} alt={video.title || 'Vídeo'} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <Film size={24} />
                    </div>
                  )}

                  <div className={cn('absolute inset-0 flex items-center justify-center transition-all', selected ? 'bg-[#0094EB]/20' : 'bg-black/10')}>
                    {selected && (
                      <div className="rounded-full bg-[#0094EB] p-1 text-white">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="truncate text-[9px] font-black text-white">{video.title || 'Sem título'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/videos/new')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50">
            Criar novo vídeo
          </button>

          <button type="button" onClick={() => setIsGalleryOpen(false)} className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]">
            Adicionar ao History
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/stories')} className="rounded-xl border border-slate-200 bg-white p-2.5 transition-all hover:bg-slate-50">
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{isCreate ? 'Novo History' : 'Editar History'}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{isCreate ? 'Criar novo history' : formData.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-4 hidden items-center gap-2 sm:flex">
            <span className={cn('text-[10px] font-black uppercase tracking-widest', formData.active ? 'text-emerald-500' : 'text-slate-400')}>
              {formData.active ? 'Status: Ativo' : 'Status: Inativo'}
            </span>

            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
              className={cn('h-6 w-12 rounded-full p-1 transition-all duration-300', formData.active ? 'bg-emerald-500' : 'bg-slate-300')}
            >
              <div className={cn('h-4 w-4 rounded-full bg-white transition-all duration-300', formData.active ? 'translate-x-6' : 'translate-x-0')} />
            </button>
          </div>

          <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-[#0E4787] disabled:opacity-60">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6">
                <Layout className="text-[#0094EB]" size={20} />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Design e Formato</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do History</label>
                  <input type="text" value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none focus:border-[#0094EB]" placeholder="Ex: Lançamentos" />
                </div>

                <div className="space-y-4 pt-4 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formato de Exibição</label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      { id: 'floating_widget', icon: MousePointer2, label: 'Flutuante' },
                      { id: 'carousel', icon: Layout, label: 'Carrossel' },
                      { id: 'grid', icon: Layers, label: 'Grade' },
                    ].map((format) => {
                      const Icon = format.icon;
                      return (
                        <button key={format.id} type="button" onClick={() => setFormData((prev) => ({ ...prev, format: format.id as StoryFormat }))} className={cn('flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all', formData.format === format.id ? 'border-[#0094EB] bg-blue-50 text-[#0094EB]' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200')}>
                          <Icon size={24} />
                          <span className="text-[10px] font-black uppercase">{format.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direção de Rolagem</label>
                  <select value={formData.scroll_direction} onChange={(event) => setFormData((prev) => ({ ...prev, scroll_direction: event.target.value as ScrollDirection }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none">
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estilo Visual / Aparência</label>
                  <select value={formData.appearance_id} onChange={(event) => setFormData((prev) => ({ ...prev, appearance_id: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none">
                    <option value="">Seguir Padrão do App</option>
                    {appearances.filter((app) => app.id && isValidUuid(app.id)).map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name} {app.is_default ? '(Padrão)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  <Film className="text-[#0094EB]" size={20} />
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Conteúdo selecionado</h3>
                </div>
                <button type="button" onClick={() => setIsGalleryOpen(true)} className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#0E4787]">
                  Galeria
                </button>
              </div>

              {selectedVideoIds.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {selectedVideoIds.map((videoId) => {
                    const video = allVideos.find((item) => item.id === videoId);
                    if (!video) return null;
                    const posterUrl = getVideoPosterUrl(video);

                    return (
                      <button key={video.id} type="button" onClick={() => handleToggleVideo(video.id)} className="group relative aspect-[9/16] overflow-hidden rounded-2xl border-2 border-[#0094EB] shadow-lg shadow-blue-100">
                        {posterUrl ? (
                          <img src={posterUrl} alt={video.title || 'Vídeo'} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <Film size={24} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Sem capa</span>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 flex items-center justify-center bg-[#0094EB]/15 transition-all">
                          <div className="rounded-full bg-[#0094EB] p-1 text-white">
                            <CheckCircle2 size={16} />
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="truncate text-[9px] font-black text-white">{video.title || 'Sem título'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-sm font-bold text-slate-400">Nenhum vídeo cadastrado para esta loja.</div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="text-[#0094EB]" size={18} />
                  <h4 className="text-sm font-black uppercase text-slate-800">Local de exibição</h4>
                </div>
              </div>

              <div className="space-y-4">
                {locations.map((location) => (
                  <div key={location.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">SELETOR CSS</label>
                        <input
                          type="text"
                          value={location.selector}
                          onChange={(event) => setLocations((prev) => prev.map((item) => (item.id === location.id ? { ...item, selector: event.target.value } : item)))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                          placeholder=".breadcrumbs"
                        />
                        <p className="text-[11px] text-slate-500">Informe o seletor de referência CSS da página</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">POSIÇÃO</label>
                        <select
                          value={location.position}
                          onChange={(event) => setLocations((prev) => prev.map((item) => (item.id === location.id ? { ...item, position: event.target.value as DisplayPosition } : item)))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                        >
                          {POSITION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button type="button" onClick={handleAddLocation} className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]">
                        + Adicionar página
                      </button>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button type="button" onClick={() => handleDeleteLocation(location.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500">
                        Remover
                      </button>
                    </div>
                  </div>
                ))}

                {locations.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs font-bold text-slate-400">
                    Nenhum local configurado.
                  </div>
                )}

                <button type="button" onClick={handleAddLocation} className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]">
                  + Adicionar página
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="text-[#0094EB]" size={18} />
                  <h4 className="text-sm font-black uppercase text-slate-800">Qual página irá aparecer?</h4>
                </div>
              </div>

              <div className="space-y-4">
                {pageRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">REGRA</label>
                        <select
                          value={rule.condition_type}
                          onChange={(event) => handleUpdatePageRule(rule.id, { condition_type: event.target.value as PageRuleCondition })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                        >
                          {PAGE_RULE_OPTIONS.map((ruleOption) => (
                            <option key={ruleOption.value} value={ruleOption.value}>
                              {ruleOption.label}
                            </option>
                          ))}
                        </select>

                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">VALOR DO FILTRO</label>
                        {CONDITION_TYPES_WITH_VALUE.includes(rule.condition_type) ? (
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(event) => handleUpdatePageRule(rule.id, { value: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                            placeholder="/colecao, /produto/nome-do-produto ou trecho da URL"
                          />
                        ) : (
                          <div className="h-[34px] rounded-xl border border-dashed border-slate-200 bg-slate-50" />
                        )}
                      </div>

                      <div className="flex items-end justify-end">
                        <button type="button" onClick={() => handleDeletePageRule(rule.id)} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50">
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {pageRules.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs font-bold text-slate-400">
                    Nenhuma regra de página adicionada.
                  </div>
                )}

                <button type="button" onClick={handleAddPageRule} className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]">
                  + Adicionar página
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {isGalleryOpen && <GalleryModal />}

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Confirmar Exclusão"
        itemName={deleteModal.name}
        onConfirm={() => {
          if (deleteModal.type === 'location') {
            handleDeleteLocation(deleteModal.id);
          } else {
            handleDeletePageRule(deleteModal.id);
          }
          setDeleteModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <SuccessDialog isOpen={successOpen} description={isCreate ? 'Story criado com sucesso.' : 'Story atualizado com sucesso.'} onClose={handleSuccessClose} />
    </div>
  );
};

export default StoryDetailsPage;
