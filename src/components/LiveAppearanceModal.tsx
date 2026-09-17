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
  position: "bottom-right",
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

// --- COMPONENTES VISUAIS CUSTOMIZADOS ---
const ColorInput = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2.5">
    <div className="relative w-9 h-9 rounded-[10px] overflow-hidden shrink-0 shadow-sm border border-slate-200 bg-slate-50">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-[-25%] w-[150%] h-[150%] cursor-pointer border-0 p-0" 
      />
    </div>
    <input
      type="text"
      value={value.toUpperCase()}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-[90px] rounded-[14px] border border-slate-200 bg-slate-50/50 px-3 text-[12px] text-slate-600 shadow-sm outline-none focus:border-rose-500 focus:bg-white transition-colors"
    />
  </div>
);

const CustomSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
  <label className="flex items-center justify-between cursor-pointer py-2.5 px-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
    <span className="text-[13px] text-slate-700 font-medium">{label}</span>
    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-rose-600' : 'bg-slate-200'}`} onClick={() => onChange(!checked)}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </div>
  </label>
);

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

  const handleSave = () => { onSave(widgetConfig, playerConfig); };

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
      setWidgetConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
    } else {
      setPlayerConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
    }
  };

  const calcHeight = (format: string, width: number) => {
    if (format === "square" || format === "circular") return width;
    if (format === "portrait") return Math.round(width * 16 / 9);
    if (format === "landscape") return Math.round(width * 9 / 16);
    return width;
  };

  const AccordionItem = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => {
    const isOpen = openAccordion === id;
    return (
      <div className="mb-2 bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-sm transition-all duration-300">
        <button onClick={() => setOpenAccordion(isOpen ? "" : id)} className="w-full bg-white hover:bg-slate-50 px-4 py-3.5 flex justify-between items-center transition-colors">
          <h4 className="text-[14px] font-medium text-slate-700">{title}</h4>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && <div className="p-4 space-y-4 border-t border-slate-100 bg-white animate-in slide-in-from-top-2 duration-200">{children}</div>}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] w-full h-[90vh] p-0 flex flex-col overflow-hidden bg-white">
        
        {/* CABEÇALHO */}
        <div className="px-8 py-5 border-b border-slate-200 bg-white flex flex-col gap-5 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-800">
              Editar estilo de widgets das lives
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">✕</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
             <Button variant="outline" onClick={() => { setActiveTab("widget"); setOpenAccordion("formato"); }} className={`rounded-full px-5 h-9 text-[13px] font-medium transition-all ${activeTab === "widget" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><LayoutTemplate className="w-3.5 h-3.5 mr-2" /> Flutuante</Button>
             <Button variant="outline" onClick={() => { setActiveTab("player"); setOpenAccordion("borda_player"); }} className={`rounded-full px-5 h-9 text-[13px] font-medium transition-all ${activeTab === "player" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><PlaySquare className="w-3.5 h-3.5 mr-2" /> Player</Button>
          </div>
        </div>

        {/* CORPO */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* PAINEL ESQUERDO */}
          <div className="w-[360px] min-w-[360px] bg-white border-r border-slate-200 flex flex-col z-10">
            <div className="pt-6 pb-4 px-6">
              <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
                Configurações do {activeTab === "widget" ? "Flutuante" : "Player"}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
              {/* Dispositivo */}
              <div className="flex items-center justify-between p-1 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                <span className="text-[13px] font-medium text-slate-500 px-3">Dispositivo</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-lg transition-colors ${device === "desktop" ? "bg-white shadow-sm text-rose-600 border border-slate-200/50" : "text-slate-400 hover:bg-slate-200/50"}`} title="Desktop"><Monitor className="h-4 w-4" /></button>
                  <button onClick={toggleLink} className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200/50 ${isLinked ? "text-rose-600" : "text-slate-400"}`} title={isLinked ? "Desvincular" : "Vincular"}>
                    {isLinked ? <LinkIcon className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-lg transition-colors ${device === "mobile" ? "bg-white shadow-sm text-rose-600 border border-slate-200/50" : "text-slate-400 hover:bg-slate-200/50"}`} title="Mobile"><Smartphone className="h-4 w-4" /></button>
                </div>
              </div>

              {/* === FLUTUANTE === */}
              {activeTab === "widget" && (
                <div className="animate-in fade-in duration-300">
                  <AccordionItem id="formato" title="1. Formato & Dimensões">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-slate-600">Formato</label>
                      <select className="w-full h-9 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all shadow-sm" value={currentWidget.format} onChange={(e) => updateWidget("format", e.target.value)}>
                        <option value="portrait">Retrato 9:16</option>
                        <option value="landscape">Paisagem 16:9</option>
                        <option value="square">Quadrado</option>
                        <option value="circular">Circular</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-slate-600">Ajuste da Imagem</label>
                      <select className="w-full h-9 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all shadow-sm" value={currentWidget.objectFit} onChange={(e) => updateWidget("objectFit", e.target.value)}>
                        <option value="cover">Cover (Preencher)</option>
                        <option value="contain">Contain (Ajustar)</option>
                        <option value="fill">Fill (Esticar)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Largura (px)</label>
                        <Input type="number" value={currentWidget.width} onChange={(e) => updateWidget("width", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-400">Altura (px)</label>
                        <Input disabled value={Math.round(calcHeight(currentWidget.format, currentWidget.width))} className="h-9 rounded-[14px] text-[13px] bg-slate-100/50 border-slate-200 text-slate-400" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="posicao" title="2. Posição & Margens">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-slate-600">Posição na Tela</label>
                      <select className="w-full h-9 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all shadow-sm" value={currentWidget.position} onChange={(e) => updateWidget("position", e.target.value)}>
                        <option value="bottom-left">Inferior Esquerda</option>
                        <option value="bottom-right">Inferior Direita</option>
                        <option value="top-left">Superior Esquerda</option>
                        <option value="top-right">Superior Direita</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600 leading-tight">Margem Y (px)</label>
                        <Input type="number" value={currentWidget.position.includes('bottom') ? currentWidget.marginBottom : currentWidget.marginTop} onChange={(e) => updateWidget(currentWidget.position.includes('bottom') ? "marginBottom" : "marginTop", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600 leading-tight">Margem X (px)</label>
                        <Input type="number" value={currentWidget.marginSide} onChange={(e) => updateWidget("marginSide", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="bordas" title="3. Bordas">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Cor da Borda</label>
                        <ColorInput value={currentWidget.borderColor} onChange={(v) => updateWidget("borderColor", v)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Largura Borda (px)</label>
                        <Input type="number" value={currentWidget.borderWidth} onChange={(e) => updateWidget("borderWidth", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Raio da Borda (px)</label>
                        <Input type="number" value={currentWidget.borderRadius} onChange={(e) => updateWidget("borderRadius", Number(e.target.value))} disabled={currentWidget.format === 'circular'} className="h-9 rounded-[14px] text-[13px] shadow-sm disabled:opacity-50 focus-visible:ring-rose-500" />
                      </div>
                    </div>
                  </AccordionItem>

                  <AccordionItem id="elementos" title="4. Elementos Visíveis">
                    <div className="space-y-2">
                      <CustomSwitch checked={currentWidget.showCTA} onChange={(v) => updateWidget("showCTA", v)} label="Exibir CTA (Balão)" />
                      {currentWidget.showCTA && (
                        <div className="pl-4 pt-1 pb-2">
                          <Input value={currentWidget.ctaText} onChange={(e) => updateWidget("ctaText", e.target.value)} placeholder="Ex: AO VIVO" className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                        </div>
                      )}
                      <CustomSwitch checked={currentWidget.showCountdown} onChange={(v) => updateWidget("showCountdown", v)} label="Contador Regressivo" />
                      <CustomSwitch checked={currentWidget.playVideo} onChange={(v) => updateWidget("playVideo", v)} label="Ícone de Reprodução" />
                      <CustomSwitch checked={currentWidget.showCloseButton} onChange={(v) => updateWidget("showCloseButton", v)} label="Botão Fechar (X)" />
                    </div>
                  </AccordionItem>
                </div>
              )}

              {/* === PLAYER === */}
              {activeTab === "player" && (
                <div className="animate-in fade-in duration-300">
                  <AccordionItem id="borda_player" title="1. Borda e Player">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Cor da Borda</label>
                        <ColorInput value={currentPlayer.borderColor} onChange={(v) => updatePlayer("borderColor", v)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Largura Borda (px)</label>
                        <Input type="number" value={currentPlayer.borderWidth} onChange={(e) => updatePlayer("borderWidth", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Raio da Borda (px)</label>
                        <Input type="number" value={currentPlayer.borderRadius} onChange={(e) => updatePlayer("borderRadius", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
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
                    <div className="grid grid-cols-1 gap-4 mb-4">
                       <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-slate-600">Fundo do Card</label>
                          <ColorInput value={currentPlayer.cardBgColor} onChange={(v) => updatePlayer("cardBgColor", v)} />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-slate-600">Cor Borda do Card</label>
                          <ColorInput value={currentPlayer.cardBorderColor} onChange={(v) => updatePlayer("cardBorderColor", v)} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Espessura (px)</label>
                        <Input type="number" value={currentPlayer.cardBorderWidth} onChange={(e) => updatePlayer("cardBorderWidth", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-slate-600">Raio (px)</label>
                        <Input type="number" value={currentPlayer.cardBorderRadius} onChange={(e) => updatePlayer("cardBorderRadius", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cor Nome</label>
                          <ColorInput value={currentPlayer.productNameColor} onChange={(v) => updatePlayer("productNameColor", v)} />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tamanho Nome</label>
                           <Input type="number" value={currentPlayer.productNameSize} onChange={(e) => updatePlayer("productNameSize", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 items-end">
                         <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cor Preço</label>
                          <ColorInput value={currentPlayer.priceColor} onChange={(v) => updatePlayer("priceColor", v)} />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tamanho Preço</label>
                           <Input type="number" value={currentPlayer.priceSize} onChange={(e) => updatePlayer("priceSize", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 items-end">
                         <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cor Botão</label>
                          <ColorInput value={currentPlayer.couponColor} onChange={(v) => updatePlayer("couponColor", v)} />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tamanho Botão</label>
                           <Input type="number" value={currentPlayer.couponSize} onChange={(e) => updatePlayer("couponSize", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px] shadow-sm focus-visible:ring-rose-500" />
                        </div>
                      </div>
                    </div>
                  </AccordionItem>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO - PREVIEW */}
          <div className="flex-1 flex flex-col relative items-center justify-center p-6 bg-slate-50/60 overflow-hidden">
            
            <div className="w-full max-w-[1000px] h-full max-h-[750px] bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-6 relative overflow-hidden">
                
                <div className="absolute top-4 right-4 z-30 flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}><Monitor className="h-4 w-4" /></button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}><Smartphone className="h-4 w-4" /></button>
                </div>

                {/* --- CAIXA DE PREVIEW REAJUSTADA AQUI --- */}
                <div className={`relative bg-[#0a0a0a] transition-all duration-500 flex flex-col shrink-0 ${
                  device === "desktop" 
                    ? "w-full max-w-[850px] aspect-video rounded-xl border-4 border-[#0a0a0a] ring-2 ring-rose-500/30 overflow-hidden shadow-xl" 
                    : "w-[280px] h-[600px] rounded-[3rem] shadow-[0_0_0_4px_#f4d1c0,0_20px_40px_rgba(0,0,0,0.15)] border-[8px] border-[#0a0a0a] overflow-hidden"
                }`}>
                  
                  {/* Notch do celular */}
                  {device === "mobile" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[22px] bg-[#0a0a0a] rounded-b-[1rem] z-[100]"></div>
                  )}

                  {activeTab === "widget" && (
                    <div className="absolute inset-0">
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
                          <video src="/demo-videos/demo1.mp4" autoPlay loop muted playsInline className="w-full h-full" style={{ objectFit: currentWidget.objectFit }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                          {currentWidget.showCloseButton && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] font-bold backdrop-blur-sm z-10 transition-colors">✕</div>}
                          {currentWidget.playVideo && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"><PlaySquare className="w-4 h-4 ml-0.5 fill-white"/></div>}
                          {currentWidget.showCountdown && <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">00:15:30</div>}
                          {currentWidget.showCTA && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg border border-white/20 z-20" style={{ backgroundColor: currentWidget.borderColor }}>
                              {currentWidget.ctaText}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {activeTab === "player" && (
                    <div className="absolute inset-0 flex flex-col bg-[#050505] overflow-hidden" style={{ border: currentPlayer.borderWidth > 0 ? `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}` : 'none', borderRadius: currentPlayer.borderRadius }}>
                        <div className="absolute inset-0 opacity-60"><video src="/demo-videos/demo2.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" /></div>

                        <div className="p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent pt-6">
                          <div className="flex gap-2 flex-wrap">
                            {currentPlayer.showBadge && <div className="bg-amber-400 text-amber-950 text-xs font-extrabold px-2 py-1 rounded shadow-sm uppercase tracking-wider">Destaque</div>}
                            <div className="bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase tracking-wider"><Radio className="w-3 h-3 animate-pulse"/> Ao Vivo</div>
                            {currentPlayer.showViewerCount && <div className="bg-black/40 backdrop-blur-md text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> 1.2k</div>}
                          </div>
                          {currentPlayer.autoplayMuted && <div className="bg-black/40 backdrop-blur-md p-1.5 rounded text-white mt-1"><VolumeX className="w-4 h-4"/></div>}
                        </div>

                        <div className="flex-1 flex items-center justify-center z-10 relative group cursor-pointer">
                          <div className="w-16 h-16 bg-white/10 group-hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-xl border border-white/10"><PlaySquare className="w-6 h-6 text-white ml-1" /></div>
                        </div>

                        <div className="p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-3 z-10 pb-6">
                          {currentPlayer.showTitle && <h2 className="text-white font-bold text-xl drop-shadow-md">Lançamento Exclusivo Nova Coleção</h2>}

                          <div className="flex items-center p-2 rounded-lg gap-3 shadow-lg bg-black/20 backdrop-blur-md" style={{ backgroundColor: currentPlayer.cardBgColor !== '#FFFFFF' ? currentPlayer.cardBgColor : 'rgba(255, 255, 255, 0.95)', border: `${currentPlayer.cardBorderWidth}px solid ${currentPlayer.cardBorderColor}`, borderRadius: currentPlayer.cardBorderRadius }}>
                              <div className="w-14 h-14 bg-slate-200 rounded object-cover overflow-hidden shrink-0"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover"/></div>
                              <div className="flex-1 min-w-0">
                                  <div style={{ fontSize: currentPlayer.productNameSize, color: currentPlayer.productNameColor }} className="font-semibold truncate">Tênis Nike Revolution 6</div>
                                  <div style={{ fontSize: currentPlayer.priceSize, color: currentPlayer.priceColor }} className="font-black mt-0.5">R$ 299,90</div>
                              </div>
                              <button style={{ backgroundColor: currentPlayer.couponColor, fontSize: currentPlayer.couponSize }} className="px-4 py-2 rounded text-white font-bold shrink-0 shadow-sm transition-transform hover:scale-105 uppercase tracking-wider">Comprar</button>
                          </div>

                          {currentPlayer.showChat && (
                              <div className="flex gap-2 items-center mt-1">
                                  <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 text-white/60 text-[13px]">Comente na live...</div>
                                  <div className="bg-rose-600 p-2.5 rounded-full text-white shadow-md"><MessageSquare className="w-5 h-5"/></div>
                              </div>
                          )}
                        </div>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between z-20">
          <Button variant="ghost" onClick={handleReset} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold px-2">
            <RotateCcw className="w-4 h-4 mr-2" /> RESETAR
          </Button>

          <div className="flex items-center text-[12px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full">
            <Info className="w-4 h-4 mr-2 text-slate-400" /> 
            Este painel é um preview meramente visual. Para testar cliques e interações, use o simulador.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-6 font-medium rounded-full">
              ✕ Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md h-10 px-6 font-medium rounded-full">
              <Save className="h-4 w-4 mr-2" /> {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
