import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, MessageSquare, Users, VolumeX, Radio, Maximize,
  Save, LayoutTemplate, PlaySquare, Lock, Copy
} from "lucide-react";

export interface LiveWidgetSettings {
  enabled: boolean;
  position: string;
  bubble_color: string;
  text_color: string;
  label_text: string;
  width?: number;
  marginBottom?: number;
  marginSide?: number;
}

export interface LivePlayerSettings {
  primary_color: string;
  background_color: string;
  show_viewer_count: boolean;
  show_chat: boolean;
  autoplay_muted: boolean;
}

export interface DeviceConfig<T> {
  desktop: T;
  mobile: T;
  linked: boolean;
}

export const defaultWidgetSettings: LiveWidgetSettings = {
  enabled: true,
  position: "bottom-right",
  bubble_color: "#e11d48",
  text_color: "#ffffff",
  label_text: "🔴 AO VIVO AGORA",
  width: 100,
  marginBottom: 20,
  marginSide: 20,
};

export const defaultPlayerSettings: LivePlayerSettings = {
  primary_color: "#e11d48",
  background_color: "#000000",
  show_viewer_count: true,
  show_chat: true,
  autoplay_muted: true,
};

// Aliases para retrocompatibilidade
export type LiveWidgetConfig = LiveWidgetSettings;
export type LivePlayerConfig = LivePlayerSettings;

// 4 Modelos Padrões do Sistema
export const SYSTEM_THEMES = [
  {
    id: "theme-live",
    name: "Live (Vermelho & Branco)",
    widget: {
      enabled: true,
      position: "bottom-right",
      bubble_color: "#e11d48",
      text_color: "#ffffff",
      label_text: "🔴 AO VIVO AGORA",
      width: 100,
      marginBottom: 20,
      marginSide: 20,
    },
    player: {
      primary_color: "#e11d48",
      background_color: "#000000",
      show_viewer_count: true,
      show_chat: true,
      autoplay_muted: true,
    },
  },
  {
    id: "theme-vidlytics",
    name: "Vidlytics (Azul & Branco)",
    widget: {
      enabled: true,
      position: "bottom-right",
      bubble_color: "#0094ea",
      text_color: "#ffffff",
      label_text: "🔴 ASSISTA AO VIVO",
      width: 100,
      marginBottom: 20,
      marginSide: 20,
    },
    player: {
      primary_color: "#0094ea",
      background_color: "#050b14",
      show_viewer_count: true,
      show_chat: true,
      autoplay_muted: true,
    },
  },
  {
    id: "theme-blackfriday",
    name: "Black Friday (Preto & Branco)",
    widget: {
      enabled: true,
      position: "bottom-right",
      bubble_color: "#111111",
      text_color: "#ffffff",
      label_text: "🔥 LIVE BLACK FRIDAY",
      width: 100,
      marginBottom: 20,
      marginSide: 20,
    },
    player: {
      primary_color: "#ffffff",
      background_color: "#09090b",
      show_viewer_count: true,
      show_chat: true,
      autoplay_muted: true,
    },
  },
  {
    id: "theme-aniversario",
    name: "Aniversário (Rosa & Branco)",
    widget: {
      enabled: true,
      position: "bottom-right",
      bubble_color: "#ec4899",
      text_color: "#ffffff",
      label_text: "🎉 LIVE ESPECIAL",
      width: 100,
      marginBottom: 20,
      marginSide: 20,
    },
    player: {
      primary_color: "#ec4899",
      background_color: "#14050d",
      show_viewer_count: true,
      show_chat: true,
      autoplay_muted: true,
    },
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgetConfig: DeviceConfig<LiveWidgetSettings>, playerConfig: DeviceConfig<LivePlayerSettings>) => void;
  initialWidgetConfig: DeviceConfig<LiveWidgetSettings>;
  initialPlayerConfig: DeviceConfig<LivePlayerSettings>;
  isSaving: boolean;
}

