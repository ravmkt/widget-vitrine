'use client';

import React, { useEffect, useState } from 'react';
import {
  db,
  Appearance,
  generateUuid,
  resolveStoreId,
} from '@/lib/db';
import { useTenant } from '@/context/TenantContext';
import {
  Plus,
  Trash2,
  Edit3,
  Star,
  Brush,
  X,
  Save,
  Loader2,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { cn } from '@/lib/utils';

type DeviceType = 'desktop' | 'mobile';

type FloatingPosition =
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

type PositionValue =
  | 'fixed_bottom_right'
  | 'fixed_bottom_left'
  | 'fixed_top_right'
  | 'fixed_top_left';

type ExtendedAppearance = Appearance & {
  useGlobalAppearance: boolean;
  width: string;
  unit: 'px' | 'percent';
  height: string;

  /**
   * Posição visual do widget flutuante.
   * Este é o único local onde a posição do widget deve ser controlada.
   */
  position: PositionValue;
  floating_position: FloatingPosition;

  bottom_spacing: string;
  left_spacing: string;
  cta_text: string;
  cta_size: string;
  cta_duration: string;
  border_style: string;
  color: string;
  show_play_icon: boolean;
  hide_stories: boolean;
  auto_center: boolean;
  carousel_view_mode: string;
  margin_top: string;
  margin_bottom: string;
  draggable: boolean;
  allow_close: boolean;
  object_fit: string;
  z_index: string;
  desktop_columns: number;
  desktop_rows: number;
  desktop_gap: number;
  mobile_columns: number;
  mobile_rows: number;
  mobile_gap: number;
  font_size: string;
};

const isValidHexColor = (value?: string) => {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '');
};

const isValidPositionValue = (value?: string): value is PositionValue => {
  return (
    value === 'fixed_bottom_right' ||
    value === 'fixed_bottom_left' ||
    value === 'fixed_top_right' ||
    value === 'fixed_top_left'
  );
};

const isValidFloatingPosition = (
  value?: string,
): value is FloatingPosition => {
  return (
    value === 'left' ||
    value === 'right' ||
    value === 'top-left' ||
    value === 'top-right' ||
    value === 'bottom-left' ||
    value === 'bottom-right'
  );
};

const positionToFloatingPosition = (
  position?: string,
): FloatingPosition => {
  switch (position) {
    case 'fixed_bottom_left':
      return 'left';

    case 'fixed_top_left':
      return 'top-left';

    case 'fixed_top_right':
      return 'top-right';

    case 'fixed_bottom_right':
    default:
      return 'right';
  }
};

const floatingPositionToPosition = (
  floatingPosition?: string,
): PositionValue => {
  switch (floatingPosition) {
    case 'left':
    case 'bottom-left':
      return 'fixed_bottom_left';

    case 'top-left':
      return 'fixed_top_left';

    case 'top-right':
      return 'fixed_top_right';

    case 'right':
    case 'bottom-right':
    default:
      return 'fixed_bottom_right';
  }
};

const normalizePosition = (
  position?: string,
  floatingPosition?: string,
): PositionValue => {
  if (isValidPositionValue(position)) {
    return position;
  }

  return floatingPositionToPosition(floatingPosition);
};

const normalizeFloatingPosition = (
  floatingPosition?: string,
  position?: string,
): FloatingPosition => {
  if (isValidFloatingPosition(floatingPosition)) {
    return floatingPosition;
  }

  return positionToFloatingPosition(position);
};

