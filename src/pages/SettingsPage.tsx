"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import { RefreshCw, Loader2, Copy, X, Image } from 'lucide-react';

interface AppSettings {
  id: string;
  store_name: string | null;
  store_url: string | null;
  store_logo_url: string | null;
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
  store_name: '',
  store_url: '',
  store_logo_url: '',
  contact_email: '',
  widget_enabled: true,
  stories_enabled: true,
  carousel_enabled: true,
  floating_widget_enabled: true,
  default_template: 'minimalista',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  whatsapp_number: '',
  whatsapp_enabled: true,
  whatsapp_message_template: 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
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

const SettingsPage = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);

        if (!supabase) {
          setSettings(DEFAULT_SETTINGS);
          return;
        }

        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .limit(1);

        if (error) throw error;

        if (data?.length) {
          setSettings(data[0]);
          setLogoPreview(data[0].store_logo_url || "");
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
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('A imagem deve ter no máximo 500 KB.');
      return;
    }

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
      if (!supabase) {
        toast.success('Configurações salvas localmente (sem backend)');
        return;
      }

      let finalLogoUrl = settings.store_logo_url || "";

      if (selectedLogoFile) {
        const fileExt = selectedLogoFile.name.split(".").pop();
        const fileName = `logos/logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("store-assets")
          .upload(fileName, selectedLogoFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: selectedLogoFile.type,
          });

        if (uploadError) {
          console.error("Erro completo no upload do logo:", uploadError);
          toast.error(`Erro ao enviar o logotipo: ${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage
          .from("store-assets")
          .getPublicUrl(fileName);

        finalLogoUrl = data.publicUrl;
      }

      const settingsToSave = {
        ...settings,
        store_logo_url: finalLogoUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = settings.id
        ? await supabase
            .from('app_settings')
            .update(settingsToSave)
            .eq('id', settings.id)
        : await supabase
            .from('app_settings')
            .insert({
              ...settingsToSave,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
            });

      if (error) throw error;

      toast.success('Settings saved successfully');
      setSelectedLogoFile(null);
    } catch (err) {
      console.error("Erro completo ao salvar configurações:", err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure dados da loja, módulos, integrações e comportamento dos vídeos.
          </p>
        </div>
      </div>

      <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">1. Dados da Loja</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Loja *</Label>
                <Input
                  type="text"
                  placeholder="Nome da sua loja"
                  value={settings?.store_name ?? ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, store_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  required
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Loja *</Label>
                <Input
                  type="url"
                  placeholder="https://sualoja.com"
                  value={settings?.store_url ?? ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, store_url: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo da Loja</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                      {logoPreview ? (
                        <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <Image className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLogoChange}
                          className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-bold file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                        />
                        <Button variant="outline" size="icon" onClick={handleRemoveLogo}><X size={20} className="text-rose-600" /></Button>
                      </div>
                      {logoPreview && (
                        <p className="text-xs text-slate-500 mt-1">
                          {(new URL(logoPreview)).pathname.split('/').pop()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail de Contato</Label>
                <Input
                  type="email"
                  placeholder="contato@sualoja.com"
                  value={settings?.contact_email ?? ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">2. Módulos</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Switch checked={settings?.widget_enabled ?? true} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, widget_enabled: checked }))} className="w-[60px] h-[30px]" />
              <div>
                <Label className="text-sm font-bold text-slate-700">Ativar Vitrine de Vídeos</Label>
                <p className="text-xs text-slate-500 mt-1">Controla a renderização pública do carrossel/grade na loja.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={settings?.whatsapp_enabled ?? true} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, whatsapp_enabled: checked }))} className="w-[60px] h-[30px]" />
              <div>
                <Label className="text-sm font-bold text-slate-700">Ativar WhatsApp</Label>
                <p className="text-xs text-slate-500 mt-1">Exibe botão de WhatsApp nos vídeos.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={settings?.stories_enabled ?? true} onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stories_enabled: checked }))} className="w-[60px] h-[30px]" />
              <div>
                <Label className="text-sm font-bold text-slate-700">Ativar Analytics</Label>
                <p className="text-xs text-slate-500 mt-1">Coleta métricas de visualização e engajamento.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">3. Integração WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do WhatsApp</Label>
              <Input
                type="tel"
                placeholder="5545998888888"
                value={settings?.whatsapp_number ?? ''}
                onChange={(e) => { const value = e.target.value.replace(/[^\d+\-\(\) ]/g, ''); setSettings(prev => ({ ...prev, whatsapp_number: value })); }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
              <p className="text-xs text-slate-500 mt-1">Informe o WhatsApp com código do país e DDD. Ex: 5545998888888</p>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem Padrão de Contato</Label>
              <Textarea
                value={settings?.whatsapp_message_template ?? 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}'}
                onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_message_template: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use a tag{" "}
                <code className="bg-slate-200 px-1 rounded text-xs font-mono">{"{{story_title}}"}</code>{" "}
                para inserir automaticamente o título do vídeo.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">5. Segurança</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Token Público / API Keys</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={settings?.public_live_key ?? ''}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 break-all"
                />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(settings?.public_live_key ?? ''); toast.success('Token copiado'); }}><Copy size={20} /></Button>
                <Button variant="outline" size="icon" onClick={() => { const newKey = 'pub_live_' + Math.random().toString(36).substr(2, 24); setSettings(prev => ({ ...prev, public_live_key: newKey })); toast.success('Token regenerado'); }}><RefreshCw size={20} className="text-amber-600" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={saving} className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
            {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : ('Salvar Configurações')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;