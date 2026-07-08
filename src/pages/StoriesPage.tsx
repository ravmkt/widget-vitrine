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
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Aparência Visual
                    </label>

                    <Link
                      to="/appearance"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:underline"
                    >
                      <Palette className="h-3.5 w-3.5" />
                      Criar/Editar
                    </Link>
                  </div>

                  <select
                    value={appearanceId || ''}
                    onChange={(event) => setAppearanceId(event.target.value || undefined)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-violet-500"
                  >
                    <option value="">Usar aparência padrão da loja</option>
                    {appearances.map((appearance) => (
                      <option key={appearance.id} value={appearance.id}>
                        {appearance.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ordem de Exibição
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={position}
                      onChange={(event) => setPosition(parseInt(event.target.value) || 1)}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </label>
                    <button
                      type="button"
                      onClick={() => setActive(!active)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                        active
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-slate-950 text-slate-500'
                      }`}
                    >
                      <span>{active ? 'Ativo no Widget' : 'Inativo / Rascunho'}</span>
                      {active ? (
                        <ToggleRight className="h-7 w-7 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <h4 className="border-b border-slate-800 pb-2 text-base font-bold text-slate-300">
                  Vídeos do Story *
                </h4>

                <div className="flex border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() => setVideoSelectTab('gallery')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      videoSelectTab === 'gallery'
                        ? 'border-violet-500 text-violet-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <FolderHeart className="h-4 w-4" />
                    Galeria Ativa
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoSelectTab('all_videos')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      videoSelectTab === 'all_videos'
                        ? 'border-violet-500 text-violet-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    Todos os Vídeos
                  </button>
                </div>

                <div
                  className={`rounded-2xl border bg-slate-950 p-2 ${
                    formErrors.videos ? 'border-rose-500' : 'border-slate-800'
                  }`}
                >
                  {currentVideoList.length === 0 ? (
                    <div className="rounded-2xl bg-slate-950 p-8 text-center">
                      <p className="text-sm text-slate-500">
                        Nenhum vídeo disponível nesta aba.
                      </p>
                      <Link
                        to="/gallery"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:underline"
                      >
                        Ir para Galeria
                      </Link>
                    </div>
                  ) : (
                    <div className="grid max-h-60 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4">
                      {currentVideoList.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => {
                            handleVideoSelection(video.id);
                            setFormErrors((prev) => ({ ...prev, videos: '' }));
                          }}
                          className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                            selectedVideoIds.includes(video.id)
                              ? 'border-violet-500 ring-2 ring-violet-500/20'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {renderVideoPreview(video)}

                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            {selectedVideoIds.includes(video.id) ? (
                              <Check className="h-6 w-6 text-emerald-400" />
                            ) : (
                              <Plus className="h-6 w-6 text-white" />
                            )}
                          </div>

                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
                            {video.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formErrors.videos && (
                  <span className="mt-1 block text-xs font-bold text-rose-500">
                    {formErrors.videos}
                  </span>
                )}

                {selectedVideoIds.length > 0 && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h5 className="text-sm font-bold text-slate-300">
                      Vídeos Selecionados ({selectedVideoIds.length})
                    </h5>

                    <ul className="space-y-2">
                      {selectedVideoIds.map((videoId, index) => {
                        const video = allVideosList.find((item) => item.id === videoId);
                        if (!video) return null;

                        const isCover = index === 0;

                        return (
                          <li
                            key={video.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900 p-3 shadow-md"
                          >
                            <GripVertical className="h-4 w-4 text-slate-600" />

                            <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-950">
                              {renderVideoPreview(video)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-200">
                                {video.title}
                              </p>
                              <p className="text-xs text-slate-500">{video.duration || 0}s</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {isCover && (
                                <span className="rounded-full border border-violet-500/35 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                                  Capa
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSetCoverVideo(video.id)}
                                className="rounded-lg bg-slate-950 p-1.5 text-slate-400 hover:text-white"
                                title="Definir como capa"
                              >
                                <Film className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveVideo(index, 'up')}
                                disabled={index === 0}
                                className="rounded-lg bg-slate-950 p-1.5 text-slate-400 disabled:opacity-30"
                              >
                                ▲
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveVideo(index, 'down')}
                                disabled={index === selectedVideoIds.length - 1}
                                className="rounded-lg bg-slate-950 p-1.5 text-slate-400 disabled:opacity-30"
                              >
                                ▼
                              </button>

                              <button
                                type="button"
                                onClick={() => handleVideoSelection(video.id)}
                                className="rounded-lg bg-slate-950 p-1.5 text-rose-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <h4 className="border-b border-slate-800 pb-2 text-base font-bold text-slate-300">
                  CTA
                </h4>

                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div>
                    <h4 className="font-bold text-slate-200">Botão de Ação</h4>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Link, produto ou WhatsApp dentro do player.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCtaEnabled(!ctaEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      ctaEnabled ? 'bg-violet-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        ctaEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {ctaEnabled && (
                  <div className="space-y-5 rounded-2xl border border-slate-800 p-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Texto do CTA
                      </label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(event) => setCtaText(event.target.value)}
                        placeholder="Ex: Comprar Agora"
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 placeholder-slate-700"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Tipo de CTA
                      </label>
                      <select
                        value={ctaType}
                        onChange={(event) => setCtaType(event.target.value as CTAType)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100"
                      >
                        <option value="custom_link">Link customizado</option>
                        <option value="product">Produto vinculado</option>
                        <option value="whatsapp">Falar no WhatsApp</option>
                      </select>
                    </div>

                    {ctaType === 'custom_link' && (
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                          URL do CTA *
                        </label>
                        <input
                          type="url"
                          value={ctaUrl}
                          onChange={(event) => {
                            setCtaUrl(event.target.value);
                            if (event.target.value.trim()) {
                              setFormErrors((prev) => ({ ...prev, ctaUrl: '' }));
                            }
                          }}
                          placeholder="https://sualoja.com.br/produto"
                          className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 ${
                            formErrors.ctaUrl
                              ? 'border-rose-500'
                              : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500'
                          }`}
                        />
                        {formErrors.ctaUrl && (
                          <span className="mt-1 block text-xs font-bold text-rose-500">
                            {formErrors.ctaUrl}
                          </span>
                        )}
                      </div>
                    )}

                    {ctaType === 'whatsapp' && (
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                          Mensagem WhatsApp *
                        </label>
                        <textarea
                          value={whatsappMessage}
                          onChange={(event) => {
                            setWhatsappMessage(event.target.value);
                            if (event.target.value.trim()) {
                              setFormErrors((prev) => ({ ...prev, whatsappMessage: '' }));
                            }
                          }}
                          placeholder="Olá! Tenho interesse no produto deste story."
                          rows={3}
                          className={`w-full resize-y rounded-2xl border bg-slate-950 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 ${
                            formErrors.whatsappMessage
                              ? 'border-rose-500'
                              : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500'
                          }`}
                        />
                        {formErrors.whatsappMessage && (
                          <span className="mt-1 block text-xs font-bold text-rose-500">
                            {formErrors.whatsappMessage}
                          </span>
                        )}
                      </div>
                    )}

                    {ctaType === 'product' && (
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                          Produto do CTA *
                        </label>
                        <select
                          value={selectedProductId || ''}
                          onChange={(event) => {
                            setSelectedProductId(event.target.value || undefined);
                            setFormErrors((prev) => ({ ...prev, productSelection: '' }));
                          }}
                          className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 focus:outline-none focus:ring-1 ${
                            formErrors.productSelection
                              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                              : 'border-slate-800 focus:border-violet-500 focus:ring-violet-500'
                          }`}
                        >
                          <option value="">Selecione o produto</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - R$ {Number(product.price || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        {formErrors.productSelection && (
                          <span className="mt-1 block text-xs font-bold text-rose-500">
                            {formErrors.productSelection}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <h4 className="border-b border-slate-800 pb-2 text-base font-bold text-slate-300">
                  Local de Exibição
                </h4>

                {displayLocations.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row"
                  >
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Seletor CSS *
                      </label>
                      <input
                        type="text"
                        value={item.selector}
                        onChange={(event) =>
                          updateDisplayLocation(index, 'selector', event.target.value)
                        }
                        placeholder="Ex: .minha-div-alvo"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-200"
                      />
                      {formErrors[`displayLocation_${index}`] && (
                        <span className="mt-1 block text-xs font-bold text-rose-500">
                          {formErrors[`displayLocation_${index}`]}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Posição *
                      </label>
                      <select
                        value={item.position}
                        onChange={(event) =>
                          updateDisplayLocation(index, 'position', event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100"
                      >
                        <option value="after_element">Abaixo do elemento</option>
                        <option value="before_element">Acima do elemento</option>
                        <option value="inside_start">Dentro do elemento - início</option>
                        <option value="inside_end">Dentro do elemento - final</option>
                        <option value="replace_element">Substituir elemento</option>
                        <option value="fixed_bottom_right">Fixo: Inferior Direita</option>
                        <option value="fixed_bottom_left">Fixo: Inferior Esquerda</option>
                        <option value="fixed_top_right">Fixo: Superior Direita</option>
                        <option value="fixed_top_left">Fixo: Superior Esquerda</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDisplayLocation(index)}
                      className="self-end rounded-xl border border-slate-800 p-2.5 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400 md:self-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addDisplayLocation}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all hover:bg-slate-800 md:text-sm"
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar Local de Exibição
                </button>
              </section>

              <section className="space-y-5">
                <h4 className="border-b border-slate-800 pb-2 text-base font-bold text-slate-300">
                  Regras de Página
                </h4>

                {pageRules.map((item, index) => {
                  const isValueDisabled = [
                    'all_pages',
                    'home_only',
                    'product_pages',
                    'category_pages',
                  ].includes(item.condition_type);

                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row"
                    >
                      <div className="flex-1">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                          Condição *
                        </label>
                        <select
                          value={item.condition_type}
                          onChange={(event) =>
                            updatePageRule(index, 'condition_type', event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100"
                        >
                          <option value="contains">Contém</option>
                          <option value="equals">É igual</option>
                          <option value="not_equals">Não é igual</option>
                          <option value="starts_with">Começa com</option>
                          <option value="ends_with">Termina com</option>
                          <option value="regex">Regex</option>
                          <option value="all_pages">Todas as páginas</option>
                          <option value="home_only">Apenas Home</option>
                          <option value="product_pages">Páginas de Produto</option>
                          <option value="category_pages">Páginas de Categoria</option>
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                          Valor / URL
                        </label>
                        <input
                          type="text"
                          value={item.value || ''}
                          onChange={(event) =>
                            updatePageRule(index, 'value', event.target.value)
                          }
                          placeholder="/caminho-da-pagina"
                          disabled={isValueDisabled}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-200 disabled:opacity-30"
                        />
                        {formErrors[`pageRule_${index}`] && (
                          <span className="mt-1 block text-xs font-bold text-rose-500">
                            {formErrors[`pageRule_${index}`]}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removePageRule(index)}
                        className="self-end rounded-xl border border-slate-800 p-2.5 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400 md:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addPageRule}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all hover:bg-slate-800 md:text-sm"
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar Regra de Página
                </button>
              </section>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="rounded-xl border border-slate-800 px-5 py-2.5 text-sm font-bold text-slate-400 transition-all hover:bg-slate-800 md:text-base"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:from-violet-500 hover:to-fuchsia-500 md:text-base"
                >
                  {editingStory ? 'Salvar Alterações' : 'Salvar Story'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl md:flex-row">
          <div className="relative w-full flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Busca
            </span>
            <input
              type="text"
              placeholder="Pesquisar story pelo título..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-20 pr-4 text-sm font-semibold text-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 md:text-base"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 md:w-auto md:text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {filteredStoriesToShow.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center shadow-xl">
            <Film className="mx-auto mb-4 h-12 w-12 text-slate-700" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum story encontrado</h3>
            <p className="mt-1 text-sm text-slate-400">
              Ajuste seus filtros ou cadastre um novo story.
            </p>
          </div>
        ) : (
          <div className="grid animate-fade-in grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStoriesToShow.map((story) => {
              const coverRelation =
                storyVideosMap.get(story.id)?.find((item) => item.is_cover) ||
                storyVideosMap.get(story.id)?.[0];

              const coverVideo = allVideosList.find(
                (video) => video.id === coverRelation?.video_id
              );

              const appearanceName =
                appearances.find((item) => item.id === story.appearance_id)?.name ||
                'Padrão da Loja';

              const modelName =
                sizingModels.find((item) => item.id === story.model_id)?.name ||
                'Nenhuma modelo';

              const videoCount = storyVideosMap.get(story.id)?.length || 0;

              return (
                <div
                  key={story.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl transition-all hover:border-slate-700"
                >
                  <div className="relative aspect-[9/16] max-h-[280px] overflow-hidden bg-slate-950">
                    <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
                      {renderVideoPreview(coverVideo)}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    <button
                      onClick={() => handleToggleActive(story)}
                      className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur-md transition-all ${
                        story.active ? 'bg-emerald-500/90 text-white' : 'bg-slate-600/90 text-white'
                      }`}
                    >
                      {story.active ? 'Ativo' : 'Inativo'}
                    </button>

                    <span className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                      Posição #{story.position}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                    <div>
                      <h3 className="line-clamp-1 text-lg font-extrabold text-slate-100 md:text-xl">
                        {story.title}
                      </h3>

                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {videoCount} vídeo(s) vinculados
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        Estilo: {appearanceName}
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        Modelo: {modelName}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <EyeIcon className="h-4 w-4 text-violet-400" />
                        <span className="font-bold">{story.view_count || 0}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MousePointerClick className="h-4 w-4 text-violet-400" />
                        <span className="font-bold">{story.click_count || 0}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
                      <button
                        type="button"
                        onClick={() => openEditStory(story)}
                        className="inline-flex min-w-[90px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-violet-400"
                      >
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        onClick={() => handleDuplicate(story)}
                        className="inline-flex min-w-[90px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-violet-400"
                        title="Duplicar Story"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicar
                      </button>

                      <Link
                        to={`/widget/${store?.id}?storyId=${story.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 transition-all hover:bg-violet-600/10 hover:text-violet-400"
                        title="Visualizar Story"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </Link>

                      <button
                        onClick={() => handleDelete(story.id)}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400"
                        title="Excluir Story"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText="Confirmar"
        cancelText="Voltar"
      />
    </div>
  );
};

export default StoriesPage;