const createDefaultFormData = (storeId?: string): ExtendedAppearance => {
  const now = new Date().toISOString();

  return {
    id: '',
    store_id: storeId || '',
    name: '',
    is_default: false,

    primary_color: '#0094EB',
    secondary_color: '#0094EB',
    text_color: '#0F172A',
    background_color: '#FFFFFF',
    button_color: '#0094EB',

    border_radius: '12px',
    shadow_enabled: true,
    font_family: 'Inter, sans-serif',
    widget_shape: 'portrait',
    widget_size: 'medium',
    widget_animation: 'none',

    carousel_card_shape: 'rounded',
    carousel_visible_items: 4,
    carousel_gap: 16,

    show_title: true,
    show_play_button: true,
    show_product: true,
    show_like_button: true,
    show_comment_button: true,
    show_share_button: true,
    show_whatsapp_button: true,
    show_product_button: true,

    created_at: now,
    updated_at: now,

    useGlobalAppearance: false,
    width: '',
    unit: 'px',
    height: '',

    /**
     * Posição do widget flutuante agora fica centralizada na Aparência.
     */
    position: 'fixed_bottom_right',
    floating_position: 'right',

    bottom_spacing: '',
    left_spacing: '',
    cta_text: '',
    cta_size: '',
    cta_duration: '',
    border_style: '',
    color: '#0094EB',
    show_play_icon: true,
    hide_stories: false,
    auto_center: false,
    carousel_view_mode: 'preview',
    margin_top: '',
    margin_bottom: '',
    draggable: false,
    allow_close: false,
    object_fit: 'cover',
    z_index: '',
    desktop_columns: 1,
    desktop_rows: 1,
    desktop_gap: 16,
    mobile_columns: 1,
    mobile_rows: 1,
    mobile_gap: 12,
    font_size: '14px',
  } as ExtendedAppearance;
};

const normalizeAppearance = (
  style: Appearance,
  storeId?: string,
): ExtendedAppearance => {
  const defaults = createDefaultFormData(storeId);
  const item = style as Appearance & Partial<ExtendedAppearance>;

  const normalizedPosition = normalizePosition(
    item.position,
    item.floating_position,
  );

  const normalizedFloatingPosition = normalizeFloatingPosition(
    item.floating_position,
    normalizedPosition,
  );

  return {
    ...defaults,
    ...item,

    id: item.id || '',
    store_id: item.store_id || storeId || '',
    name: item.name || '',
    is_default: Boolean(item.is_default),

    primary_color: item.primary_color || defaults.primary_color,
    secondary_color: item.secondary_color || defaults.secondary_color,
    text_color: item.text_color || defaults.text_color,
    background_color: item.background_color || defaults.background_color,
    button_color: item.button_color || defaults.button_color,

    border_radius: item.border_radius || defaults.border_radius,
    shadow_enabled: item.shadow_enabled ?? defaults.shadow_enabled,
    font_family: item.font_family || defaults.font_family,
    widget_shape: item.widget_shape || defaults.widget_shape,
    widget_size: item.widget_size || defaults.widget_size,
    widget_animation: item.widget_animation || defaults.widget_animation,

    carousel_card_shape:
      item.carousel_card_shape || defaults.carousel_card_shape,
    carousel_visible_items:
      item.carousel_visible_items || defaults.carousel_visible_items,
    carousel_gap: item.carousel_gap ?? defaults.carousel_gap,

    show_title: item.show_title ?? defaults.show_title,
    show_play_button: item.show_play_button ?? defaults.show_play_button,
    show_product: item.show_product ?? defaults.show_product,
    show_like_button: item.show_like_button ?? defaults.show_like_button,
    show_comment_button:
      item.show_comment_button ?? defaults.show_comment_button,
    show_share_button: item.show_share_button ?? defaults.show_share_button,
    show_whatsapp_button:
      item.show_whatsapp_button ?? defaults.show_whatsapp_button,
    show_product_button:
      item.show_product_button ?? defaults.show_product_button,

    created_at: item.created_at || defaults.created_at,
    updated_at: item.updated_at || defaults.updated_at,

    useGlobalAppearance:
      item.useGlobalAppearance ?? defaults.useGlobalAppearance,
    width: item.width ?? defaults.width,
    unit: item.unit ?? defaults.unit,
    height: item.height ?? defaults.height,

    position: normalizedPosition,
    floating_position: normalizedFloatingPosition,

    bottom_spacing: item.bottom_spacing ?? defaults.bottom_spacing,
    left_spacing: item.left_spacing ?? defaults.left_spacing,
    cta_text: item.cta_text ?? defaults.cta_text,
    cta_size: item.cta_size ?? defaults.cta_size,
    cta_duration: item.cta_duration ?? defaults.cta_duration,
    border_style: item.border_style ?? defaults.border_style,
    color: item.color || item.primary_color || defaults.color,
    show_play_icon: item.show_play_icon ?? item.show_play_button ?? true,
    hide_stories: item.hide_stories ?? defaults.hide_stories,
    auto_center: item.auto_center ?? defaults.auto_center,
    carousel_view_mode:
      item.carousel_view_mode ?? defaults.carousel_view_mode,
    margin_top: item.margin_top ?? defaults.margin_top,
    margin_bottom: item.margin_bottom ?? defaults.margin_bottom,
    draggable: item.draggable ?? defaults.draggable,
    allow_close: item.allow_close ?? defaults.allow_close,
    object_fit: item.object_fit ?? defaults.object_fit,
    z_index: item.z_index ?? defaults.z_index,
    desktop_columns: item.desktop_columns ?? defaults.desktop_columns,
    desktop_rows: item.desktop_rows ?? defaults.desktop_rows,
    desktop_gap: item.desktop_gap ?? defaults.desktop_gap,
    mobile_columns: item.mobile_columns ?? defaults.mobile_columns,
    mobile_rows: item.mobile_rows ?? defaults.mobile_rows,
    mobile_gap: item.mobile_gap ?? defaults.mobile_gap,
    font_size: item.font_size ?? defaults.font_size,
  } as ExtendedAppearance;
};

