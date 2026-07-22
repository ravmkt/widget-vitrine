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
import { supabase } from '@/lib/supabase';
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
} from 'lucide-react';
import { showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const POSITION_METHOD_MAP: Record<string, DisplayPosition> = {
  before_element: 'beforebegin',
  after_element: 'afterend',
  inside_start: 'afterbegin',
  inside_end: 'beforeend',
};

const PAGE_RULE_OPTIONS = [
  { label: 'HOME', value: 'home' },
  { label: 'Todas as páginas', value: 'all_pages' },
  { label: 'URL Contém', value: 'url_contains' },
  { label: 'URL Igual', value: 'url_equals' },
  { label: 'URL Diferente', value: 'url_not_equals' },
] as const;


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

const getByIdSafe = async <T,>(
  collection: any,
  id?: string,
  storeId?: string,
): Promise<T | null> => {
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

type UiRule = {
  id: string;
  store_id?: string;
  story_id?: string;
  condition_type: ConditionType;
  value: string;
  created_at?: string;
  updated_at?: string;
};

type DisplayLocationUi = DisplayLocation & {
  rules: UiRule[];
};

const CONDITION_TYPES_WITH_VALUE: ConditionType[] = ['url_contains', 'url_equals', 'url_not_equals'];

const mapDbRuleToUiRule = (rule: any): UiRule => {
  const conditionType =
    (rule.condition_type as ConditionType) ||
    (rule.match_type as ConditionType) ||
    (rule.rule_type as ConditionType) ||
    'all_pages';

  return {
    id: rule.id,
    store_id: rule.store_id,
    story_id: rule.story_id,
    condition_type: conditionType,
    value: rule.value || rule.url_pattern || rule.page_url || '',
    created_at: rule.created_at,
    updated_at: rule.updated_at,
  };
};

const mapUiRuleToDbRule = (
  rule: UiRule,
  targetStoreId: string,
  targetStoryId: string,
  now: string,
) => {
  const hasValue = CONDITION_TYPES_WITH_VALUE.includes(rule.condition_type);

  return {
    id: isValidUuid(rule.id) ? rule.id : generateUuid(),
    store_id: targetStoreId,
    story_id: targetStoryId,
    condition_type: rule.condition_type,
    value: hasValue ? rule.value || '' : null,
    created_at: rule.created_at || now,
    updated_at: now,
  } as unknown as PageRule & Record<string, any>;
};

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

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [embedModalLocation, setEmbedModalLocation] = useState<DisplayLocationUi | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: '',
    page_rule_mode: 'all_pages' as ConditionType,
    page_rule_value: '',
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'location';
    id: string;
    name: string;
  }>({

    isOpen: false,
    type: 'location',
    id: '',
    name: '',
  });

  const selectedVideosCount = useMemo(() => selectedVideoIds.length, [selectedVideoIds]);

  const buildEmbedSnippet = (location: DisplayLocationUi): string => {
    const id = location.id;
    const embedBaseUrl =
      window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'https://app.vidlytics.com.br'
        : window.location.origin;

    let snippet = `<script src="${embedBaseUrl}/embed/${id}.js"\n        data-block-id="${id}"\n        data-selector="${location.selector}"\n        data-position="${location.position}"`;

    snippet += `\n        async></script>`;
    return snippet;
  };

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
        setFormData({
          title: '',
          format: 'carousel',
          scroll_direction: 'horizontal',
          active: true,
          appearance_id: '',
          page_rule_mode: 'all_pages',
          page_rule_value: '',
        });
        setSelectedVideoIds([]);
        setLocations([]);
        return;
      }

      if (!id || !isValidUuid(id)) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        return;
      }

      const currentStory = await getByIdSafe<Story>((db as any).stories, id, finalStoreId);

      if (!currentStory) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        return;
      }

      setStory(currentStory);

      const [relations, locs, rls] = await Promise.all([
        getAllSafe<StoryVideo>((db as any).storyVideos, finalStoreId),
        getAllSafe<DisplayLocationUi>((db as any).displayLocations, finalStoreId),
        getAllSafe<any>((db as any).pageRules, finalStoreId),
      ]);

      const storyVideoIds = relations
        .filter((relation: any) => {
          const sameStory = relation.story_id === currentStory.id;
          const sameStore = !relation.store_id || relation.store_id === finalStoreId;
          return sameStory && sameStore;
        })
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
        .map((relation: any) => relation.video_id)
        .filter((videoId: any) => videoId && isValidUuid(videoId));

      setSelectedVideoIds(storyVideoIds);

      const filteredLocations = locs.filter((location: any) => {
        const sameStory = location.story_id === currentStory.id;
        const sameStore = !location.store_id || location.store_id === finalStoreId;
        return sameStory && sameStore;
      });

      const filteredDbRules = rls.filter((rule: any) => {
        const sameStory = rule.story_id === currentStory.id;
        const sameStore = !rule.store_id || rule.store_id === finalStoreId;
        return sameStory && sameStore;
      });

      const convertedLocations = filteredLocations.map((location: any) => ({
        ...location,
        position: location.position || 'beforeend',
        rules: filteredDbRules
          .filter((rule: any) => String(rule.location_id || rule.display_location_id || '') === String(location.id))
          .map(mapDbRuleToUiRule),
      }));

      setLocations(convertedLocations);

      const firstRule = filteredDbRules[0] || null;

      setFormData({
        title: currentStory.title || '',
        format: currentStory.format || 'carousel',
        scroll_direction: currentStory.scroll_direction || 'horizontal',
        active: Boolean(currentStory.active),
        appearance_id:
          currentStory.appearance_id && isValidUuid(currentStory.appearance_id)
            ? currentStory.appearance_id
            : '',
        page_rule_mode: (firstRule?.condition_type || 'all_pages') as ConditionType,
        page_rule_value: firstRule?.value || '',
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

    const existingLocations = await getAllSafe<DisplayLocationUi>(
      (db as any).displayLocations,
      targetStoreId,
    );

    const locationsToDelete = existingLocations.filter((location: any) => {
      const sameStory = location.story_id === targetStoryId;
      const sameStore = !location.store_id || location.store_id === targetStoreId;
      return sameStory && sameStore;
    });

    await Promise.all(
      locationsToDelete.map((location: any) =>
        deleteSafe((db as any).displayLocations, location.id, targetStoreId),
      ),
    );

    const normalizedLocations = locations.map((location: any) => ({
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
    const rulesToDelete = existingRules.filter((rule: any) => {
      const sameStory = rule.story_id === targetStoryId;
      const sameStore = !rule.store_id || rule.store_id === targetStoreId;
      return sameStory && sameStore;
    });

    await Promise.all(
      rulesToDelete.map((rule: any) => deleteSafe((db as any).pageRules, rule.id, targetStoreId)),
    );

    const normalizedRules = locations.flatMap((location: any) =>
      (location.rules || []).map((rule: any) =>
        mapUiRuleToDbRule(
          {
            ...rule,
            story_id: targetStoryId,
            store_id: targetStoreId,
          },
          targetStoreId,
          targetStoryId,
          now,
        ),
      ),
    );

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
        appearance_id:
          formData.appearance_id && isValidUuid(formData.appearance_id)
            ? formData.appearance_id
            : null,
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
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((currentId) => currentId !== videoId) : [...prev, videoId],
    );
  };

  const handleAddLocation = async () => {
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));
    const newLocation: DisplayLocationUi = {
      id: generateUuid(),
      store_id: finalStoreId,
      story_id: story?.id || '',
      selector: '',
      position: 'beforeend',
      rules: [],
    };

    setLocations((prev) => [...prev, newLocation]);
  };

  const handleAddRule = () => {
    setFormData((prev) => ({
      ...prev,
      page_rule_mode: prev.page_rule_mode || 'home',
      page_rule_value: prev.page_rule_value || '',
    }));
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) => prev.filter((location) => location.id !== locationId));
  };

  const handleDeleteRule = () => {
    setFormData((prev) => ({
      ...prev,
      page_rule_mode: 'all_pages',
      page_rule_value: '',
    }));
  };

  const openDeleteLocationModal = (location: DisplayLocation) => {
    setDeleteModal({
      isOpen: true,
      type: 'location',
      id: location.id,
      name: location.selector || 'Local de exibição',
    });
  };

  const handleSuccessClose = () => {
    navigate('/stories');
  };

  const handleGenerateEmbedCode = () => {
    const firstLocation = locations[0] || null;
    if (firstLocation) {
      setEmbedModalLocation(firstLocation);
      setCopiedSnippet(false);
    }
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
        <button
          type="button"
          onClick={() => navigate('/stories')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Story não encontrado</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Não foi possível localizar esse Story para a loja atual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/stories')}
            className="rounded-xl border border-slate-200 bg-white p-2.5 transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {isCreate ? 'Novo Story' : 'Editar Story'}
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {isCreate ? 'Criar novo story' : formData.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-4 hidden items-center gap-2 sm:flex">
            <span
              className={cn(
                'text-[10px] font-black uppercase tracking-widest',
                formData.active ? 'text-emerald-500' : 'text-slate-400',
              )}
            >
              {formData.active ? 'Status: Ativo' : 'Status: Inativo'}
            </span>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  active: !prev.active,
                }))
              }
              className={cn(
                'h-6 w-12 rounded-full p-1 transition-all duration-300',
                formData.active ? 'bg-emerald-500' : 'bg-slate-300',
              )}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded-full bg-white transition-all duration-300',
                  formData.active ? 'translate-x-6' : 'translate-x-0',
                )}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-[#0E4787] disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_350px]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6">
                <Layout className="text-[#0094EB]" size={20} />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Design e Formato
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Nome do Bloco
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none focus:border-[#0094EB]"
                    placeholder="Ex: Lançamentos"
                  />
                </div>

                <div className="space-y-4 pt-4 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Formato de Exibição
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'carousel', icon: Layout, label: 'Carrossel' },
                      { id: 'grid', icon: Layers, label: 'Grade' },
                      { id: 'floating_widget', icon: MousePointer2, label: 'Flutuante' },
                    ].map((format) => {
                      const Icon = format.icon;
                      return (
                        <button
                          key={format.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              format: format.id as StoryFormat,
                            }))
                          }
                          className={cn(
                            'flex flex-col items-center gap-3 rounded-3xl border-2 p-6 transition-all',
                            formData.format === format.id
                              ? 'border-[#0094EB] bg-blue-50 text-[#0094EB]'
                              : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200',
                          )}
                        >
                          <Icon size={24} />
                          <span className="text-[10px] font-black uppercase">{format.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Direção de Rolagem
                  </label>
                  <select
                    value={formData.scroll_direction}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        scroll_direction: event.target.value as ScrollDirection,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Estilo Visual / Aparência
                  </label>
                  <select
                    value={formData.appearance_id}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        appearance_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none"
                  >
                    <option value="">Seguir Padrão do App</option>
                    {appearances
                      .filter((app) => app.id && isValidUuid(app.id))
                      .map((app) => (
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
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
                    Conteúdo Selecionado
                  </h3>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
                  {selectedVideosCount} Vídeos
                </span>
              </div>

              {allVideos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {allVideos.map((video) => {
                    const isSelected = selectedVideoIds.includes(video.id);
                    const posterUrl = getVideoPosterUrl(video);
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleToggleVideo(video.id)}
                        className={cn(
                          'group relative aspect-[9/16] overflow-hidden rounded-2xl border-2 transition-all',
                          isSelected
                            ? 'scale-[0.98] border-[#0094EB] shadow-lg shadow-blue-100'
                            : 'border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0',
                        )}
                      >
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={video.title || 'Vídeo'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <Film size={24} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Sem capa</span>
                            </div>
                          </div>
                        )}

                        <div
                          className={cn(
                            'absolute inset-0 flex items-center justify-center transition-all',
                            isSelected ? 'bg-[#0094EB]/20' : 'bg-black/20',
                          )}
                        >
                          {isSelected ? (
                            <div className="rounded-full bg-[#0094EB] p-1 text-white">
                              <CheckCircle2 size={16} />
                            </div>
                          ) : (
                            <Plus className="text-white opacity-0 group-hover:opacity-100" size={24} />
                          )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="truncate text-[9px] font-black text-white">
                            {video.title || 'Sem título'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-sm font-bold text-slate-400">
                  Nenhum vídeo cadastrado para esta loja.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-[#0094EB]" size={18} />
                      <h4 className="text-sm font-black uppercase text-slate-800">LOCAL DE EXIBIÇÃO</h4>
                    </div>
                  </div>
    
                  <div className="space-y-4">
                    {locations.map((location) => (
                      <div
                        key={location.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">SELETOR CSS</label>
                            <input
                              type="text"
                              value={location.selector}
                              onChange={(event) => {
                                const next = locations.map((item) =>
                                  item.id === location.id ? { ...item, selector: event.target.value } : item,
                                );
                                setLocations(next);
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                              placeholder=".breadcrumbs"
                            />
                            <p className="text-[11px] text-slate-500">Informe o seletor de referência CSS da página</p>
                          </div>
    
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">POSIÇÃO</label>
                            <select
                              value={location.position}
                              onChange={(event) => {
                                const next = locations.map((item) =>
                                  item.id === location.id ? { ...item, position: event.target.value as DisplayLocation['position'] } : item,
                                );
                                setLocations(next);
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                            >
                              <option value="beforebegin">Acima do elemento</option>
                              <option value="afterend">Abaixo do elemento</option>
                              <option value="afterbegin">Dentro do elemento, no início</option>
                              <option value="beforeend">Dentro do elemento, no final</option>
                            </select>
                          </div>
    
                          <button
                            type="button"
                            onClick={handleAddLocation}
                            className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]"
                          >
                            + Adicionar página
                          </button>
                        </div>
    
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(location.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500"
                          >
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
    
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]"
                    >
                      + Adicionar página
                    </button>
                  </div>
                </div>
    
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="text-[#0094EB]" size={18} />
                      <h4 className="text-sm font-black uppercase text-slate-800">QUAL PÁGINA IRÁ APARECER?</h4>
                    </div>
                  </div>
    
                  <div className="space-y-4">
    
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="group relative rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(location.id)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 opacity-0 shadow-sm transition-all group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Seletor CSS</label>
                        <input
                          type="text"
                          value={location.selector}
                          onChange={(event) => {
                            const next = locations.map((item) =>
                              item.id === location.id ? { ...item, selector: event.target.value } : item,
                            );
                            setLocations(next);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                          placeholder=".breadcrumbs .container"
                        />
                        <p className="text-[11px] text-slate-500">Informe o seletor CSS do elemento de referência na página.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Posição</label>
                        <select
                          value={location.position}
                          onChange={(event) => {
                            const next = locations.map((item) =>
                              item.id === location.id ? { ...item, position: event.target.value as DisplayLocation['position'] } : item,
                            );

                            setLocations(next);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                        >
                          <option value="beforebegin">Acima do elemento</option>
                          <option value="afterend">Abaixo do elemento</option>
                          <option value="afterbegin">Dentro do elemento, no início</option>
                          <option value="beforeend">Dentro do elemento, no final</option>
                        </select>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">Qual página irá aparecer?</h5>
                          <button
                            type="button"
                            onClick={() => handleAddRule(location.id)}
                            className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-100"
                          >
                            + Adicionar página onde irá aparecer
                          </button>
                        </div>

                {PAGE_RULE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">REGRA</label>
                        <select
                          value={formData.page_rule_mode}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              page_rule_mode: event.target.value as ConditionType,
                              page_rule_value:
                                event.target.value === 'home' || event.target.value === 'all_pages'
                                  ? ''
                                  : prev.page_rule_value,
                            }))
                          }
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
                        {CONDITION_TYPES_WITH_VALUE.includes(formData.page_rule_mode) ? (
                          <input
                            type="text"
                            value={formData.page_rule_value}
                            onChange={(event) =>
                              setFormData((prev) => ({
                                ...prev,
                                page_rule_value: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                            placeholder="/colecao, /produto/nome-do-produto ou trecho da URL"
                          />
                        ) : (
                          <div className="h-[34px] rounded-xl border border-dashed border-slate-200 bg-slate-50" />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]"
                      >
                        + Adicionar página
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddRule}
                  className="rounded-xl bg-[#0094EB] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-[#0E4787]"
                >
                  + Adicionar página
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {embedModalLocation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Código de embed</h3>
              <button
                type="button"
                onClick={() => setEmbedModalLocation(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              readOnly
              value={buildEmbedSnippet(embedModalLocation)}
              className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 outline-none"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(buildEmbedSnippet(embedModalLocation));
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 1500);
                }}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
              >
                {copiedSnippet ? 'Copiado!' : 'Copiar'}
              </button>

              <button
                type="button"
                onClick={() => setEmbedModalLocation(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Confirmar Exclusão"
        itemName={deleteModal.name}
        onConfirm={() => {
          handleDeleteLocation(deleteModal.id);

          setDeleteModal((prev) => ({
            ...prev,
            isOpen: false,
          }));
        }}
        onCancel={() =>
          setDeleteModal((prev) => ({
            ...prev,
            isOpen: false,

          }))
        }
      />

      <SuccessDialog
        isOpen={successOpen}
        description={isCreate ? 'Story criado com sucesso.' : 'Story atualizado com sucesso.'}
        onClose={handleSuccessClose}
      />
    </div>
  );
};

export default StoryDetailsPage;
