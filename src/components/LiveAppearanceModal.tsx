import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, Link as LinkIcon, Unlink, Radio, Save, LayoutTemplate, PlaySquare,
  VolumeX, ChevronDown, RotateCcw, Info, ShoppingCart, ExternalLink, Eye,
  MessageCircle, Send, ShoppingBag, Phone, Heart, ChevronDown as ChevronDownIcon
} from "lucide-react";

// --- INTERFACES ---
export interface BaseWidgetSettings {
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
  playVideo: boolean;
  showCloseButton: boolean;
  showCTA: boolean;
  ctaText: string;
  ctaBgColor: string;
  ctaTextColor: string;
  ctaBorderRadius: string;
}

export interface WidgetDivulgacaoSettings extends BaseWidgetSettings {
  showCountdown: boolean;
  countdownBgColor: string;
  countdownTextColor: string;
  countdownBorderRadius: string;
}

export interface WidgetAoVivoSettings extends BaseWidgetSettings { }

export interface LivePlayerSettings {
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  
  showTitle: boolean;
  titleText: string;
  titleColor: string;

  showCoupon: boolean;
  couponCode: string;
  couponCodeColor: string;
  couponCodeBgColor: string;
  couponText: string;
  couponTextColor: string;
  couponTextBgColor: string;

  showInfo: boolean;
  infoText1: string;
  infoText2: string;
  infoSize1: number;
  infoSize2: number;
  infoTextColor: string;
  infoBgColor: string;

  showShare: boolean;
  shareTextColor: string;
  shareBgColor: string;

  showViewerCount: boolean;
  showChat: boolean;
  autoplayMuted: boolean;
  
  showProducts: boolean;
  productNameSize: number;
  productNameColor: string;
  productPriceSize: number;
  productPriceColor: string;
}

export interface DeviceConfig<T> {
  desktop: T;
  mobile: T;
  linked: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    divulgacao: DeviceConfig<WidgetDivulgacaoSettings>, 
    aoVivo: DeviceConfig<WidgetAoVivoSettings>, 
    player: DeviceConfig<LivePlayerSettings>
  ) => void;
  isSaving: boolean;
}

// --- DEFAULTS ---
const defaultWidgetBase: BaseWidgetSettings = {
  format: "portrait",
  objectFit: "cover",
  width: 100,
  position: "bottom-left",
  marginBottom: 0,
  marginTop: 0,
  marginSide: 5,
  borderColor: "#e7191f",
  borderWidth: 2,
  borderRadius: 12,
  playVideo: true,
  showCloseButton: true,
  showCTA: true,
  ctaText: "Participe",
  ctaBgColor: "#000000",
  ctaTextColor: "#FFFFFF",
  ctaBorderRadius: "9999px"
};

// EXPORT ADICIONADO AQUI: Resolve o [MISSING_EXPORT] defaultWidgetSettings da Vercel
export const defaultWidgetSettings = defaultWidgetBase;

export const defaultDivulgacaoSettings: WidgetDivulgacaoSettings = {
  ...defaultWidgetBase,
  showCountdown: true,
  countdownBgColor: "#e7191f",
  countdownTextColor: "#FFFFFF",
  countdownBorderRadius: "4px"
};

export const defaultAoVivoSettings: WidgetAoVivoSettings = {
  ...defaultWidgetBase,
  ctaText: "AO VIVO",
  ctaBgColor: "#e7191f"
};

export const defaultPlayerSettings: LivePlayerSettings = {
  borderColor: "#e7191f",
  borderWidth: 2,
  borderRadius: 12,
  
  showTitle: true,
  titleText: "Black Friday",
  titleColor: "#FFFFFF",

  showCoupon: true,
  couponCode: "BLACK15",
  couponCodeColor: "#FFFFFF",
  couponCodeBgColor: "#e7191f",
  couponText: "15%OFF",
  couponTextColor: "#000000",
  couponTextBgColor: "#FFFFFF",

  showInfo: true,
  infoText1: "FRETE GRÁTIS",
  infoText2: "Acima de R$200",
  infoSize1: 18,
  infoSize2: 12,
  infoTextColor: "#000000",
  infoBgColor: "#FFFFFF",

  showShare: true,
  shareTextColor: "#000000",
  shareBgColor: "#FFFFFF",

  showViewerCount: true,
  showChat: true,
  autoplayMuted: true,
  
  showProducts: true,
  productNameSize: 13,
  productNameColor: "#000000",
  productPriceSize: 14,
  productPriceColor: "#0ea5e9", // Azul do print
};