const getAppearancesSafe = async (storeId: string): Promise<Appearance[]> => {
  try {
    return await db.appearances.getAll(storeId);
  } catch {
    try {
      return await db.appearances.getAll();
    } catch {
      return [];
    }
  }
};

const deleteAppearanceSafe = async (id: string, storeId?: string) => {
  try {
    if (storeId) {
      await (db.appearances as any).delete(id, storeId);
      return;
    }

    await db.appearances.delete(id);
  } catch {
    await db.appearances.delete(id);
  }
};

const ToggleSwitch = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}) => {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-5 w-5 rounded-lg bg-gray-50 text-gray-600 accent-[#0094EB] focus:ring-2 focus:ring-[#0094EB]"
      />

      <span>
        <span className="block text-sm font-medium text-slate-300">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
};

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const safeColor = isValidHexColor(value) ? value : '#000000';

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-100"
        style={{
          backgroundColor: safeColor,
        }}
      >
        <input
          type="color"
          aria-label={label}
          value={safeColor}
          onChange={onChange}
          className="h-8 w-8 cursor-pointer appearance-none rounded-full text-transparent"
        />
      </div>

      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
      />
    </div>
  );
};

const DeviceTabs = ({
  activeDevice,
  onChange,
}: {
  activeDevice: DeviceType;
  onChange: (device: DeviceType) => void;
}) => {
  return (
    <div className="flex w-fit rounded-lg bg-slate-900 p-1">
      <button
        type="button"
        onClick={() => onChange('desktop')}
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-bold transition-all',
          activeDevice === 'desktop'
            ? 'bg-[#0094EB] text-white shadow-lg'
            : 'text-slate-400 hover:text-white',
        )}
      >
        Desktop
      </button>

      <button
        type="button"
        onClick={() => onChange('mobile')}
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-bold transition-all',
          activeDevice === 'mobile'
            ? 'bg-[#0094EB] text-white shadow-lg'
            : 'text-slate-400 hover:text-white',
        )}
      >
        Mobile
      </button>
    </div>
  );
};

const SectionCard = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'space-y-6 rounded-[1.5rem] bg-slate-950 p-6',
        className,
      )}
    >
      <h3 className="text-lg font-black text-white">{title}</h3>
      {children}
    </div>
  );
};

