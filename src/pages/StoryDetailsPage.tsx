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
} from 'lucide-react';
import { showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const getAllSafe = async <T,>(
  collection: any,
  storeId?: string,
): Promise<T[]> => {
  if (!collection?.getAll) return [];

  try {
    if (storeId) {
      return await collection.getAll(storeId);
    }

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
    if (storeId) {
      return await collection.getById(id, storeId);
    }

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
      // ignora erro de fallback
    }
  }
};

const getVideoPosterUrl = (video: Video) => {
  const item = video as any;

  return (
    item.thumbnail_url ||
    item.thumbnailUrl ||
    item.poster_url ||
    item.posterUrl ||
    item.image_url ||
    item.imageUrl ||
    ''
  );
};

// ==============================
// Tipo de regra usado na UI (não é o formato salvo na tabela)
// ==============================
type UiRule = {
  id: string;
  store_id?: string;
  story_id?: string;
  condition_type: ConditionType;
  value: string;
  created_at?: string;
  updated_at?: string;
};

const CONDITION_TYPES_WITH_VALUE: ConditionType[] = [
  'contains',
  'equals',
  'not_equals',
  'starts_with',
  'ends_with',
  'regex',
];

/**
 * Converte um registro vindo do banco (colunas reais da tabela page_rules)
 * para o formato usado internamente pela UI (condition_type / value).
 */
const mapDbRuleToUiRule = (rule: any): UiRule => {
  const ruleType: ConditionType = rule.rule_type || 'all_pages';

  // Se a regra tiver match_type (contains, equals, etc.) esse é o "tipo real"
  // de condição; caso contrário, usamos rule_type diretamente.
  const conditionType: ConditionType = CONDITION_TYPES_WITH_VALUE.includes(
    rule.match_type,
  )
    ? rule.match_type
    : ruleType;

  return {
    id: rule.id,
    store_id: rule.store_id,
    story_id: rule.story_id,
    condition_type: conditionType,
    value: rule.url_pattern || rule.page_url || '',
    created_at: rule.created_at,
    updated_at: rule.updated_at,
  };
};

