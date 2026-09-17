import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, Link as LinkIcon, Unlink, Radio, Save, LayoutTemplate, PlaySquare,
  VolumeX, ChevronDown, RotateCcw, Info, Share2, ShoppingCart
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
}

export interface WidgetDivulgacaoSettings extends BaseWidgetSettings {
  showCountdown: boolean;
  countdownBgColor: string;
  countdownTextColor: string;
}

export interface WidgetAoVivoSettings extends BaseWidgetSettings {
  // Herda as configurações base
}

export interface LivePlayerSettings {
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  
  showTitle: boolean;
  titleText: string;
  titleColor: string;

  // Card Cupom
  couponCode: string;
  couponCodeColor: string;
  couponCodeBgColor: string;
  couponText: string;
  couponTextColor: string;
  couponTextBgColor: string;

  // Card Informativo
  infoText1: string;
  infoText2: string;
  infoSize1: number;
  infoSize2: number;
  infoTextColor: string;
  infoBgColor: string;

  // Card Compartilhar
  shareTextColor: string;
  shareBgColor: string;

  // Elementos do player
  showViewerCount: boolean;
  showChat: boolean;
  autoplayMuted: boolean;
  showProducts: boolean;

  // Produto
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
  ctaTextColor: "#FFFFFF"
};

export const defaultDivulgacaoSettings: WidgetDivulgacaoSettings = {
  ...defaultWidgetBase,
  showCountdown: true,
  countdownBgColor: "#e7191f",
  countdownTextColor: "#FFFFFF"
};

export const defaultAoVivoSettings: WidgetAoVivoSettings = {
  ...defaultWidgetBase,
  ctaText: "AO VIVO",
  ctaBgColor: "#e7191f"
};

// MANTIDO PARA EVITAR ERRO DE BUILD NA PÁGINA LIVECOMMERCEPAGE
export const defaultWidgetSettings = defaultDivulgacaoSettings;

export const defaultPlayerSettings: LivePlayerSettings = {
  borderColor: "#e7191f",
  borderWidth: 2,
  borderRadius: 12,
  
  showTitle: true,
  titleText: "Live Shop",
  titleColor: "#FFFFFF",

  couponCode: "CÓDIGO",
  couponCodeColor: "#FFFFFF",
  couponCodeBgColor: "#e7191f",
  couponText: "15%OFF",
  couponTextColor: "#000000",
  couponTextBgColor: "#FFFFFF",

  infoText1: "FRETE GRÁTIS",
  infoText2: "Acima de R$200",
  infoSize1: 20,
  infoSize2: 14,
  infoTextColor: "#000000",
  infoBgColor: "#FFFFFF",

  shareTextColor: "#000000",
  shareBgColor: "#FFFFFF",

  showViewerCount: true,
  showChat: true,
  autoplayMuted: true,
  showProducts: true,

  productNameSize: 12,
  productNameColor: "#000000",
  productPriceSize: 12,
  productPriceColor: "#e7191f",
};

