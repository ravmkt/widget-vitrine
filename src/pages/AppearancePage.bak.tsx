'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings2, PlaySquare, Rows3, LayoutGrid, X, Save, Trash2, 
  Smartphone, Monitor, RotateCcw, Loader2, ChevronDown, Check, Info, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

// ==========================================
// CONFIGURAÇÕES PADRÃO (RESETS INDIVIDUAIS)
// ==========================================
const createDefaultFloatingConfig = () => ({
  enabled: true,
  position: 'bottom-right',
  shape: 'circle',
  size: 68,
  margin_bottom: 24,
  margin_side: 24,
  border_color: '#0094EB',
  border_width: 3,
  pulse_effect: true,
  pulse_color: 'rgba(0, 148, 235, 0.4)',
  label_enabled: true,
  label_text: 'Stories',
  label_bg_color: '#FFFFFF',
  label_text_color: '#1E293B'
});

const createDefaultCarouselConfig = () => ({
  enabled: true,
  title: 'Confira nossos Stories',
  title_color: '#0F172A',
  title_size_desktop: 18,
  title_size_mobile: 15,
  avatar_shape: 'circle',
  avatar_size: 72,
  gap: 16,
  border_color: '#0094EB',
  border_width: 3,
  spacing_bottom: 20
});

const createDefaultDynamicCarouselConfig = () => ({
  enabled: false,
  title: 'Mais recomendados',
  title_color: '#0F172A',
  title_size_desktop: 18,
  title_size_mobile: 15,
  avatar_shape: 'circle',
  avatar_size: 72,
  gap: 16,
  border_color: '#FF007F',
  border_width: 3,
  spacing_bottom: 20
});

const createDefaultGridConfig = () => ({
  enabled: false,
  title: 'Veja em Destaque',
  title_color: '#0F172A',
  columns_desktop: 4,
  columns_mobile: 2,
  gap: 12,
  border_color: '#10B981',
  border_width: 2,
  spacing_bottom: 24
});

const createDefaultModalConfig = () => ({
  overlay_color: 'rgba(0, 0, 0, 0.85)',
  bar_color: '#0094EB',
  bar_height: 4,
  close_button_color: '#FFFFFF',
  text_color: '#FFFFFF',
  font_family: 'sans-serif'
});

const createDefaultAppearance = (storeId: string) => ({
  id: '',
  store_id: storeId,
  name: 'Configuração Padrão',
  is_active: true,
  floating_config: createDefaultFloatingConfig(),
  carousel_config: createDefaultCarouselConfig(),
  dynamic_carousel_config: createDefaultDynamicCarouselConfig(),
  grid_config: createDefaultGridConfig(),
  modal_config: createDefaultModalConfig()
});

// ==========================================
// SUB-COMPONENTES AUXILIARES DA INTERFACE
// ==========================================
interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, isOpen, onToggle, children }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200">
    <button 
      type="button"
      onClick={onToggle} 
      className="flex w-full items-center justify-between px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors"
    >
      {title}
      <ChevronDown className={cn('text-slate-400 transition-transform duration-200', isOpen ? 'rotate-180 text-[#0094EB]' : '')} size={16} />
    </button>
    {isOpen && <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/20">{children}</div>}
  </div>
);

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, description }) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 transition-all hover:border-blue-200 hover:bg-blue-50/10">
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onChange(e.target.checked)} 
      className="h-4 w-4 rounded border-slate-300 text-[#0094EB] focus:ring-[#0094EB] accent-[#0094EB]" 
    />
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-bold text-slate-800">{label}</span>
      {description && <span className="block text-[10px] font-medium text-slate-500 mt-0.5">{description}</span>}
    </span>
  </label>
);

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => {
  const safeColor = /^#?[0-9A-Fa-f]{6}$|^rgba?\(.+\)$/.test(value) ? value : '#000000';
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="flex items-center gap-2">
        <div 
          className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 shadow-inner overflow-hidden transition hover:scale-105" 
          style={{ backgroundColor: safeColor }}
        >
          <input 
            type="color" 
            aria-label={label} 
            value={safeColor.startsWith('#') ? safeColor : '#000000'} 
            onChange={(e) => onChange(e.target.value)} 
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0" 
          />
        </div>
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:ring-1 focus:ring-[#0094EB]" 
        />
      </div>
    </div>
  );
};

interface ModalTabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ModalTabButton: React.FC<ModalTabButtonProps> = ({ active, icon, label, onClick }) => (
  <button 
    type="button"
    onClick={onClick} 
    className={cn(
      'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all shrink-0', 
      active 
        ? 'bg-[#0094EB] text-white shadow-md shadow-blue-500/15' 
        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
    )}
  >
    {icon} {label}
  </button>
);

// ==========================================
// COMPONENTE PRINCIPAL (APPEARANCE PAGE)
// ==========================================
const AppearancePage: React.FC = () => {
  const { storeId, loading: tenantLoading } = useTenant();
  const [stylesList, setStylesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'floating' | 'carousel' | 'dynamic_carousel' | 'grid'>('basic');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile'); // Mobile-first como padrão!
  
  // Controle de Accordions abertos no painel de edição
  const [openSection, setOpenSection] = useState<string | null>('general');

  // Estado principal de edição
  const [style, setStyle] = useState<any>(createDefaultAppearance(''));

  // Estado de exclusão
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' });

  // Buscar URLs da loja (para os links ou contextos, mantido limpo)
  const [storeUrl, setStoreUrl] = useState<string>('');

  // Carregar dados de configurações salvas
  const loadStyles = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appearance_settings')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStylesList(data || []);

      // Buscar URL da Loja para preview se necessário
      const { data: storeData } = await supabase
        .from('stores')
        .select('domain, custom_domain')
        .eq('id', storeId)
        .single();

      if (storeData) {
        setStoreUrl(storeData.custom_domain || storeData.domain || '');
      }
    } catch (err: any) {
      showError('Erro ao carregar estilos de aparência: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!tenantLoading && storeId) {
      loadStyles();
    }
  }, [storeId, tenantLoading, loadStyles]);
