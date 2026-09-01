"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db, type GeneralSettings } from '@/lib/db';
import { PLATFORM_OPTIONS } from '@/lib/platforms';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ShoppingBag, Sparkles, Cpu, Home, Activity, Trophy, 
  Baby, PawPrint, Coffee, Gem, Palette, Globe,
  Loader2, Save, Sun, Moon, Copy, RefreshCw, CheckCircle2, Image, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';

const LOGO_BUCKET = "store-assets";

interface AppSettings {
  id: string;
  store_id: string;
  store_name: string | null;
  store_url: string | null;
  store_logo_url: string | null;
  platform: string | null;
  contact_email: string | null;
  widget_enabled: boolean;
  stories_enabled: boolean;
  carousel_enabled: boolean;
  floating_widget_enabled: boolean;
  default_template: string;
  language: string;
  timezone: string;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  whatsapp_message_template: string;
  open_product_new_tab: boolean;
  pause_on_leave: boolean;
  autoplay: boolean;
  muted_by_default: boolean;
  show_video_controls: boolean;
  store_public_id: string | null;
  public_live_key: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: '',
  store_id: '',
  store_name: '',
  store_url: '',
  store_logo_url: '',
  platform: null,
  contact_email: '',
  widget_enabled: true,
  stories_enabled: true,
  carousel_enabled: true,
  floating_widget_enabled: true,
  default_template: 'minimalista',
  language: 'pt-BR',
  timezone: 'America/Paulo',
  whatsapp_number: '',
  whatsapp_enabled: true,
  whatsapp_message_template:
    'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
  open_product_new_tab: true,
  pause_on_leave: true,
  autoplay: true,
  muted_by_default: true,
  show_video_controls: false,
  store_public_id: '',
  public_live_key: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const generalSettingsToAppSettings = (gs: GeneralSettings): AppSettings => ({
  id: gs.id || '',
  store_id: gs.store_id || '',
  store_name: gs.store_name ?? null,
  store_url: gs.store_url ?? null,
  store_logo_url: gs.logo_url ?? null,
  platform: gs.platform ?? null,
  contact_email: gs.contact_email ?? null,
  widget_enabled: gs.widget_enabled ?? true,
  stories_enabled: gs.stories_enabled ?? true,
  carousel_enabled: gs.carousel_enabled ?? true,
  floating_widget_enabled: gs.floating_widget_enabled ?? true,
  default_template: gs.default_template ?? 'minimalista',
  language: gs.language ?? 'pt-BR',
  timezone: gs.timezone ?? 'America/Sao_Paulo',
  whatsapp_number: gs.whatsapp_number ?? null,
  whatsapp_enabled: gs.whatsapp_enabled ?? true,
  whatsapp_message_template:
    gs.whatsapp_message_template ??
    DEFAULT_SETTINGS.whatsapp_message_template,
  open_product_new_tab: gs.open_product_new_tab ?? true,
  pause_on_leave: gs.pause_on_leave ?? true,
  autoplay: gs.autoplay ?? true,
  muted_by_default: gs.muted_by_default ?? true,
  show_video_controls: gs.show_video_controls ?? false,
  store_public_id: gs.store_public_id ?? null,
  public_live_key: gs.public_live_key ?? null,
  created_at: gs.created_at ?? DEFAULT_SETTINGS.created_at,
  updated_at: gs.updated_at ?? DEFAULT_SETTINGS.updated_at,
});

const appSettingsToGeneralSettings = (
  app: AppSettings,
): Partial<GeneralSettings> => ({
  id: app.id,
  store_id: app.store_id,
  store_name: app.store_name || '',
  store_url: app.store_url || '',
  logo_url: app.store_logo_url,
  platform: app.platform || '',
  contact_email: app.contact_email || '',
  widget_enabled: app.widget_enabled,
  stories_enabled: app.stories_enabled,
  carousel_enabled: app.carousel_enabled,
  floating_widget_enabled: app.floating_widget_enabled,
  default_template: app.default_template,
  language: app.language,
  timezone: app.timezone,
  whatsapp_number: app.whatsapp_number || '',
  whatsapp_enabled: app.whatsapp_enabled,
  whatsapp_message_template: app.whatsapp_message_template,
  open_product_new_tab: app.open_product_new_tab,
  pause_on_leave: app.pause_on_leave,
  autoplay: app.autoplay,
  muted_by_default: app.muted_by_default,
  show_video_controls: app.show_video_controls,
  store_public_id: app.store_public_id || '',
  public_live_key: app.public_live_key || '',
});

// Helper para converter a string de ícone vinda do banco em Componente SVG
const renderSectorIcon = (iconName: string) => {
  const props = { className: "w-4 h-4 mr-2 text-slate-500 dark:text-slate-400 inline-block shrink-0" };
  switch (iconName) {
    case 'ShoppingBag': return <ShoppingBag {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Cpu': return <Cpu {...props} />;
    case 'Home': return <Home {...props} />;
    case 'Activity': return <Activity {...props} />;
    case 'Trophy': return <Trophy {...props} />;
    case 'Baby': return <Baby {...props} />;
    case 'PawPrint': return <PawPrint {...props} />;
    case 'Coffee': return <Coffee {...props} />;
    case 'Gem': return <Gem {...props} />;
    case 'Palette': return <Palette {...props} />;
    default: return <Globe {...props} />;
  }
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { storeId: tenantStoreId, currentStore, loading: tenantLoading } = useTenant();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [loadingSectors, setLoadingSectors] = useState(true);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app-theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (tenantLoading) return;

      try {
        setLoading(true);
        const activeStoreId = tenantStoreId;

        if (activeStoreId && supabase) {
          const { data: settingsRow } = await supabase
            .from('store_settings')
            .select('*')
            .eq('store_id', activeStoreId)
            .maybeSingle();

          if (settingsRow) {
            const loaded = generalSettingsToAppSettings(settingsRow as GeneralSettings);
            setSettings(loaded);
            setLogoPreview(loaded.store_logo_url || "");
          } else if (currentStore) {
            setSettings({
              ...DEFAULT_SETTINGS,
              store_id: currentStore.id,
              store_name: currentStore.name || '',
              store_url: currentStore.url || '',
              store_logo_url: currentStore.logo_url || null,
              contact_email: currentStore.contact_email || null,
            });
            setLogoPreview(currentStore.logo_url || "");
          } else {
            setSettings({
              ...DEFAULT_SETTINGS,
              store_id: activeStoreId,
            });
          }
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [tenantStoreId, currentStore, tenantLoading]);

  useEffect(() => {
    const fetchSectors = async () => {
      if (!supabase) {
        setLoadingSectors(false);
        return;
      }
      try {
        const { data: sectorList } = await supabase
          .from('sectors')
          .select('id, name, slug, icon')
          .order('name', { ascending: true });

        if (sectorList) setSectors(sectorList);

        const storeId = settings?.store_id || tenantStoreId;
        if (storeId) {
          const { data: store } = await supabase
            .from('stores')
            .select('sector_id')
            .eq('id', storeId)
            .maybeSingle();
          if (store?.sector_id) setSelectedSectorId(store.sector_id);
        }
      } catch (e) {
        console.error('Erro ao carregar setores:', e);
      } finally {
        setLoadingSectors(false);
      }
    };
    fetchSectors();
  }, [settings?.store_id, tenantStoreId]);

  const formatStoreUrl = (url: string | null): string => {
    if (!url) return "";
    let trimmed = url.trim().toLowerCase();
    if (trimmed === "") return "";
    if (!/^https?:\/\//.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    if (trimmed.endsWith("/")) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    setSelectedLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreview("");
    setSettings(prev => ({ ...prev, store_logo_url: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resolvedStoreId = tenantStoreId || settings.store_id;

      if (!resolvedStoreId || resolvedStoreId.trim() === '') {
        toast.error('Não foi possível identificar o ID da loja ativa. Por favor, recarregue a página.');
        setSaving(false);
        return;
      }

      let finalLogoUrl = settings.store_logo_url || "";

      if (selectedLogoFile) {
        if (!supabase) {
          toast.error('Upload de logo requer conexão com Supabase.');
          setSaving(false);
          return;
        }

        const fileExt = selectedLogoFile.name.split(".").pop();
        const fileName = `logos/logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(LOGO_BUCKET)
          .upload(fileName, selectedLogoFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: selectedLogoFile.type,
          });

        if (uploadError) {
          console.error("Erro completo no upload do logo:", uploadError);
          if (
            uploadError.message?.includes('Bucket not found') ||
            uploadError.message?.includes('bucket')
          ) {
            toast.error(
              `Bucket '${LOGO_BUCKET}' não encontrado. Crie este bucket público no Supabase Storage.`,
            );
          } else {
            toast.error(`Erro ao enviar o logotipo: ${uploadError.message}`);
          }
          setSaving(false);
          return;
        }

        const { data } = supabase.storage
          .from(LOGO_BUCKET)
          .getPublicUrl(fileName);
        finalLogoUrl = data.publicUrl;
      }

      const finalStoreUrl = formatStoreUrl(settings.store_url);
      const now = new Date().toISOString();
      const updatedSettings: AppSettings = {
        ...settings,
        store_id: resolvedStoreId,
        store_url: finalStoreUrl,
        store_logo_url: finalLogoUrl,
        updated_at: now,
      };

      const payload = appSettingsToGeneralSettings(updatedSettings);
      await db.generalSettings.save(payload as GeneralSettings);

      if (supabase && resolvedStoreId) {
        const sectorValue =
          selectedSectorId === 'none' ? null : selectedSectorId || null;

        // Procura o setor selecionado na lista para extrair a slug textual limpa
        const selectedSectorObj = sectors.find(s => s.id === selectedSectorId);
        const sectorSlug = selectedSectorObj ? selectedSectorObj.slug : null;

        await supabase
          .from('stores')
          .update({
            name: updatedSettings.store_name || 'Loja',
            url: finalStoreUrl || null,
            logo_url: finalLogoUrl || null,
            contact_email: updatedSettings.contact_email || null,
            sector_id: sectorValue,
            sector: sectorSlug, // Sincronização direta e transparente
            updated_at: now,
          })
          .eq('id', resolvedStoreId);
      }

      setSettings(updatedSettings);
      setSelectedLogoFile(null);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('focus'));

      toast.success('Configurações salvas com sucesso!', {
        duration: 2000,
        onDismiss: () => navigate('/dashboard'),
      });
      setTimeout(() => navigate('/dashboard'), 2200);
    } catch (err) {
      console.error("Erro completo ao salvar configurações:", err);
      toast.error('Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading || tenantLoading)
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      <form
        noValidate 
        className="space-y-8"
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
      >
        {/* ── CABEÇALHO DA PÁGINA COM BOTÃO SALVAR INTEGRADO NO TOPO ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Configurações do Sistema
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-[#c0c5d4] mt-1">
              Configure dados da loja, módulos ativos, integrações e comportamento global dos vídeos.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin !text-white" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* ── SEÇÃO SUPERIOR: STATUS E TEMA LADO A LADO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD DE STATUS GERAL DO VIDLYTICS */}
          <div className={`rounded-[2.5rem] border-2 transition-all p-6 sm:p-8 shadow-xs flex flex-col justify-between ${settings.widget_enabled ? 'border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35]/80'}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                  Status de Exibição
                </span>
                <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-[#8a90a0]">
                    {settings.widget_enabled ? 'Online' : 'Offline'}
                  </span>
                  <Switch
                    checked={settings?.widget_enabled ?? true}
                    onCheckedChange={c =>
                      setSettings(prev => ({ ...prev, widget_enabled: c }))
                    }
                    className="data-[state=checked]:bg-[#0094EB] dark:data-[state=checked]:!bg-[#ff7a29]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black flex items-center gap-2">
                  {settings.widget_enabled ? (
                    <span className="text-emerald-500 flex items-center gap-2 text-md font-extrabold">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      Vidlytics Ativo
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 text-md font-extrabold">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                      Vidlytics Inativo
                    </span>
                  )}
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] leading-relaxed">
                  {settings.widget_enabled
                    ? 'A vitrine de stories está ativa e renderizando publicamente no seu e-commerce.'
                    : 'A exibição dos vídeos na sua loja está pausada. Nenhum widget será carregado.'}
                </p>
              </div>
            </div>
          </div>

          {/* CARD DO TEMA DA INTERFACE */}
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-white/5 pb-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Sun size={18} className="text-[#0094EB] dark:text-[#ff7a29]" /> Tema da Interface
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-[#8a90a0]">
                  Escolha entre o modo claro ou escuro para o painel administrativo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsDark(false)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-all text-left cursor-pointer ${!isDark ? 'border-[#0094EB] bg-blue-50/50 dark:bg-[#0f1220]' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1220]/40 hover:border-slate-300 dark:hover:border-white/20'}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${!isDark ? 'bg-[#0094EB] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                    <Sun size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className={`block text-xs font-black truncate ${!isDark ? 'text-[#0094EB] dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      Tema Claro
                    </span>
                  </div>
                  {!isDark && <CheckCircle2 size={16} className="ml-auto text-[#0094EB] shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDark(true)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-all text-left cursor-pointer ${isDark ? 'border-[#ff7a29] bg-orange-50/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1220]/40 hover:border-slate-300 dark:hover:border-white/20'}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${isDark ? 'bg-[#ff7a29] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                    <Moon size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className={`block text-xs font-black truncate ${isDark ? 'text-[#ff7a29]' : 'text-slate-700 dark:text-slate-300'}`}>
                      Tema Escuro
                    </span>
                  </div>
                  {isDark && <CheckCircle2 size={16} className="ml-auto text-[#ff7a29] shrink-0" />}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── 1. DADOS DA LOJA ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 dark:border-white/5 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
             1. Dados da Loja
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] mt-0.5">
              Informações cadastrais e identidade da sua marca no Vidlytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                Nome da Loja *
              </Label>
              <Input
                type="text"
                placeholder="Nome da sua loja"
                value={settings?.store_name ?? ''}
                onChange={e =>
                  setSettings(prev => ({ ...prev, store_name: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                URL da Loja *
              </Label>
              <Input
                type="text"
                placeholder="https://sualoja.com"
                value={settings?.store_url ?? ''}
                onChange={e =>
                  setSettings(prev => ({ ...prev, store_url: e.target.value }))
                }
                onBlur={e => {
                  const formatted = formatStoreUrl(e.target.value);
                  setSettings(prev => ({ ...prev, store_url: formatted }));
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                Plataforma de E-commerce
              </Label>
              <Select
                value={settings?.platform ?? ''}
                onValueChange={(value) =>
                  setSettings(prev => ({ ...prev, platform: value || null }))
                }
              >
                <SelectTrigger className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0">
                  <SelectValue placeholder="Selecione uma plataforma..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-xs font-bold text-slate-800 dark:text-white shadow-xl">
                  <SelectItem value="none">Selecione uma plataforma...</SelectItem>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 dark:text-[#8a90a0]">
                Isso nos ajuda a gerar o script de instalação correto para sua loja.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                Setor da Loja
              </Label>
              <Select
                value={selectedSectorId || 'none'}
                onValueChange={setSelectedSectorId}
                disabled={loadingSectors}
              >
                <SelectTrigger className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0">
                  <SelectValue placeholder="Selecione um setor..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1f35] text-xs font-bold text-slate-800 dark:text-white shadow-xl">
                  <SelectItem value="none">Nenhum setor selecionado</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-1.5">
                        {renderSectorIcon(s.icon)}
                        <span>{s.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 dark:text-[#8a90a0]">
                Usado para comparar sua performance com os benchmarks do setor.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                Logo da Loja
              </Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0f1220] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      className="w-full h-full object-cover"
                      alt="Logo"
                    />
                  ) : (
                    <Image className="w-6 h-6 text-slate-400 dark:text-[#8a90a0]" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="flex-1 h-11 p-1 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-600 dark:text-[#c0c5d4] flex items-center file:inline-flex file:items-center file:justify-center file:h-9 file:px-4 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0094EB] dark:file:bg-[#ff7a29] file:text-white file:font-black file:text-xs file:cursor-pointer hover:file:bg-[#0081cc] dark:hover:file:bg-[#e66c22] transition-all cursor-pointer"
                    />
                    {logoPreview && (
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        onClick={handleRemoveLogo} 
                        className="h-11 w-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1220] hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                        title="Remover logo"
                      >
                        <X size={16} className="text-rose-500" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-[#8a90a0]">
                    Formatos suportados: JPG, PNG ou WEBP.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                E-mail de Contato
              </Label>
              <Input
                type="email"
                placeholder="contato@sualoja.com"
                value={settings?.contact_email ?? ''}
                onChange={e =>
                  setSettings(prev => ({ ...prev, contact_email: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0"
              />
            </div>
          </div>
        </div>

        {/* ── 2. INTEGRAÇÃO WHATSAPP ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span>💬</span> 2. Integração WhatsApp
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] mt-0.5">
                Defina o número receptor e a mensagem automática enviada pelos clientes nos vídeos.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#0f1220]/60 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">
                {settings.whatsapp_enabled ? 'Ativo' : 'Inativo'}
              </span>
              <Switch
                checked={settings?.whatsapp_enabled ?? true}
                onCheckedChange={c =>
                  setSettings(prev => ({ ...prev, whatsapp_enabled: c }))
                }
                className="data-[state=checked]:bg-[#0094EB] dark:data-[state=checked]:!bg-[#ff7a29]"
              />
            </div>
          </div>

          <div className={`space-y-4 transition-all duration-300 ${!settings.whatsapp_enabled ? 'opacity-40 pointer-events-none filter grayscale-[30%]' : ''}`}>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                Número do WhatsApp
              </Label>
              <Input
                type="tel"
                placeholder="5545998888888"
                value={settings?.whatsapp_number ?? ''}
                onChange={e => {
                  const v = e.target.value.replace(/[^\d+\-\(\) ]/g, '');
                  setSettings(prev => ({ ...prev, whatsapp_number: v }));
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0"
                disabled={!settings.whatsapp_enabled}
              />
              <p className="text-[11px] text-slate-500 dark:text-[#8a90a0]">
                Informe o WhatsApp com código do país e DDD (Ex: 5545998888888).
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                Mensagem Padrão de Contato
              </Label>
              <Textarea
                value={settings?.whatsapp_message_template ?? ''}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    whatsapp_message_template: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] focus-visible:ring-2 focus-visible:ring-[#0094EB] dark:focus-visible:ring-[#ff7a29] focus-visible:ring-offset-0"
                disabled={!settings.whatsapp_enabled}
              />
            </div>
          </div>
        </div>

        {/* ── 3. MÉTRICAS ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 dark:border-white/5 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              3. Métricas
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] mt-0.5">
              Monitore de forma inteligente o comportamento do cliente final e as interações com seus vídeos.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-[#0f1220]/60 border border-slate-100 dark:border-white/5">
              <div className="space-y-0.5">
                <Label className="text-xs font-black text-slate-800 dark:text-white block">
                  {settings?.stories_enabled ? 'Ativar métricas e analytics' : 'Desativar métricas e analytics'}
                </Label>
                <p className="text-[11px] font-medium text-slate-500 dark:text-[#8a90a0] leading-relaxed">
                  Coleta métricas detalhadas de visualização, retenção de público, engajamento e cliques em tempo real na loja.
                </p>
              </div>
              <Switch
                checked={settings?.stories_enabled ?? true}
                onCheckedChange={c =>
                  setSettings(prev => ({ ...prev, stories_enabled: c }))
                }
                className="data-[state=checked]:bg-[#0094EB] dark:data-[state=checked]:!bg-[#ff7a29]"
              />
            </div>
          </div>
        </div>

        {/* ── 4. SEGURANÇA & API KEYS ── */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 dark:border-white/5 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              4. Segurança & API
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0] mt-0.5">
              Credenciais e chaves públicas de integração do widget na loja.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
              Token Público / Live Key
            </Label>
            <div className="flex items-center gap-2.5">
              <Input
                type="text"
                value={settings?.public_live_key ?? ''}
                readOnly
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 break-all"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(settings?.public_live_key ?? '');
                  toast.success('Token copiado');
                }}
                className="rounded-xl border-slate-200 dark:border-white/10 hover:border-[#0094EB] dark:hover:border-[#ff7a29] text-slate-600 dark:text-slate-300 hover:text-[#0094EB] dark:hover:text-[#ff7a29]"
                title="Copiar token"
              >
                <Copy size={16} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const k = 'pub_live_' + Math.random().toString(36).substr(2, 24);
                  setSettings(prev => ({ ...prev, public_live_key: k }));
                  toast.success('Token regenerado');
                }}
                className="rounded-xl border-slate-200 dark:border-white/10 hover:border-[#0094EB] dark:hover:border-amber-500 text-[#0094EB] dark:text-amber-500"
                title="Regenerar token"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </div>
        
        {/* ── BOTÃO SALVAR PRIMÁRIO NO RODAPÉ ── */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin !text-white" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
