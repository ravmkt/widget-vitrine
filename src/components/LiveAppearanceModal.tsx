import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, Link as LinkIcon, Unlink, Radio, Save, LayoutTemplate, PlaySquare,
  VolumeX, ChevronDown, RotateCcw, Info, Share2, ShoppingCart, ExternalLink, Eye,
  MessageCircle, Send, Heart, ShoppingBag
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

export interface WidgetAoVivoSettings extends BaseWidgetSettings {
  // Herda configurações base
}

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
export const defaultWidgetBase: BaseWidgetSettings = {
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

// Export necessário para compatibilidade com LiveCommercePage
export const defaultWidgetSettings: WidgetDivulgacaoSettings = {
  ...defaultDivulgacaoSettings
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
  productNameSize: 11,
  productNameColor: "#1e293b",
  productPriceSize: 12,
  productPriceColor: "#0284c7",
};

// --- COMPONENTES AUXILIARES ---
const ColorInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => (
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

const CustomSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center justify-between cursor-pointer py-2.5 px-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
    <span className="text-[13px] text-slate-700 font-medium">{label}</span>
    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-rose-600' : 'bg-slate-200'}`} onClick={() => onChange(!checked)}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </div>
  </label>
);

const AccordionItem = ({
  id,
  title,
  children,
  openAccordion,
  setOpenAccordion
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  openAccordion: string;
  setOpenAccordion: (id: string) => void;
}) => {
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
  const [openAccordion, setOpenAccordion] = useState<string>("player_borda");

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

  const updateConfig = (stateSetter: any, key: string, value: any, currentLinked: boolean) => {
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

  const currentDivulgacao = divulgacaoConfig[device];
  const currentAoVivo = aoVivoConfig[device];
  const currentPlayer = playerConfig[device];

  const toggleLink = () => {
    if (activeTab === "divulgacao") setDivulgacaoConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
    if (activeTab === "aovivo") setAoVivoConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
    if (activeTab === "player") setPlayerConfig(prev => ({ ...prev, linked: !prev.linked, mobile: !prev.linked ? { ...prev.desktop } : prev.mobile }));
  };

  const isLinked = activeTab === "divulgacao" ? divulgacaoConfig.linked : activeTab === "aovivo" ? aoVivoConfig.linked : playerConfig.linked;

  const calcHeight = (format: string, width: number) => {
    if (format === "square" || format === "circular") return width;
    if (format === "portrait") return Math.round(width * 16 / 9);
    if (format === "landscape") return Math.round(width * 9 / 16);
    return width;
  };

  const renderWidgetSettings = (config: any, updateFn: any, isDivulgacao: boolean) => (
    <div className="animate-in fade-in duration-300">
      <AccordionItem id="formato" title="1. Formato & Dimensões" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-600">Formato</label>
          <select className="w-full h-9 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none" value={config.format} onChange={(e) => updateFn("format", e.target.value)}>
            <option value="portrait">Retrato 9:16</option>
            <option value="landscape">Paisagem 16:9</option>
            <option value="square">Quadrado</option>
            <option value="circular">Circular</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-600">Ajuste da Imagem</label>
          <select className="w-full h-9 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none" value={config.objectFit} onChange={(e) => updateFn("objectFit", e.target.value)}>
            <option value="cover">Cover (Preencher)</option>
            <option value="contain">Contain (Ajustar)</option>
            <option value="fill">Fill (Esticar)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-600">Largura (px)</label>
            <Input type="number" value={config.width} onChange={(e) => updateFn("width", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-400">Altura (calc)</label>
            <Input disabled value={calcHeight(config.format, config.width)} className="h-9 rounded-[14px] text-[13px] bg-slate-100/50" />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem id="posicao" title="2. Posição & Margens" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-600">Posição na Tela</label>
          <select className="w-full h-9 rounded-[14px] border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none" value={config.position} onChange={(e) => updateFn("position", e.target.value)}>
            <option value="bottom-left">Inferior Esquerda</option>
            <option value="bottom-right">Inferior Direita</option>
            <option value="top-left">Superior Esquerda</option>
            <option value="top-right">Superior Direita</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-600">Margem Inferior (px)</label>
            <Input type="number" value={config.marginBottom} onChange={(e) => updateFn("marginBottom", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-600">Margem Superior (px)</label>
            <Input type="number" value={config.marginTop} onChange={(e) => updateFn("marginTop", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px]" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[12px] font-medium text-slate-600">Margem Lateral (px)</label>
            <Input type="number" value={config.marginSide} onChange={(e) => updateFn("marginSide", Number(e.target.value))} className="h-9 rounded-[14px] text-[13px]" />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem id="bordas" title="3. Bordas" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ColorInput label="Cor da Borda" value={config.borderColor} onChange={(v) => updateFn("borderColor", v)} />
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Espessura (px)</label>
            <Input type="number" value={config.borderWidth} onChange={(e) => updateFn("borderWidth", Number(e.target.value))} className="h-8 rounded-lg text-[13px]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Raio (Arredondamento)</label>
          <Input type="number" value={config.borderRadius} onChange={(e) => updateFn("borderRadius", Number(e.target.value))} disabled={config.format === 'circular'} className="h-9 rounded-[14px] text-[13px] disabled:opacity-50" />
        </div>
      </AccordionItem>

      <AccordionItem id="elementos" title="4. Elementos Visíveis" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="space-y-4">
          <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
            <CustomSwitch checked={config.showCTA} onChange={(v) => updateFn("showCTA", v)} label="Exibir CTA" />
            {config.showCTA && (
              <div className="mt-3 space-y-3 pt-3 border-t border-slate-200">
                <Input value={config.ctaText} onChange={(e) => updateFn("ctaText", e.target.value)} placeholder="Texto" className="h-9 rounded-lg text-[13px]" />
                <div className="grid grid-cols-2 gap-3">
                  <ColorInput label="Fundo" value={config.ctaBgColor} onChange={(v) => updateFn("ctaBgColor", v)} />
                  <ColorInput label="Texto" value={config.ctaTextColor} onChange={(v) => updateFn("ctaTextColor", v)} />
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Raio da Borda do CTA</label>
                  <Input type="text" value={config.ctaBorderRadius || '9999px'} onChange={(e) => updateFn("ctaBorderRadius", e.target.value)} placeholder="ex: 8px ou 9999px" className="h-8 rounded-lg text-[13px]" />
                </div>
              </div>
            )}
          </div>

          {isDivulgacao && (
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <CustomSwitch checked={config.showCountdown} onChange={(v) => updateFn("showCountdown", v)} label="Contador Regressivo" />
              {config.showCountdown && (
                <div className="mt-3 space-y-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <ColorInput label="Fundo" value={config.countdownBgColor} onChange={(v) => updateConfig(setDivulgacaoConfig, "countdownBgColor", v, divulgacaoConfig.linked)} />
                    <ColorInput label="Texto" value={config.countdownTextColor} onChange={(v) => updateConfig(setDivulgacaoConfig, "countdownTextColor", v, divulgacaoConfig.linked)} />
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Raio da Borda do Contador</label>
                    <Input type="text" value={config.countdownBorderRadius || '4px'} onChange={(e) => updateConfig(setDivulgacaoConfig, "countdownBorderRadius", e.target.value, divulgacaoConfig.linked)} placeholder="ex: 4px" className="h-8 rounded-lg text-[13px]" />
                  </div>
                </div>
              )}
            </div>
          )}

          <CustomSwitch checked={config.playVideo} onChange={(v) => updateFn("playVideo", v)} label="Reproduzir Vídeo" />
          <CustomSwitch checked={config.showCloseButton} onChange={(v) => updateFn("showCloseButton", v)} label="Exibir Botão Fechar (X)" />
        </div>
      </AccordionItem>
    </div>
  );

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
             <Button variant="outline" onClick={() => { setActiveTab("player"); setOpenAccordion("player_borda"); }} className={`rounded-full px-5 h-9 text-[13px] font-medium transition-all ${activeTab === "player" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}><PlaySquare className="w-3.5 h-3.5 mr-2" /> Player</Button>
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
              {activeTab === "divulgacao" && renderWidgetSettings(currentDivulgacao, (k:any, v:any) => updateConfig(setDivulgacaoConfig, k, v, divulgacaoConfig.linked), true)}
              {activeTab === "aovivo" && renderWidgetSettings(currentAoVivo, (k:any, v:any) => updateConfig(setAoVivoConfig, k, v, aoVivoConfig.linked), false)}

              {/* ABA PLAYER CONFIG */}
              {activeTab === "player" && (
                <div className="animate-in fade-in duration-300">
                  
                  <AccordionItem id="player_borda" title="1. Borda (Aplica a todos os cards)" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
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
                        <CustomSwitch checked={currentPlayer.showProducts} onChange={(v) => updateConfig(setPlayerConfig, "showProducts", v, playerConfig.linked)} label="Produtos" />
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
                               <ColorInput label="Cor Preço" value={currentPlayer.productPriceColor} onChange={(v) => updateConfig(setPlayerConfig, "productPriceColor", v, playerConfig.linked)} />
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
                        <CustomSwitch checked={currentPlayer.showCoupon} onChange={(v) => updateConfig(setPlayerConfig, "showCoupon", v, playerConfig.linked)} label="Card do Cupom" />
                        {currentPlayer.showCoupon && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input value={currentPlayer.couponCode} onChange={(e) => updateConfig(setPlayerConfig, "couponCode", e.target.value)} placeholder="Código" className="h-8 rounded-lg text-[12px]" />
                              <Input value={currentPlayer.couponText} onChange={(e) => updateConfig(setPlayerConfig, "couponText", e.target.value)} placeholder="Texto" className="h-8 rounded-lg text-[12px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                               <ColorInput label="Cor Cód." value={currentPlayer.couponCodeColor} onChange={(v) => updateConfig(setPlayerConfig, "couponCodeColor", v, playerConfig.linked)} />
                               <ColorInput label="Fundo Cód." value={currentPlayer.couponCodeBgColor} onChange={(v) => updateConfig(setPlayerConfig, "couponCodeBgColor", v, playerConfig.linked)} />
                               <ColorInput label="Cor Texto" value={currentPlayer.couponTextColor} onChange={(v) => updateConfig(setPlayerConfig, "couponTextColor", v, playerConfig.linked)} />
                               <ColorInput label="Fundo Texto" value={currentPlayer.couponTextBgColor} onChange={(v) => updateConfig(setPlayerConfig, "couponTextBgColor", v, playerConfig.linked)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Informativo */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        <CustomSwitch checked={currentPlayer.showInfo} onChange={(v) => updateConfig(setPlayerConfig, "showInfo", v, playerConfig.linked)} label="Card Informativo" />
                        {currentPlayer.showInfo && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Input value={currentPlayer.infoText1} onChange={(e) => updateConfig(setPlayerConfig, "infoText1", e.target.value)} className="h-8 rounded-lg text-[12px]" />
                                <Input type="number" placeholder="Tam. px" value={currentPlayer.infoSize1} onChange={(e) => updateConfig(setPlayerConfig, "infoSize1", Number(e.target.value), playerConfig.linked)} className="h-7 rounded-md text-[11px]" />
                              </div>
                              <div className="space-y-1">
                                <Input value={currentPlayer.infoText2} onChange={(e) => updateConfig(setPlayerConfig, "infoText2", e.target.value)} className="h-8 rounded-lg text-[12px]" />
                                <Input type="number" placeholder="Tam. px" value={currentPlayer.infoSize2} onChange={(e) => updateConfig(setPlayerConfig, "infoSize2", Number(e.target.value), playerConfig.linked)} className="h-7 rounded-md text-[11px]" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                               <ColorInput label="Cor Texto" value={currentPlayer.infoTextColor} onChange={(v) => updateConfig(setPlayerConfig, "infoTextColor", v, playerConfig.linked)} />
                               <ColorInput label="Cor Fundo" value={currentPlayer.infoBgColor} onChange={(v) => updateConfig(setPlayerConfig, "infoBgColor", v, playerConfig.linked)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Compartilhar */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                         <CustomSwitch checked={currentPlayer.showShare} onChange={(v) => updateConfig(setPlayerConfig, "showShare", v, playerConfig.linked)} label="Card Compartilhar" />
                         {currentPlayer.showShare && (
                           <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                             <ColorInput label="Cor Texto" value={currentPlayer.shareTextColor} onChange={(v) => updateConfig(setPlayerConfig, "shareTextColor", v, playerConfig.linked)} />
                             <ColorInput label="Cor Fundo" value={currentPlayer.shareBgColor} onChange={(v) => updateConfig(setPlayerConfig, "shareBgColor", v, playerConfig.linked)} />
                           </div>
                         )}
                      </div>

                      <CustomSwitch checked={currentPlayer.showViewerCount} onChange={(v) => updateConfig(setPlayerConfig, "showViewerCount", v, playerConfig.linked)} label="Contador de espectadores" />
                      <CustomSwitch checked={currentPlayer.showChat} onChange={(v) => updateConfig(setPlayerConfig, "showChat", v, playerConfig.linked)} label="Chat ao vivo" />
                      <CustomSwitch checked={currentPlayer.autoplayMuted} onChange={(v) => updateConfig(setPlayerConfig, "autoplayMuted", v, playerConfig.linked)} label="Iniciar com som desativado" />
                    </div>
                  </AccordionItem>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO - PREVIEW */}
          <div className="flex-1 flex flex-col relative items-center justify-center p-4 sm:p-6 bg-slate-50/60 overflow-hidden min-h-0">
            <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-3 relative overflow-hidden min-h-0">
                
                {activeTab !== "player" ? (
                  
                  // ==========================================
                  // PREVIEW DOS WIDGETS FLUTUANTES
                  // ==========================================
                  <div className={`relative bg-[#0a0a0a] transition-all duration-500 flex flex-col shrink-0 ${
                    device === "desktop" 
                      ? "w-full max-w-[850px] aspect-video rounded-xl border-4 border-[#0a0a0a] overflow-hidden shadow-xl" 
                      : "h-full max-h-[700px] max-w-[95%] aspect-[9/19.5] rounded-[2rem] shadow-[0_0_0_3px_#f4d1c0] border-[6px] border-[#0a0a0a] overflow-hidden"
                  }`}>
                    {device === "mobile" && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] max-w-[120px] h-[20px] bg-[#0a0a0a] rounded-b-[1rem] z-[100]"></div>}
                    <div className="absolute inset-0 bg-white">
                      <div className="w-full h-full opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format')", backgroundSize: "cover"}}></div>
                      
                      {(activeTab === "divulgacao" || activeTab === "aovivo") && 
                        [activeTab === "divulgacao" ? currentDivulgacao : currentAoVivo].map((config, i) => (
                          <div 
                            key={i}
                            className="absolute transition-all duration-300 flex flex-col items-center group cursor-pointer gap-2.5" 
                            style={{
                              ...(config.position.includes('bottom') ? { bottom: config.marginBottom } : { top: config.marginTop }),
                              ...(config.position.includes('left') ? { left: config.marginSide } : { right: config.marginSide }),
                              zIndex: 50
                            }}
                          >
                            <div 
                              className="relative overflow-hidden bg-black shadow-[0_8px_30px_rgba(0,0,0,0.15)]" 
                              style={{
                                width: config.width,
                                height: calcHeight(config.format, config.width),
                                border: `${config.borderWidth}px solid ${config.borderColor}`,
                                borderRadius: config.format === 'circular' ? '50%' : config.borderRadius,
                              }}
                            >
                              <video 
                                ref={(el) => { if (el) { if (config.playVideo) el.play().catch(() => {}); else el.pause(); } }}
                                src="/demo-videos/demo1.mp4" loop muted playsInline className="w-full h-full" style={{ objectFit: config.objectFit }} 
                              />
                              {config.showCloseButton && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">✕</div>}
                              {!config.playVideo && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center z-10"><PlaySquare className="w-3.5 h-3.5 ml-0.5 fill-white text-white"/></div>}
                              {activeTab === "divulgacao" && (config as WidgetDivulgacaoSettings).showCountdown && (
                                <div className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 shadow-sm z-10" style={{ backgroundColor: (config as WidgetDivulgacaoSettings).countdownBgColor, color: (config as WidgetDivulgacaoSettings).countdownTextColor, borderRadius: (config as WidgetDivulgacaoSettings).countdownBorderRadius || '4px' }}>02d 10h 01m</div>
                              )}
                            </div>
                            {config.showCTA && (
                              <div className="text-[12px] font-bold px-4 py-1.5 shadow-lg text-center transition-transform hover:scale-105" style={{ backgroundColor: config.ctaBgColor, color: config.ctaTextColor, width: '90%', minWidth: 'max-content', borderRadius: config.ctaBorderRadius || '9999px' }}>{config.ctaText}</div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                ) : (
                  
                  // ==========================================
                  // PREVIEW DO PLAYER
                  // ==========================================
                  <div className="w-full h-full flex justify-center items-center overflow-hidden">
                    {device === 'mobile' ? (
                      // ==========================================================
                      // PREVIEW MOBILE - 3 CELULARES ADAPTADOS SEM SCROLL VERTICAL
                      // ==========================================================
                      <div className="w-full h-full flex items-center justify-center gap-3 sm:gap-6 overflow-x-auto overflow-y-hidden px-2 select-none">
                        {[
                          { id: "normal",   label: "Player" },
                          { id: "products", label: "Com Produtos" },
                          { id: "chat",     label: "Com Chat" },
                        ].map((phone) => (
                          <div key={phone.id} className="flex flex-col items-center gap-2 shrink-0 h-full justify-center">
                            
                            {/* MOLDURA DO SMARTPHONE */}
                            <div
                              className="relative bg-[#0a0a0a] rounded-[2.2rem] border-[6px] border-slate-200 shadow-xl overflow-hidden shrink-0"
                              style={{ height: 'min(54vh, 490px)', aspectRatio: '9 / 19' }}
                            >
                              {/* Notch / Speaker central */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34%] max-w-[95px] h-[15px] bg-slate-200 rounded-b-[0.7rem] z-30"></div>

                              {/* VÍDEO DE FUNDO */}
                              <video
                                src="/demo-videos/demo1.mp4"
                                autoPlay loop muted playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75 pointer-events-none z-10"></div>

                              {/* TOPO ESQUERDO: Logo + Título */}
                              <div className="absolute top-3.5 left-2.5 flex items-center gap-1.5 z-20">
                                <div className="w-5 h-5 rounded-full bg-[#1b4332] border border-white/40 flex items-center justify-center text-[6px] font-bold text-white shadow shrink-0">USE</div>
                                {currentPlayer.showTitle && (
                                  <span className="font-bold text-[11px] drop-shadow-md tracking-tight leading-none" style={{ color: currentPlayer.titleColor }}>
                                    {currentPlayer.titleText}
                                  </span>
                                )}
                              </div>

                              {/* CUPOM */}
                              {currentPlayer.showCoupon && (
                                <div className="absolute top-11 left-2.5 rounded-[5px] overflow-hidden flex flex-col w-[54px] z-20 shadow-md border" style={{ borderColor: currentPlayer.borderColor }}>
                                  <div className="text-center py-0.5 text-[7px] font-black uppercase tracking-tight" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor }}>
                                    {currentPlayer.couponCode}
                                  </div>
                                  <div className="text-center py-0.5 text-[7px] font-bold" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor }}>
                                    {currentPlayer.couponText}
                                  </div>
                                </div>
                              )}

                              {/* COLUNA LATERAL DIREITA DE AÇÕES */}
                              <div className="absolute top-3.5 right-2 flex flex-col items-center gap-1.5 z-20">
                                <div className="flex items-center gap-1 bg-[#e7191f] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  <PlaySquare className="w-2 h-2 fill-white"/> LIVE
                                </div>

                                {currentPlayer.showViewerCount && (
                                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md text-white text-[7px] font-semibold px-1.5 py-0.5 rounded-full border border-white/10 shadow-sm">
                                    <Eye className="w-2 h-2 text-white/90" /> 1.2k
                                  </div>
                                )}

                                {currentPlayer.autoplayMuted && (
                                  <div className="w-5 h-5 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
                                    <VolumeX className="w-2.5 h-2.5"/>
                                  </div>
                                )}

                                {currentPlayer.showChat && (
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white border shadow-sm transition ${phone.id === 'chat' ? 'bg-white/25 border-white/70' : 'bg-black/45 border-white/20'}`}>
                                    <MessageCircle className="w-2.5 h-2.5"/>
                                  </div>
                                )}

                                {currentPlayer.showShare && (
                                  <div className="w-5 h-5 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
                                    <Send className="w-2 h-2 -ml-0.5 mt-0.5 transform -rotate-12"/>
                                  </div>
                                )}

                                <div className="w-5 h-5 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-sm">
                                  <ShoppingBag className="w-2.5 h-2.5"/>
                                </div>

                                {currentPlayer.showProducts && (
                                  <div className="flex flex-col items-center -mt-0.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white border shadow-sm transition ${phone.id === 'products' ? 'bg-white/25 border-white/70' : 'bg-black/45 border-white/20'}`}>
                                      <ShoppingCart className="w-2.5 h-2.5"/>
                                    </div>
                                    <span className="text-white text-[6px] font-bold drop-shadow mt-0.5">3</span>
                                  </div>
                                )}

                                <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center text-white border border-white shadow-md">
                                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </div>
                              </div>

                              {/* CHAT ABERTO */}
                              {phone.id === 'chat' && currentPlayer.showChat && (
                                <div className="absolute bottom-[60px] left-2 right-9 z-20 flex flex-col justify-end pointer-events-none">
                                  <div className="flex flex-col gap-1 mb-1.5 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent 100%)' }}>
                                    {[1,2,3].map(i => (
                                      <div key={i} className="flex items-center gap-1 drop-shadow">
                                        <img src={`https://i.pravatar.cc/100?img=${i+14}`} className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"/>
                                        <span className="text-white text-[7.5px] font-medium drop-shadow leading-none">Nononononono</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="bg-white/90 backdrop-blur-md rounded-full flex items-center justify-between pl-2.5 pr-1 py-0.5 shadow-sm">
                                    <span className="text-slate-400 text-[8px]">Chat...</span>
                                    <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 shrink-0" />
                                  </div>
                                </div>
                              )}

                              {/* CARD DO PRODUTO NA BASE */}
                              {phone.id !== 'products' && currentPlayer.showProducts && (
                                <div className="absolute bottom-2 left-2 right-2 z-20">
                                  <div
                                    className="bg-white p-1.5 flex gap-1.5 items-center shadow-lg"
                                    style={{
                                      border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                                      borderRadius: `${currentPlayer.borderRadius}px`
                                    }}
                                  >
                                    <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=120&auto=format" className="w-[32px] h-[38px] rounded-md object-cover bg-slate-100 shrink-0"/>
                                    <div className="flex-1 min-w-0 pr-0.5">
                                      <div
                                        className="font-bold leading-tight line-clamp-1"
                                        style={{ fontSize: `${currentPlayer.productNameSize * 0.75}px`, color: currentPlayer.productNameColor }}
                                      >
                                        Blusa Life Rosê em Malha Tecnológica
                                      </div>
                                      <div className="text-[6.5px] text-slate-400 line-through mt-0.5 leading-none">De: R$ 149,90</div>
                                      <div
                                        className="font-black leading-tight mt-0.5"
                                        style={{ fontSize: `${currentPlayer.productPriceSize * 0.75}px`, color: currentPlayer.productPriceColor }}
                                      >
                                        Por: R$ 149,90
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: currentPlayer.borderColor }}>
                                        <ShoppingCart className="w-2 h-2" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* GAVETA DE PRODUTOS ABERTA */}
                              {phone.id === 'products' && currentPlayer.showProducts && (
                                <div className="absolute inset-x-1.5 bottom-1.5 top-6 z-50 flex flex-col overflow-hidden">
                                  <div
                                    className="bg-white flex-1 flex flex-col shadow-2xl overflow-hidden"
                                    style={{
                                      border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                                      borderRadius: `${currentPlayer.borderRadius}px`
                                    }}
                                  >
                                    <div
                                      className="text-white text-center py-1.5 font-bold text-[10px] tracking-wide shadow-sm"
                                      style={{ backgroundColor: currentPlayer.borderColor }}
                                    >
                                      PRODUTOS
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1 scrollbar-hide bg-slate-50">
                                      {[1,2,3,4,5,6].map(i => (
                                        <div
                                          key={i}
                                          className="bg-white p-1 flex gap-1.5 items-center shadow-sm"
                                          style={{
                                            border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                                            borderRadius: `${Math.max(4, currentPlayer.borderRadius - 2)}px`
                                          }}
                                        >
                                          <div className="w-3 text-center font-black text-[8px]" style={{ color: currentPlayer.borderColor }}>0{i}</div>
                                          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=120&auto=format" className="w-[28px] h-[34px] object-cover rounded bg-slate-100 shrink-0"/>
                                          <div className="flex-1 min-w-0">
                                            <div
                                              className="font-bold leading-tight line-clamp-1"
                                              style={{ fontSize: `${currentPlayer.productNameSize * 0.72}px`, color: currentPlayer.productNameColor }}
                                            >
                                              Blusa Life Rosê em Malha Tecnológica
                                            </div>
                                            <div className="text-[6.5px] text-slate-400 line-through">De: R$ 149,90</div>
                                            <div
                                              className="font-bold"
                                              style={{ fontSize: `${currentPlayer.productPriceSize * 0.72}px`, color: currentPlayer.productPriceColor }}
                                            >
                                              Por: R$ 149,90
                                            </div>
                                          </div>
                                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: currentPlayer.borderColor }}>
                                            <ShoppingCart className="w-2 h-2"/>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="bg-white p-1.5 border-t flex flex-col items-center shrink-0" style={{ borderColor: `${currentPlayer.borderColor}30` }}>
                                      <ChevronDown className="w-3 h-3 mb-0.5" style={{ color: currentPlayer.borderColor }}/>
                                      <div className="flex justify-between items-center w-full text-[8.5px] font-bold" style={{ color: currentPlayer.borderColor }}>
                                        <span className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentPlayer.borderColor }}></span>
                                          6 Produtos adicionados
                                        </span>
                                        <span className="text-slate-600 flex items-center">Finalizar <ExternalLink className="w-2 h-2 ml-0.5"/></span>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // ----------------------------------------------------
                      // PREVIEW DESKTOP - Layout de 3 colunas
                      // ----------------------------------------------------
                      <div className="flex gap-3 sm:gap-4 w-full max-w-[1050px] mx-auto h-full max-h-[550px] justify-center">
                        
                        {/* --- COLUNA 1: Produtos + Info --- */}
                        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[310px] flex-1">
                          {currentPlayer.showProducts && (
                            <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden shadow-sm" style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: currentPlayer.borderRadius }}>
                              <div className="text-white text-center py-2 font-medium text-[13px] tracking-wide" style={{ backgroundColor: currentPlayer.borderColor }}>PRODUTOS</div>
                              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-thin">
                                {[1,2,3,4,5].map(i => (
                                  <div key={i} className="flex gap-2 p-1.5 bg-white border rounded-lg relative transition-all hover:shadow-md" style={{ borderColor: currentPlayer.borderColor }}>
                                      <div className="font-bold text-[11px] w-4 pt-1 text-center" style={{ color: currentPlayer.borderColor }}>0{i}</div>
                                      <div className="w-[50px] h-[60px] bg-slate-100 rounded overflow-hidden shrink-0">
                                        <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=100&auto=format&fit=crop" className="w-full h-full object-cover" alt="Produto" />
                                      </div>
                                      <div className="flex-1 pt-0.5 pr-6">
                                        <div style={{ fontSize: currentPlayer.productNameSize, color: currentPlayer.productNameColor }} className="leading-tight line-clamp-2 font-medium">Blusa Life Rosê em Malha Tecnológica</div>
                                        <div className="text-[10px] text-slate-400 line-through mt-0.5">De: R$ 199,90</div>
                                        <div style={{ fontSize: currentPlayer.productPriceSize, color: currentPlayer.productPriceColor }} className="font-bold leading-none">Por: R$ 149,90</div>
                                      </div>
                                      <div className="absolute right-2 bottom-2 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: currentPlayer.borderColor }}>
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                      </div>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t p-2.5 flex justify-between items-center bg-slate-50" style={{ borderColor: `${currentPlayer.borderColor}40` }}>
                                  <div className="flex items-center text-[11px] font-medium text-slate-600">
                                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" style={{ color: currentPlayer.borderColor }}/> 
                                    6 Produtos adicionados
                                  </div>
                                  <div className="text-[11px] font-bold flex items-center cursor-pointer hover:underline" style={{ color: currentPlayer.borderColor }}>
                                    Finalizar <ExternalLink className="w-3 h-3 ml-1" />
                                  </div>
                              </div>
                            </div>
                          )}

                          {currentPlayer.showInfo && (
                            <div className="h-[55px] xl:h-[60px] flex-shrink-0 flex flex-col items-center justify-center shadow-sm transition-all w-full overflow-hidden" 
                                  style={{ backgroundColor: currentPlayer.infoBgColor, color: currentPlayer.infoTextColor, border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: currentPlayer.borderRadius }}>
                                <div className="font-black tracking-tight leading-none" style={{ fontSize: currentPlayer.infoSize1 }}>{currentPlayer.infoText1}</div>
                                <div className="font-medium opacity-80 mt-1" style={{ fontSize: currentPlayer.infoSize2 }}>{currentPlayer.infoText2}</div>
                            </div>
                          )}
                        </div>

                        {/* --- COLUNA 2: Video + Cupom --- */}
                        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[310px] flex-1">
                            <div className="flex-1 min-h-0 relative bg-black overflow-hidden shadow-lg w-full" style={{
                              border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                              borderRadius: currentPlayer.borderRadius,
                            }}>
                              <video src="/demo-videos/demo1.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-90" />
                              <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-2">
                                 <div className="flex items-center gap-2 max-w-[60%]">
                                    <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-[14px] shrink-0">🦋</div>
                                    {currentPlayer.showTitle && (
                                      <span style={{ color: currentPlayer.titleColor }} className="font-bold text-[13px] drop-shadow-md truncate leading-tight">
                                        {currentPlayer.titleText}
                                      </span>
                                    )}
                                 </div>
                                 <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                                       <Radio className="w-3 h-3 animate-pulse"/> Ao Vivo
                                    </div>
                                    {currentPlayer.showViewerCount && (
                                       <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
                                         <Eye className="w-3 h-3" /> 1.2K
                                       </div>
                                    )}
                                    {currentPlayer.autoplayMuted && (
                                       <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white border border-white/20 mt-1">
                                         <VolumeX className="w-3.5 h-3.5"/>
                                       </div>
                                    )}
                                 </div>
                              </div>
                            </div>

                            {currentPlayer.showCoupon && (
                              <div className="h-[55px] xl:h-[60px] flex-shrink-0 flex overflow-hidden shadow-sm w-full" style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: currentPlayer.borderRadius }}>
                                <div className="flex items-center justify-center px-4 font-black tracking-widest text-[16px]" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor, width: '50%' }}>
                                  {currentPlayer.couponCode}
                                </div>
                                <div className="flex items-center justify-center px-4 font-black text-[18px]" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor, width: '50%' }}>
                                  {currentPlayer.couponText}
                                </div>
                              </div>
                            )}
                        </div>

                        {/* --- COLUNA 3: Chat + Compartilhar --- */}
                        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[310px] flex-1">
                          {currentPlayer.showChat && (
                            <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden shadow-sm" style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: currentPlayer.borderRadius }}>
                              <div className="text-white text-center py-2 font-medium text-[13px] tracking-wide" style={{ backgroundColor: currentPlayer.borderColor }}>CHAT</div>
                              <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                                  <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-14 scrollbar-thin">
                                    {[1,2,3,4,5].map(i => (
                                      <div key={i} className="flex gap-2.5 items-start text-[11px] leading-tight">
                                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} className="w-6 h-6 rounded-full border border-slate-200 shrink-0" alt="Avatar" />
                                        <div className="text-slate-600 pt-0.5">
                                          <span className="font-bold text-slate-800">@usuario{i}</span> Oi, qual o valor? Vocês entregam para SP?
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent">
                                    <div className="bg-white border rounded-full py-2 px-3.5 text-[12px] text-slate-400 flex justify-between items-center shadow-sm" style={{ borderColor: currentPlayer.borderColor }}>
                                        Chat...
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white cursor-pointer" style={{ backgroundColor: currentPlayer.borderColor }}>
                                          <Heart className="w-3.5 h-3.5 fill-current"/>
                                        </div>
                                    </div>
                                  </div>
                              </div>
                            </div>
                          )}

                          {currentPlayer.showShare && (
                            <button className="h-[55px] xl:h-[60px] flex-shrink-0 w-full flex items-center justify-center gap-2 shadow-sm font-bold text-[16px] transition-transform hover:scale-[1.02] overflow-hidden" 
                                    style={{ backgroundColor: currentPlayer.shareBgColor, color: currentPlayer.shareTextColor, border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: currentPlayer.borderRadius }}>
                                Compartilhar <Share2 className="w-4 h-4 ml-1" />
                            </button>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between z-20">
          <Button variant="ghost" onClick={handleReset} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold px-2">
            <RotateCcw className="w-4 h-4 mr-2" /> RESETAR ESTA ABA
          </Button>

          <div className="flex items-center text-[12px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full hidden sm:flex">
            <Info className="w-4 h-4 mr-2 text-slate-400" /> 
            O preview é visual. As dimensões e posições reais variam no site do cliente.
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
