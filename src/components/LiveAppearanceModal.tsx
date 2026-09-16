import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, Link as LinkIcon, Unlink, Radio, Save, LayoutTemplate, PlaySquare,
  MessageSquare, Users, VolumeX, ChevronDown, RotateCcw, Info
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
export const defaultWidgetSettings: LiveWidgetSettings = {
  format: "portrait",
  objectFit: "cover",
  width: 120,
  position: "bottom-right", // Ajustado padrão para direita para combinar com o print
  marginBottom: 20,
  marginTop: 20,
  marginSide: 20,
  borderColor: "#E11D48",
  borderWidth: 2,
  borderRadius: 12,
  showCTA: true,
  ctaText: "AO VIVO",
  showCountdown: false,
  playVideo: true,
  showCloseButton: true,
};

export const defaultPlayerSettings: LivePlayerSettings = {
  borderColor: "#E11D48",
  borderWidth: 0,
  borderRadius: 12,
  showTitle: true,
  showBadge: true,
  badgeUrl: "",
  showViewerCount: true,
  showChat: true,
  autoplayMuted: true,
  cardBgColor: "#FFFFFF",
  cardBorderColor: "#E2E8F0",
  cardBorderWidth: 1,
  cardBorderRadius: 8,
  productNameSize: 14,
  productNameColor: "#0F172A",
  priceSize: 16,
  priceColor: "#E11D48",
  couponSize: 12,
  couponColor: "#22C55E",
};