// --- COMPONENTES VISUAIS CUSTOMIZADOS (AGORA TODOS FORA DO COMPONENTE PRINCIPAL) ---
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
  const [activeTab, setActiveTab] = useState<"divulgacao" | "aovivo" | "player">("divulgacao");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [openAccordion, setOpenAccordion] = useState<string>("formato");

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
              <div className="mt-3 space-y-3">
                <Input value={config.ctaText} onChange={(e) => updateFn("ctaText", e.target.value)} placeholder="Texto" className="h-9 rounded-lg text-[13px]" />
                <div className="grid grid-cols-2 gap-3">
                  <ColorInput label="Fundo" value={config.ctaBgColor} onChange={(v) => updateFn("ctaBgColor", v)} />
                  <ColorInput label="Texto" value={config.ctaTextColor} onChange={(v) => updateFn("ctaTextColor", v)} />
                </div>
              </div>
            )}
          </div>

          {isDivulgacao && (
            <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <CustomSwitch checked={config.showCountdown} onChange={(v) => updateFn("showCountdown", v)} label="Contador Regressivo" />
              {config.showCountdown && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <ColorInput label="Fundo" value={config.countdownBgColor} onChange={(v) => updateFn("countdownBgColor", v)} />
                  <ColorInput label="Texto" value={config.countdownTextColor} onChange={(v) => updateFn("countdownTextColor", v)} />
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
      <DialogContent className="max-w-[1250px] w-full h-[92vh] p-0 flex flex-col overflow-hidden bg-white">
        
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

        {/* CORPO */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          
          {/* PAINEL ESQUERDO */}
          <div className="w-[380px] min-w-[380px] bg-white border-r border-slate-200 flex flex-col z-10 overflow-hidden">
            <div className="pt-6 pb-4 px-6 flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
                Configurações
              </h3>
               {/* Toggle Dispositivo */}
               <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-white shadow-sm text-rose-600" : "text-slate-400"}`}><Monitor className="h-3.5 w-3.5" /></button>
                  <button onClick={toggleLink} className={`p-1.5 rounded-md hover:bg-slate-200/50 ${isLinked ? "text-rose-600" : "text-slate-400"}`}>{isLinked ? <LinkIcon className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}</button>
                  <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-white shadow-sm text-rose-600" : "text-slate-400"}`}><Smartphone className="h-3.5 w-3.5" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
              {activeTab === "divulgacao" && renderWidgetSettings(currentDivulgacao, (k:any, v:any) => updateConfig(setDivulgacaoConfig, k, v, divulgacaoConfig.linked), true)}
              {activeTab === "aovivo" && renderWidgetSettings(currentAoVivo, (k:any, v:any) => updateConfig(setAoVivoConfig, k, v, aoVivoConfig.linked), false)}

              {/* ABA PLAYER */}
              {activeTab === "player" && (
                <div className="animate-in fade-in duration-300">
                  <AccordionItem id="player_borda" title="1. Borda" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
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
                      {/* Titulo */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        <CustomSwitch checked={currentPlayer.showTitle} onChange={(v) => updateConfig(setPlayerConfig, "showTitle", v, playerConfig.linked)} label="Exibir Título" />
                        {currentPlayer.showTitle && (
                          <div className="mt-3 space-y-3">
                            <Input value={currentPlayer.titleText} onChange={(e) => updateConfig(setPlayerConfig, "titleText", e.target.value)} className="h-8 rounded-lg text-[13px]" />
                            <ColorInput label="Cor do Texto" value={currentPlayer.titleColor} onChange={(v) => updateConfig(setPlayerConfig, "titleColor", v, playerConfig.linked)} />
                          </div>
                        )}
                      </div>

                      {/* Card Cupom */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                        <span className="text-[12px] font-bold text-slate-700">Estilo do Cupom</span>
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

                      {/* Card Informativo */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                        <span className="text-[12px] font-bold text-slate-700">Card Informativo</span>
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

                      {/* Card Compartilhar */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                         <span className="text-[12px] font-bold text-slate-700">Botão Compartilhar</span>
                         <div className="grid grid-cols-2 gap-3 mt-1">
                           <ColorInput label="Cor Texto" value={currentPlayer.shareTextColor} onChange={(v) => updateConfig(setPlayerConfig, "shareTextColor", v, playerConfig.linked)} />
                           <ColorInput label="Cor Fundo" value={currentPlayer.shareBgColor} onChange={(v) => updateConfig(setPlayerConfig, "shareBgColor", v, playerConfig.linked)} />
                        </div>
                      </div>

                      {/* Produtos */}
                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        <CustomSwitch checked={currentPlayer.showProducts} onChange={(v) => updateConfig(setPlayerConfig, "showProducts", v, playerConfig.linked)} label="Exibir Produtos" />
                        {currentPlayer.showProducts && (
                          <div className="mt-4 grid grid-cols-2 gap-4">
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
            <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-4 sm:p-8 relative overflow-hidden min-h-0">
                
                {/* --- MOCKUP DO DISPOSITIVO --- */}
                {activeTab !== "player" ? (
                  // PREVIEW DOS WIDGETS FLUTUANTES
                  <div className={`relative bg-[#0a0a0a] transition-all duration-500 flex flex-col shrink-0 ${
                    device === "desktop" 
                      ? "w-full max-w-[850px] aspect-video rounded-xl border-4 border-[#0a0a0a] overflow-hidden shadow-xl" 
                      : "h-full max-h-[700px] max-w-[95%] aspect-[9/19.5] rounded-[2rem] shadow-[0_0_0_3px_#f4d1c0] border-[6px] border-[#0a0a0a] overflow-hidden"
                  }`}>
                    {device === "mobile" && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] max-w-[120px] h-[20px] bg-[#0a0a0a] rounded-b-[1rem] z-[100]"></div>}
                    <div className="absolute inset-0 bg-white">
                      <div className="w-full h-full opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format')", backgroundSize: "cover"}}></div>
                      
{/* O WIDGET EM SI */}
{(activeTab === "divulgacao" || activeTab === "aovivo") && (() => {
  const config = activeTab === "divulgacao" ? currentDivulgacao : currentAoVivo;
  return (
    {/* AQUI: Removida a sombra do pai e adicionado 'gap-2.5' para separar os itens */}
    <div className="absolute transition-all duration-300 flex flex-col items-center group cursor-pointer gap-2.5" 
        style={{
          ...(config.position.includes('bottom') ? { bottom: config.marginBottom } : { top: config.marginTop }),
          ...(config.position.includes('left') ? { left: config.marginSide } : { right: config.marginSide }),
        }}>
        
        {/* Container do Video: Sombra movida para cá */}
        <div className="relative overflow-hidden bg-black shadow-[0_8px_30px_rgba(0,0,0,0.15)]" style={{
          width: config.width,
          height: calcHeight(config.format, config.width),
          border: `${config.borderWidth}px solid ${config.borderColor}`,
          borderRadius: config.format === 'circular' ? '50%' : config.borderRadius,
        }}>
          <video src="/demo-videos/demo1.mp4" autoPlay loop muted playsInline className="w-full h-full" style={{ objectFit: config.objectFit }} />
          {config.showCloseButton && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10">✕</div>}
          {config.playVideo && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center"><PlaySquare className="w-3.5 h-3.5 ml-0.5 fill-white text-white"/></div>}
          
          {/* Contador (Apenas Divulgação) */}
          {activeTab === "divulgacao" && currentDivulgacao.showCountdown && (
            <div className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10"
                 style={{ backgroundColor: currentDivulgacao.countdownBgColor, color: currentDivulgacao.countdownTextColor }}>
              02d 10h 01m
            </div>
          )}
        </div>

        {/* CTA Embaixo: Removido o '-mt-2', arredondado por completo (rounded-full) e com sombra própria */}
        {config.showCTA && (
          <div className="text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg text-center transition-transform hover:scale-105" 
               style={{ backgroundColor: config.ctaBgColor, color: config.ctaTextColor, width: '90%', minWidth: 'max-content' }}>
            {config.ctaText}
          </div>
        )}
    </div>
  )
})()}
                    </div>
                  </div>
                ) : (
                  // PREVIEW DO PLAYER
                  <div className={`w-full h-full bg-slate-50 flex ${device === 'mobile' ? 'flex-col overflow-y-auto rounded-xl border border-slate-200' : 'gap-4 p-4'}`}>
                    
                    {/* COLUNA ESQUERDA: Produtos */}
                    {currentPlayer.showProducts && (
                      <div className={`${device === 'mobile' ? 'w-full order-3 p-4' : 'w-[280px] flex-shrink-0 flex flex-col'}`}>
                        <div className="text-white text-center py-2.5 rounded-t-xl font-medium text-sm" style={{ backgroundColor: currentPlayer.borderColor }}>PRODUTOS</div>
                        <div className="border border-t-0 rounded-b-xl bg-white p-2 space-y-2 flex-1 overflow-y-auto" style={{ borderColor: currentPlayer.borderColor }}>
                          {[1,2,3].map(i => (
                            <div key={i} className="flex gap-2 p-2 border border-slate-100 rounded-lg shadow-sm relative">
                               <div className="absolute left-1 top-1 font-bold text-xs" style={{ color: currentPlayer.borderColor }}>{`0${i}`}</div>
                               <div className="w-12 h-14 bg-slate-100 rounded mt-3 ml-2 overflow-hidden"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=100&auto=format&fit=crop" className="w-full h-full object-cover"/></div>
                               <div className="flex-1 pt-1">
                                  <div style={{ fontSize: currentPlayer.productNameSize, color: currentPlayer.productNameColor }} className="leading-tight line-clamp-2">Blusa Life Rosê em Malha Tecnológica</div>
                                  <div style={{ fontSize: currentPlayer.productPriceSize, color: currentPlayer.productPriceColor }} className="font-bold mt-1">Por: R$ 149,90</div>
                               </div>
                               <div className="absolute right-2 bottom-2" style={{ color: currentPlayer.borderColor }}><ShoppingCart className="w-4 h-4" /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COLUNA CENTRAL: Video + Cards */}
                    <div className={`flex flex-col gap-4 ${device === 'mobile' ? 'w-full order-1 p-4 pb-0' : 'flex-1 max-w-[400px] mx-auto'}`}>
                       {/* Video */}
                       <div className="relative bg-black overflow-hidden flex-shrink-0" style={{
                         border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                         borderRadius: currentPlayer.borderRadius,
                         aspectRatio: '9/16'
                       }}>
                          <video src="/demo-videos/demo2.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
                          
                          {/* Elementos no video */}
                          <div className="absolute top-4 left-4 flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">🦋</div>
                             {currentPlayer.showTitle && <span style={{ color: currentPlayer.titleColor }} className="font-bold text-sm drop-shadow-md">{currentPlayer.titleText}</span>}
                          </div>

                          <div className="absolute top-4 right-4 flex items-center gap-2">
                            <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase"><Radio className="w-3 h-3 animate-pulse"/> Ao Vivo</div>
                          </div>

                          {currentPlayer.autoplayMuted && <div className="absolute top-14 right-4 bg-black/40 backdrop-blur-md p-1.5 rounded text-white"><VolumeX className="w-3.5 h-3.5"/></div>}
                       </div>

                       {/* Card Cupom */}
                       <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ height: '48px' }}>
                          <div className="flex items-center justify-center px-4 font-bold tracking-wide" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor, width: '50%' }}>
                            {currentPlayer.couponCode}
                          </div>
                          <div className="flex items-center justify-center px-4 font-bold" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor, width: '50%' }}>
                            {currentPlayer.couponText}
                          </div>
                       </div>

                       {/* Card Informativo */}
                       <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 shadow-sm py-2" style={{ backgroundColor: currentPlayer.infoBgColor, color: currentPlayer.infoTextColor }}>
                          <div className="font-black tracking-tight" style={{ fontSize: currentPlayer.infoSize1 }}>{currentPlayer.infoText1}</div>
                          <div className="font-medium opacity-80" style={{ fontSize: currentPlayer.infoSize2 }}>{currentPlayer.infoText2}</div>
                       </div>
                    </div>

                    {/* COLUNA DIREITA: Chat + Compartilhar */}
                    <div className={`${device === 'mobile' ? 'w-full order-2 p-4 pb-0' : 'w-[280px] flex-shrink-0 flex flex-col gap-4'}`}>
                      {currentPlayer.showChat && (
                        <div className="flex-1 flex flex-col h-full max-h-[500px]">
                          <div className="text-white text-center py-2.5 rounded-t-xl font-medium text-sm" style={{ backgroundColor: currentPlayer.borderColor }}>CHAT</div>
                          <div className="border border-t-0 rounded-b-xl bg-white p-3 flex-1 flex flex-col overflow-hidden relative" style={{ borderColor: currentPlayer.borderColor }}>
                             <div className="flex-1 overflow-y-auto space-y-3 pb-12">
                                {[1,2,3,4].map(i => (
                                  <div key={i} className="flex gap-2 items-start text-xs">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0"></div>
                                    <div className="text-slate-600"><span className="font-bold text-slate-700">@usuario{i}</span> Oi, qual o valor?</div>
                                  </div>
                                ))}
                             </div>
                             <div className="absolute bottom-2 left-2 right-2 bg-slate-50 border border-slate-200 rounded-full py-2 px-3 text-xs text-slate-400 flex justify-between items-center">
                                Chat...
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: currentPlayer.borderColor }}></div>
                             </div>
                          </div>
                        </div>
                      )}

                      {/* Botão Compartilhar */}
                      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 shadow-sm font-bold text-[15px] transition-transform hover:scale-[1.02]" 
                              style={{ backgroundColor: currentPlayer.shareBgColor, color: currentPlayer.shareTextColor }}>
                         Compartilhar <Share2 className="w-4 h-4" />
                      </button>
                    </div>

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