const FormField = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>

      {children}
    </div>
  );
};

const AppearancePage = () => {
  const { storeId, loading: tenantLoading } = useTenant();

  const [resolvedStoreId, setResolvedStoreId] = useState('');
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<Appearance | null>(null);

  const [formData, setFormData] = useState<ExtendedAppearance>(() =>
    createDefaultFormData(storeId),
  );

  const [floatingDevice, setFloatingDevice] =
    useState<DeviceType>('desktop');
  const [carouselDevice, setCarouselDevice] =
    useState<DeviceType>('desktop');
  const [gridDevice, setGridDevice] = useState<DeviceType>('desktop');

  const loadData = async () => {
    try {
      setLoading(true);

      if (tenantLoading) return;

      const finalStoreId = await resolveStoreId(storeId);
      setResolvedStoreId(finalStoreId);

      if (!finalStoreId) {
        setAppearances([]);
        return;
      }

      const list = await getAppearancesSafe(finalStoreId);
      setAppearances(list || []);
    } catch (error) {
      console.error('Erro ao carregar estilos:', error);
      showError('Erro ao carregar estilos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantLoading) {
      loadData();
    }
  }, [storeId, tenantLoading]);

  const handleSetDefault = async (id: string) => {
    try {
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

      if (!finalStoreId) {
        showError('Não foi possível identificar a loja atual.');
        return;
      }

      const now = new Date().toISOString();

      await Promise.all(
        appearances.map(style =>
          db.appearances.save({
            ...style,
            store_id: finalStoreId,
            is_default: style.id === id,
            updated_at: now,
          } as Appearance),
        ),
      );

      showSuccess('Estilo padrão atualizado!');
      await loadData();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      showError('Erro ao definir padrão.');
    }
  };

  const handleDeleteClick = (app: Appearance) => {
    setDeleteModal({
      isOpen: true,
      id: app.id,
      name: app.name,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

      await deleteAppearanceSafe(deleteModal.id, finalStoreId);

      showSuccess('Estilo excluído com sucesso.');

      setDeleteModal(prev => ({
        ...prev,
        isOpen: false,
      }));

      await loadData();
    } catch (error) {
      console.error('Erro ao excluir estilo:', error);
      showError('Erro ao excluir estilo.');
    }
  };

  const handleNewStyle = async () => {
    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

    setEditingStyle(null);
    setFormData(createDefaultFormData(finalStoreId));
    setFloatingDevice('desktop');
    setCarouselDevice('desktop');
    setGridDevice('desktop');
    setShowModal(true);
  };

  const handleEditStyle = (style: Appearance) => {
    setEditingStyle(style);
    setFormData(normalizeAppearance(style, resolvedStoreId || storeId));
    setFloatingDevice('desktop');
    setCarouselDevice('desktop');
    setGridDevice('desktop');
    setShowModal(true);
  };

  const handlePositionChange = (position: PositionValue) => {
    setFormData(prev => ({
      ...prev,
      position,
      floating_position: positionToFloatingPosition(position),
    }));
  };

  const handleSaveStyle = async () => {
    if (saving) return;

    const finalStoreId = resolvedStoreId || (await resolveStoreId(storeId));

    if (!finalStoreId) {
      showError('Não foi possível identificar a loja atual.');
      return;
    }

    if (!formData.name.trim()) {
      showError('Nome do estilo é obrigatório.');
      return;
    }

    try {
      setSaving(true);

      const now = new Date().toISOString();

      const id = editingStyle?.id || formData.id || generateUuid();

      const normalizedPosition = normalizePosition(
        formData.position,
        formData.floating_position,
      );

      const normalizedFloatingPosition =
        positionToFloatingPosition(normalizedPosition);

      const stylePayload = {
        ...formData,
        id,
        store_id: finalStoreId,
        name: formData.name.trim(),

        /**
         * A posição do widget flutuante é salva somente aqui,
         * na Aparência.
         */
        position: normalizedPosition,
        floating_position: normalizedFloatingPosition,

        color: formData.color || formData.primary_color,
        show_play_button: formData.show_play_icon,
        updated_at: now,
        created_at: formData.created_at || editingStyle?.created_at || now,
      } as Appearance & {
        position: PositionValue;
        floating_position: FloatingPosition;
      };

      if (stylePayload.is_default) {
        await Promise.all(
          appearances
            .filter(style => style.id !== id)
            .map(style =>
              db.appearances.save({
                ...style,
                store_id: finalStoreId,
                is_default: false,
                updated_at: now,
              } as Appearance),
            ),
        );
      }

      await db.appearances.save(stylePayload as Appearance);

      window.dispatchEvent(new Event('storage'));

      showSuccess(
        editingStyle
          ? 'Estilo atualizado com sucesso!'
          : 'Estilo criado com sucesso!',
      );

      setShowModal(false);
      setEditingStyle(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar estilo:', error);
      showError('Erro ao salvar estilo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;

    setShowModal(false);
    setEditingStyle(null);
  };

  const gridColumns =
    gridDevice === 'desktop'
      ? formData.desktop_columns
      : formData.mobile_columns;

  const gridRows =
    gridDevice === 'desktop' ? formData.desktop_rows : formData.mobile_rows;

  const gridGap =
    gridDevice === 'desktop' ? formData.desktop_gap : formData.mobile_gap;

  const updateGridColumns = (value: number) => {
    if (gridDevice === 'desktop') {
      setFormData(prev => ({
        ...prev,
        desktop_columns: value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        mobile_columns: value,
      }));
    }
  };

  const updateGridRows = (value: number) => {
    if (gridDevice === 'desktop') {
      setFormData(prev => ({
        ...prev,
        desktop_rows: value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        mobile_rows: value,
      }));
    }
  };

  const updateGridGap = (value: number) => {
    if (gridDevice === 'desktop') {
      setFormData(prev => ({
        ...prev,
        desktop_gap: value,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        mobile_gap: value,
      }));
    }
  };

  if (loading || tenantLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Aparência
          </h1>

          <p className="mt-1 font-medium text-slate-500">
            Customize o design dos widgets e carrosséis de vídeo da sua loja.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNewStyle}
          className="flex items-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0E4787]"
        >
          <Plus size={18} />
          Novo Estilo
        </button>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <Brush className="h-5 w-5 text-[#0094EB]" />

          <h3 className="font-extrabold text-slate-800">
            Estilos Cadastrados
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Template
                </th>

                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Cor Principal
                </th>

                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Status
                </th>

                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {appearances.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Nenhum estilo cadastrado ainda.
                  </td>
                </tr>
              ) : (
                appearances.map(app => (
                  <tr
                    key={app.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg border border-slate-200 shadow-sm"
                          style={{
                            backgroundColor: app.primary_color,
                          }}
                        />

                        <span className="text-sm font-bold text-slate-800">
                          {app.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">
                      {app.primary_color}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {app.is_default ? (
                        <span className="mx-auto flex w-fit items-center justify-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0094EB]">
                          <Star size={12} className="fill-[#0094EB]" />
                          Padrão
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(app.id)}
                          className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-[#0094EB]"
                        >
                          Definir Padrão
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditStyle(app)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#0094EB]"
                          aria-label="Editar estilo"
                        >
                          <Edit3 size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClick(app)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Excluir estilo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingStyle ? 'Editar Estilo' : 'Criar Novo Estilo'}
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  Configure a aparência dos widgets, carrosséis, grades e
                  player.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <SectionCard title="1. Dados Básicos">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField label="Nome do Estilo">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ex: Estilo padrão"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                    />
                  </FormField>

                  <FormField label="Definir como padrão">
                    <ToggleSwitch
                      label="Definir como padrão da loja"
                      checked={formData.is_default}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          is_default: e.target.checked,
                        })
                      }
                    />
                  </FormField>
                </div>

                <FormField label="Usar aparência em todos os dispositivos">
                  <ToggleSwitch
                    label="Usar aparência em todos os dispositivos"
                    checked={formData.useGlobalAppearance}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        useGlobalAppearance: e.target.checked,
                      })
                    }
                    description="Quando ativado, a mesma aparência será aplicada no mobile e no desktop."
                  />
                </FormField>
              </SectionCard>

              <SectionCard title="2. Configurações">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white">
                      Flutuante
                    </h4>

                    <DeviceTabs
                      activeDevice={floatingDevice}
                      onChange={setFloatingDevice}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Forma">
                        <select
                          value={formData.widget_shape}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              widget_shape: e.target.value as any,
                            })
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="circle">Circular</option>
                          <option value="square">Quadrado</option>
                          <option value="portrait">Retrato</option>
                        </select>
                      </FormField>

                      <FormField label="Tamanho/Largura">
                        <input
                          type="text"
                          value={formData.width}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              width: e.target.value,
                            })
                          }
                          placeholder="Ex: 80px"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Altura">
                        <input
                          type="text"
                          value={formData.height}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              height: e.target.value,
                            })
                          }
                          placeholder="Ex: 110px"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Raio da borda">
                        <input
                          type="text"
                          value={formData.border_radius}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              border_radius: e.target.value,
                            })
                          }
                          placeholder="Ex: 12px"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Posição do widget flutuante">
                        <select
                          value={formData.position}
                          onChange={e =>
                            handlePositionChange(
                              e.target.value as PositionValue,
                            )
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="fixed_bottom_right">
                            Inferior direita
                          </option>
                          <option value="fixed_bottom_left">
                            Inferior esquerda
                          </option>
                          <option value="fixed_top_right">
                            Superior direita
                          </option>
                          <option value="fixed_top_left">
                            Superior esquerda
                          </option>
                        </select>
                      </FormField>

                      <FormField label="Distância inferior/superior">
                        <input
                          type="text"
                          value={formData.bottom_spacing}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              bottom_spacing: e.target.value,
                            })
                          }
                          placeholder="Ex: 20px"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Distância lateral">
                        <input
                          type="text"
                          value={formData.left_spacing}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              left_spacing: e.target.value,
                            })
                          }
                          placeholder="Ex: 20px"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Cor da borda">
                        <ColorInput
                          label="Cor da borda"
                          value={formData.color}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              color: e.target.value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="Largura/estilo da borda">
                        <input
                          type="text"
                          value={formData.border_style}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              border_style: e.target.value,
                            })
                          }
                          placeholder="Ex: 2px solid"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Z-index">
                        <input
                          type="text"
                          value={formData.z_index}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              z_index: e.target.value,
                            })
                          }
                          placeholder="Ex: 2147483647"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white">
                      Carrossel
                    </h4>

                    <DeviceTabs
                      activeDevice={carouselDevice}
                      onChange={setCarouselDevice}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Espaçamento">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.carousel_gap}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              carousel_gap: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Forma">
                        <select
                          value={formData.carousel_card_shape}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              carousel_card_shape: e.target.value as any,
                            })
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="rounded">Arredondado</option>
                          <option value="square">Quadrado</option>
                          <option value="circle">Circular</option>
                          <option value="custom">Personalizado</option>
                        </select>
                      </FormField>

                      <FormField label="Modo de visualização do carrossel">
                        <select
                          value={formData.carousel_view_mode}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              carousel_view_mode: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        >
                          <option value="preview">
                            Preview, vídeo no hover
                          </option>
                          <option value="poster">Poster/imagem apenas</option>
                          <option value="custom">Personalizado</option>
                        </select>
                      </FormField>

                      <FormField label="Margem superior">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.margin_top}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              margin_top: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Margem inferior">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.margin_bottom}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              margin_bottom: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Exibir produto no carrossel">
                        <ToggleSwitch
                          label="Exibir produto no carrossel"
                          checked={formData.show_product}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              show_product: e.target.checked,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="Mostrar botão play">
                        <ToggleSwitch
                          label="Mostrar botão play"
                          checked={formData.show_play_icon}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              show_play_icon: e.target.checked,
                            })
                          }
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white">Grade</h4>

                    <DeviceTabs
                      activeDevice={gridDevice}
                      onChange={setGridDevice}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Colunas">
                        <input
                          type="number"
                          min="1"
                          value={gridColumns}
                          onChange={e =>
                            updateGridColumns(Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Linhas">
                        <input
                          type="number"
                          min="1"
                          value={gridRows}
                          onChange={e =>
                            updateGridRows(Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>

                      <FormField label="Espaçamento">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={gridGap}
                          onChange={e => updateGridGap(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="3. Cores e Tipografia">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField label="Cor principal">
                    <ColorInput
                      label="Cor principal"
                      value={formData.primary_color}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          primary_color: e.target.value,
                          secondary_color: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Cor secundária">
                    <ColorInput
                      label="Cor secundária"
                      value={formData.secondary_color}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          secondary_color: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Cor do texto">
                    <ColorInput
                      label="Cor do texto"
                      value={formData.text_color}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          text_color: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Cor do fundo">
                    <ColorInput
                      label="Cor do fundo"
                      value={formData.background_color}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          background_color: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Cor do botão">
                    <ColorInput
                      label="Cor do botão"
                      value={formData.button_color}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          button_color: e.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Fonte de texto">
                    <select
                      value={formData.font_family}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          font_family: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#0094EB]"
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                      <option value="Lato, sans-serif">Lato</option>
                      <option value="Montserrat, sans-serif">Montserrat</option>
                      <option value="Poppins, sans-serif">Poppins</option>
                    </select>
                  </FormField>

                  <FormField label="Tamanho do texto">
                    <input
                      type="text"
                      value={formData.font_size}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          font_size: e.target.value,
                        })
                      }
                      placeholder="Ex: 14px"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#0094EB]"
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard title="4. Player Interativo e Modal">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField label="Mostrar título">
                    <ToggleSwitch
                      label="Mostrar título"
                      checked={formData.show_title}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_title: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Mostrar botão curtir">
                    <ToggleSwitch
                      label="Mostrar botão curtir"
                      checked={formData.show_like_button}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_like_button: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Mostrar botão WhatsApp">
                    <ToggleSwitch
                      label="Mostrar botão WhatsApp"
                      checked={formData.show_whatsapp_button}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_whatsapp_button: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Mostrar produto">
                    <ToggleSwitch
                      label="Mostrar produto"
                      checked={formData.show_product}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_product: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Mostrar botão produto">
                    <ToggleSwitch
                      label="Mostrar botão produto"
                      checked={formData.show_product_button}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_product_button: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Mostrar botão compartilhar">
                    <ToggleSwitch
                      label="Mostrar botão compartilhar"
                      checked={formData.show_share_button}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_share_button: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Mostrar botão comentários">
                    <ToggleSwitch
                      label="Mostrar botão comentários"
                      checked={formData.show_comment_button}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          show_comment_button: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Ocultar stories">
                    <ToggleSwitch
                      label="Ocultar stories"
                      checked={formData.hide_stories}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          hide_stories: e.target.checked,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Sombra">
                    <ToggleSwitch
                      label="Ativar sombra"
                      checked={formData.shadow_enabled}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          shadow_enabled: e.target.checked,
                        })
                      }
                    />
                  </FormField>
                </div>
              </SectionCard>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveStyle}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#0094EB] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#0E4787] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Estilo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="Excluir Aparência"
        itemName={deleteModal.name}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal(prev => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
    </div>
  );
};

export default AppearancePage;