export default function LiveAppearanceModal({
  isOpen, onClose, onSave, initialWidgetConfig, initialPlayerConfig, isSaving
}: Props) {
  const [activeTab, setActiveTab] = useState<"widget" | "player">("widget");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [openAccordion, setOpenAccordion] = useState<string>("formato");

  const [widgetConfig, setWidgetConfig] = useState<DeviceConfig<LiveWidgetSettings>>({
    desktop: { ...defaultWidgetSettings },
    mobile: { ...defaultWidgetSettings, width: 90, marginBottom: 10, marginSide: 10 },
    linked: false
  });

  const [playerConfig, setPlayerConfig] = useState<DeviceConfig<LivePlayerSettings>>({
    desktop: { ...defaultPlayerSettings },
    mobile: { ...defaultPlayerSettings },
    linked: true
  });

  useEffect(() => {
    if (isOpen) {
      if (initialWidgetConfig && initialWidgetConfig.desktop) setWidgetConfig(initialWidgetConfig);
      if (initialPlayerConfig && initialPlayerConfig.desktop) setPlayerConfig(initialPlayerConfig);
    }
  }, [isOpen, initialWidgetConfig, initialPlayerConfig]);

  const handleSave = () => {
    onSave(widgetConfig, playerConfig);
  };

  const handleReset = () => {
    setWidgetConfig({
      desktop: { ...defaultWidgetSettings },
      mobile: { ...defaultWidgetSettings, width: 90, marginBottom: 10, marginSide: 10 },
      linked: false
    });
    setPlayerConfig({
      desktop: { ...defaultPlayerSettings },
      mobile: { ...defaultPlayerSettings },
      linked: true
    });
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
        mobile: !prev.linked ? { ...prev.desktop } : prev.mobile
      }));
    } else {
      setPlayerConfig(prev => ({
        ...prev,
        linked: !prev.linked,
        mobile: !prev.linked ? { ...prev.desktop } : prev.mobile
      }));
    }
  };

  const calcHeight = (format: string, width: number) => {
    if (format === "square" || format === "circular") return width;
    if (format === "portrait") return Math.round(width * 16 / 9);
    if (format === "landscape") return Math.round(width * 9 / 16);
    return width;
  };

  // Componentes de UI Locais
  const CustomSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-rose-600' : 'bg-muted'}`} onClick={() => onChange(!checked)}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
      </div>
    </label>
  );

  const AccordionItem = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => {
    const isOpen = openAccordion === id;
    return (
      <div className="mb-3 bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <button
          onClick={() => setOpenAccordion(isOpen ? "" : id)}
          className="w-full bg-muted/10 hover:bg-muted/30 px-4 py-3 flex justify-between items-center transition-colors"
        >
          <h4 className="text-sm font-semibold text-foreground/80">{title}</h4>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="p-4 space-y-4 border-t border-border/50 bg-background animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] w-full h-[90vh] p-0 flex flex-col overflow-hidden bg-muted/10">
        
        {/* CABEÇALHO SUPERIOR (Estilo Print 2) */}
        <div className="px-6 py-4 border-b border-border bg-background flex flex-col gap-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Editar Estilo</h2>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">✕</button>
          </div>
          
          {/* Abas */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
             <Button 
                variant={activeTab === "widget" ? "default" : "outline"} 
                onClick={() => { setActiveTab("widget"); setOpenAccordion("formato"); }} 
                className={`rounded-full px-6 transition-all ${activeTab === "widget" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "border-border text-foreground hover:bg-muted"}`}
             >
                <LayoutTemplate className="w-4 h-4 mr-2" /> Flutuante
             </Button>
             <Button 
                variant={activeTab === "player" ? "default" : "outline"} 
                onClick={() => { setActiveTab("player"); setOpenAccordion("borda_player"); }} 
                className={`rounded-full px-6 transition-all ${activeTab === "player" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "border-border text-foreground hover:bg-muted"}`}
             >
                <PlaySquare className="w-4 h-4 mr-2" /> Player
             </Button>
          </div>
        </div>

        {/* CORPO PRINCIPAL */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* PAINEL ESQUERDO - CONFIGURAÇÕES */}
          <div className="w-[380px] min-w-[380px] bg-background border-r border-border flex flex-col z-10">
            <div className="p-5 border-b border-border/50">
              <h3 className="font-bold text-foreground">
                Configurações do {activeTab === "widget" ? "Flutuante" : "Player"}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              
              {/* Controles do Dispositivo e Link */}
              <div className="flex items-center justify-between p-1 bg-muted/40 border border-border rounded-lg mb-6">
                <span className="text-xs font-medium text-muted-foreground px-3">Dispositivo</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-white shadow-sm text-rose-600" : "text-muted-foreground hover:bg-muted"}`} title="Desktop"><Monitor className="h-4 w-4" /></button>
                  <button onClick={toggleLink} className={`p-1.5 rounded-md transition-colors hover:bg-muted ${isLinked ? "text-rose-600" : "text-muted-foreground"}`} title={isLinked ? "Desvincular" : "Vincular"}>
                    {isLinked ? <LinkIcon className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-white shadow-sm text-rose-600" : "text-muted-foreground hover:bg-muted"}`} title="Mobile"><Smartphone className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Acordeão Flutuante */}
              {activeTab === "widget" && (
                <div className="animate-in fade-in duration-300">
                  <AccordionItem id="formato" title="1. Formato & Dimensões">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Formato</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all" value={currentWidget.format} onChange={(e) => updateWidget("format", e.target.value)}>
                        <option value="portrait">Retrato 9:16</option>
                        <option value="landscape">Paisagem 16:9</option>
                        <option value="square">Quadrado</option>
                        <option value="circular">Circular</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Ajuste da Imagem</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all" value={currentWidget.objectFit} onChange={(e) => updateWidget("objectFit", e.target.value)}>
                        <option value="cover">Cover (Preencher)</option>
                        <option value="contain">Contain (Ajustar)</option>
                        <option value="fill">Fill (Esticar)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Largura (px)</label>
                        <Input type="number" value={currentWidget.width} onChange={(e) => updateWidget("width", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Altura (px)</label>
                        <Input disabled value={Math.round(calcHeight(currentWidget.format, currentWidget.width))} className="h-9 bg-muted/50" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="posicao" title="2. Posição & Margens">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Posição na Tela</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all" value={currentWidget.position} onChange={(e) => updateWidget("position", e.target.value)}>
                        <option value="bottom-left">Inferior Esquerda</option>
                        <option value="bottom-right">Inferior Direita</option>
                        <option value="top-left">Superior Esquerda</option>
                        <option value="top-right">Superior Direita</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium leading-tight">Margem Y (px)</label>
                        <Input type="number" value={currentWidget.position.includes('bottom') ? currentWidget.marginBottom : currentWidget.marginTop} onChange={(e) => updateWidget(currentWidget.position.includes('bottom') ? "marginBottom" : "marginTop", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium leading-tight">Margem X (px)</label>
                        <Input type="number" value={currentWidget.marginSide} onChange={(e) => updateWidget("marginSide", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="bordas" title="3. Bordas">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2 col-span-1">
                        <label className="text-xs font-medium">Cor</label>
                        <div className="flex h-9 rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-rose-500">
                          <input type="color" value={currentWidget.borderColor} onChange={(e) => updateWidget("borderColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0" />
                          <input type="text" value={currentWidget.borderColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none bg-background" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Espessura</label>
                        <Input type="number" value={currentWidget.borderWidth} onChange={(e) => updateWidget("borderWidth", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Raio</label>
                        <Input type="number" value={currentWidget.borderRadius} onChange={(e) => updateWidget("borderRadius", Number(e.target.value))} disabled={currentWidget.format === 'circular'} className="h-9 disabled:opacity-50 focus-visible:ring-rose-500" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="elementos" title="4. Elementos Visíveis">
                    <div className="space-y-2">
                      <CustomSwitch checked={currentWidget.showCTA} onChange={(v) => updateWidget("showCTA", v)} label="Exibir CTA (Balão)" />
                      {currentWidget.showCTA && (
                        <div className="pl-4 pt-1 pb-2"><Input value={currentWidget.ctaText} onChange={(e) => updateWidget("ctaText", e.target.value)} placeholder="Ex: AO VIVO" className="h-9 text-xs focus-visible:ring-rose-500" /></div>
                      )}
                      <CustomSwitch checked={currentWidget.showCountdown} onChange={(v) => updateWidget("showCountdown", v)} label="Contador Regressivo" />
                      <CustomSwitch checked={currentWidget.playVideo} onChange={(v) => updateWidget("playVideo", v)} label="Ícone de Reprodução" />
                      <CustomSwitch checked={currentWidget.showCloseButton} onChange={(v) => updateWidget("showCloseButton", v)} label="Botão Fechar (X)" />
                    </div>
                  </AccordionItem>
                </div>
              )}

              {/* Acordeão Player */}
              {activeTab === "player" && (
                <div className="animate-in fade-in duration-300">
                  <AccordionItem id="borda_player" title="1. Borda e Player">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2 col-span-1">
                        <label className="text-xs font-medium">Cor</label>
                        <div className="flex h-9 rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-rose-500">
                          <input type="color" value={currentPlayer.borderColor} onChange={(e) => updatePlayer("borderColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0" />
                          <input type="text" value={currentPlayer.borderColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none bg-background" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Espessura</label>
                        <Input type="number" value={currentPlayer.borderWidth} onChange={(e) => updatePlayer("borderWidth", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Raio (px)</label>
                        <Input type="number" value={currentPlayer.borderRadius} onChange={(e) => updatePlayer("borderRadius", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="elementos_player" title="2. Elementos Visíveis">
                    <div className="space-y-2">
                      <CustomSwitch checked={currentPlayer.showTitle} onChange={(v) => updatePlayer("showTitle", v)} label="Exibir título da Live" />
                      <CustomSwitch checked={currentPlayer.showBadge} onChange={(v) => updatePlayer("showBadge", v)} label="Selo destaque" />
                      <CustomSwitch checked={currentPlayer.showViewerCount} onChange={(v) => updatePlayer("showViewerCount", v)} label="Contador de espectadores" />
                      <CustomSwitch checked={currentPlayer.showChat} onChange={(v) => updatePlayer("showChat", v)} label="Exibir chat ao vivo" />
                      <CustomSwitch checked={currentPlayer.autoplayMuted} onChange={(v) => updatePlayer("autoplayMuted", v)} label="Ícone de volume" />
                    </div>
                  </AccordionItem>

                  <AccordionItem id="estilo_produto" title="3. Estilo do Produto (Card)">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                       <div className="space-y-2"><label className="text-xs font-medium">Fundo do Card</label><div className="flex h-9 rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-rose-500"><input type="color" value={currentPlayer.cardBgColor} onChange={(e) => updatePlayer("cardBgColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0" /><input type="text" value={currentPlayer.cardBgColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none bg-background"/></div></div>
                       <div className="space-y-2"><label className="text-xs font-medium">Cor Borda</label><div className="flex h-9 rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-rose-500"><input type="color" value={currentPlayer.cardBorderColor} onChange={(e) => updatePlayer("cardBorderColor", e.target.value)} className="w-8 h-full cursor-pointer border-0 p-0" /><input type="text" value={currentPlayer.cardBorderColor.toUpperCase()} readOnly className="w-full text-[10px] px-1 outline-none bg-background"/></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-2"><label className="text-xs font-medium">Espessura (px)</label><Input type="number" value={currentPlayer.cardBorderWidth} onChange={(e) => updatePlayer("cardBorderWidth", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" /></div>
                      <div className="space-y-2"><label className="text-xs font-medium">Raio (px)</label><Input type="number" value={currentPlayer.cardBorderRadius} onChange={(e) => updatePlayer("cardBorderRadius", Number(e.target.value))} className="h-9 focus-visible:ring-rose-500" /></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-4 border-t border-border/50">
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground uppercase">Tamanho Nome</label><Input type="number" value={currentPlayer.productNameSize} onChange={(e) => updatePlayer("productNameSize", Number(e.target.value))} className="h-8 text-xs focus-visible:ring-rose-500" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground uppercase">Cor Nome</label><div className="flex h-8 rounded border border-input overflow-hidden"><input type="color" value={currentPlayer.productNameColor} onChange={(e) => updatePlayer("productNameColor", e.target.value)} className="w-full h-full cursor-pointer border-0 p-0" /></div></div>
                      
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground uppercase">Tamanho Preço</label><Input type="number" value={currentPlayer.priceSize} onChange={(e) => updatePlayer("priceSize", Number(e.target.value))} className="h-8 text-xs focus-visible:ring-rose-500" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground uppercase">Cor Preço</label><div className="flex h-8 rounded border border-input overflow-hidden"><input type="color" value={currentPlayer.priceColor} onChange={(e) => updatePlayer("priceColor", e.target.value)} className="w-full h-full cursor-pointer border-0 p-0" /></div></div>
                      
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground uppercase">Tamanho Botão</label><Input type="number" value={currentPlayer.couponSize} onChange={(e) => updatePlayer("couponSize", Number(e.target.value))} className="h-8 text-xs focus-visible:ring-rose-500" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground uppercase">Cor Botão</label><div className="flex h-8 rounded border border-input overflow-hidden"><input type="color" value={currentPlayer.couponColor} onChange={(e) => updatePlayer("couponColor", e.target.value)} className="w-full h-full cursor-pointer border-0 p-0" /></div></div>
                    </div>
                  </AccordionItem>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO - PREVIEW */}
          <div className="flex-1 flex flex-col relative items-center justify-center p-8 overflow-hidden bg-muted/20">
            
            {/* CONTAINER ESCURO DO PREVIEW */}
            <div className={`relative bg-[#050505] shadow-2xl overflow-hidden transition-all duration-500 flex flex-col ring-2 ring-rose-500/50 ${device === "desktop" ? "w-full max-w-[900px] aspect-video rounded-xl" : "w-[360px] h-[700px] rounded-[2.5rem] border-[10px] border-[#111]"}`}>
              
              {/* Overlay de Toggle Device Canto Superior Direito */}
              <div className="absolute top-4 right-4 z-30 flex items-center bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-lg">
                <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-rose-600 text-white" : "text-white/50 hover:bg-white/10 hover:text-white"}`} title="Visualizar no Desktop"><Monitor className="h-4 w-4" /></button>
                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-rose-600 text-white" : "text-white/50 hover:bg-white/10 hover:text-white"}`} title="Visualizar no Mobile"><Smartphone className="h-4 w-4" /></button>
              </div>
              
              {/* PREVIEW DIVULGAÇÃO (WIDGET) */}
              {activeTab === "widget" && (
                <div className="absolute inset-0">
                  {/* O Widget Flutuante */}
                  <div className="absolute transition-all duration-300 shadow-[0_10px_40px_rgba(225,29,72,0.15)] group cursor-pointer" 
                       style={{
                         ...(currentWidget.position.includes('bottom') ? { bottom: currentWidget.marginBottom } : { top: currentWidget.marginTop }),
                         ...(currentWidget.position.includes('left') ? { left: currentWidget.marginSide } : { right: currentWidget.marginSide }),
                         width: currentWidget.width,
                         height: calcHeight(currentWidget.format, currentWidget.width),
                         border: `${currentWidget.borderWidth}px solid ${currentWidget.borderColor}`,
                         borderRadius: currentWidget.format === 'circular' ? '50%' : currentWidget.borderRadius,
                         overflow: 'hidden',
                         backgroundColor: '#000'
                       }}>
                       
                       {/* Vídeo Demo */}
                       <video 
                          src="/demo-videos/demo1.mp4" 
                          autoPlay loop muted playsInline 
                          className="w-full h-full" 
                          style={{ objectFit: currentWidget.objectFit }} 
                       />
                       
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                       {/* Elementos */}
                       {currentWidget.showCloseButton && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] font-bold backdrop-blur-sm z-10 transition-colors">✕</div>}
                       
                       {currentWidget.playVideo && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"><PlaySquare className="w-4 h-4 ml-0.5 fill-white"/></div>}
                       
                       {currentWidget.showCountdown && <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">00:15:30</div>}
                       
                       {currentWidget.showCTA && (
                         <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg border border-white/20 z-20"
                              style={{ backgroundColor: currentWidget.borderColor }}>
                           {currentWidget.ctaText}
                         </div>
                       )}
                  </div>
                </div>
              )}

              {/* PREVIEW PLAYER */}
              {activeTab === "player" && (
                <div className="absolute inset-0 flex flex-col bg-[#050505] overflow-hidden" 
                     style={{
                       border: currentPlayer.borderWidth > 0 ? `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}` : 'none',
                       borderRadius: currentPlayer.borderRadius,
                     }}>
                     
                     {/* Vídeo Demo Fundo */}
                     <div className="absolute inset-0 opacity-60">
                       <video src="/demo-videos/demo2.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                     </div>

                    {/* Header Overlay */}
                    <div className="p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent pt-6">
                      <div className="flex gap-2 flex-wrap">
                        {currentPlayer.showBadge && <div className="bg-amber-400 text-amber-950 text-xs font-extrabold px-2 py-1 rounded shadow-sm uppercase tracking-wider">Destaque</div>}
                        <div className="bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase tracking-wider"><Radio className="w-3 h-3 animate-pulse"/> Ao Vivo</div>
                        {currentPlayer.showViewerCount && <div className="bg-black/40 backdrop-blur-md text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> 1.2k</div>}
                      </div>
                      {currentPlayer.autoplayMuted && <div className="bg-black/40 backdrop-blur-md p-1.5 rounded text-white mt-1"><VolumeX className="w-4 h-4"/></div>}
                    </div>

                    {/* Centro */}
                    <div className="flex-1 flex items-center justify-center z-10 relative group cursor-pointer">
                       <div className="w-16 h-16 bg-white/10 group-hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-xl border border-white/10">
                         <PlaySquare className="w-6 h-6 text-white ml-1" />
                       </div>
                    </div>

                    {/* Footer Overlay */}
                    <div className="p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-3 z-10 pb-6">
                      {currentPlayer.showTitle && <h2 className="text-white font-bold text-xl drop-shadow-md">Lançamento Exclusivo Nova Coleção</h2>}

                      {/* Card Produto */}
                      <div className="flex items-center p-2 rounded-lg gap-3 shadow-lg bg-black/20 backdrop-blur-md" 
                           style={{
                             backgroundColor: currentPlayer.cardBgColor !== '#FFFFFF' ? currentPlayer.cardBgColor : 'rgba(255, 255, 255, 0.95)',
                             border: `${currentPlayer.cardBorderWidth}px solid ${currentPlayer.cardBorderColor}`,
                             borderRadius: currentPlayer.cardBorderRadius
                           }}>
                          <div className="w-14 h-14 bg-muted rounded object-cover overflow-hidden shrink-0"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover"/></div>
                          <div className="flex-1 min-w-0">
                              <div style={{ fontSize: currentPlayer.productNameSize, color: currentPlayer.productNameColor }} className="font-semibold truncate">Tênis Nike Revolution 6</div>
                              <div style={{ fontSize: currentPlayer.priceSize, color: currentPlayer.priceColor }} className="font-black mt-0.5">R$ 299,90</div>
                          </div>
                          <button style={{ backgroundColor: currentPlayer.couponColor, fontSize: currentPlayer.couponSize }} className="px-4 py-2 rounded text-white font-bold shrink-0 shadow-sm transition-transform hover:scale-105 uppercase tracking-wider">Comprar</button>
                      </div>

                      {/* Fake Chat */}
                      {currentPlayer.showChat && (
                          <div className="flex gap-2 items-center mt-1">
                              <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 text-white/60 text-sm">Comente na live...</div>
                              <div className="bg-rose-600 p-2.5 rounded-full text-white shadow-md"><MessageSquare className="w-5 h-5"/></div>
                          </div>
                      )}
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ ESTILO PRINT 2 */}
        <div className="px-6 py-4 border-t border-border bg-background flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <Button variant="outline" onClick={handleReset} className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
            <RotateCcw className="w-4 h-4 mr-2" /> RESETAR
          </Button>

          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
            <Info className="w-3.5 h-3.5 mr-1.5" /> 
            Este painel é um preview meramente visual.
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Save className="h-4 w-4 mr-2" /> {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