// --- COMPONENTES VISUAIS CUSTOMIZADOS ---
const ColorInput = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-200 bg-slate-50">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-25%] w-[150%] h-[150%] cursor-pointer border-0 p-0" />
      </div>
      <input type="text" value={value.toUpperCase()} onChange={(e) => onChange(e.target.value)} className="h-8 w-full min-w-[70px] rounded-lg border border-slate-200 bg-slate-50/50 px-2 text-[12px] text-slate-600 shadow-sm outline-none focus:border-rose-500 focus:bg-white transition-colors" />
    </div>
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

const AccordionItem = ({ id, title, children, openAccordion, setOpenAccordion }: { id: string, title: string, children: React.ReactNode, openAccordion: string, setOpenAccordion: (id: string) => void }) => {
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

export default function LiveAppearanceModal({ isOpen, onClose, onSave, isSaving }: Props) {
  const [activeTab, setActiveTab] = useState<"divulgacao" | "aovivo" | "player">("player");
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [openAccordion, setOpenAccordion] = useState<string>("player_visibilidade");

  // Estados interativos do preview
  const [previewChatOpen, setPreviewChatOpen] = useState(false);
  const [previewProductsOpen, setPreviewProductsOpen] = useState(false);

  const [divulgacaoConfig, setDivulgacaoConfig] = useState<DeviceConfig<WidgetDivulgacaoSettings>>({
    desktop: { ...defaultDivulgacaoSettings }, mobile: { ...defaultDivulgacaoSettings, width: 80 }, linked: false
  });

  const [aoVivoConfig, setAoVivoConfig] = useState<DeviceConfig<WidgetAoVivoSettings>>({
    desktop: { ...defaultAoVivoSettings }, mobile: { ...defaultAoVivoSettings, width: 80 }, linked: false
  });

  const [playerConfig, setPlayerConfig] = useState<DeviceConfig<LivePlayerSettings>>({
    desktop: { ...defaultPlayerSettings }, mobile: { ...defaultPlayerSettings }, linked: true
  });

  const handleSave = () => { onSave(divulgacaoConfig, aoVivoConfig, playerConfig); };

  const handleReset = () => {
    if (activeTab === "divulgacao") setDivulgacaoConfig({ desktop: { ...defaultDivulgacaoSettings }, mobile: { ...defaultDivulgacaoSettings, width: 80 }, linked: false });
    if (activeTab === "aovivo") setAoVivoConfig({ desktop: { ...defaultAoVivoSettings }, mobile: { ...defaultAoVivoSettings, width: 80 }, linked: false });
    if (activeTab === "player") setPlayerConfig({ desktop: { ...defaultPlayerSettings }, mobile: { ...defaultPlayerSettings }, linked: true });
  };

  const updateConfig = (stateSetter: React.Dispatch<React.SetStateAction<any>>, key: string, value: any, currentLinked: boolean) => {
    stateSetter((prev: any) => {
      const newState = { ...prev };
      newState[device] = { ...newState[device], [key]: value };
      if (currentLinked) {
        const otherDevice = device === "desktop" ? "mobile" : "desktop";
        newState[otherDevice] = { ...newState[otherDevice], [key]: value };
      }
      return newState;
    });
  };

  const currentPlayer = playerConfig[device];

  const toggleLink = () => {
    if (activeTab === "divulgacao") setDivulgacaoConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
    if (activeTab === "aovivo") setAoVivoConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
    if (activeTab === "player") setPlayerConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
  };

  const isLinked = activeTab === "divulgacao" ? divulgacaoConfig.linked : activeTab === "aovivo" ? aoVivoConfig.linked : playerConfig.linked;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1300px] w-full h-[92vh] p-0 flex flex-col overflow-hidden bg-white">
        
        {/* CABEÇALHO */}
        <div className="px-8 py-5 border-b border-slate-200 bg-white flex flex-col gap-5 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-800">Estilo da Experiência Ao Vivo</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">✕</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
             <Button variant="outline" onClick={() => { setActiveTab("divulgacao"); setOpenAccordion("formato"); }} className={`rounded-full px-5 h-9 text-[13px] font-medium transition-all ${activeTab === "divulgacao" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><LayoutTemplate className="w-3.5 h-3.5 mr-2" /> Divulgação</Button>
             <Button variant="outline" onClick={() => { setActiveTab("aovivo"); setOpenAccordion("formato"); }} className={`rounded-full px-5 h-9 text-[13px] font-medium transition-all ${activeTab === "aovivo" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Radio className="w-3.5 h-3.5 mr-2" /> Ao Vivo</Button>
             <Button variant="outline" onClick={() => { setActiveTab("player"); setOpenAccordion("player_visibilidade"); }} className={`rounded-full px-5 h-9 text-[13px] font-medium transition-all ${activeTab === "player" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><PlaySquare className="w-3.5 h-3.5 mr-2" /> Player da Live</Button>
          </div>
        </div>

        {/* CORPO PRINCIPAL */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          
          {/* PAINEL ESQUERDO */}
          <div className="w-[380px] min-w-[380px] bg-white border-r border-slate-200 flex flex-col z-10 overflow-hidden">
            <div className="pt-6 pb-4 px-6 flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Configurações</h3>
               <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-white shadow-sm text-rose-600" : "text-slate-400"}`}><Monitor className="h-3.5 w-3.5" /></button>
                  <button onClick={toggleLink} className={`p-1.5 rounded-md hover:bg-slate-200/50 ${isLinked ? "text-rose-600" : "text-slate-400"}`}>{isLinked ? <LinkIcon className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}</button>
                  <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-white shadow-sm text-rose-600" : "text-slate-400"}`}><Smartphone className="h-3.5 w-3.5" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
              {activeTab === "player" && (
                <div className="animate-in fade-in duration-300">
                  <AccordionItem id="player_borda" title="1. Aparência Global (Card Principal)" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <ColorInput label="Cor da Borda" value={currentPlayer.borderColor} onChange={(v) => updateConfig(setPlayerConfig, "borderColor", v, playerConfig.linked)} />
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Espessura (px)</label>
                        <Input type="number" value={currentPlayer.borderWidth} onChange={(e) => updateConfig(setPlayerConfig, "borderWidth", Number(e.target.value), playerConfig.linked)} className="h-8 rounded-lg text-[13px]" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Raio da Borda (px)</label>
                      <Input type="number" value={currentPlayer.borderRadius} onChange={(e) => updateConfig(setPlayerConfig, "borderRadius", Number(e.target.value), playerConfig.linked)} className="h-8 rounded-lg text-[13px]" />
                    </div>
                  </AccordionItem>

                  <AccordionItem id="player_visibilidade" title="2. Elementos Visíveis" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div className="space-y-4">
                      
                      {/* Titulo do Vídeo */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        <CustomSwitch checked={currentPlayer.showTitle} onChange={(v) => updateConfig(setPlayerConfig, "showTitle", v, playerConfig.linked)} label="Exibir Título no Vídeo" />
                        {currentPlayer.showTitle && (
                          <div className="mt-3 space-y-3 pt-3 border-t border-slate-200">
                            <Input value={currentPlayer.titleText} onChange={(e) => updateConfig(setPlayerConfig, "titleText", e.target.value)} className="h-8 rounded-lg text-[13px]" />
                            <ColorInput label="Cor do Texto" value={currentPlayer.titleColor} onChange={(v) => updateConfig(setPlayerConfig, "titleColor", v, playerConfig.linked)} />
                          </div>
                        )}
                      </div>

                      {/* Produtos */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        <CustomSwitch checked={currentPlayer.showProducts} onChange={(v) => updateConfig(setPlayerConfig, "showProducts", v, playerConfig.linked)} label="Estilo dos Produtos" />
                        {currentPlayer.showProducts && (
                          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                               <ColorInput label="Cor Nome" value={currentPlayer.productNameColor} onChange={(v) => updateConfig(setPlayerConfig, "productNameColor", v, playerConfig.linked)} />
                               <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tamanho Nome (px)</label>
                                 <Input type="number" value={currentPlayer.productNameSize} onChange={(e) => updateConfig(setPlayerConfig, "productNameSize", Number(e.target.value), playerConfig.linked)} className="h-8 rounded-lg text-[13px]" />
                               </div>
                            </div>
                            <div className="space-y-3">
                               <ColorInput label="Cor Preço (Por)" value={currentPlayer.productPriceColor} onChange={(v) => updateConfig(setPlayerConfig, "productPriceColor", v, playerConfig.linked)} />
                               <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tamanho Preço (px)</label>
                                 <Input type="number" value={currentPlayer.productPriceSize} onChange={(e) => updateConfig(setPlayerConfig, "productPriceSize", Number(e.target.value), playerConfig.linked)} className="h-8 rounded-lg text-[13px]" />
                               </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card do Cupom */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        <CustomSwitch checked={currentPlayer.showCoupon} onChange={(v) => updateConfig(setPlayerConfig, "showCoupon", v, playerConfig.linked)} label="Etiqueta de Cupom" />
                        {currentPlayer.showCoupon && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input value={currentPlayer.couponCode} onChange={(e) => updateConfig(setPlayerConfig, "couponCode", e.target.value)} placeholder="Código (ex: BLACK15)" className="h-8 rounded-lg text-[12px]" />
                              <Input value={currentPlayer.couponText} onChange={(e) => updateConfig(setPlayerConfig, "couponText", e.target.value)} placeholder="Texto (ex: 15%OFF)" className="h-8 rounded-lg text-[12px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                               <ColorInput label="Fundo Cód." value={currentPlayer.couponCodeBgColor} onChange={(v) => updateConfig(setPlayerConfig, "couponCodeBgColor", v, playerConfig.linked)} />
                               <ColorInput label="Cor Cód." value={currentPlayer.couponCodeColor} onChange={(v) => updateConfig(setPlayerConfig, "couponCodeColor", v, playerConfig.linked)} />
                               <ColorInput label="Fundo Texto" value={currentPlayer.couponTextBgColor} onChange={(v) => updateConfig(setPlayerConfig, "couponTextBgColor", v, playerConfig.linked)} />
                               <ColorInput label="Cor Texto" value={currentPlayer.couponTextColor} onChange={(v) => updateConfig(setPlayerConfig, "couponTextColor", v, playerConfig.linked)} />
                            </div>
                          </div>
                        )}
                      </div>

                      <CustomSwitch checked={currentPlayer.showViewerCount} onChange={(v) => updateConfig(setPlayerConfig, "showViewerCount", v, playerConfig.linked)} label="Contador de espectadores" />
                      <CustomSwitch checked={currentPlayer.showChat} onChange={(v) => updateConfig(setPlayerConfig, "showChat", v, playerConfig.linked)} label="Chat ao vivo" />
                      <CustomSwitch checked={currentPlayer.showShare} onChange={(v) => updateConfig(setPlayerConfig, "showShare", v, playerConfig.linked)} label="Botão Compartilhar" />
                      <CustomSwitch checked={currentPlayer.autoplayMuted} onChange={(v) => updateConfig(setPlayerConfig, "autoplayMuted", v, playerConfig.linked)} label="Iniciar mutado (Ícone Som)" />
                    </div>
                  </AccordionItem>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO - PREVIEW DO PLAYER MOBILE OVELAY */}
          <div className="flex-1 flex flex-col relative items-center justify-center p-4 sm:p-6 bg-slate-50/60 overflow-hidden min-h-0">
            
            {activeTab === "player" && (
              // MOLDURA ESTILO CELULAR (Mobile Player)
              <div className={`relative bg-[#0a0a0a] transition-all duration-500 shrink-0 shadow-2xl ${
                device === "desktop" 
                  ? "w-full max-w-[900px] h-full max-h-[600px] rounded-xl border-4 border-[#0a0a0a] overflow-hidden" 
                  : "h-full max-h-[750px] max-w-[95%] aspect-[9/19.5] rounded-[2rem] shadow-[0_0_0_3px_#f4d1c0] border-[6px] border-[#0a0a0a] overflow-hidden"
              }`}>
                
                {/* Entalhe do celular */}
                {device === "mobile" && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] max-w-[120px] h-[20px] bg-[#0a0a0a] rounded-b-[1rem] z-[100]"></div>}
                
                {/* VÍDEO DE FUNDO */}
                <video src="/demo-videos/demo2.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

                {/* ==================================================== */}
                {/* CONTEÚDO DO PLAYER (OVERLAYS EXATAMENTE COMO NO PRINT) */}
                {/* ==================================================== */}
                
                {/* --- TOPO ESQUERDA: Logo da Loja e Título --- */}
                <div className="absolute top-8 left-4 right-20 flex items-center gap-2 z-10">
                   <div className="w-9 h-9 rounded-full bg-slate-800/80 overflow-hidden border border-white/20 shrink-0 flex items-center justify-center shadow-md">
                     <span className="text-[9px] text-white/70">LOGO</span>
                   </div>
                   {currentPlayer.showTitle && (
                     <div style={{ color: currentPlayer.titleColor }} className="font-bold text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
                       {currentPlayer.titleText}
                     </div>
                   )}
                </div>

                {/* --- TOPO DIREITA: Live, Viewers, Mudo --- */}
                <div className="absolute top-8 right-3 flex flex-col items-end gap-2 z-10">
                   <div className="flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md">
                      <PlaySquare className="w-3 h-3 fill-white"/> LIVE
                   </div>
                   
                   {currentPlayer.showViewerCount && (
                      <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-[12px] font-medium px-2 py-0.5 rounded-full shadow-md border border-white/10">
                        <Eye className="w-3.5 h-3.5" /> 1.2k
                      </div>
                   )}

                   {currentPlayer.autoplayMuted && (
                      <button className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white mt-1 border border-white/10 shadow-md hover:bg-black/70 transition">
                        <VolumeX className="w-4 h-4"/>
                      </button>
                   )}
                </div>

                {/* --- ABAIXO DO LOGO: Cupom --- */}
                {currentPlayer.showCoupon && (
                  <div className="absolute top-20 left-4 rounded overflow-hidden shadow-lg border border-white/20 flex flex-col w-[85px] z-10">
                    <div className="text-center py-1 text-[10px] font-black tracking-wider" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor }}>
                      {currentPlayer.couponCode}
                    </div>
                    <div className="text-center py-1 text-[10px] font-bold" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor }}>
                      {currentPlayer.couponText}
                    </div>
                  </div>
                )}

                {/* --- MENU LATERAL DIREITO (Ações) - REDUZIDO --- */}
                <div className="absolute bottom-[95px] right-2.5 flex flex-col items-center gap-3 z-10">
                  {currentPlayer.showChat && (
                    <button onClick={() => setPreviewChatOpen(!previewChatOpen)} className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg hover:bg-black/70 transition">
                      <MessageCircle className="w-[18px] h-[18px]" />
                    </button>
                  )}
                  {currentPlayer.showShare && (
                    <button className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg hover:bg-black/70 transition">
                      <Send className="w-[18px] h-[18px]" />
                    </button>
                  )}
                  {currentPlayer.showProducts && (
                    <button onClick={() => setPreviewProductsOpen(true)} className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex flex-col items-center justify-center text-white border border-white/10 shadow-lg hover:bg-black/70 transition">
                      <ShoppingBag className="w-[18px] h-[18px] mb-0.5" />
                    </button>
                  )}
                  <button className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg relative hover:bg-black/70 transition">
                    <ShoppingCart className="w-[18px] h-[18px]" />
                    <span className="absolute -bottom-1.5 text-[10px] font-bold text-white drop-shadow-md">3</span>
                  </button>
                  <button className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-[0_0_10px_rgba(37,211,102,0.5)] hover:scale-105 transition-transform border-2 border-white">
                    <Phone className="w-[18px] h-[18px] fill-white" />
                  </button>
                </div>

                {/* --- CHAT OVERLAY - REPOSICIONADO --- */}
                {currentPlayer.showChat && previewChatOpen && !previewProductsOpen && (
                  <div className="absolute bottom-[88px] left-3 right-14 flex flex-col justify-end z-20 animate-in slide-in-from-bottom-5 fade-in">
                     <div className="space-y-2 mb-2 max-h-[140px] overflow-hidden flex flex-col justify-end mask-image-top">
                       {[1,2,3].map(i => (
                         <div key={i} className="flex gap-2 items-center">
                           <div className="w-6 h-6 rounded-full bg-slate-200 border border-white overflow-hidden shrink-0">
                              <img src={`https://i.pravatar.cc/100?img=${i+12}`} className="w-full h-full object-cover"/>
                           </div>
                           <div className="text-white text-[11px] font-medium drop-shadow-md bg-black/20 px-2 py-0.5 rounded-lg">
                             Nonononononono
                           </div>
                         </div>
                       ))}
                     </div>
                     <div className="bg-white/90 backdrop-blur-md rounded-full px-3 py-2 flex justify-between items-center shadow-lg">
                        <span className="text-slate-500 text-[12px]">Chat...</span>
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                     </div>
                  </div>
                )}

                {/* --- CARD DO PRODUTO ATUAL - REDUZIDO --- */}
                {!previewProductsOpen && currentPlayer.showProducts && (
                  <div className="absolute bottom-4 left-3 right-3 bg-white shadow-2xl z-10 flex items-center p-2 transition-all hover:scale-[1.02] cursor-pointer" 
                       style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: currentPlayer.borderRadius }}>
                    <div className="w-[52px] h-[68px] bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-100">
                      <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="Produto" />
                    </div>
                    <div className="ml-3 flex-1 flex flex-col justify-center">
                      <h4 style={{ fontSize: `${currentPlayer.productNameSize - 1}px`, color: currentPlayer.productNameColor }} className="font-bold leading-tight line-clamp-2">
                        Blusa Life Rosê em Malha Tecnológica
                      </h4>
                      <div className="text-[10px] text-slate-400 line-through mt-0.5">De: R$ 149,90</div>
                      <div style={{ fontSize: `${currentPlayer.productPriceSize - 1}px`, color: currentPlayer.productPriceColor }} className="font-black leading-none mt-0.5">
                        Por: R$ 149,90
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-md ml-1" style={{ backgroundColor: currentPlayer.borderColor }}>
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* ==================================================== */}
                {/* MODAL LISTA DE PRODUTOS */}
                {/* ==================================================== */}
                {previewProductsOpen && (
                  <div className="absolute inset-x-2 top-10 bottom-10 bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    
                    {/* Header Azul */}
                    <div className="bg-[#0ea5e9] text-white text-center py-3 text-[16px] font-medium tracking-wide relative shrink-0">
                      PRODUTOS
                      <button onClick={() => setPreviewProductsOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">✕</button>
                    </div>

                    {/* Lista de Produtos (Scroll) */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50 scrollbar-hide">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className="flex gap-3 p-2 bg-white border border-[#0ea5e9]/30 rounded-xl relative">
                           <div className="font-bold text-[16px] w-5 pt-1 text-center text-[#0ea5e9]">0{i}</div>
                           <div className="w-[50px] h-[65px] bg-slate-100 rounded-md overflow-hidden shrink-0">
                             <img src={`https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=150&auto=format&fit=crop&sig=${i}`} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 pt-0.5 pr-7">
                             <div className="text-[12px] text-slate-800 leading-tight font-medium">Blusa Life Rosê em Malha Tecnológica</div>
                             <div className="text-[10px] text-slate-400 mt-0.5">De: R$ 149,90</div>
                             <div className="text-[13px] font-bold text-[#0ea5e9] leading-none mt-0.5">Por: R$ 149,90</div>
                           </div>
                           {i === 1 && (
                             <div className="absolute right-2 top-2 text-red-600">
                               <Radio className="w-3.5 h-3.5 animate-pulse" />
                             </div>
                           )}
                           <div className="absolute right-2 bottom-2 w-6 h-6 rounded-full flex items-center justify-center text-white bg-[#0ea5e9]">
                             <ShoppingCart className="w-3 h-3" />
                           </div>
                        </div>
                      ))}
                    </div>

                    {/* Setinha pra baixo */}
                    <div className="h-6 bg-white flex items-center justify-center shrink-0">
                      <ChevronDownIcon className="w-6 h-6 text-[#0ea5e9]" />
                    </div>

                    {/* Footer do Modal */}
                    <div className="border-t border-slate-100 p-3 flex justify-between items-center bg-white shrink-0">
                        <div className="flex items-center text-[12px] font-medium text-slate-600">
                          <div className="w-7 h-7 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white mr-2">
                             <ShoppingCart className="w-3.5 h-3.5" />
                          </div>
                          6 Produtos
                        </div>
                        <div className="text-[13px] font-medium flex items-center cursor-pointer text-slate-700 hover:text-black">
                          Finalizar <ExternalLink className="w-3.5 h-3.5 ml-1 text-[#0ea5e9]" />
                        </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between z-20">
          <Button variant="ghost" onClick={handleReset} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold px-2">
            <RotateCcw className="w-4 h-4 mr-2" /> RESETAR ESTA ABA
          </Button>

          <div className="flex items-center text-[12px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full hidden sm:flex">
            <Info className="w-4 h-4 mr-2 text-slate-400" /> 
            Clique nos ícones de Chat e Produtos no preview para interagir.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-6 font-medium rounded-full">
              ✕ Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md h-10 px-6 font-medium rounded-full">
              <Save className="h-4 w-4 mr-2" /> {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
