import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const StoryDetailsPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();
  const { id } = useParams();
  const navigate = useNavigate();

  const isCreate = !id || id === 'new';

  const [story, setStory] = useState<Story | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [rules, setRules] = useState<PageRule[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel' as StoryFormat,
    scroll_direction: 'horizontal' as ScrollDirection,
    active: true,
    appearance_id: '',
    position: 1,
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

  const loadStoryData = useCallback(async () => {
    try {
      setLoading(true);

      if (tenantLoading) {
        return;
      }

      const resolvedStoreId = await resolveStoreId(storeId);

      const videos = await db.videos.getAll(resolvedStoreId);
      setAllVideos(videos);

      const apps = await db.appearances.getAll(resolvedStoreId);
      setAppearances(apps);

      if (isCreate) {
        setStory(null);
        setFormData({
          title: '',
          format: 'carousel',
          scroll_direction: 'horizontal',
          active: true,
          appearance_id: '',
          position: 1,
        });
        setSelectedVideoIds([]);
        setLocations([]);
        setRules([]);
        return;
      }

      if (!id || !isValidUuid(id)) {
        setStory(null);
        return;
      }

      const currentStory = await db.stories.getById(id, resolvedStoreId);

      if (!currentStory) {
        setStory(null);
        return;
      }

      setStory(currentStory);

      setFormData({
        title: currentStory.title,
        format: currentStory.format,
        scroll_direction: currentStory.scroll_direction || 'horizontal',
        active: currentStory.active,
        appearance_id: currentStory.appearance_id || '',
        position: currentStory.position || 1,
      });

      const relations = await db.storyVideos.getAll(resolvedStoreId);

      const storyVideoIds = relations
        .filter(
          relation =>
            relation.story_id === currentStory.id &&
            relation.store_id === resolvedStoreId,
        )
        .sort((a, b) => a.position - b.position)
        .map(relation => relation.video_id);

      setSelectedVideoIds(storyVideoIds);

      const locs = await db.displayLocations.getAll(resolvedStoreId);

      setLocations(
        locs.filter(
          location =>
            location.story_id === currentStory.id &&
            location.store_id === resolvedStoreId,
        ),
      );

      const rls = await db.pageRules.getAll(resolvedStoreId);

      setRules(
        rls.filter(
          rule =>
            rule.story_id === currentStory.id &&
            rule.store_id === resolvedStoreId,
        ),
      );
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
    const existingLocations = await db.displayLocations.getAll(targetStoreId);

    const locationsToDelete = existingLocations.filter(
      location =>
        location.story_id === targetStoryId &&
        location.store_id === targetStoreId,
    );

    await Promise.all(
      locationsToDelete.map(location => db.displayLocations.delete(location.id)),
    );

    const normalizedLocations: DisplayLocation[] = locations.map(location => ({
      ...location,
      id: isValidUuid(location.id) ? location.id : generateUuid(),
      store_id: targetStoreId,
      story_id: targetStoryId,
      selector: location.selector || 'body',
      position: location.position || 'fixed_bottom_right',
    }));

    await Promise.all(
      normalizedLocations.map(location => db.displayLocations.save(location)),
    );

    const existingRules = await db.pageRules.getAll(targetStoreId);

    const rulesToDelete = existingRules.filter(
      rule => rule.story_id === targetStoryId && rule.store_id === targetStoreId,
    );

    await Promise.all(rulesToDelete.map(rule => db.pageRules.delete(rule.id)));

    const normalizedRules: PageRule[] = rules.map(rule => ({
      ...rule,
      id: isValidUuid(rule.id) ? rule.id : generateUuid(),
      store_id: targetStoreId,
      story_id: targetStoryId,
      condition_type: rule.condition_type || 'all_pages',
      value: rule.value || undefined,
    }));

    await Promise.all(normalizedRules.map(rule => db.pageRules.save(rule)));
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (isSaving) return;

    try {
      setIsSaving(true);

      const resolvedStoreId = await resolveStoreId(storeId);

      if (!formData.title.trim()) {
        showError('Informe o nome do Story.');
        return;
      }

      const now = new Date().toISOString();

      if (isCreate) {
        const newStoryPayload: Story = {
          id: generateUuid(),
          store_id: resolvedStoreId,
          title: formData.title.trim(),
          format: formData.format,
          scroll_direction: formData.scroll_direction,
          active: formData.active,
          appearance_id: formData.appearance_id || null,
          position: formData.position || 1,
          cta_enabled: false,
          cta_type: 'none',
          cta_text: '',
          cta_url: '',
          whatsapp_message: '',
          view_count: 0,
          click_count: 0,
          created_at: now,
          updated_at: now,
        };

        const savedStory = await db.stories.save(newStoryPayload);

        const newRelations: StoryVideo[] = selectedVideoIds.map(
          (videoId, index) => ({
            id: generateUuid(),
            store_id: resolvedStoreId,
            story_id: savedStory.id,
            video_id: videoId,
            position: index + 1,
            is_cover: index === 0,
            created_at: now,
          }),
        );

        await replaceStoryRelations(
          'story_videos',
          resolvedStoreId,
          savedStory.id,
          newRelations,
        );

        await saveLocationsAndRules(savedStory.id, resolvedStoreId);

        window.dispatchEvent(new Event('storage'));

        setStory(savedStory);
        setSuccessOpen(true);
        return;
      }

      if (!story) {
        showError('Story não encontrado.');
        return;
      }

      const updatedStory: Story = {
        ...story,
        store_id: resolvedStoreId,
        title: formData.title.trim(),
        format: formData.format,
        scroll_direction: formData.scroll_direction,
        active: formData.active,
        appearance_id: formData.appearance_id || null,
        position: formData.position || 1,
        updated_at: now,
      };

      const savedStory = await db.stories.save(updatedStory);

      const newRelations: StoryVideo[] = selectedVideoIds.map(
        (videoId, index) => ({
          id: generateUuid(),
          store_id: resolvedStoreId,
          story_id: savedStory.id,
          video_id: videoId,
          position: index + 1,
          is_cover: index === 0,
          created_at: now,
        }),
      );

      await replaceStoryRelations(
        'story_videos',
        resolvedStoreId,
        savedStory.id,
        newRelations,
      );

      await saveLocationsAndRules(savedStory.id, resolvedStoreId);

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
    setSelectedVideoIds(prev =>
      prev.includes(videoId)
        ? prev.filter(currentId => currentId !== videoId)
        : [...prev, videoId],
    );
  };

  const handleAddLocation = async () => {
    const resolvedStoreId = await resolveStoreId(storeId);

    const newLocation: DisplayLocation = {
      id: generateUuid(),
      store_id: resolvedStoreId,
      story_id: story?.id || generateUuid(),
      selector: 'body',
      position: 'fixed_bottom_right',
    };

    setLocations(prev => [...prev, newLocation]);
  };

  const handleAddRule = async () => {
    const resolvedStoreId = await resolveStoreId(storeId);

    const newRule: PageRule = {
      id: generateUuid(),
      store_id: resolvedStoreId,
      story_id: story?.id || generateUuid(),
      condition_type: 'all_pages',
      value: '',
    };

    setRules(prev => [...prev, newRule]);
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations(prev => prev.filter(location => location.id !== locationId));
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  if (loading || tenantLoading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/stories')}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isCreate ? 'Novo Story' : 'Editar Story'}
            </h1>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {isCreate ? 'Criar novo story' : formData.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 mr-4">
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
                setFormData(prev => ({
                  ...prev,
                  active: !prev.active,
                }))
              }
              className={cn(
                'w-12 h-6 rounded-full p-1 transition-all duration-300',
                formData.active ? 'bg-emerald-500' : 'bg-slate-300',
              )}
            >
              <div
                className={cn(
                  'bg-white w-4 h-4 rounded-full transition-all duration-300',
                  formData.active ? 'translate-x-6' : 'translate-x-0',
                )}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#0094EB] hover:bg-[#0E4787] disabled:opacity-60 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
                <Layout className="text-[#0094EB]" size={20} />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Design e Formato
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nome do Bloco
                  </label>

                  <input
                    type="text"
                    value={formData.title}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Posição / Ordem
                  </label>

                  <input
                    type="number"
                    value={formData.position}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        position: Number(e.target.value),
                      }))
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  />
                </div>

                <div className="md:col-span-2 space-y-4 pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                    ].map(format => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() =>
                          setFormData(prev => ({
                            ...prev,
                            format: format.id as StoryFormat,
                          }))
                        }
                        className={cn(
                          'flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all',
                          formData.format === format.id
                            ? 'border-[#0094EB] bg-blue-50 text-[#0094EB]'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200',
                        )}
                      >
                        <format.icon size={24} />
                        <span className="text-[10px] font-black uppercase">
                          {format.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Direção de Rolagem
                  </label>

                  <select
                    value={formData.scroll_direction}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        scroll_direction: e.target.value as ScrollDirection,
                      }))
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Estilo Visual / Aparência
                  </label>

                  <select
                    value={formData.appearance_id}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        appearance_id: e.target.value,
                      }))
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">Seguir Padrão do App</option>

                    {appearances.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.name} {app.is_default ? '(Padrão)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-3">
                  <Film className="text-[#0094EB]" size={20} />
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    Conteúdo Selecionado
                  </h3>
                </div>

                <span className="text-xs font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                  {selectedVideoIds.length} Vídeos
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allVideos.map(video => {
                  const isSelected = selectedVideoIds.includes(video.id);

                  return (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => handleToggleVideo(video.id)}
                      className={cn(
                        'relative aspect-[9/16] rounded-2xl overflow-hidden border-2 transition-all group',
                        isSelected
                          ? 'border-[#0094EB] shadow-lg shadow-blue-100 scale-[0.98]'
                          : 'border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0',
                      )}
                    >
                      <img
                        src={video.thumbnail_url || video.poster_url || video.image_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />

                      <div
                        className={cn(
                          'absolute inset-0 flex items-center justify-center transition-all',
                          isSelected ? 'bg-[#0094EB]/20' : 'bg-black/20',
                        )}
                      >
                        {isSelected ? (
                          <div className="bg-[#0094EB] text-white p-1 rounded-full">
                            <CheckCircle2 size={16} />
                          </div>
                        ) : (
                          <Plus
                            className="text-white opacity-0 group-hover:opacity-100"
                            size={24}
                          />
                        )}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[9px] font-black text-white truncate">
                          {video.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {allVideos.length === 0 && (
                <div className="p-10 text-center text-sm font-bold text-slate-400">
                  Nenhum vídeo cadastrado para esta loja.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="text-orange-500" size={18} />
                  <h4 className="text-sm font-black text-slate-800 uppercase">
                    Onde Aparece
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="p-1.5 bg-orange-50 text-orange-500 rounded-lg hover:bg-orange-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {locations.map(location => (
                  <div
                    key={location.id}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group"
                  >
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(location.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <X size={12} />
                    </button>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Seletor CSS
                        </label>

                        <input
                          type="text"
                          value={location.selector}
                          onChange={e => {
                            const next = locations.map(item =>
                              item.id === location.id
                                ? {
                                    ...item,
                                    selector: e.target.value,
                                  }
                                : item,
                            );

                            setLocations(next);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Posição
                        </label>

                        <select
                          value={location.position}
                          onChange={e => {
                            const next = locations.map(item =>
                              item.id === location.id
                                ? {
                                    ...item,
                                    position: e.target.value as DisplayPosition,
                                  }
                                : item,
                            );

                            setLocations(next);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                        >
                          <option value="fixed_bottom_right">
                            Flutuante / Direita
                          </option>
                          <option value="fixed_bottom_left">
                            Flutuante / Esquerda
                          </option>
                          <option value="fixed_top_right">
                            Flutuante / Topo Direita
                          </option>
                          <option value="fixed_top_left">
                            Flutuante / Topo Esquerda
                          </option>
                          <option value="after_element">Depois do Seletor</option>
                          <option value="before_element">Antes do Seletor</option>
                          <option value="inside_start">Dentro / Início</option>
                          <option value="inside_end">Dentro / Fim</option>
                          <option value="replace_element">
                            Substituir Elemento
                          </option>
                        </select>
                      </div>
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

            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Globe className="text-emerald-500" size={18} />
                  <h4 className="text-sm font-black text-slate-800 uppercase">
                    Quando Aparece
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleAddRule}
                  className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg hover:bg-emerald-100"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group"
                  >
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <X size={12} />
                    </button>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Tipo de Regra
                        </label>

                        <select
                          value={rule.condition_type}
                          onChange={e => {
                            const next = rules.map(item =>
                              item.id === rule.id
                                ? {
                                    ...item,
                                    condition_type: e.target
                                      .value as ConditionType,
                                  }
                                : item,
                            );

                            setRules(next);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
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

                      {[
                        'contains',
                        'equals',
                        'not_equals',
                        'starts_with',
                        'ends_with',
                        'regex',
                      ].includes(rule.condition_type) && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Valor do Filtro
                          </label>

                          <input
                            type="text"
                            value={rule.value || ''}
                            onChange={e => {
                              const next = rules.map(item =>
                                item.id === rule.id
                                  ? {
                                      ...item,
                                      value: e.target.value,
                                    }
                                  : item,
                              );

                              setRules(next);
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
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

          setDeleteModal(prev => ({
            ...prev,
            isOpen: false,
          }));
        }}
        onCancel={() =>
          setDeleteModal(prev => ({
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
        onClose={() => navigate('/stories')}
      />
    </div>
  );
};

export default StoryDetailsPage;
