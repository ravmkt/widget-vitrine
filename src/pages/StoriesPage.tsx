import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import {
  db,
  Story,
  Store,
  Video,
  StoryVideo,
  Appearance,
  StoryFormat,
  CTAType,
  ScrollDirection,
  DisplayLocation,
  PageRule,
  Product,
  DisplayPosition,
  ConditionType,
  SizingModel,
} from '@/lib/db';
import {
  Plus,
  Film,
  Eye,
  Trash2,
  Edit3,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
  Eye as EyeIcon,
  MousePointerClick,
  Video as VideoIcon,
  Layers,
  Palette,
  Ruler,
  ShoppingBag,
  PlusCircle,
  GripVertical,
  FolderHeart,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

type DisplayLocationDraft = Pick<DisplayLocation, 'selector' | 'position'>;
type PageRuleDraft = Pick<PageRule, 'condition_type' | 'value'>;

type VideoWithFallbacks = Video & {
  poster_url?: string;
  image_url?: string;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const getVideoPreviewUrl = (video?: Video | null) => {
  if (!video) return '';

  const item = video as VideoWithFallbacks;

  return (
    item.thumbnail_url?.trim() ||
    item.poster_url?.trim() ||
    item.image_url?.trim() ||
    item.video_url?.trim() ||
    ''
  );
};

const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);

const StoriesPage = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [allVideosList, setAllVideosList] = useState<Video[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sizingModels, setSizingModels] = useState<SizingModel[]>([]);
  const [storyVideosMap, setStoryVideosMap] = useState<Map<string, StoryVideo[]>>(new Map());

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [videoSelectTab, setVideoSelectTab] = useState<'gallery' | 'all_videos'>('gallery');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<StoryFormat>('carousel');
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('horizontal');
  const [active, setActive] = useState(true);
  const [appearanceId, setAppearanceId] = useState<string | undefined>(undefined);
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaText, setCtaText] = useState('');
  const [ctaType, setCtaType] = useState<CTAType>('custom_link');
  const [ctaUrl, setCtaUrl] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [position, setPosition] = useState(1);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [selectedSizingModelId, setSelectedSizingModelId] = useState<string | undefined>(undefined);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    product_url: '',
    image_url: '',
    price: 0,
  });

  const [displayLocations, setDisplayLocations] = useState<DisplayLocationDraft[]>([]);
  const [pageRules, setPageRules] = useState<PageRuleDraft[]>([]);

  const loadStoriesData = useCallback(async () => {
    try {
      setLoading(true);

      const stores = await db.stores.getAll();
      const mainStore = stores[0] || null;
      setStore(mainStore);

      if (!mainStore) return;

      const fetchedStories = await db.stories.getAll(mainStore.id);
      setAllStories(fetchedStories.sort((a, b) => a.position - b.position));

      const fetchedVideos = await db.videos.getAll(mainStore.id);
      setAllVideosList(fetchedVideos);
      setVideos(fetchedVideos.filter((video) => video.status === 'active'));

      setAppearances(await db.appearances.getAll(mainStore.id));
      setProducts(await db.products.getAll(mainStore.id));
      setSizingModels(await db.sizingModels.getAll(mainStore.id));

      const fetchedStoryVideos = await db.storyVideos.getAll();
      const map = new Map<string, StoryVideo[]>();

      fetchedStoryVideos.forEach((item) => {
        if (!map.has(item.story_id)) map.set(item.story_id, []);
        map.get(item.story_id)?.push(item);
      });

      map.forEach((items) => items.sort((a, b) => a.position - b.position));
      setStoryVideosMap(map);

      const maxPos = fetchedStories.reduce((max, story) => Math.max(max, story.position || 0), 0);
      if (!editingStory) setPosition(maxPos + 1);
    } catch (error) {
      console.error('Erro ao carregar dados de stories:', error);
      showError('Erro ao carregar os stories.');
    } finally {
      setLoading(false);
    }
  }, [editingStory]);

  useEffect(() => {
    loadStoriesData();
  }, [loadStoriesData]);

  const filteredStoriesToShow = useMemo(() => {
    let currentStories = allStories;

    if (filterStatus !== 'all') {
      currentStories = currentStories.filter((story) =>
        filterStatus === 'active' ? story.active : !story.active
      );
    }

    if (searchTerm) {
      currentStories = currentStories.filter((story) =>
        String(story.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return currentStories;
  }, [allStories, filterStatus, searchTerm]);

  const currentVideoList = videoSelectTab === 'gallery' ? videos : allVideosList;

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const renderVideoPreview = (
    video?: Video | null,
    className = 'h-full w-full object-cover'
  ) => {
    const previewUrl = getVideoPreviewUrl(video);

    if (!previewUrl) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-500">
          <VideoIcon className="h-8 w-8" />
        </div>
      );
    }

    if (isVideoFile(previewUrl)) {
      return (
        <video
          src={previewUrl}
          muted
          playsInline
          preload="metadata"
          className={className}
        />
      );
    }

    return (
      <img
        src={previewUrl}
        alt={video?.title || 'Vídeo'}
        className={className}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  };

  const resetForm = () => {
    setEditingStory(null);
    setTitle('');
    setFormat('carousel');
    setScrollDirection('horizontal');
    setActive(true);
    setAppearanceId(undefined);
    setCtaEnabled(true);
    setCtaText('');
    setCtaType('custom_link');
    setCtaUrl('');
    setWhatsappMessage('');
    setSelectedVideoIds([]);
    setSelectedProductId(undefined);
    setSelectedSizingModelId(undefined);
    setNewProductForm({ name: '', product_url: '', image_url: '', price: 0 });
    setDisplayLocations([]);
    setPageRules([]);
    setFormErrors({});

    const maxPos = allStories.reduce((max, story) => Math.max(max, story.position || 0), 0);
    setPosition(maxPos + 1);
  };

  const openEditStory = async (story: Story) => {
    try {
      setEditingStory(story);

      setTitle(story.title || '');
      setFormat(story.format || 'carousel');
      setScrollDirection(story.scroll_direction || 'horizontal');
      setActive(Boolean(story.active));
      setAppearanceId(story.appearance_id || undefined);
      setSelectedSizingModelId(story.model_id || undefined);
      setCtaEnabled(Boolean(story.cta_enabled));
      setCtaText(story.cta_text || '');
      setCtaType(story.cta_type || 'custom_link');
      setCtaUrl(story.cta_url || '');
      setWhatsappMessage(story.whatsapp_message || '');
      setPosition(story.position || 1);

      const allStoryVideos = await db.storyVideos.getAll();
      const relatedVideos = allStoryVideos
        .filter((item) => item.story_id === story.id)
        .sort((a, b) => a.position - b.position);

      setSelectedVideoIds(relatedVideos.map((item) => item.video_id));

      const allStoryProducts = await db.storyProducts.getAll();
      const relatedProduct = allStoryProducts.find((item) => item.story_id === story.id);
      setSelectedProductId(relatedProduct?.product_id || undefined);

      const allDisplayLocations = await db.displayLocations.getAll();
      setDisplayLocations(
        allDisplayLocations
          .filter((item) => item.story_id === story.id)
          .map((item) => ({
            selector: item.selector,
            position: item.position,
          }))
      );

      const allPageRules = await db.pageRules.getAll();
      setPageRules(
        allPageRules
          .filter((item) => item.story_id === story.id)
          .map((item) => ({
            condition_type: item.condition_type,
            value: item.value || '',
          }))
      );

      setShowForm(true);
      setFormErrors({});

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error(error);
      showError('Erro ao abrir edição do story.');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Por favor, insira o título do story.';
    }

    if (selectedVideoIds.length === 0) {
      errors.videos = 'Selecione pelo menos um vídeo para compor este story.';
    }

    if (ctaEnabled) {
      if (ctaType === 'custom_link' && (!ctaUrl.trim() || !isValidUrl(ctaUrl))) {
        errors.ctaUrl = 'Forneça uma URL válida. Ex: https://sualoja.com.br/produto';
      }

      if (ctaType === 'whatsapp' && !whatsappMessage.trim()) {
        errors.whatsappMessage = 'Preencha a mensagem inicial de atendimento.';
      }

      if (ctaType === 'product' && !selectedProductId && !newProductForm.name.trim()) {
        errors.productSelection = 'Escolha um produto cadastrado ou informe um novo produto.';
      }
    }

    displayLocations.forEach((item, index) => {
      if (!item.selector.trim()) {
        errors[`displayLocation_${index}`] = 'Informe o seletor CSS.';
      }
    });

    pageRules.forEach((item, index) => {
      const needsValue = !['all_pages', 'home_only', 'product_pages', 'category_pages'].includes(
        item.condition_type
      );

      if (needsValue && !item.value?.trim()) {
        errors[`pageRule_${index}`] = 'Informe o valor da regra.';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveStory = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!store) return;

    if (!validateForm()) {
      showError('Alguns campos obrigatórios precisam de correção.');
      return;
    }

    try {
      let finalProductId = selectedProductId;

      if (newProductForm.name.trim()) {
        const savedProduct = await db.products.save({
          id: generateId(),
          store_id: store.id,
          name: newProductForm.name.trim(),
          product_url: newProductForm.product_url.trim(),
          image_url: newProductForm.image_url.trim(),
          price: Number(newProductForm.price || 0),
          active: true,
        });

        finalProductId = savedProduct.id;
      }

      const storyToSave: Story = {
        id: editingStory?.id || generateId(),
        store_id: store.id,
        title: title.trim(),
        format,
        scroll_direction: format === 'carousel' ? scrollDirection : undefined,
        active,
        appearance_id: appearanceId || undefined,
        model_id: selectedSizingModelId || undefined,
        cta_enabled: ctaEnabled,
        cta_text: ctaEnabled ? ctaText.trim() || undefined : undefined,
        cta_type: ctaEnabled ? ctaType : 'none',
        cta_url: ctaEnabled && ctaType === 'custom_link' ? ctaUrl.trim() : undefined,
        whatsapp_message:
          ctaEnabled && ctaType === 'whatsapp' ? whatsappMessage.trim() : undefined,
        position,
        view_count: editingStory?.view_count || 0,
        click_count: editingStory?.click_count || 0,
        created_at: editingStory?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const savedStory = await db.stories.save(storyToSave);

      if (editingStory) {
        const oldStoryVideos = (await db.storyVideos.getAll()).filter(
          (item) => item.story_id === savedStory.id
        );

        for (const item of oldStoryVideos) {
          await db.storyVideos.delete(item.id);
        }

        const oldStoryProducts = (await db.storyProducts.getAll()).filter(
          (item) => item.story_id === savedStory.id
        );

        for (const item of oldStoryProducts) {
          await db.storyProducts.delete(item.id);
        }

        const oldDisplayLocations = (await db.displayLocations.getAll()).filter(
          (item) => item.story_id === savedStory.id
        );

        for (const item of oldDisplayLocations) {
          await db.displayLocations.delete(item.id);
        }

        const oldPageRules = (await db.pageRules.getAll()).filter(
          (item) => item.story_id === savedStory.id
        );

        for (const item of oldPageRules) {
          await db.pageRules.delete(item.id);
        }
      }

      for (let index = 0; index < selectedVideoIds.length; index++) {
        await db.storyVideos.save({
          id: generateId(),
          story_id: savedStory.id,
          video_id: selectedVideoIds[index],
          position: index + 1,
          is_cover: index === 0,
        });
      }

      if (finalProductId) {
        await db.storyProducts.save({
          id: generateId(),
          story_id: savedStory.id,
          product_id: finalProductId,
        });
      }

      for (const item of displayLocations) {
        await db.displayLocations.save({
          id: generateId(),
          store_id: store.id,
          story_id: savedStory.id,
          selector: item.selector,
          position: item.position,
        });
      }

      for (const item of pageRules) {
        await db.pageRules.save({
          id: generateId(),
          store_id: store.id,
          story_id: savedStory.id,
          condition_type: item.condition_type,
          value: item.value,
        });
      }

      showSuccess(editingStory ? 'Story atualizado com sucesso!' : 'Story cadastrado com sucesso!');

      resetForm();
      setShowForm(false);
      await loadStoriesData();
    } catch (error) {
      console.error('Erro detalhado ao salvar story:', error);
      showError(error instanceof Error ? error.message : 'Erro ao salvar o story.');
    }
  };

  const handleDuplicate = async (storyToDup: Story) => {
    try {
      const newStoryId = generateId();

      await db.stories.save({
        ...storyToDup,
        id: newStoryId,
        title: `Cópia de ${storyToDup.title}`,
        view_count: 0,
        click_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const relatedVideos = (await db.storyVideos.getAll()).filter(
        (item) => item.story_id === storyToDup.id
      );

      for (const item of relatedVideos) {
        await db.storyVideos.save({
          id: generateId(),
          story_id: newStoryId,
          video_id: item.video_id,
          position: item.position,
          is_cover: item.is_cover,
        });
      }

      const relatedProducts = (await db.storyProducts.getAll()).filter(
        (item) => item.story_id === storyToDup.id
      );

      for (const item of relatedProducts) {
        await db.storyProducts.save({
          id: generateId(),
          story_id: newStoryId,
          product_id: item.product_id,
          video_id: item.video_id,
        });
      }

      const relatedLocations = (await db.displayLocations.getAll()).filter(
        (item) => item.story_id === storyToDup.id
      );

      for (const item of relatedLocations) {
        await db.displayLocations.save({
          id: generateId(),
          store_id: item.store_id,
          story_id: newStoryId,
          selector: item.selector,
          position: item.position,
        });
      }

      const relatedRules = (await db.pageRules.getAll()).filter(
        (item) => item.story_id === storyToDup.id
      );

      for (const item of relatedRules) {
        await db.pageRules.save({
          id: generateId(),
          store_id: item.store_id,
          story_id: newStoryId,
          condition_type: item.condition_type,
          value: item.value,
        });
      }

      showSuccess('Story duplicado com sucesso!');
      await loadStoriesData();
    } catch (error) {
      console.error(error);
      showError('Falha ao duplicar o story selecionado.');
    }
  };

  const handleDelete = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Story?',
      description:
        'Tem certeza de que deseja remover permanentemente este story? Esta ação também remove vínculos, regras e comentários.',
      onConfirm: async () => {
        try {
          const relatedStoryVideos = (await db.storyVideos.getAll()).filter(
            (item) => item.story_id === id
          );

          for (const item of relatedStoryVideos) {
            await db.storyVideos.delete(item.id);
          }

          const relatedDisplayLocations = (await db.displayLocations.getAll()).filter(
            (item) => item.story_id === id
          );

          for (const item of relatedDisplayLocations) {
            await db.displayLocations.delete(item.id);
          }

          const relatedPageRules = (await db.pageRules.getAll()).filter(
            (item) => item.story_id === id
          );

          for (const item of relatedPageRules) {
            await db.pageRules.delete(item.id);
          }

          const relatedStoryProducts = (await db.storyProducts.getAll()).filter(
            (item) => item.story_id === id
          );

          for (const item of relatedStoryProducts) {
            await db.storyProducts.delete(item.id);
          }

          const relatedComments = (await db.comments.getAll()).filter(
            (item) => item.story_id === id
          );

          for (const item of relatedComments) {
            await db.comments.delete(item.id);
          }

          await db.stories.delete(id);

          showSuccess('Story excluído com sucesso!');
          setDialog((prev) => ({ ...prev, isOpen: false }));
          await loadStoriesData();
        } catch (error) {
          console.error(error);
          showError('Erro ao excluir o story.');
        }
      },
      onCancel: () => setDialog((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const handleToggleActive = async (story: Story) => {
    try {
      const updated = {
        ...story,
        active: !story.active,
        updated_at: new Date().toISOString(),
      };

      await db.stories.save(updated);
      showSuccess(`Story ${updated.active ? 'ativado' : 'desativado'} com sucesso!`);
      await loadStoriesData();
    } catch (error) {
      console.error(error);
      showError('Erro ao atualizar status do story.');
    }
  };

  const handleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  };

  const handleMoveVideo = (index: number, direction: 'up' | 'down') => {
    setSelectedVideoIds((prev) => {
      const newOrder = [...prev];
      const [movedItem] = newOrder.splice(index, 1);

      if (direction === 'up') {
        newOrder.splice(index - 1, 0, movedItem);
      } else {
        newOrder.splice(index + 1, 0, movedItem);
      }

      return newOrder;
    });
  };

  const handleSetCoverVideo = (videoId: string) => {
    setSelectedVideoIds((prev) => {
      const newOrder = prev.filter((id) => id !== videoId);
      return [videoId, ...newOrder];
    });
  };

  const addDisplayLocation = () => {
    setDisplayLocations((prev) => [
      ...prev,
      {
        selector: '',
        position: 'after_element',
      },
    ]);
  };

  const updateDisplayLocation = (
    index: number,
    field: keyof DisplayLocationDraft,
    value: string
  ) => {
    setDisplayLocations((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === 'position' ? (value as DisplayPosition) : value,
            }
          : item
      )
    );
  };

  const removeDisplayLocation = (index: number) => {
    setDisplayLocations((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const addPageRule = () => {
    setPageRules((prev) => [
      ...prev,
      {
        condition_type: 'contains',
        value: '',
      },
    ]);
  };

  const updatePageRule = (index: number, field: keyof PageRuleDraft, value: string) => {
    setPageRules((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === 'condition_type' ? (value as ConditionType) : value,
            }
          : item
      )
    );
  };

  const removePageRule = (index: number) => {
    setPageRules((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500" />
        <p className="text-base font-semibold text-slate-400">Carregando seus stories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-3xl font-black text-transparent">
              Gerenciador de Stories
            </h1>
            <p className="mt-1 text-sm text-slate-400 md:text-base">
              Crie stories, vincule vídeos, produtos, modelos, CTAs e regras de exibição.
            </p>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                resetForm();
                setShowForm(false);
              } else {
                resetForm();
                setShowForm(true);
              }
            }}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-violet-500 hover:to-fuchsia-500 sm:self-auto md:text-base"
          >
            <Plus className="h-5 w-5" />
            {showForm ? 'Fechar Formulário' : 'Novo Story'}
          </button>
        </div>

        {showForm && (
          <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl md:p-8">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h3 className="text-lg font-bold">
                {editingStory ? 'Editar Story' : 'Cadastrar Novo Story'}
              </h3>
            </div>

            <form onSubmit={handleSaveStory} className="space-y-8">
              <section className="space-y-5">
                <h4 className="border-b border-slate-800 pb-2 text-base font-bold text-slate-300">
                  Informações Básicas
                </h4>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Título do Story *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        if (event.target.value.trim()) {
                          setFormErrors((prev) => ({ ...prev, title: '' }));
                        }
                      }}
                      placeholder="Ex: Coleção Outono"
                      className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 md:text-base ${
                        formErrors.title
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500'
                      }`}
                    />
                    {formErrors.title && (
                      <span className="mt-1 block text-xs font-bold text-rose-500">
                        {formErrors.title}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Formato de Exibição *
                    </label>
                    <select
                      value={format}
                      onChange={(event) => setFormat(event.target.value as StoryFormat)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-violet-500 md:text-base"
                    >
                      <option value="carousel">Carrossel de Stories</option>
                      <option value="floating_widget">Balão Fixo de Canto</option>
                      <option value="grid">Bloco de Stories</option>
                    </select>
                  </div>
                </div>

                {format === 'carousel' && (
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Direção de Rolagem
                    </label>
                    <select
                      value={scrollDirection}
                      onChange={(event) =>
                        setScrollDirection(event.target.value as ScrollDirection)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-violet-500"
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <ShoppingBag className="h-3.5 w-3.5 text-violet-400" />
                      Produto Principal
                    </label>
                    <select
                      value={selectedProductId || ''}
                      onChange={(event) => setSelectedProductId(event.target.value || undefined)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 focus:border-violet-500"
                    >
                      <option value="">Nenhum produto vinculado</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - R$ {Number(product.price || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Ruler className="h-3.5 w-3.5 text-violet-400" />
                      Modelo / Medidas
                    </label>
                    <select
                      value={selectedSizingModelId || ''}
                      onChange={(event) =>
                        setSelectedSizingModelId(event.target.value || undefined)
                      }
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 focus:border-violet-500"
                    >
                      <option value="">Nenhuma modelo vinculada</option>
                      {sizingModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
