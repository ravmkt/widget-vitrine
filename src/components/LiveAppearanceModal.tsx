$code = @'
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, Link as LinkIcon, Unlink, Radio, Save, LayoutTemplate, PlaySquare, Image as ImageIcon,
  MessageSquare, Users, VolumeX, Maximize
} from "lucide-react";

// --- INTERFACES ---
export interface LiveWidgetSettings {
  format: "circular" | "square" | "portrait" | "landscape";
  objectFit: "cover" | "contain" | "fill";
  width: number;
  position: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  marginBottom: number;
  marginTop: number;
  marginSide: number;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  showCTA: boolean;
  ctaText: string;
  showCountdown: boolean;
  playVideo: boolean;
  showCloseButton: boolean;
}

export interface LivePlayerSettings {
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  showTitle: boolean;
  showBadge: boolean;
  badgeUrl: string;
  showViewerCount: boolean;
  showChat: boolean;
  autoplayMuted: boolean;
  cardBgColor: string;
  cardBorderColor: string;
  cardBorderWidth: number;
  cardBorderRadius: number;
  productNameSize: number;
  productNameColor: string;
  priceSize: number;
  priceColor: string;
  couponSize: number;
  couponColor: string;
}

export interface DeviceConfig<T> {
  desktop: T;
  mobile: T;
  linked: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: DeviceConfig<LiveWidgetSettings>, player: DeviceConfig<LivePlayerSettings>) => void;
  initialWidgetConfig?: DeviceConfig<LiveWidgetSettings>;
  initialPlayerConfig?: DeviceConfig<LivePlayerSettings>;
  isSaving: boolean;
}

// --- DEFAULTS ---
const defaultWidgetSettings: LiveWidgetSettings = {
  format: "portrait",
  objectFit: "cover",
  width: 100,
  position: "bottom-left",
  marginBottom: 0,
  marginTop: 0,
  marginSide: 5,
  borderColor: "#0094EB",
  borderWidth: 2,
  borderRadius: 12,
  showCTA: true,
  ctaText: "Participe",
  showCountdown: true,
  playVideo: true,
  showCloseButton: true,
};

const defaultPlayerSettings: LivePlayerSettings = {
  borderColor: "#0094EB",
  borderWidth: 2,
  borderRadius: 12,
  showTitle: true,
  showBadge: false,
  badgeUrl: "",
  showViewerCount: true,
  showChat: false,
  autoplayMuted: true,
  cardBgColor: "#FFFFFF",
  cardBorderColor: "#E2E8F0",
  cardBorderWidth: 2,
  cardBorderRadius: 12,
  productNameSize: 12,
  productNameColor: "#0F172A",
  priceSize: 12,
  priceColor: "#0094EB",
  couponSize: 12,
  couponColor: "#eb0000",
};

