"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  db,
  resolveStoreId,
  generateUuid,
  type Appearance,
  type Video,
  type ScrollDirection,
  type DisplayPosition,
  type ConditionType,
  type StoryFormat,
} from '@/lib/db';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Search,
  Check,
  Trash2,
  Play,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const CONDITION_LABELS: Record<ConditionType, string> = {
  home: 'Página Inicial',
  all_pages: 'Todas as Páginas',
  url_contains: 'URL Contém',
  url_equals: 'URL É',
  url_not_equals: 'URL Diferente de',
};

const POSITION_LABELS: Record<DisplayPosition, string> = {
  beforebegin: 'Antes do Elemento',
  afterbegin: 'Dentro (após abrir)',
  beforeend: 'Dentro (antes de fechar)',
  afterend: 'Depois do Elemento',
};

const StoryNewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const isEditing = Boolean(id);

  // ── Campos do Story ──────────────────────────────────
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<StoryFormat>('floating_widget');
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('vertical');
  const [appearanceId, setAppearanceId] = useState<string>('');
  const [active, setActive] = useState(true);

  // ── Display Location ─────────────────────────────────
  const [selector, setSelector] = useState('body');
  const [displayPosition, setDisplayPosition] = useState<DisplayPosition>('afterend');
  const [displayLocationId, setDisplayLocationId] = useState<string | null>(null);

  // ── Page Rules ───────────────────────────────────────
  const [pageRules, setPageRules] = useState<
    { key: string; id?: string; condition_type: ConditionType; value: string }[]
  >([]);

  // ── Vídeos Selecionados ──────────────────────────────
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [videoSearch, setVideoSearch] = useState('');

  // ── Dados carregados ─────────────────────────────────
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingStory, setLoadingStory] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [existingPosition, setExistingPosition] = useState<number | null>(null);

  // ── Carregar aparências e vídeos ─────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const storeId = await resolveStoreId();
        const [apps, vids] = await Promise.all([
          db.appearances.getAll(storeId),
          db.videos.getAll(storeId),
        ]);
        setAppearances(apps || []);
        setVideos(vids || []);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // ── Carregar dados do Story se estiver editando ──────
  useEffect(() => {
    if (!id) {
      setLoadingStory(false);
      return;
    }

    const loadStory = async () => {
      try {
        const storeId = await resolveStoreId();

        // Buscar story
        const story = await db.stories.getById(id);
        if (!story) {
          showError('Story não encontrado.');
          navigate('/stories', { replace: true });
          return;
        }

        setTitle(story.title ?? '');
        setFormat(story.format ?? 'floating_widget');
        setScrollDirection(story.scroll_direction ?? 'vertical');
        setAppearanceId(story.appearance_id ?? '');
        setActive(story.active ?? true);
        setExistingPosition(story.position ?? null);

        // Buscar display location
        const locations = await db.displayLocations.getAll(storeId);
        const location = locations.find((l: any) => l.story_id === id);
        if (location) {
          setSelector(location.selector ?? 'body');
          setDisplayPosition(location.position ?? 'afterend');
          setDisplayLocationId(location.id ?? null);
        }

        // Buscar page rules
        const allRules = await db.pageRules.getAll(storeId);
        const storyRules = allRules.filter((r: any) => r.story_id === id);
        setPageRules(
          storyRules.map((r: any) => ({
            key: generateUuid(),
            id: r.id,
            condition_type: r.condition_type,
            value: r.value ?? '',
          })),
        );

        // Buscar vídeos associados
        const allStoryVideos = await db.storyVideos.getAll(storeId);
        const storyVids = allStoryVideos
          .filter((sv: any) => sv.story_id === id)
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
        setSelectedVideoIds(storyVids.map((sv: any) => sv.video_id));
      } catch (e) {
        console.error('Erro ao carregar story:', e);
        showError('Erro ao carregar dados do Story.');
        navigate('/stories', { replace: true });
      } finally {
        setLoadingStory(false);
      }
    };

    loadStory();
  }, [id, navigate]);

  // ── Vídeos filtrados pela busca ──────────────────────
  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase()),
  );

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId],
    );
  };

  // ── Page Rules handlers ──────────────────────────────
  const addPageRule = () => {
    setPageRules(prev => [
      ...prev,
      { key: generateUuid(), condition_type: 'url_contains' as ConditionType, value: '' },
    ]);
  };

  const removePageRule = (key: string) => {
    setPageRules(prev => prev.filter(r => r.key !== key));
  };

  const updatePageRule = (
    key: string,
    field: 'condition_type' | 'value',
    val: string,
  ) => {
    setPageRules(prev =>
      prev.map(r => (r.key === key ? { ...r, [field]: val } : r)),
    );
  };

  // ── Salvar ───────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      showError('Informe um nome para o Story.');
      return;
    }

    setSaving(true);
    try {
      const storeId = await resolveStoreId();

      // ── 1. Salvar/Atualizar Story ──
      let storyId = id;

      if (isEditing && id) {
        await db.stories.save({
          id,
          title: title.trim(),
          format,
          scroll_direction: scrollDirection,
          appearance_id: appearanceId || null,
          store_id: storeId,
          active,
          position: existingPosition ?? Math.floor(Date.now() / 1000),
        });
      } else {
        const story = await db.stories.save({
          title: title.trim(),
          format,
          scroll_direction: scrollDirection,
          appearance_id: appearanceId || null,
          store_id: storeId,
          active: true,
          position: Math.floor(Date.now() / 1000),
        });
        storyId = story.id;
      }

      if (!storyId) throw new Error('Falha ao obter ID do story');

      // ── 2. Salvar/Atualizar Display Location ──
      if (displayLocationId) {
        await db.displayLocations.save({
          id: displayLocationId,
          store_id: storeId,
          story_id: storyId,
          selector,
          position: displayPosition,
        });
      } else {
        await db.displayLocations.save({
          store_id: storeId,
          story_id: storyId,
          selector,
          position: displayPosition,
        });
      }

      // ── 3. Reconciliar Page Rules ──
      if (isEditing) {
        // Obter rules existentes para saber quais remover
        const allRules = await db.pageRules.getAll(storeId);
        const existingRuleIds = allRules
          .filter((r: any) => r.story_id === storyId)
          .map((r: any) => r.id);

        const newRuleIds = pageRules.map(r => r.id).filter(Boolean);

        // Remover rules que não estão mais na lista
        for (const ruleId of existingRuleIds) {
          if (!newRuleIds.includes(ruleId)) {
            await db.pageRules.delete(ruleId);
          }
        }
      }

      // Salvar/atualizar cada rule
      for (const rule of pageRules) {
        if (
          rule.condition_type !== 'home' &&
          rule.condition_type !== 'all_pages' &&
          !rule.value.trim()
        ) {
          continue;
        }

        await db.pageRules.save({
          ...(rule.id ? { id: rule.id } : {}),
          store_id: storeId,
          story_id: storyId,
          condition_type: rule.condition_type,
          value:
            rule.condition_type === 'home' || rule.condition_type === 'all_pages'
              ? null
              : rule.value.trim(),
        });
      }

      // ── 4. Reconciliar Story Videos ──
      if (isEditing) {
        const allStoryVideos = await db.storyVideos.getAll(storeId);
        const existingSVIds = allStoryVideos
          .filter((sv: any) => sv.story_id === storyId)
          .map((sv: any) => sv.id);

        // Remover todos os vínculos antigos
        for (const svId of existingSVIds) {
          await db.storyVideos.delete(svId);
        }
      }

      // Inserir novos vínculos
      for (let i = 0; i < selectedVideoIds.length; i++) {
        await db.storyVideos.save({
          story_id: storyId,
          video_id: selectedVideoIds[i],
          position: i,
          is_cover: i === 0,
        });
      }

      showSuccess(isEditing ? 'Story atualizado com sucesso!' : 'Story criado com sucesso!');
      navigate('/stories');
    } catch (e) {
      console.error('Erro ao salvar story:', e);
      showError('Erro ao salvar o Story.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading (carregamento inicial dos dados base) ────
  if (loadingData) return null;

  // ── Loading (carregamento do story para edição) ──────
  if (loadingStory) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 size={24} className="animate-spin text-[#0094EB]" />
        <p className="text-sm font-bold text-slate-500">Carregando story...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/stories')}
          className="p-2 text-slate-400 hover:text-[#0094EB] hover:bg-slate-50 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isEditing ? 'Editar Story' : 'Novo Story'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {isEditing
              ? 'Edite a configuração do seu agrupamento de vídeos.'
              : 'Configure um novo agrupamento de vídeos.'}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm space-y-6 max-w-3xl">
        {/* ──────── Nome ──────── */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
            Nome do Story
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Stories da Página Inicial"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
          />
        </div>

        {/* ──────── Formato + Direção ──────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formato */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
              Formato de Exibição
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'floating_widget', label: 'Flutuante' },
                { value: 'carousel', label: 'Carrossel' },
                { value: 'grid', label: 'Grade' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value as StoryFormat)}
                  className={cn(
                    'px-5 py-3 rounded-xl text-sm font-bold transition-all border',
                    format === opt.value
                      ? 'bg-[#0094EB] text-white border-[#0094EB]'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direção de Rolagem */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
              Direção de Rolagem
            </label>
            <div className="flex gap-2">
              {[
                { value: 'vertical', label: 'Vertical' },
                { value: 'horizontal', label: 'Horizontal' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScrollDirection(opt.value as ScrollDirection)}
                  className={cn(
                    'px-5 py-3 rounded-xl text-sm font-bold transition-all border',
                    scrollDirection === opt.value
                      ? 'bg-[#0094EB] text-white border-[#0094EB]'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ──────── Aparência ──────── */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
            Aparência
          </label>
          {appearances.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Nenhuma aparência disponível.{' '}
              <button
                type="button"
                onClick={() => navigate('/aparencia')}
                className="text-[#0094EB] underline font-bold"
              >
                Criar aparência
              </button>
            </p>
          ) : (
            <select
              value={appearanceId}
              onChange={e => setAppearanceId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] appearance-none cursor-pointer"
            >
              <option value="">Padrão da Loja</option>
              {appearances.map(app => (
                <option key={app.id} value={app.id}>
                  {app.name || app.style_name || 'Sem nome'}
                  {app.is_default || app.isDefault ? ' (padrão)' : ''}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Selecione uma aparência ou deixe em branco para usar o padrão da loja.
          </p>
        </div>

        {/* ──────── Ativo/Inativo ──────── */}
        {isEditing && (
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {[
                { value: true, label: 'Ativo' },
                { value: false, label: 'Inativo' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setActive(opt.value)}
                  className={cn(
                    'px-5 py-3 rounded-xl text-sm font-bold transition-all border',
                    active === opt.value
                      ? opt.value
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-400 text-white border-slate-400'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ──────── Local de Exibição ──────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
              Local de Exibição (seletor CSS)
            </label>
            <input
              type="text"
              value={selector}
              onChange={e => setSelector(e.target.value)}
              placeholder="body"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
            />
            <p className="text-xs text-slate-400 mt-1">
              Use <code className="bg-slate-100 px-1 rounded">body</code> para exibir em todas as páginas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
              Posição
            </label>
            <select
              value={displayPosition}
              onChange={e => setDisplayPosition(e.target.value as DisplayPosition)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] appearance-none cursor-pointer"
            >
              {(Object.keys(POSITION_LABELS) as DisplayPosition[]).map(pos => (
                <option key={pos} value={pos}>
                  {POSITION_LABELS[pos]}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Define onde o Story será inserido em relação ao seletor acima.
            </p>
          </div>
        </div>

        {/* ──────── Regras de Página ──────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">
              Qual página irá aparecer?
            </label>
            <button
              type="button"
              onClick={addPageRule}
              className="text-[10px] font-black uppercase text-[#0094EB] hover:text-[#0E4787] flex items-center gap-1"
            >
              <Plus size={14} /> Adicionar Regra
            </button>
          </div>

          {pageRules.length === 0 ? (
            <p className="text-sm text-slate-400 italic bg-slate-50 border border-slate-100 rounded-xl p-4">
              Nenhuma regra definida — o Story aparecerá em todas as páginas.
            </p>
          ) : (
            <div className="space-y-3">
              {pageRules.map(rule => (
                <div
                  key={rule.key}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3"
                >
                  <select
                    value={rule.condition_type}
                    onChange={e =>
                      updatePageRule(rule.key, 'condition_type', e.target.value)
                    }
                    className="px-3 py-2 bg-white border border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#0094EB] cursor-pointer"
                  >
                    {(Object.keys(CONDITION_LABELS) as ConditionType[]).map(ct => (
                      <option key={ct} value={ct}>
                        {CONDITION_LABELS[ct]}
                      </option>
                    ))}
                  </select>

                  {rule.condition_type !== 'home' &&
                    rule.condition_type !== 'all_pages' && (
                      <input
                        type="text"
                        value={rule.value}
                        onChange={e =>
                          updatePageRule(rule.key, 'value', e.target.value)
                        }
                        placeholder={
                          rule.condition_type === 'url_contains'
                            ? '/produtos'
                            : 'https://...'
                        }
                        className="flex-1 px-3 py-2 bg-white border border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                      />
                    )}

                  <button
                    type="button"
                    onClick={() => removePageRule(rule.key)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ──────── Conteúdo (Vídeos) ──────── */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2">
            Conteúdo Selecionado ({selectedVideoIds.length} vídeo{selectedVideoIds.length !== 1 ? 's' : ''})
          </label>

          {videos.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center">
              <Play size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400">
                Nenhum vídeo disponível.
              </p>
              <button
                type="button"
                onClick={() => navigate('/videos')}
                className="text-[#0094EB] text-xs font-bold underline mt-1"
              >
                Ir para Vídeos
              </button>
            </div>
          ) : (
            <>
              {/* Campo de busca */}
              <div className="relative mb-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={e => setVideoSearch(e.target.value)}
                  placeholder="Buscar vídeos..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-[#0094EB]"
                />
              </div>

              {/* Lista de vídeos */}
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                {filteredVideos.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Nenhum vídeo encontrado.
                  </p>
                ) : (
                  filteredVideos.map(video => {
                    const isSelected = selectedVideoIds.includes(video.id);
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => toggleVideo(video.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          isSelected
                            ? 'bg-[#0094EB]/5 border-l-2 border-l-[#0094EB]'
                            : 'hover:bg-slate-50 border-l-2 border-l-transparent',
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-200 overflow-hidden">
                          {video.thumbnail_url || video.poster_url ? (
                            <img
                              src={video.thumbnail_url || video.poster_url || ''}
                              alt={video.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon size={18} className="text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">
                            {video.title}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 uppercase">
                            {video.source_type === 'upload' ? 'Upload' : video.source_type}
                          </p>
                        </div>

                        {/* Checkbox visual */}
                        <div
                          className={cn(
                            'h-6 w-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-[#0094EB] border-[#0094EB]'
                              : 'border-slate-200',
                          )}
                        >
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedVideoIds.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Os vídeos serão exibidos na ordem de seleção. Arraste para reordenar na edição.
                </p>
              )}
            </>
          )}
        </div>

        {/* ──────── Botão Salvar ──────── */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/stories')}
            className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : isEditing ? 'Atualizar Story' : 'Salvar Story'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryNewPage;