export default function LiveAppearanceModal({
  isOpen,
  onClose,
  onSave,
  initialWidgetConfig,
  initialPlayerConfig,
  isSaving,
}: Props) {
  // 1. Sempre abre na aba Divulgação
  const [activeTab, setActiveTab] = useState<"widget" | "player">("widget");
  // 2. Sempre abre no preview Mobile
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");

  const [widget, setWidget] = useState<DeviceConfig<LiveWidgetSettings>>(initialWidgetConfig);
  const [player, setPlayer] = useState<DeviceConfig<LivePlayerSettings>>(initialPlayerConfig);

  // Modelos de Temas
  const [selectedThemeId, setSelectedThemeId] = useState<string>("theme-live");
  const [isNewNameModalOpen, setIsNewNameModalOpen] = useState(false);
  const [customThemeName, setCustomThemeName] = useState("");

  const isSystemTheme = selectedThemeId.startsWith("theme-");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("widget");
      setDevice("mobile");
      setWidget(initialWidgetConfig);
      setPlayer(initialPlayerConfig);
    }
  }, [isOpen, initialWidgetConfig, initialPlayerConfig]);

  const handleApplyTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    const theme = SYSTEM_THEMES.find((t) => t.id === themeId);
    if (!theme) return;

    setWidget((prev) => ({
      ...prev,
      desktop: { ...prev.desktop, ...theme.widget },
      mobile: { ...prev.mobile, ...theme.widget },
    }));

    setPlayer((prev) => ({
      ...prev,
      desktop: { ...prev.desktop, ...theme.player },
      mobile: { ...prev.mobile, ...theme.player },
    }));
  };

  const handleSaveClick = () => {
    // 3. Bloqueia salvar por cima do tema padrão
    if (isSystemTheme) {
      setCustomThemeName("");
      setIsNewNameModalOpen(true);
      return;
    }
    onSave(widget, player);
  };

  const handleConfirmSaveAsNew = () => {
    if (!customThemeName.trim()) return;
    setIsNewNameModalOpen(false);
    setSelectedThemeId("custom");
    onSave(widget, player);
  };

  const currentWidget = widget[device] || defaultWidgetSettings;
  const currentPlayer = player[device] || defaultPlayerSettings;

  const updateWidget = (patch: Partial<LiveWidgetSettings>) => {
    setWidget((prev) => ({
      ...prev,
      [device]: { ...prev[device], ...patch },
      ...(prev.linked ? { [device === "desktop" ? "mobile" : "desktop"]: { ...prev[device === "desktop" ? "mobile" : "desktop"], ...patch } } : {}),
    }));
  };

  const updatePlayer = (patch: Partial<LivePlayerSettings>) => {
    setPlayer((prev) => ({
      ...prev,
      [device]: { ...prev[device], ...patch },
      ...(prev.linked ? { [device === "desktop" ? "mobile" : "desktop"]: { ...prev[device === "desktop" ? "mobile" : "desktop"], ...patch } } : {}),
    }));
  };

  const CustomSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
        onClick={() => onChange(!checked)}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </div>
    </label>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-background">
          <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Radio className="h-5 w-5 text-rose-500" />
              Aparência da Live
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
              >
                {isSystemTheme ? <Copy className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Salvando..." : isSystemTheme ? "Salvar como Novo Tema" : "Salvar Alterações"}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Coluna Lateral de Controles */}
            <div className="w-1/3 min-w-[320px] border-r border-border flex flex-col bg-muted/10">
              {/* Seletor de Tema Padrão */}
              <div className="p-3 border-b border-border bg-background">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    Tema da Live
                    {isSystemTheme && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded font-normal">
                        <Lock className="w-3 h-3" /> Padrão Bloqueado
                      </span>
                    )}
                  </label>
                </div>
                <select
                  value={selectedThemeId}
                  onChange={(e) => handleApplyTheme(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:ring-1 focus:ring-rose-500"
                >
                  <optgroup label="Temas Padrões (Não editáveis)">
                    {SYSTEM_THEMES.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        🔒 {theme.name}
                      </option>
                    ))}
                  </optgroup>
                  {selectedThemeId === "custom" && (
                    <optgroup label="Personalizado">
                      <option value="custom">★ Meu Tema Customizado</option>
                    </optgroup>
                  )}
                </select>
                {isSystemTheme && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Temas padrões não podem ser sobrescritos. Suas edições serão salvas com outro nome.
                  </p>
                )}
              </div>

              {/* Abas: Divulgação e Player */}
              <div className="flex p-2 gap-1 border-b border-border bg-background">
                <button
                  onClick={() => setActiveTab("widget")}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "widget" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <LayoutTemplate className="h-4 w-4" />
                  Divulgação
                </button>
                <button
                  onClick={() => setActiveTab("player")}
                  className={`flex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "player" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <PlaySquare className="h-4 w-4" />
                  Player
                </button>
              </div>

              {/* Opções das Abas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === "widget" ? (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Widget Flutuante</h3>
                    </div>
                    <CustomSwitch
                      checked={currentWidget.enabled}
                      onChange={(v) => updateWidget({ enabled: v })}
                      label="Habilitar Widget na loja"
                    />
                    {currentWidget.enabled && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Texto do Balão</label>
                          <Input
                            value={currentWidget.label_text}
                            onChange={(e) => updateWidget({ label_text: e.target.value })}
                            placeholder="Ex: 🔴 AO VIVO AGORA"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Cor de Fundo</label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={currentWidget.bubble_color}
                                onChange={(e) => updateWidget({ bubble_color: e.target.value })}
                                className="w-12 p-1 h-10 cursor-pointer"
                              />
                              <Input
                                value={currentWidget.bubble_color}
                                onChange={(e) => updateWidget({ bubble_color: e.target.value })}
                                className="flex-1 font-mono uppercase text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Cor do Texto</label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={currentWidget.text_color}
                                onChange={(e) => updateWidget({ text_color: e.target.value })}
                                className="w-12 p-1 h-10 cursor-pointer"
                              />
                              <Input
                                value={currentWidget.text_color}
                                onChange={(e) => updateWidget({ text_color: e.target.value })}
                                className="flex-1 font-mono uppercase text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Posição</label>
                          <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={currentWidget.position}
                            onChange={(e) => updateWidget({ position: e.target.value })}
                          >
                            <option value="bottom-right">Inferior Direito</option>
                            <option value="bottom-left">Inferior Esquerdo</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Player da Live</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cor Principal</label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={currentPlayer.primary_color}
                            onChange={(e) => updatePlayer({ primary_color: e.target.value })}
                            className="w-12 p-1 h-10 cursor-pointer"
                          />
                          <Input
                            value={currentPlayer.primary_color}
                            onChange={(e) => updatePlayer({ primary_color: e.target.value })}
                            className="flex-1 font-mono uppercase text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Fundo</label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={currentPlayer.background_color}
                            onChange={(e) => updatePlayer({ background_color: e.target.value })}
                            className="w-12 p-1 h-10 cursor-pointer"
                          />
                          <Input
                            value={currentPlayer.background_color}
                            onChange={(e) => updatePlayer({ background_color: e.target.value })}
                            className="flex-1 font-mono uppercase text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      <CustomSwitch
                        checked={currentPlayer.show_chat}
                        onChange={(v) => updatePlayer({ show_chat: v })}
                        label="Exibir Chat"
                      />
                      <CustomSwitch
                        checked={currentPlayer.show_viewer_count}
                        onChange={(v) => updatePlayer({ show_viewer_count: v })}
                        label="Exibir Número de Espectadores"
                      />
                      <CustomSwitch
                        checked={currentPlayer.autoplay_muted}
                        onChange={(v) => updatePlayer({ autoplay_muted: v })}
                        label="Autoplay Mutado"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Painel de Preview */}
            <div className="flex-1 flex flex-col bg-muted/30 relative">
              {/* Botões: Mobile PRIMEIRO, depois Desktop */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-background border border-border rounded-lg shadow-sm z-10">
                <button
                  onClick={() => setDevice("mobile")}
                  title="Mobile"
                  className={`p-2 rounded-md transition-colors ${
                    device === "mobile" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDevice("desktop")}
                  title="Desktop"
                  className={`p-2 rounded-md transition-colors ${
                    device === "desktop" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
                <div
                  className={`relative bg-background border border-border shadow-xl overflow-hidden transition-all duration-500 flex flex-col ${
                    device === "desktop"
                      ? "w-full max-w-[800px] aspect-video rounded-xl"
                      : "w-[320px] h-[650px] rounded-[2rem] border-[6px]"
                  }`}
                  style={activeTab === "player" ? { backgroundColor: currentPlayer.background_color } : {}}
                >
                  {activeTab === "widget" && (
                    <div className="absolute inset-0 bg-muted/10">
                      <div className="w-full h-12 border-b border-border bg-background flex items-center px-4 shadow-sm">
                        <div className="w-24 h-4 bg-muted rounded-full"></div>
                      </div>
                      {currentWidget.enabled && (
                        <div
                          className="absolute p-3 px-4 rounded-full shadow-lg cursor-pointer flex items-center gap-2"
                          style={{
                            backgroundColor: currentWidget.bubble_color,
                            color: currentWidget.text_color,
                            bottom: "24px",
                            right: currentWidget.position === "bottom-right" ? "24px" : "auto",
                            left: currentWidget.position === "bottom-left" ? "24px" : "auto",
                          }}
                        >
                          <Radio className="h-5 w-5 animate-pulse" />
                          <span className="font-bold text-sm tracking-wide">{currentWidget.label_text}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "player" && (
                    <div className="absolute inset-0 flex flex-col">
                      <div className="p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pr-3 border border-white/10">
                          <div className="bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Radio className="w-3 h-3" /> Ao Vivo
                          </div>
                          {currentPlayer.show_viewer_count && (
                            <div className="text-white text-xs font-medium flex items-center gap-1 opacity-90">
                              <Users className="w-3 h-3" /> 1.2k
                            </div>
                          )}
                        </div>
                        {currentPlayer.autoplay_muted && (
                          <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white/90 border border-white/10">
                            <VolumeX className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex items-center justify-center">
                        <PlaySquare className="w-16 h-16 opacity-20" style={{ color: currentPlayer.primary_color }} />
                      </div>

                      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                        <div className="flex-1">
                          <h2 className="text-white font-bold text-lg mb-1 drop-shadow-md">Lançamento Exclusivo</h2>
                          <p className="text-white/80 text-sm">Compre agora com descontos imperdíveis!</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {currentPlayer.show_chat && (
                            <div
                              className="bg-black/50 backdrop-blur-md p-2.5 rounded-full text-white cursor-pointer border border-white/10"
                              style={{ backgroundColor: `${currentPlayer.primary_color}40` }}
                            >
                              <MessageSquare className="w-5 h-5" />
                            </div>
                          )}
                          <div className="bg-black/50 backdrop-blur-md p-2.5 rounded-full text-white cursor-pointer border border-white/10">
                            <Maximize className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Janela de Confirmação para Salvar com Novo Nome */}
      <Dialog open={isNewNameModalOpen} onOpenChange={setIsNewNameModalOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Salvar com outro nome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Os temas padrões são fixos do sistema. Digite um nome para salvar suas modificações como um novo tema:
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Tema</label>
              <Input
                value={customThemeName}
                onChange={(e) => setCustomThemeName(e.target.value)}
                placeholder="Ex: Minha Live Customizada"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewNameModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSaveAsNew}
              disabled={!customThemeName.trim() || isSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