export default function LiveAppearanceModal({
  isOpen, onClose, onSave, initialWidgetConfig, initialPlayerConfig, isSaving
}: Props) {
  const [activeTab, setActiveTab] = useState<"widget" | "player">("widget");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const [widgetConfig, setWidgetConfig] = useState<DeviceConfig<LiveWidgetSettings>>({
    desktop: { ...defaultWidgetSettings },
    mobile: { ...defaultWidgetSettings },
    linked: true
  });

  const [playerConfig, setPlayerConfig] = useState<DeviceConfig<LivePlayerSettings>>({
    desktop: { ...defaultPlayerSettings },
    mobile: { ...defaultPlayerSettings },
    linked: true
  });

  useEffect(() => {
    if (isOpen) {
      if (initialWidgetConfig) setWidgetConfig(initialWidgetConfig);
      if (initialPlayerConfig) setPlayerConfig(initialPlayerConfig);
    }
  }, [isOpen, initialWidgetConfig, initialPlayerConfig]);

  const handleSave = () => {
    onSave(widgetConfig, playerConfig);
  };

  // Funções de Update Genéricas
  const updateWidget = (key: keyof LiveWidgetSettings, value: any) => {
    setWidgetConfig(prev => {
      const newState = { ...prev };
      newState[device] = { ...newState[device], [key]: value };
      if (newState.linked) {
        const otherDevice = device === "desktop" ? "mobile" : "desktop";
        newState[otherDevice] = { ...newState[otherDevice], [key]: value };
      }
      return newState;
    });
  };

  const updatePlayer = (key: keyof LivePlayerSettings, value: any) => {
    setPlayerConfig(prev => {
      const newState = { ...prev };
      newState[device] = { ...newState[device], [key]: value };
      if (newState.linked) {
        const otherDevice = device === "desktop" ? "mobile" : "desktop";
        newState[otherDevice] = { ...newState[otherDevice], [key]: value };
      }
      return newState;
    });
  };

  const currentWidget = widgetConfig[device];
  const currentPlayer = playerConfig[device];
  const isLinked = activeTab === "widget" ? widgetConfig.linked : playerConfig.linked;

  const toggleLink = () => {
    if (activeTab === "widget") {
      setWidgetConfig(prev => ({
        ...prev,
        linked: !prev.linked,
        mobile: !prev.linked ? { ...prev.desktop } : prev.mobile // Copia desktop pro mobile ao linkar
      }));
    } else {
      setPlayerConfig(prev => ({
        ...prev,
        linked: !prev.linked,
        mobile: !prev.linked ? { ...prev.desktop } : prev.mobile
      }));
    }
  };

  // Utilitários de UI e Cálculos
  const calcHeight = (format: string, width: number) => {
    if (format === "square" || format === "circular") return width;
    if (format === "portrait") return width * (16 / 9);
    if (format === "landscape") return width * (9 / 16);
    return width;
  };

  const CustomSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`} onClick={() => onChange(!checked)}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
      </div>
    </label>
  );

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-6 bg-background border border-border/60 rounded-xl overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 border-b border-border/60"><h4 className="text-sm font-semibold text-foreground/80">{title}</h4></div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] w-full h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between sticky top-0 bg-background z-10">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-500 animate-pulse" /> Aparência da Live
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
              <Save className="h-4 w-4" /> {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* MENU ESQUERDO - CONFIGURAÇÕES */}
          <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-muted/5 z-10">
            <div className="flex p-2 gap-1 border-b border-border bg-background shadow-sm">
              <button onClick={() => setActiveTab("widget")} className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-md transition-all ${activeTab === "widget" ? "bg-white shadow-sm border border-border text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}><LayoutTemplate className="h-4 w-4" />Divulgação</button>
              <button onClick={() => setActiveTab("player")} className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-md transition-all ${activeTab === "player" ? "bg-white shadow-sm border border-border text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}><PlaySquare className="h-4 w-4" />Player</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {activeTab === "widget" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <Section title="1. Formato & Dimensões">
                    <div className="space-y-2"><label className="text-xs font-medium">Formato</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={currentWidget.format} onChange={(e) => updateWidget("format", e.target.value)}>
                        <option value="portrait">Retrato 9:16</option><option value="landscape">Paisagem 16:9</option><option value="square">Quadrado</option><option value="circular">Circular</option>
                      </select>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-medium">Ajuste da Imagem</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={currentWidget.objectFit} onChange={(e) => updateWidget("objectFit", e.target.value)}>
                        <option value="cover">Cover (Preencher)</option><option value="contain">Contain (Ajustar)</option><option value="fill">Fill (Esticar)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><label className="text-xs font-medium">Largura (px)</label><Input type="number" value={currentWidget.width} onChange={(e) => updateWidget("width", Number(e.target.value))} className="h-9"/></div>
                      <div className="space-y-2"><label className="text-xs font-medium text-muted-foreground">Altura (Calculada)</label><Input disabled value={Math.round(calcHeight(currentWidget.format, currentWidget.width))} className="h-9 bg-muted/50"/></div>
                    </div>
                  </Section>

                  <Section title="2. Posição & Margens">
                    <div className="space-y-2"><label className="text-xs font-medium">Posição na Tela</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={currentWidget.position} onChange={(e) => updateWidget("position", e.target.value)}>
                        <option value="bottom-left">Inferior Esquerda</option><option value="bottom-right">Inferior Direita</option><option value="top-left">Superior Esquerda</option><option value="top-right">Superior Direita</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2"><label className="text-[10px] font-medium">Margem Inferior</label><Input type="number" value={currentWidget.marginBottom} onChange={(e) => updateWidget("marginBottom", Number(e.target.value))} className="h-8 text-xs"/></div>
                      <div className="space-y-2"><label className="text-[10px] font-medium">Margem Superior</label><Input type="number" value={currentWidget.marginTop} onChange={(e) => updateWidget("marginTop", Number(e.target.value))} className="h-8 text-xs"/></div>
                      <div className="space-y-2"><label className="text-[10px] font-medium">Margem Lateral</label><Input type="number" value={currentWidget.marginSide} onChange={(e) => updateWidget("marginSide", Number(e.target.value))} className="h-8 text-xs"/></div>
                    </div>
                  </Section>

                  <Section title="3. Bordas">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2 col-span-1"><label className="text-xs font-medium">Cor</label><div className="flex h-9 rounded-md border border-input overflow-hidden"><input type="color" value={currentWidget.borderColor} onChange={(e) => updateWidget("borderColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0"/><input type="text" value={currentWidget.borderColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none"/></div></div>
                      <div className="space-y-2"><label className="text-xs font-medium">Largura (px)</label><Input type="number" value={currentWidget.borderWidth} onChange={(e) => updateWidget("borderWidth", Number(e.target.value))} className="h-9"/></div>
                      <div className="space-y-2"><label className="text-xs font-medium">Raio (px)</label><Input type="number" value={currentWidget.borderRadius} onChange={(e) => updateWidget("borderRadius", Number(e.target.value))} disabled={currentWidget.format === 'circular'} className="h-9"/></div>
                    </div>
                  </Section>

                  <Section title="4. Elementos Visíveis">
                    <div className="space-y-2">
                      <CustomSwitch checked={currentWidget.showCTA} onChange={(v) => updateWidget("showCTA", v)} label="Exibir CTA" />
                      {currentWidget.showCTA && <div className="pl-4 pt-1"><Input value={currentWidget.ctaText} onChange={(e) => updateWidget("ctaText", e.target.value)} placeholder="Texto do botão" className="h-8 text-xs"/></div>}
                      <CustomSwitch checked={currentWidget.showCountdown} onChange={(v) => updateWidget("showCountdown", v)} label="Exibir Contador Regressivo" />
                      <CustomSwitch checked={currentWidget.playVideo} onChange={(v) => updateWidget("playVideo", v)} label="Reproduzir vídeo" />
                      <CustomSwitch checked={currentWidget.showCloseButton} onChange={(v) => updateWidget("showCloseButton", v)} label="Exibir botão de fechar (X)" />
                    </div>
                  </Section>
                </div>
              )}

              {activeTab === "player" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <Section title="1. Borda do Player">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2 col-span-1"><label className="text-xs font-medium">Cor</label><div className="flex h-9 rounded-md border border-input overflow-hidden"><input type="color" value={currentPlayer.borderColor} onChange={(e) => updatePlayer("borderColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0"/><input type="text" value={currentPlayer.borderColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none"/></div></div>
                      <div className="space-y-2"><label className="text-xs font-medium">Largura (px)</label><Input type="number" value={currentPlayer.borderWidth} onChange={(e) => updatePlayer("borderWidth", Number(e.target.value))} className="h-9"/></div>
                      <div className="space-y-2"><label className="text-xs font-medium">Raio (px)</label><Input type="number" value={currentPlayer.borderRadius} onChange={(e) => updatePlayer("borderRadius", Number(e.target.value))} className="h-9"/></div>
                    </div>
                  </Section>

                  <Section title="2. Elementos Visíveis">
                    <div className="space-y-2">
                      <CustomSwitch checked={currentPlayer.showTitle} onChange={(v) => updatePlayer("showTitle", v)} label="Exibir título" />
                      <CustomSwitch checked={currentPlayer.showBadge} onChange={(v) => updatePlayer("showBadge", v)} label="Selo destaque" />
                      {currentPlayer.showBadge && <div className="pl-4 pt-1"><div className="flex items-center gap-2 border border-dashed border-border rounded p-2 justify-center text-xs text-muted-foreground"><ImageIcon className="h-4 w-4"/> Enviar Imagem (150x150)</div></div>}
                      <CustomSwitch checked={currentPlayer.showViewerCount} onChange={(v) => updatePlayer("showViewerCount", v)} label="Exibir contador de espectadores" />
                      <CustomSwitch checked={currentPlayer.showChat} onChange={(v) => updatePlayer("showChat", v)} label="Exibir chat ao vivo" />
                      <CustomSwitch checked={currentPlayer.autoplayMuted} onChange={(v) => updatePlayer("autoplayMuted", v)} label="Iniciar com som desativado" />
                    </div>
                  </Section>

                  <Section title="3. Card de Produto">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                       <div className="space-y-2"><label className="text-xs font-medium">Fundo</label><div className="flex h-8 rounded-md border border-input overflow-hidden"><input type="color" value={currentPlayer.cardBgColor} onChange={(e) => updatePlayer("cardBgColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0"/><input type="text" value={currentPlayer.cardBgColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none"/></div></div>
                       <div className="space-y-2"><label className="text-xs font-medium">Cor Borda</label><div className="flex h-8 rounded-md border border-input overflow-hidden"><input type="color" value={currentPlayer.cardBorderColor} onChange={(e) => updatePlayer("cardBorderColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0"/><input type="text" value={currentPlayer.cardBorderColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none"/></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-2"><label className="text-xs font-medium">Largura Borda (px)</label><Input type="number" value={currentPlayer.cardBorderWidth} onChange={(e) => updatePlayer("cardBorderWidth", Number(e.target.value))} className="h-8 text-xs"/></div>
                      <div className="space-y-2"><label className="text-xs font-medium">Raio Borda (px)</label><Input type="number" value={currentPlayer.cardBorderRadius} onChange={(e) => updatePlayer("cardBorderRadius", Number(e.target.value))} className="h-8 text-xs"/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-border/50">
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Nome Prod. (Tamanho)</label><Input type="number" value={currentPlayer.productNameSize} onChange={(e) => updatePlayer("productNameSize", Number(e.target.value))} className="h-7 text-xs"/></div>
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Cor</label><input type="color" value={currentPlayer.productNameColor} onChange={(e) => updatePlayer("productNameColor", e.target.value)} className="w-full h-7 rounded border border-input cursor-pointer p-0"/></div>
                      
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Preço (Tamanho)</label><Input type="number" value={currentPlayer.priceSize} onChange={(e) => updatePlayer("priceSize", Number(e.target.value))} className="h-7 text-xs"/></div>
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Cor</label><input type="color" value={currentPlayer.priceColor} onChange={(e) => updatePlayer("priceColor", e.target.value)} className="w-full h-7 rounded border border-input cursor-pointer p-0"/></div>
                      
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Cupom (Tamanho)</label><Input type="number" value={currentPlayer.couponSize} onChange={(e) => updatePlayer("couponSize", Number(e.target.value))} className="h-7 text-xs"/></div>
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Cor</label><input type="color" value={currentPlayer.couponColor} onChange={(e) => updatePlayer("couponColor", e.target.value)} className="w-full h-7 rounded border border-input cursor-pointer p-0"/></div>
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </div>

          {/* ÁREA DE PREVIEW (DIREITA) */}
          <div className="flex-1 flex flex-col bg-[#F3F4F6] relative border-l border-border/50">
            {/* CONTROLES DE DISPOSITIVO NO TOPO DO PREVIEW */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-background border border-border/80 rounded-lg shadow-sm z-20">
              <button onClick={() => setDevice("desktop")} className={`p-2 rounded-md transition-all ${device === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><Monitor className="h-4 w-4" /></button>
              <button onClick={() => setDevice("mobile")} className={`p-2 rounded-md transition-all ${device === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><Smartphone className="h-4 w-4" /></button>
              <div className="w-[1px] h-4 bg-border mx-1"></div>
              <button onClick={toggleLink} title={isLinked ? "Desvincular configurações" : "Vincular configurações"} className={`p-2 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${isLinked ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}>
                {isLinked ? <><LinkIcon className="h-4 w-4"/> Linkado</> : <><Unlink className="h-4 w-4"/> Deslinkado</>}
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden w-full h-full relative">
              {/* O CONTAINER FAKE DA LOJA */}
              <div className={`relative bg-white shadow-2xl overflow-hidden transition-all duration-500 ease-in-out ${device === "desktop" ? "w-full max-w-[900px] h-full max-h-[600px] rounded-lg border border-border" : "w-[340px] h-[700px] rounded-[2.5rem] border-[8px] border-gray-900"}`}>
                
                {/* Header Fake da Loja */}
                <div className="w-full h-14 border-b border-gray-100 bg-gray-50 flex items-center px-6">
                  <div className="w-24 h-4 bg-gray-200 rounded-full"></div>
                  <div className="ml-auto flex gap-4 hidden sm:flex">
                    <div className="w-12 h-2 bg-gray-200 rounded-full"></div>
                    <div className="w-12 h-2 bg-gray-200 rounded-full"></div>
                  </div>
                </div>

                {/* --- PREVIEW DO WIDGET (DIVULGAÇÃO) --- */}
                {activeTab === "widget" && (
                  <div 
                    className="absolute z-10 transition-all duration-300 shadow-xl overflow-hidden group cursor-pointer flex flex-col items-center justify-center"
                    style={{
                      width: `${currentWidget.width}px`,
                      height: `${calcHeight(currentWidget.format, currentWidget.width)}px`,
                      borderRadius: currentWidget.format === 'circular' ? '50%' : `${currentWidget.borderRadius}px`,
                      border: `${currentWidget.borderWidth}px solid ${currentWidget.borderColor}`,
                      bottom: currentWidget.position.includes('bottom') ? `${currentWidget.marginBottom}px` : 'auto',
                      top: currentWidget.position.includes('top') ? `${currentWidget.marginTop}px` : 'auto',
                      left: currentWidget.position.includes('left') ? `${currentWidget.marginSide}px` : 'auto',
                      right: currentWidget.position.includes('right') ? `${currentWidget.marginSide}px` : 'auto',
                      backgroundColor: '#000',
                    }}
                  >
                    {/* Placeholder Video */}
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                       {currentWidget.playVideo ? <PlaySquare className="w-1/3 h-1/3 text-white/30" /> : <ImageIcon className="w-1/3 h-1/3 text-white/30" />}
                    </div>

                    {currentWidget.showCloseButton && (
                      <div className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><div className="w-3 h-3 flex items-center justify-center text-[8px]">X</div></div>
                    )}
                    
                    {currentWidget.showCountdown && (
                      <div className="absolute top-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> 05:00
                      </div>
                    )}

                    {currentWidget.showCTA && currentWidget.format !== 'circular' && (
                      <div className="absolute bottom-2 w-[90%] bg-primary text-primary-foreground text-center py-1 rounded-md text-[10px] font-bold shadow-md truncate px-1">
                        {currentWidget.ctaText || "Participe"}
                      </div>
                    )}
                  </div>
                )}

                {/* --- PREVIEW DO PLAYER --- */}
                {activeTab === "player" && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                     <div 
                        className="bg-black relative overflow-hidden flex flex-col shadow-2xl transition-all"
                        style={{
                          width: device === "mobile" ? '100%' : '360px',
                          height: device === "mobile" ? '100%' : '640px',
                          border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                          borderRadius: `${currentPlayer.borderRadius}px`,
                        }}
                     >
                        {/* Header Player */}
                        <div className="p-3 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full">
                          <div className="flex flex-col gap-2">
                             <div className="flex gap-2">
                               {currentPlayer.showBadge && <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[8px] text-white">Selo</div>}
                               <div className="flex flex-col">
                                 {currentPlayer.showTitle && <span className="text-white text-xs font-bold shadow-sm">Live Exclusiva</span>}
                                 {currentPlayer.showViewerCount && <span className="text-white/80 text-[10px] flex items-center gap-1"><Users className="w-3 h-3" /> 1.2k</span>}
                               </div>
                             </div>
                          </div>
                          {currentPlayer.autoplayMuted && <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white/90"><VolumeX className="w-3 h-3" /></div>}
                        </div>

                        {/* Center Player */}
                        <div className="flex-1 flex items-center justify-center text-white/10"><PlaySquare className="w-16 h-16" /></div>

                        {/* Bottom Actions & Product Card */}
                        <div className="p-3 flex flex-col gap-2 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent absolute bottom-0 w-full">
                           <div className="flex justify-end gap-2 mb-1">
                             {currentPlayer.showChat && <div className="bg-black/50 p-2 rounded-full text-white border border-white/20"><MessageSquare className="w-4 h-4" /></div>}
                             <div className="bg-black/50 p-2 rounded-full text-white border border-white/20"><Maximize className="w-4 h-4" /></div>
                           </div>
                           
                           {/* Product Card Preview */}
                           <div 
                             className="flex items-center gap-3 p-2 w-full shadow-lg"
                             style={{
                               backgroundColor: currentPlayer.cardBgColor,
                               border: `${currentPlayer.cardBorderWidth}px solid ${currentPlayer.cardBorderColor}`,
                               borderRadius: `${currentPlayer.cardBorderRadius}px`
                             }}
                           >
                              <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0"></div>
                              <div className="flex flex-col flex-1 truncate">
                                <span className="font-bold truncate" style={{ fontSize: `${currentPlayer.productNameSize}px`, color: currentPlayer.productNameColor }}>Super Tênis Esportivo</span>
                                <span className="font-black" style={{ fontSize: `${currentPlayer.priceSize}px`, color: currentPlayer.priceColor }}>R$ 199,90</span>
                                <span className="font-medium mt-0.5 px-1.5 py-0.5 rounded bg-gray-100 self-start inline-block" style={{ fontSize: `${currentPlayer.couponSize}px`, color: currentPlayer.couponColor }}>LIVE20</span>
                              </div>
                              <Button size="sm" className="h-8 text-xs px-2">Comprar</Button>
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
  );
}
'@

$code | Out-File -FilePath "src\components\live\LiveAppearanceModal.tsx" -Encoding utf8

git add src/components/live/LiveAppearanceModal.tsx
git commit -m "feat: modal de aparencia completo com link device e abas reais"
git push
