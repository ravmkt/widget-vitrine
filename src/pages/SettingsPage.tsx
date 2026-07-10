"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCw, Loader2, Copy, X, Image } from "lucide-react";

const LOGO_BUCKET = "store-assets";

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

interface AppSettingsRow {
  id?: string | number | null;
  settings?: Partial<AppSettings> | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: "",
  store_name: "",
  store_url: "",
  store_logo_url: "",
  contact_email: "",
  widget_enabled: true,
  stories_enabled: true,
  carousel_enabled: true,
  floating_widget_enabled: true,
  default_template: "minimalista",
  language: "pt-BR",
  timezone: "America/Sao_Paulo",
  whatsapp_number: "",
  whatsapp_enabled: true,
  whatsapp_message_template:
    "Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}",
  open_product_new_tab: true,
  pause_on_leave: true,
  autoplay: true,
  muted_by_default: true,
  show_video_controls: false,
  store_public_id: "",
  public_live_key: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const normalizeSettingsFromRow = (row: AppSettingsRow): AppSettings => {
  const jsonSettings = isObject(row.settings) ? row.settings : {};

  const merged = {
    ...DEFAULT_SETTINGS,

    /**
     * Compatibilidade com dados antigos:
     * Se antes você tinha colunas diretas como store_name, whatsapp_number etc.,
     * elas ainda podem ser aproveitadas na primeira leitura.
     */
    ...row,

    /**
     * Nova estrutura oficial:
     * As configurações passam a vir da coluna JSONB "settings".
     */
    ...jsonSettings,

    id: row.id !== undefined && row.id !== null ? String(row.id) : "",
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : DEFAULT_SETTINGS.created_at,
    updated_at:
      typeof row.updated_at === "string"
        ? row.updated_at
        : DEFAULT_SETTINGS.updated_at,
  };

  delete (merged as AppSettingsRow).settings;

  return merged as AppSettings;
};

const buildSettingsJson = (value: AppSettings) => {
  const {
    id,
    created_at,
    updated_at,
    ...settingsJson
  } = value;

  return {
    ...settingsJson,
    store_name: value.store_name || "",
    store_url: value.store_url || "",
    store_logo_url: value.store_logo_url || null,
    contact_email: value.contact_email || "",
    whatsapp_number: value.whatsapp_number || "",
    store_public_id: value.store_public_id || "",
    public_live_key: value.public_live_key || "",
  };
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
          .from("app_settings")
          .select("*")
          .limit(1);

        if (error) throw error;

        if (data?.length) {
          const loadedSettings = normalizeSettingsFromRow(data[0]);
          setSettings(loadedSettings);
          setLogoPreview(loadedSettings.store_logo_url || "");
        } else {
          setSettings(DEFAULT_SETTINGS);
          setLogoPreview("");
        }
      } catch (err) {
        console.error("Erro ao buscar configurações:", err);
        setSettings(DEFAULT_SETTINGS);
        setLogoPreview("");
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
      toast.error("A imagem deve ter no máximo 500 KB.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreview("");
    setSettings((prev) => ({ ...prev, store_logo_url: null }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (!supabase) {
        toast.success("Configurações salvas localmente, sem backend.");
        return;
      }

      let finalLogoUrl = settings.store_logo_url || "";

      if (selectedLogoFile) {
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
            uploadError.message?.includes("Bucket not found") ||
            uploadError.message?.includes("bucket")
          ) {
            toast.error(
              `Bucket '${LOGO_BUCKET}' não encontrado. Crie este bucket público no Supabase Storage.`
            );
          } else {
            toast.error(`Erro ao enviar o logotipo: ${uploadError.message}`);
          }

          return;
        }

        const { data } = supabase.storage
          .from(LOGO_BUCKET)
          .getPublicUrl(fileName);

        finalLogoUrl = data.publicUrl;
      }

      const now = new Date().toISOString();

      const settingsToSave: AppSettings = {
        ...settings,
        store_logo_url: finalLogoUrl,
        updated_at: now,
      };

      const settingsJson = buildSettingsJson(settingsToSave);

      const rowId = settings.id || crypto.randomUUID();

      /**
       * IMPORTANTE:
       * Aqui salvamos somente nas colunas reais:
       *
       * - id
       * - settings
       * - created_at
       * - updated_at
       *
       * Todas as configurações ficam dentro de "settings" JSONB.
       */
      const rowPayload = {
        id: rowId,
        settings: settingsJson,
        created_at: settings.created_at || now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("app_settings")
        .upsert(rowPayload, {
          onConflict: "id",
        })
        .select("*")
        .single();

      if (error) throw error;

      const savedSettings = normalizeSettingsFromRow(data);
      setSettings(savedSettings);
      setLogoPreview(savedSettings.store_logo_url || "");
      setSelectedLogoFile(null);

      toast.success("Configurações salvas com sucesso.");
    } catch (err) {
      console.error("Erro completo ao salvar configurações:", err);
      toast.error("Falha ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Configurações do Sistema
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure dados da loja, módulos, integrações e comportamento dos
            vídeos.
          </p>
        </div>
      </div>

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              1. Dados da Loja
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nome da Loja *
                </Label>
                <Input
                  type="text"
                  placeholder="Nome da sua loja"
                  value={settings.store_name ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      store_name: e.target.value,
                    }))
                  }
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
                  value={settings.store_url ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      store_url: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                  required
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Logo da Loja
                </Label>

                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          className="w-full h-full object-cover"
                          alt="Logo"
                        />
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

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleRemoveLogo}
                        >
                          <X size={20} className="text-rose-600" />
                        </Button>
                      </div>

                      {logoPreview && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new URL(logoPreview).pathname.split("/").pop()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  E-mail de Contato
                </Label>
                <Input
                  type="email"
                  placeholder="contato@sualoja.com"
                  value={settings.contact_email ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      contact_email: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              2. Módulos
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.widget_enabled ?? true}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    widget_enabled: checked,
                  }))
                }
                className="w-[60px] h-[30px]"
              />
              <div>
                <Label className="text-sm font-bold text-slate-700">
                  Ativar Vitrine de Vídeos
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Controla a renderização pública do carrossel/grade na loja.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={settings.whatsapp_enabled ?? true}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    whatsapp_enabled: checked,
                  }))
                }
                className="w-[60px] h-[30px]"
              />
              <div>
                <Label className="text-sm font-bold text-slate-700">
                  Ativar WhatsApp
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Exibe botão de WhatsApp nos vídeos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={settings.stories_enabled ?? true}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    stories_enabled: checked,
                  }))
                }
                className="w-[60px] h-[30px]"
              />
              <div>
                <Label className="text-sm font-bold text-slate-700">
                  Ativar Analytics
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Coleta métricas de visualização e engajamento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={settings.floating_widget_enabled ?? true}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    floating_widget_enabled: checked,
                  }))
                }
                className="w-[60px] h-[30px]"
              />
              <div>
                <Label className="text-sm font-bold text-slate-700">
                  Ativar Widget Flutuante
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Exibe o widget flutuante da vitrine de vídeos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
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
                placeholder="5541999999999"
                value={settings.whatsapp_number ?? ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d+\-\(\) ]/g, "");
                  setSettings((prev) => ({
                    ...prev,
                    whatsapp_number: value,
                  }));
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Informe o WhatsApp com código do país e DDD. Ex:
                5541999999999
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mensagem Padrão de Contato
              </Label>
              <Textarea
                value={
                  settings.whatsapp_message_template ??
                  "Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}"
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    whatsapp_message_template: e.target.value,
                  }))
                }
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

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              4. Aparência e Comportamento dos Vídeos
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Template Padrão
                </Label>
                <Select
                  value={settings.default_template ?? "minimalista"}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      default_template: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimalista">Minimalista</SelectItem>
                    <SelectItem value="moderno">Moderno</SelectItem>
                    <SelectItem value="classico">Clássico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Idioma
                </Label>
                <Select
                  value={settings.language ?? "pt-BR"}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      language: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
                    <SelectValue placeholder="Selecione o idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português Brasil</SelectItem>
                    <SelectItem value="en-US">Inglês</SelectItem>
                    <SelectItem value="es-ES">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Fuso Horário
                </Label>
                <Input
                  type="text"
                  value={settings.timezone ?? "America/Sao_Paulo"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      timezone: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.carousel_enabled ?? true}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      carousel_enabled: checked,
                    }))
                  }
                  className="w-[60px] h-[30px]"
                />
                <div>
                  <Label className="text-sm font-bold text-slate-700">
                    Ativar Carrossel
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Exibe os vídeos em formato de carrossel.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.open_product_new_tab ?? true}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      open_product_new_tab: checked,
                    }))
                  }
                  className="w-[60px] h-[30px]"
                />
                <div>
                  <Label className="text-sm font-bold text-slate-700">
                    Abrir Produto em Nova Aba
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Abre o link do produto em uma nova guia do navegador.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.pause_on_leave ?? true}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      pause_on_leave: checked,
                    }))
                  }
                  className="w-[60px] h-[30px]"
                />
                <div>
                  <Label className="text-sm font-bold text-slate-700">
                    Pausar ao Sair
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Pausa o vídeo quando o usuário tira o mouse ou sai da área.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.autoplay ?? true}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      autoplay: checked,
                    }))
                  }
                  className="w-[60px] h-[30px]"
                />
                <div>
                  <Label className="text-sm font-bold text-slate-700">
                    Reprodução Automática
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Inicia os vídeos automaticamente quando possível.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.muted_by_default ?? true}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      muted_by_default: checked,
                    }))
                  }
                  className="w-[60px] h-[30px]"
                />
                <div>
                  <Label className="text-sm font-bold text-slate-700">
                    Iniciar Sem Som
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Os vídeos começam silenciados por padrão.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.show_video_controls ?? false}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      show_video_controls: checked,
                    }))
                  }
                  className="w-[60px] h-[30px]"
                />
                <div>
                  <Label className="text-sm font-bold text-slate-700">
                    Exibir Controles do Vídeo
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Mostra controles nativos como play, pause e volume.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black text-slate-800">
              5. Segurança
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Token Público / API Keys
              </Label>

              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={settings.public_live_key ?? ""}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 break-all"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      settings.public_live_key ?? ""
                    );
                    toast.success("Token copiado.");
                  }}
                >
                  <Copy size={20} />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newKey =
                      "pub_live_" + Math.random().toString(36).substr(2, 24);

                    setSettings((prev) => ({
                      ...prev,
                      public_live_key: newKey,
                    }));

                    toast.success("Token regenerado.");
                  }}
                >
                  <RefreshCw size={20} className="text-amber-600" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
              "Salvar Configurações"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
