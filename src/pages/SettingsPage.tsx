"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Button
} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Checkbox,
} from '@/components/ui/checkbox';
import {
  Input,
} from '@/components/ui/input';
import {
  Label,
} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Switch,
  SwitchThumb,
  SwitchTrack,
} from '@/components/ui/switch';
import {
  Textarea,
} from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Copy } from 'lucide-react';
import { X } from 'lucide-react';
import { Image } from 'lucide-react';

// Define the shape of our settings based on the app_settings table
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

const SettingsPage = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .limit(1);

        if (error) throw error;

        // If no settings exist, we'll use defaults and create on first save
        if (data?.length) {
          setSettings(data[0]);
        } else {
          // Provide default values
          setSettings({
            id: '',
            store_name: null,
            store_url: null,
            store_logo_url: null,
            contact_email: null,
            widget_enabled: true,
            stories_enabled: true,
            carousel_enabled: true,
            floating_widget_enabled: true,
            default_template: 'minimalista',
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            whatsapp_number: null,
            whatsapp_enabled: true,
            whatsapp_message_template: 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}',
            open_product_new_tab: true,
            pause_on_leave: true,
            autoplay: true,
            muted_by_default: true,
            show_video_controls: false,
            store_public_id: null,
            public_live_key: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { data, error } = settings.id
        ? await supabase
            .from('app_settings')
            .update({
              ...settings,
              updated_at: new Date().toISOString(),
            })
            .eq('id', settings.id)
        : await supabase
            .from('app_settings')
            .insert({
              ...settings,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-[200px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure dados da loja, módulos, integrações e comportamento dos vídeos.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form className="space-y-8" onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}>
        {/* 1. Dados da Loja */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              1. Dados da Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Store Name and URL */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nome da Loja *
                </Label>
                <Input
                  type="text"
                  placeholder="Nome da sua loja"
                  value={settings?.store_name ?? ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, store_name: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  required
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  URL da Loja *
                </Label>
                <Input
                  type="url"
                  placeholder="https://sualoja.com"
                  value={settings?.store_url ?? ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, store_url: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  required
                />
              </div>

              {/* Store IDs */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ID de Loja Primário
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={settings?.store_public_id ?? settings?.id ?? ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 break-all"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(settings?.store_public_id ?? settings?.id ?? '');
                      toast.success('ID copiado');
                    }}
                  >
                    <Copy size={20} />
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ID de Loja Público
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={settings?.store_public_id ?? ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 break-all"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(settings?.store_public_id ?? '');
                      toast.success('ID público copiado');
                    }}
                  >
                    <Copy size={20} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newId = 'pub_live_' + Math.random().toString(36).substr(2, 24);
                      setSettings(prev => prev ? { ...prev, store_public_id: newId } : null);
                      toast.success('ID público regenerado');
                    }}
                  >
                    <RefreshCw size={20} className="text-amber-600" />
                  </Button>
                </div>
              </div>

              {/* Logo and Contact Email */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Logo da Loja
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                      {settings?.store_logo_url ? (
                        <img src={settings.store_logo_url} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                        <Image className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
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
                            const reader = new FileReader();
                            reader.onload = () => {
                              setSettings(prev => prev ? { ...prev, store_logo_url: reader.result as string } : null);
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-bold file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSettings(prev => prev ? { ...prev, store_logo_url: null } : null);
                            toast.success('Logo removida');
                          }}
                        >
                          <X size={20} className="text-rose-600" />
                        </Button>
                      </div>
                      {settings?.store_logo_url && (
                        <p className="text-xs text-slate-500 mt-1">
                          {(new URL(settings.store_logo_url)).pathname.split('/').pop()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Input
                    type="url"
                    placeholder="Ou cole a URL da logo"
                    value={settings?.store_logo_url ?? ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, store_logo_url: e.target.value } : null)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#0094EB]"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  E-mail de Contato
                </Label>
                <Input
                  type="email"
                  placeholder="contato@sualoja.com"
                  value={settings?.contact_email ?? ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, contact_email: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Módulos */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              2. Módulos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Switch
                checked={settings?.widget_enabled ?? true}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, widget_enabled: checked } : null)}
                className="w-[60px] h-[30px]"
              >
                <SwitchTrack className="bg-slate-200">
                  <SwitchThumb className="bg-slate-900" />
                </SwitchTrack>
              </Switch>
              <Label className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ativação Geral do Widget
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Controla a renderização pública do carrossel/grade na loja.
              </p>
            </div>
            <div className="space-y-4">
              <Switch
                checked={settings?.stories_enabled ?? true}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, stories_enabled: checked } : null)}
                className="w-[60px] h-[30px]"
              >
                <SwitchTrack className="bg-slate-200">
                  <SwitchThumb className="bg-slate-900" />
                </SwitchTrack>
              </Switch>
              <Label className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ativar Módulo Stories
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Disponibiliza exibição de stories.
              </p>
            </div>
            <div className="space-y-4">
              <Switch
                checked={settings?.carousel_enabled ?? true}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, carousel_enabled: checked } : null)}
                className="w-[60px] h-[30px]"
              >
                <SwitchTrack className="bg-slate-200">
                  <SwitchThumb className="bg-slate-900" />
                </SwitchTrack>
              </Switch>
              <Label className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ativar Carrossel
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Permite rolagem horizontal.
              </p>
            </div>
            <div className="space-y-4">
              <Switch
                checked={settings?.floating_widget_enabled ?? true}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, floating_widget_enabled: checked } : null)}
                className="w-[60px] h-[30px]"
              >
                <SwitchTrack className="bg-slate-200">
                  <SwitchThumb className="bg-slate-900" />
                </SwitchTrack>
              </Switch>
              <Label className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ativar Widget Flutuante
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Exibe círculo fixo no canto da loja.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Template Padrão
                  </Label>
                  <Select
                    value={settings?.default_template ?? 'minimalista'}
                    onValueChange={(value) => setSettings(prev => prev ? { ...prev, default_template: value as string } : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimalista">Minimalista</SelectItem>
                      <SelectItem value="moderno">Moderno</SelectItem>
                      <SelectItem value="classico">Clássico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Idioma
                  </Label>
                  <Select
                    value={settings?.language ?? 'pt-BR'}
                    onValueChange={(value) => setSettings(prev => prev ? { ...prev, language: value as string } : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (pt-BR)</SelectItem>
                      <SelectItem value="en-US">Inglês (en-US)</SelectItem>
                      <SelectItem value="es-ES">Espanhol (es-ES)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Fuso Horário
                  </Label>
                  <Select
                    value={settings?.timezone ?? 'America/Sao_Paulo'}
                    onValueChange={(value) => setSettings(prev => prev ? { ...prev, timezone: value as string } : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tóquio (GMT+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Integração WhatsApp */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              3. Integração WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Número do WhatsApp
              </Label>
              <Input
                type="tel"
                placeholder="5545999629702"
                value={settings?.whatsapp_number ?? ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d+\-\(\) ]/g, '');
                  setSettings(prev => prev ? { ...prev, whatsapp_number: value } : null);
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Insira o número completo com DDD e código do país. Ex: 55 para Brasil.
              </p>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Botão WhatsApp nos Vídeos
              </Label>
              <Switch
                checked={settings?.whatsapp_enabled ?? true}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, whatsapp_enabled: checked } : null)}
                className="w-[60px] h-[30px]"
              >
                <SwitchTrack className="bg-slate-200">
                  <SwitchThumb className="bg-slate-900" />
                </SwitchTrack>
              </Switch>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mensagem Padrão de Contato
              </Label>
              <Textarea
                value={settings?.whatsapp_message_template ?? 'Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, whatsapp_message_template: e.target.value } : null)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use a tag{" "}
                <code className="bg-slate-200 px-1 rounded text-xs font-mono">
                  {"{{story_title}}"}
                </code>{" "}
                para inserir automaticamente o título do vídeo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Comportamento */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              4. Comportamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Título Padrão da Vitrine
              </Label>
              <Input
                type="text"
                placeholder="Vitrine de Vídeos"
                value={settings?.store_name ?? 'Vitrine de Vídeos'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, store_name: e.target.value } : null)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Quantidade de Vídeos por Página
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={settings?.store_public_id ? '10' : '10'}
                onChange={(e) => {
                  const num = parseInt(e.target.value);
                  if (!isNaN(num) && num >= 1 && num <= 100) {
                    console.log('Videos per page:', num);
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Número entre 1 e 100
              </p>
            </div>
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ordenação Padrão
              </Label>
              <Select
                value={settings?.store_public_id ? 'recent' : 'recent'}
                onValueChange={(value) => {
                  console.log('Default order:', value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
                  <SelectItem value="oldest">Mais Antigos</SelectItem>
                  <SelectItem value="views_desc">Mais Visualizações</SelectItem>
                  <SelectItem value="views_asc">Menos Visualizações</SelectItem>
                  <SelectItem value="likes_desc">Mais Curtidas</SelectItem>
                  <SelectItem value="likes_asc">Menos Curtidas</SelectItem>
                  <SelectItem value="comments_desc">Mais Comentários</SelectItem>
                  <SelectItem value="comments_asc">Menos Comentários</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 5. Segurança */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-950 text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              5. Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Token Público / API Key
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={settings?.public_live_key ?? ''}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 break-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(settings?.public_live_key ?? '');
                    toast.success('Token copiado');
                  }}
                >
                  <Copy size={20} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newKey = 'pub_live_' + Math.random().toString(36).substr(2, 24);
                    setSettings(prev => prev ? { ...prev, public_live_key: newKey } : null);
                    toast.success('Token regenerado');
                  }}
                >
                  <RefreshCw size={20} className="text-amber-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;