/**
 * Converte uma regra da UI (condition_type / value) para o formato
 * de colunas reais da tabela page_rules.
 */
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
    rule_type: hasValue ? 'custom' : rule.condition_type,
    match_type: hasValue ? rule.condition_type : null,
    page_url: null,
    url_pattern: hasValue ? rule.value || '' : null,
    page_type: null,
    active: true,
    created_at: rule.created_at || now,
    updated_at: now,
  } as PageRule & Record<string, any>;
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
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [rules, setRules] = useState<UiRule[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: '',
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'location' | 'rule';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'location',
    id: '',
    name: '',
  });

  const selectedVideosCount = useMemo(
    () => selectedVideoIds.length,
    [selectedVideoIds],
  );

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
        });
        setSelectedVideoIds([]);
        setLocations([]);
        setRules([]);
        return;
      }

      if (!id || !isValidUuid(id)) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        setRules([]);
        return;
      }

      const currentStory = await getByIdSafe<Story>(
        (db as any).stories,
        id,
        finalStoreId,
      );

      if (!currentStory) {
        setStory(null);
        setSelectedVideoIds([]);
        setLocations([]);
        setRules([]);
        return;
      }

      setStory(currentStory);

      setFormData({
        title: currentStory.title || '',
        format: currentStory.format || 'carousel',
        scroll_direction: currentStory.scroll_direction || 'horizontal',
        active: Boolean(currentStory.active),
        appearance_id:
          currentStory.appearance_id && isValidUuid(currentStory.appearance_id)
            ? currentStory.appearance_id
            : '',
      });

      const [relations, locs, rls] = await Promise.all([
        getAllSafe<StoryVideo>((db as any).storyVideos, finalStoreId),
        getAllSafe<DisplayLocation>((db as any).displayLocations, finalStoreId),
        getAllSafe<any>((db as any).pageRules, finalStoreId),
      ]);

      const storyVideoIds = relations
        .filter((relation: any) => {
          const sameStory = relation.story_id === currentStory.id;
          const sameStore =
            !relation.store_id || relation.store_id === finalStoreId;

          return sameStory && sameStore;
        })
        .sort(
          (a: any, b: any) => Number(a.position || 0) - Number(b.position || 0),
        )
        .map((relation: any) => relation.video_id)
        .filter((videoId: any) => videoId && isValidUuid(videoId));

      setSelectedVideoIds(storyVideoIds);

      setLocations(
        locs.filter((location: any) => {
          const sameStory = location.story_id === currentStory.id;
          const sameStore =
            !location.store_id || location.store_id === finalStoreId;

          return sameStory && sameStore;
        }),
      );

      const filteredDbRules = rls.filter((rule: any) => {
        const sameStory = rule.story_id === currentStory.id;
        const sameStore = !rule.store_id || rule.store_id === finalStoreId;

        return sameStory && sameStore;
      });

      setRules(filteredDbRules.map(mapDbRuleToUiRule));
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

  const saveLocationsAndRules = async (
    targetStoryId: string,
    targetStoreId: string,
  ) => {
    const now = new Date().toISOString();

    // ----- Locais de exibição -----
    const existingLocations = await getAllSafe<DisplayLocation>(
      (db as any).displayLocations,
      targetStoreId,
    );

    const locationsToDelete = existingLocations.filter((location: any) => {
      const sameStory = location.story_id === targetStoryId;
      const sameStore =
        !location.store_id || location.store_id === targetStoreId;

      return sameStory && sameStore;
    });

    await Promise.all(
      locationsToDelete.map((location: any) =>
        deleteSafe((db as any).displayLocations, location.id, targetStoreId),
      ),
    );

    const normalizedLocations = locations.map((location: any) => {
      const { position: _position, ...locationWithoutPosition } = location;

      return {
        ...locationWithoutPosition,
        id: isValidUuid(location.id) ? location.id : generateUuid(),
        store_id: targetStoreId,
        story_id: targetStoryId,
        selector: location.selector || 'body',
        created_at: location.created_at || now,
        updated_at: now,
      };
    });

    await Promise.all(
      normalizedLocations.map((location) =>
        (db as any).displayLocations.save(location),
      ),
    );

    // ----- Regras de exibição (page_rules) -----
    const existingRules = await getAllSafe<any>(
      (db as any).pageRules,
      targetStoreId,
    );

    const rulesToDelete = existingRules.filter((rule: any) => {
      const sameStory = rule.story_id === targetStoryId;
      const sameStore = !rule.store_id || rule.store_id === targetStoreId;

      return sameStory && sameStore;
    });

    await Promise.all(
      rulesToDelete.map((rule: any) =>
        deleteSafe((db as any).pageRules, rule.id, targetStoreId),
      ),
    );

    const normalizedRules = rules.map((rule) =>
      mapUiRuleToDbRule(rule, targetStoreId, targetStoryId, now),
    );

    await Promise.all(
      normalizedRules.map((rule) => (db as any).pageRules.save(rule)),
    );
  };

  const handleSave = async (event?: FormEvent) => {
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

      const validSelectedVideoIds = selectedVideoIds.filter((videoId) =>
        isValidUuid(videoId),
      );

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

      const newRelations: StoryVideo[] = validSelectedVideoIds.map(
        (videoId, index) => ({
          id: generateUuid(),
          store_id: finalStoreId,
          story_id: savedStory.id,
          video_id: videoId,
          position: index + 1,
          is_cover: index === 0,
          created_at: now,
        }),
      );

      await replaceStoryRelations(
        'story_videos',
        finalStoreId,
        savedStory.id,
        newRelations,
      );

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
      prev.includes(videoId)
        ? prev.filter((currentId) => currentId !== videoId)
        : [...prev, videoId],
    );
  };

  const handleAddLocation = async () => {
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

    const newLocation = {
      id: generateUuid(),
      store_id: finalStoreId,
      story_id: story?.id || '',
      selector: 'body',
    } as DisplayLocation;

    setLocations((prev) => [...prev, newLocation]);
  };

  const handleAddRule = async () => {
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

    const newRule: UiRule = {
      id: generateUuid(),
      store_id: finalStoreId,
      story_id: story?.id || '',
      condition_type: 'all_pages',
      value: '',
    };

    setRules((prev) => [...prev, newRule]);
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations((prev) =>
      prev.filter((location) => location.id !== locationId),
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const openDeleteLocationModal = (location: DisplayLocation) => {
    setDeleteModal({
      isOpen: true,
      type: 'location',
      id: location.id,
      name: location.selector || 'Local de exibição',
    });
  };

  const openDeleteRuleModal = (rule: UiRule) => {
    setDeleteModal({
      isOpen: true,
      type: 'rule',
      id: rule.id,
      name: rule.condition_type || 'Regra de exibição',
    });
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
        <button
          type="button"
          onClick={() => navigate('/stories')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">
            Story não encontrado
          </h1>
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
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-[#0E4787] disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}

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
                      {
                        id: 'floating_widget',
                        icon: MousePointer2,
                        label: 'Flutuante',
                      },
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

                          <span className="text-[10px] font-black uppercase">
                            {format.label}
                          </span>
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
                          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-400">
                            <Film size={24} />
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
                            <Plus
                              className="text-white opacity-0 group-hover:opacity-100"
                              size={24}
                            />
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
                  <MapPin className="text-orange-500" size={18} />
                  <h4 className="text-sm font-black uppercase text-slate-800">
                    Onde Aparece
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="rounded-lg bg-orange-50 p-1.5 text-orange-500 hover:bg-orange-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="group relative rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <button
                      type="button"
                      onClick={() => openDeleteLocationModal(location)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 opacity-0 shadow-sm transition-all group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Seletor CSS
                      </label>

                      <input
                        type="text"
                        value={location.selector || ''}
                        onChange={(event) => {
                          const next = locations.map((item) =>
                            item.id === location.id
                              ? {
                                  ...item,
                                  selector: event.target.value,
                                }
                              : item,
                          );

                          setLocations(next);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                        placeholder="Ex: body, .product-info, #main"
                      />
                    </div>
                  </div>
                ))}

                {locations.length === 0 && (
                  <p className="text-xs font-bold text-slate-400">
                    Nenhum local configurado.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="text-emerald-500" size={18} />
                  <h4 className="text-sm font-black uppercase text-slate-800">
                    Quando Aparece
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  className="rounded-lg bg-emerald-50 p-1.5 text-emerald-500 hover:bg-emerald-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="group relative rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <button
                      type="button"
                      onClick={() => openDeleteRuleModal(rule)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 opacity-0 shadow-sm transition-all group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Tipo de Regra
                        </label>

                        <select
                          value={rule.condition_type || 'all_pages'}
                          onChange={(event) => {
                            const next = rules.map((item) =>
                              item.id === rule.id
                                ? {
                                    ...item,
                                    condition_type:
                                      event.target.value as ConditionType,
                                  }
                                : item,
                            );

                            setRules(next);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                        >
                          <option value="all_pages">Todas as Páginas</option>
                          <option value="home_only">Apenas Home</option>
                          <option value="product_pages">
                            Páginas de Produto
                          </option>
                          <option value="category_pages">
                            Páginas de Categoria
                          </option>
                          <option value="contains">URL Contém</option>
                          <option value="equals">URL Igual</option>
                          <option value="not_equals">URL Diferente</option>
                          <option value="starts_with">URL Começa com</option>
                          <option value="ends_with">URL Termina com</option>
                          <option value="regex">Regex</option>
                        </select>
                      </div>

                      {CONDITION_TYPES_WITH_VALUE.includes(
                        rule.condition_type,
                      ) && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Valor do Filtro
                          </label>

                          <input
                            type="text"
                            value={rule.value || ''}
                            onChange={(event) => {
                              const next = rules.map((item) =>
                                item.id === rule.id
                                  ? {
                                      ...item,
                                      value: event.target.value,
                                    }
                                  : item,
                              );

                              setRules(next);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                            placeholder="Ex: /produto"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {rules.length === 0 && (
                  <p className="text-xs font-bold text-slate-400">
                    Nenhuma regra configurada.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Confirmar Exclusão"
        itemName={deleteModal.name}
        onConfirm={() => {
          if (deleteModal.type === 'location') {
            handleDeleteLocation(deleteModal.id);
          } else {
            handleDeleteRule(deleteModal.id);
          }

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
        description={
          isCreate ? 'Story criado com sucesso.' : 'Story atualizado com sucesso.'
        }
        onClose={handleSuccessClose}
      />
    </div>
  );
};

export default StoryDetailsPage;
