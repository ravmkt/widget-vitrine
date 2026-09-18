import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, Link as LinkIcon, Unlink, Radio, Save, LayoutTemplate, PlaySquare,
  VolumeX, ChevronDown, RotateCcw, Info, Share2, ShoppingCart, ExternalLink, Eye,
  MessageCircle, Send, Heart, ShoppingBag, FolderOpen, Plus, Check, Trash2, Layers
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

export interface WidgetAoVivoSettings extends BaseWidgetSettings {}

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

export interface LiveAppearanceTemplate {
  id: string;
  name: string;
  isDefault?: boolean;
  divulgacao: DeviceConfig<WidgetDivulgacaoSettings>;
  aoVivo: DeviceConfig<WidgetAoVivoSettings>;
  player: DeviceConfig<LivePlayerSettings>;
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

// --- DADOS MOCKADOS DOS PRODUTOS DA LIVE ---
const MOCK_PRODUCTS = [
  { id: 1, name: "Blusa Life Rosê em Malha Tecnológica", oldPrice: "R$ 149,90", price: "R$ 149,90", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format" },
  { id: 2, name: "Blusa Scrub Tecnológico Estampa Pet", oldPrice: "R$ 189,00", price: "R$ 149,90", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format" },
  { id: 3, name: "Vestido Midi Canelado Estampa Floral", oldPrice: "R$ 289,90", price: "R$ 199,90", img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=200&auto=format" },
  { id: 4, name: "Tênis Street Casual Branco & Caramelo", oldPrice: "R$ 349,00", price: "R$ 249,90", img: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=200&auto=format" },
  { id: 5, name: "Bolsa Couro Legítimo Alça Estruturada", oldPrice: "R$ 399,90", price: "R$ 299,00", img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=200&auto=format" },
  { id: 6, name: "Jaqueta Corta-Vento Street Casual", oldPrice: "R$ 259,00", price: "R$ 189,90", img: "https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=200&auto=format" },
  { id: 7, name: "Camisa Linho Pura Fibra Bege Areia", oldPrice: "R$ 189,00", price: "R$ 139,90", img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=200&auto=format" },
  { id: 8, name: "Conjunto Moletom Soft Plush Inverno", oldPrice: "R$ 299,00", price: "R$ 219,90", img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=200&auto=format" },
  { id: 9, name: "Óculos de Sol Retrô Polarizado Black", oldPrice: "R$ 169,00", price: "R$ 119,90", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=200&auto=format" },
  { id: 10, name: "Relógio Minimalista Pulseira Aço", oldPrice: "R$ 499,00", price: "R$ 349,90", img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=200&auto=format" },
];

const CART_PRODUCT_IDS = [1, 3, 5, 6, 8, 10];
const CURRENT_LIVE_PRODUCT_ID = 5;

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
  borderRadius: 14,
  playVideo: true,
  showCloseButton: true,
  showCTA: true,
  ctaText: "Participe",
  ctaBgColor: "#000000",
  ctaTextColor: "#FFFFFF",
  ctaBorderRadius: "9999px"
};

export const defaultWidgetSettings = defaultWidgetBase;
export type WidgetSettings = BaseWidgetSettings;

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
  borderRadius: 14,
  
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
  infoText2: "Acima de R$200,00",
  infoSize1: 18,
  infoSize2: 12,
  infoTextColor: "#FFFFFF",
  infoBgColor: "#e7191f",

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

// --- 4 PRESETS PADRÕES VIDLYTICS ---
const INITIAL_TEMPLATES: LiveAppearanceTemplate[] = [
  {
    id: "preset_padrao",
    name: "Padrão Vidlytics (Azul)",
    isDefault: true,
    divulgacao: {
      desktop: { ...defaultDivulgacaoSettings, borderColor: "#0094ea", ctaBgColor: "#0094ea" },
      mobile: { ...defaultDivulgacaoSettings, width: 80, borderColor: "#0094ea", ctaBgColor: "#0094ea" },
      linked: false
    },
    aoVivo: {
      desktop: { ...defaultAoVivoSettings, borderColor: "#0094ea", ctaBgColor: "#0094ea" },
      mobile: { ...defaultAoVivoSettings, width: 80, borderColor: "#0094ea", ctaBgColor: "#0094ea" },
      linked: false
    },
    player: {
      desktop: { ...defaultPlayerSettings, borderColor: "#0094ea" },
      mobile: { ...defaultPlayerSettings, borderColor: "#0094ea" },
      linked: true
    }
  },
  {
    id: "preset_blackfriday",
    name: "Tema Black Friday (Dourado & Preto)",
    isDefault: true,
    divulgacao: {
      desktop: { ...defaultDivulgacaoSettings, borderColor: "#eab308", ctaBgColor: "#000000", ctaTextColor: "#eab308", countdownBgColor: "#eab308", countdownTextColor: "#000000" },
      mobile: { ...defaultDivulgacaoSettings, width: 80, borderColor: "#eab308", ctaBgColor: "#000000", ctaTextColor: "#eab308", countdownBgColor: "#eab308", countdownTextColor: "#000000" },
      linked: false
    },
    aoVivo: {
      desktop: { ...defaultAoVivoSettings, borderColor: "#eab308", ctaBgColor: "#eab308", ctaTextColor: "#000000" },
      mobile: { ...defaultAoVivoSettings, width: 80, borderColor: "#eab308", ctaBgColor: "#eab308", ctaTextColor: "#000000" },
      linked: false
    },
    player: {
      desktop: {
        ...defaultPlayerSettings,
        borderColor: "#eab308",
        couponCodeBgColor: "#eab308",
        couponCodeColor: "#000000",
        couponTextBgColor: "#000000",
        couponTextColor: "#eab308",
        infoBgColor: "#000000",
        infoTextColor: "#eab308",
        productPriceColor: "#ca8a04",
      },
      mobile: {
        ...defaultPlayerSettings,
        borderColor: "#eab308",
        couponCodeBgColor: "#eab308",
        couponCodeColor: "#000000",
        couponTextBgColor: "#000000",
        couponTextColor: "#eab308",
        infoBgColor: "#000000",
        infoTextColor: "#eab308",
        productPriceColor: "#ca8a04",
      },
      linked: true
    }
  },
  {
    id: "preset_live",
    name: "Tema Live Especial (Roxo & Neon)",
    isDefault: true,
    divulgacao: {
      desktop: { ...defaultDivulgacaoSettings, borderColor: "#8b5cf6", ctaBgColor: "#8b5cf6", ctaTextColor: "#ffffff", countdownBgColor: "#7c3aed", countdownTextColor: "#ffffff" },
      mobile: { ...defaultDivulgacaoSettings, width: 80, borderColor: "#8b5cf6", ctaBgColor: "#8b5cf6", ctaTextColor: "#ffffff", countdownBgColor: "#7c3aed", countdownTextColor: "#ffffff" },
      linked: false
    },
    aoVivo: {
      desktop: { ...defaultAoVivoSettings, borderColor: "#8b5cf6", ctaBgColor: "#8b5cf6", ctaTextColor: "#ffffff" },
      mobile: { ...defaultAoVivoSettings, width: 80, borderColor: "#8b5cf6", ctaBgColor: "#8b5cf6", ctaTextColor: "#ffffff" },
      linked: false
    },
    player: {
      desktop: {
        ...defaultPlayerSettings,
        borderColor: "#8b5cf6",
        couponCodeBgColor: "#8b5cf6",
        couponCodeColor: "#ffffff",
        couponTextBgColor: "#4c1d95",
        couponTextColor: "#ffffff",
        infoBgColor: "#6d28d9",
        infoTextColor: "#ffffff",
        productPriceColor: "#7c3aed",
      },
      mobile: {
        ...defaultPlayerSettings,
        borderColor: "#8b5cf6",
        couponCodeBgColor: "#8b5cf6",
        couponCodeColor: "#ffffff",
        couponTextBgColor: "#4c1d95",
        couponTextColor: "#ffffff",
        infoBgColor: "#6d28d9",
        infoTextColor: "#ffffff",
        productPriceColor: "#7c3aed",
      },
      linked: true
    }
  },
  {
    id: "preset_aniversario",
    name: "Tema Aniversário (Rosa & Ouro)",
    isDefault: true,
    divulgacao: {
      desktop: { ...defaultDivulgacaoSettings, borderColor: "#ec4899", ctaBgColor: "#ec4899", ctaTextColor: "#ffffff", countdownBgColor: "#db2777", countdownTextColor: "#ffffff" },
      mobile: { ...defaultDivulgacaoSettings, width: 80, borderColor: "#ec4899", ctaBgColor: "#ec4899", ctaTextColor: "#ffffff", countdownBgColor: "#db2777", countdownTextColor: "#ffffff" },
      linked: false
    },
    aoVivo: {
      desktop: { ...defaultAoVivoSettings, borderColor: "#ec4899", ctaBgColor: "#ec4899", ctaTextColor: "#ffffff" },
      mobile: { ...defaultAoVivoSettings, width: 80, borderColor: "#ec4899", ctaBgColor: "#ec4899", ctaTextColor: "#ffffff" },
      linked: false
    },
    player: {
      desktop: {
        ...defaultPlayerSettings,
        borderColor: "#ec4899",
        couponCodeBgColor: "#ec4899",
        couponCodeColor: "#ffffff",
        couponTextBgColor: "#831843",
        couponTextColor: "#fbcfe8",
        infoBgColor: "#be185d",
        infoTextColor: "#ffffff",
        productPriceColor: "#db2777",
      },
      mobile: {
        ...defaultPlayerSettings,
        borderColor: "#ec4899",
        couponCodeBgColor: "#ec4899",
        couponCodeColor: "#ffffff",
        couponTextBgColor: "#831843",
        couponTextColor: "#fbcfe8",
        infoBgColor: "#be185d",
        infoTextColor: "#ffffff",
        productPriceColor: "#db2777",
      },
      linked: true
    }
  }
];

const STORAGE_KEY_TEMPLATES = "vidlytics_live_appearance_templates_v2";

// --- COMPONENTES AUXILIARES ---
const ColorInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => (
  <div className="space-y-1">
    {label && <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
    <div className="flex items-center gap-2">
      <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-200 bg-slate-50">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-25%] w-[150%] h-[150%] cursor-pointer border-0 p-0" />
      </div>
      <input type="text" value={value.toUpperCase()} onChange={(e) => onChange(e.target.value)} className="h-7 w-full min-w-[70px] rounded-md border border-slate-200 bg-slate-50/50 px-2 text-[11px] font-mono text-slate-600 shadow-sm outline-none focus:border-rose-500 focus:bg-white transition-colors" />
    </div>
  </div>
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
    <div className="mb-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
      <button onClick={() => setOpenAccordion(isOpen ? "" : id)} className="w-full bg-white hover:bg-slate-50 px-3.5 py-2.5 flex justify-between items-center transition-colors">
        <h4 className="text-[13px] font-semibold text-slate-700">{title}</h4>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="p-3 space-y-3 border-t border-slate-100 bg-white animate-in slide-in-from-top-1 duration-150">{children}</div>}
    </div>
  );
};

interface SubItemProps {
  id: string;
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  openSubItem: string;
  setOpenSubItem: (id: string) => void;
  hasSettings?: boolean;
  children?: React.ReactNode;
}

const ElementSubItem = ({
  id,
  label,
  checked,
  onToggle,
  openSubItem,
  setOpenSubItem,
  hasSettings = true,
  children
}: SubItemProps) => {
  const isOpen = openSubItem === id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !checked;
    onToggle(nextState);
    if (nextState && hasSettings) {
      setOpenSubItem(id);
    } else if (!nextState && isOpen) {
      setOpenSubItem("");
    }
  };

  const toggleExpand = () => {
    if (!hasSettings) return;
    setOpenSubItem(isOpen ? "" : id);
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 ${isOpen ? "border-rose-200 bg-rose-50/20 shadow-sm" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/40"}`}>
      <div 
        onClick={toggleExpand}
        className={`flex items-center justify-between p-2.5 ${hasSettings ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-2">
          {hasSettings && (
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-rose-600" : ""}`} />
          )}
          <span className={`text-[12.5px] font-medium transition-colors ${isOpen ? "text-rose-900 font-semibold" : "text-slate-700"}`}>
            {label}
          </span>
        </div>

        <div 
          onClick={handleToggle}
          className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors cursor-pointer shrink-0 ${checked ? 'bg-rose-600' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
      </div>

      {hasSettings && isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-rose-100 animate-in slide-in-from-top-1 duration-150 space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
};

export default function LiveAppearanceModal({ isOpen, onClose, onSave, isSaving }: Props) {
  const [activeTab, setActiveTab] = useState<"divulgacao" | "aovivo" | "player">("divulgacao");
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [openAccordion, setOpenAccordion] = useState<string>("player_visibilidade");
  const [openSubItem, setOpenSubItem] = useState<string>("");

  const [divulgacaoConfig, setDivulgacaoConfig] = useState<DeviceConfig<WidgetDivulgacaoSettings>>({
    desktop: { ...defaultDivulgacaoSettings }, mobile: { ...defaultDivulgacaoSettings, width: 80 }, linked: false
  });

  const [aoVivoConfig, setAoVivoConfig] = useState<DeviceConfig<WidgetAoVivoSettings>>({
    desktop: { ...defaultAoVivoSettings }, mobile: { ...defaultAoVivoSettings, width: 80 }, linked: false
  });

  const [playerConfig, setPlayerConfig] = useState<DeviceConfig<LivePlayerSettings>>({
    desktop: { ...defaultPlayerSettings }, mobile: { ...defaultPlayerSettings }, linked: true
  });

  // --- CONTROLE DIRETO DE TEMPLATES ---
  const [templates, setTemplates] = useState<LiveAppearanceTemplate[]>(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("preset_padrao");
  const [templateNameInput, setTemplateNameInput] = useState<string>("Padrão Vidlytics (Azul)");
  const [bannerAlert, setBannerAlert] = useState<string>("");

  // Sempre ao abrir o modal, resetar para a aba Divulgação e visualização Mobile
  useEffect(() => {
    if (isOpen) {
      setActiveTab("divulgacao");
      setDevice("mobile");
      setOpenAccordion("formato");
      setOpenSubItem("");
    }
  }, [isOpen]);

  // Carrega templates do usuário gravados no navegador
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTemplates([...INITIAL_TEMPLATES, ...parsed]);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const notify = (msg: string) => {
    setBannerAlert(msg);
    setTimeout(() => setBannerAlert(""), 3500);
  };

  // Ao trocar de template no select
  const handleSelectTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setSelectedTemplateId(id);
    setTemplateNameInput(tpl.name);
    setDivulgacaoConfig(JSON.parse(JSON.stringify(tpl.divulgacao)));
    setAoVivoConfig(JSON.parse(JSON.stringify(tpl.aoVivo)));
    setPlayerConfig(JSON.parse(JSON.stringify(tpl.player)));
    notify(`Template "${tpl.name}" carregado!`);
  };

  // Salvar alterações no template atual selecionado (ou se for default, salva como cópia com o novo nome)
  const handleSaveCurrentTemplate = () => {
    const name = templateNameInput.trim();
    if (!name) return;

    const currentTpl = templates.find(t => t.id === selectedTemplateId);

    // Se estiver em cima de um preset de fábrica ou se mudou o nome, salva como novo personalizado
    if (!currentTpl || currentTpl.isDefault) {
      handleSaveAsNewTemplate();
      return;
    }

    // Atualiza o template personalizado existente
    const updated = templates.map(t => {
      if (t.id === selectedTemplateId) {
        return {
          ...t,
          name: name,
          divulgacao: JSON.parse(JSON.stringify(divulgacaoConfig)),
          aoVivo: JSON.parse(JSON.stringify(aoVivoConfig)),
          player: JSON.parse(JSON.stringify(playerConfig))
        };
      }
      return t;
    });

    const customs = updated.filter(t => !t.isDefault);
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customs));
    setTemplates(updated);
    notify(`Template "${name}" atualizado com sucesso!`);
  };

  // Salvar como um novo template independente
  const handleSaveAsNewTemplate = () => {
    const name = templateNameInput.trim();
    if (!name) return;

    const newId = "custom_" + Date.now();
    const newTemplate: LiveAppearanceTemplate = {
      id: newId,
      name: name,
      isDefault: false,
      divulgacao: JSON.parse(JSON.stringify(divulgacaoConfig)),
      aoVivo: JSON.parse(JSON.stringify(aoVivoConfig)),
      player: JSON.parse(JSON.stringify(playerConfig))
    };

    const customs = [...templates.filter(t => !t.isDefault), newTemplate];
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customs));
    setTemplates([...INITIAL_TEMPLATES, ...customs]);
    setSelectedTemplateId(newId);
    notify(`Novo template "${name}" salvo!`);
  };

  // Excluir template customizado
  const handleDeleteCurrentTemplate = () => {
    const current = templates.find(t => t.id === selectedTemplateId);
    if (!current || current.isDefault) return;

    if (!confirm(`Deseja realmente excluir o template "${current.name}"?`)) return;

    const customs = templates.filter(t => !t.isDefault && t.id !== selectedTemplateId);
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customs));
    setTemplates([...INITIAL_TEMPLATES, ...customs]);
    setSelectedTemplateId("preset_padrao");
    setTemplateNameInput("Padrão Vidlytics (Azul)");
    notify("Template excluído.");
  };

  const handleSave = () => { onSave(divulgacaoConfig, aoVivoConfig, playerConfig); };

  const handleReset = () => {
    setOpenSubItem("");
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

  const isCurrentTemplateCustom = templates.find(t => t.id === selectedTemplateId && !t.isDefault);

  const renderWidgetSettings = (config: any, updateFn: any, isDivulgacao: boolean) => (
    <div className="animate-in fade-in duration-200">
      <AccordionItem id="formato" title="1. Formato & Dimensões" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600">Formato</label>
          <select className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 outline-none" value={config.format} onChange={(e) => updateFn("format", e.target.value)}>
            <option value="portrait">Retrato 9:16</option>
            <option value="landscape">Paisagem 16:9</option>
            <option value="square">Quadrado</option>
            <option value="circular">Circular</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600">Ajuste da Imagem</label>
          <select className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 outline-none" value={config.objectFit} onChange={(e) => updateFn("objectFit", e.target.value)}>
            <option value="cover">Cover (Preencher)</option>
            <option value="contain">Contain (Ajustar)</option>
            <option value="fill">Fill (Esticar)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">Largura (px)</label>
            <Input type="number" value={config.width} onChange={(e) => updateFn("width", Number(e.target.value))} className="h-8 rounded-lg text-[12px]" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Altura (calc)</label>
            <Input disabled value={calcHeight(config.format, config.width)} className="h-8 rounded-lg text-[12px] bg-slate-100/50" />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem id="posicao" title="2. Posição & Margens" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-600">Posição na Tela</label>
          <select className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 outline-none" value={config.position} onChange={(e) => updateFn("position", e.target.value)}>
            <option value="bottom-left">Inferior Esquerda</option>
            <option value="bottom-right">Inferior Direita</option>
            <option value="top-left">Superior Esquerda</option>
            <option value="top-right">Superior Direita</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">Margem Inferior</label>
            <Input type="number" value={config.marginBottom} onChange={(e) => updateFn("marginBottom", Number(e.target.value))} className="h-8 rounded-lg text-[12px]" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600">Margem Superior</label>
            <Input type="number" value={config.marginTop} onChange={(e) => updateFn("marginTop", Number(e.target.value))} className="h-8 rounded-lg text-[12px]" />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[11px] font-medium text-slate-600">Margem Lateral</label>
            <Input type="number" value={config.marginSide} onChange={(e) => updateFn("marginSide", Number(e.target.value))} className="h-8 rounded-lg text-[12px]" />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem id="bordas" title="3. Bordas" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <ColorInput label="Cor da Borda" value={config.borderColor} onChange={(v) => updateFn("borderColor", v)} />
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Espessura (px)</label>
            <Input type="number" value={config.borderWidth} onChange={(e) => updateFn("borderWidth", Number(e.target.value))} className="h-7 rounded-md text-[12px]" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Raio (Arredondamento)</label>
          <Input type="number" value={config.borderRadius} onChange={(e) => updateFn("borderRadius", Number(e.target.value))} disabled={config.format === 'circular'} className="h-8 rounded-lg text-[12px] disabled:opacity-50" />
        </div>
      </AccordionItem>

      <AccordionItem id="elementos" title="4. Elementos Visíveis" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
        <div className="space-y-2">
          <ElementSubItem
            id="sub_cta"
            label="Botão de Ação (CTA)"
            checked={config.showCTA}
            onToggle={(v) => updateFn("showCTA", v)}
            openSubItem={openSubItem}
            setOpenSubItem={setOpenSubItem}
          >
            <Input value={config.ctaText} onChange={(e) => updateFn("ctaText", e.target.value)} placeholder="Texto CTA" className="h-7 rounded-md text-[12px]" />
            <div className="grid grid-cols-2 gap-2">
              <ColorInput label="Fundo" value={config.ctaBgColor} onChange={(v) => updateFn("ctaBgColor", v)} />
              <ColorInput label="Texto" value={config.ctaTextColor} onChange={(v) => updateFn("ctaTextColor", v)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Raio da Borda</label>
              <Input type="text" value={config.ctaBorderRadius || '9999px'} onChange={(e) => updateFn("ctaBorderRadius", e.target.value)} placeholder="ex: 8px ou 9999px" className="h-7 rounded-md text-[12px]" />
            </div>
          </ElementSubItem>

          {isDivulgacao && (
            <ElementSubItem
              id="sub_countdown"
              label="Contador Regressivo"
              checked={config.showCountdown}
              onToggle={(v) => updateFn("showCountdown", v)}
              openSubItem={openSubItem}
              setOpenSubItem={setOpenSubItem}
            >
              <div className="grid grid-cols-2 gap-2">
                <ColorInput label="Fundo" value={config.countdownBgColor} onChange={(v) => updateConfig(setDivulgacaoConfig, "countdownBgColor", v, divulgacaoConfig.linked)} />
                <ColorInput label="Texto" value={config.countdownTextColor} onChange={(v) => updateConfig(setDivulgacaoConfig, "countdownTextColor", v, divulgacaoConfig.linked)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Raio da Borda</label>
                <Input type="text" value={config.countdownBorderRadius || '4px'} onChange={(e) => updateConfig(setDivulgacaoConfig, "countdownBorderRadius", e.target.value, divulgacaoConfig.linked)} placeholder="ex: 4px" className="h-7 rounded-md text-[12px]" />
              </div>
            </ElementSubItem>
          )}

          <ElementSubItem id="sub_video" label="Reproduzir Vídeo" checked={config.playVideo} onToggle={(v) => updateFn("playVideo", v)} openSubItem={openSubItem} setOpenSubItem={setOpenSubItem} hasSettings={false} />
          <ElementSubItem id="sub_close" label="Exibir Botão Fechar (X)" checked={config.showCloseButton} onToggle={(v) => updateFn("showCloseButton", v)} openSubItem={openSubItem} setOpenSubItem={setOpenSubItem} hasSettings={false} />
        </div>
      </AccordionItem>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[97vw] w-[97vw] h-[96vh] p-0 flex flex-col overflow-hidden bg-white shadow-2xl rounded-2xl border-0">
        
        {/* CABEÇALHO COM SELEÇÃO DE ABAS */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-[17px] font-bold tracking-tight text-slate-800">Estilo da Experiência Ao Vivo</h2>
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-full">
              <button 
                onClick={() => { setActiveTab("divulgacao"); setOpenAccordion("formato"); setOpenSubItem(""); }} 
                className={`px-3.5 py-1 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${activeTab === "divulgacao" ? "bg-rose-600 text-white shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
              >
                <LayoutTemplate className="w-3 h-3" /> Divulgação
              </button>
              <button 
                onClick={() => { setActiveTab("aovivo"); setOpenAccordion("formato"); setOpenSubItem(""); }} 
                className={`px-3.5 py-1 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${activeTab === "aovivo" ? "bg-rose-600 text-white shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Radio className="w-3 h-3" /> Ao Vivo
              </button>
              <button 
                onClick={() => { setActiveTab("player"); setOpenAccordion("player_visibilidade"); setOpenSubItem(""); }} 
                className={`px-3.5 py-1 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${activeTab === "player" ? "bg-rose-600 text-white shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
              >
                <PlaySquare className="w-3 h-3" /> Player
              </button>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            ✕
          </button>
        </div>

        {/* BARRA PRÁTICA E DIRETA DE GERENCIAMENTO DE TEMPLATES */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 text-[12px] font-bold">
              <Layers className="w-4 h-4 text-rose-600" />
              <span>Tema/Template:</span>
            </div>

            {/* SELETOR DE TEMPLATES EXISTENTES */}
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-700 outline-none hover:border-slate-400 focus:border-rose-500 cursor-pointer shadow-sm"
            >
              <optgroup label="Modelos Padrão">
                {templates.filter(t => t.isDefault).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
              {templates.some(t => !t.isDefault) && (
                <optgroup label="Meus Templates Salvos">
                  {templates.filter(t => !t.isDefault).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* CAMPO COM O NOME DO TEMPLATE PARA RENOMEAR/EDITAR DIRETO */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-400 pl-1">Nome:</span>
              <Input
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                placeholder="Nome do tema (ex: Black Friday, Verão...)"
                className="h-8 w-[240px] text-[12px] bg-white rounded-lg border-slate-300 focus:border-rose-500"
              />
            </div>

            {/* BOTÃO SALVAR ATUALIZAÇÃO NO TEMPLATE */}
            <Button
              onClick={handleSaveCurrentTemplate}
              size="sm"
              variant="outline"
              title={isCurrentTemplateCustom ? "Atualiza o template com as modificações atuais" : "Cria uma cópia personalizada com suas modificações"}
              className={`h-8 text-[11.5px] font-bold shadow-sm rounded-lg transition-all ${
                isCurrentTemplateCustom
                  ? "text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
                  : "text-rose-600 bg-rose-50/50 hover:bg-rose-50 border-rose-200"
              }`}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isCurrentTemplateCustom ? "Atualizar Template" : "Salvar Template"}
            </Button>

            {/* EXCLUIR SE FOR TEMPLATE CRIADO */}
            {isCurrentTemplateCustom && (
              <Button
                onClick={handleDeleteCurrentTemplate}
                size="sm"
                variant="ghost"
                title="Excluir este template personalizado"
                className="h-8 px-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* MENSAGEM DISCRETA DE SUCESSO */}
          {bannerAlert && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-in fade-in">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>{bannerAlert}</span>
            </div>
          )}
        </div>

        {/* CORPO PRINCIPAL */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          
          {/* PAINEL DE CONFIGURAÇÕES */}
          <div className="w-[340px] min-w-[340px] bg-white border-r border-slate-200 flex flex-col z-10 overflow-hidden shrink-0">
            <div className="py-2.5 px-4 flex justify-between items-center border-b border-slate-100">
              <span className="text-[13px] font-bold text-slate-800">Ajuste dos Elementos</span>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setDevice("desktop")} title="Desktop" className={`p-1 rounded-md transition-colors ${device === "desktop" ? "bg-white shadow-sm text-rose-600" : "text-slate-400 hover:text-slate-600"}`}><Monitor className="h-3.5 w-3.5" /></button>
                <button onClick={toggleLink} title={isLinked ? "Vinculado" : "Desvinculado"} className={`p-1 rounded-md hover:bg-slate-200/50 ${isLinked ? "text-rose-600" : "text-slate-400"}`}>{isLinked ? <LinkIcon className="h-3 w-3" /> : <Unlink className="h-3 w-3" />}</button>
                <button onClick={() => setDevice("mobile")} title="Mobile" className={`p-1 rounded-md transition-colors ${device === "mobile" ? "bg-white shadow-sm text-rose-600" : "text-slate-400 hover:text-slate-600"}`}><Smartphone className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 scrollbar-thin">
              {activeTab === "divulgacao" && renderWidgetSettings(currentDivulgacao, (k:any, v:any) => updateConfig(setDivulgacaoConfig, k, v, divulgacaoConfig.linked), true)}
              {activeTab === "aovivo" && renderWidgetSettings(currentAoVivo, (k:any, v:any) => updateConfig(setAoVivoConfig, k, v, aoVivoConfig.linked), false)}

              {activeTab === "player" && (
                <div className="animate-in fade-in duration-200">
                  <AccordionItem id="player_borda" title="1. Borda (Aplica a todos os cards)" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <ColorInput label="Cor da Borda" value={currentPlayer.borderColor} onChange={(v) => updateConfig(setPlayerConfig, "borderColor", v, playerConfig.linked)} />
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Espessura (px)</label>
                        <Input type="number" value={currentPlayer.borderWidth} onChange={(e) => updateConfig(setPlayerConfig, "borderWidth", Number(e.target.value), playerConfig.linked)} className="h-7 rounded-md text-[12px]" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Raio da Borda (px)</label>
                      <Input type="number" value={currentPlayer.borderRadius} onChange={(e) => updateConfig(setPlayerConfig, "borderRadius", Number(e.target.value), playerConfig.linked)} className="h-8 rounded-lg text-[12px]" />
                    </div>
                  </AccordionItem>

                  <AccordionItem id="player_visibilidade" title="2. Elementos Visíveis" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div className="space-y-2">
                      
                      <ElementSubItem
                        id="sub_title"
                        label="Exibir Título no Vídeo"
                        checked={currentPlayer.showTitle}
                        onToggle={(v) => updateConfig(setPlayerConfig, "showTitle", v, playerConfig.linked)}
                        openSubItem={openSubItem}
                        setOpenSubItem={setOpenSubItem}
                      >
                        <Input value={currentPlayer.titleText} onChange={(e) => updateConfig(setPlayerConfig, "titleText", e.target.value)} placeholder="Título da Live" className="h-7 rounded-md text-[12px]" />
                        <ColorInput label="Cor do Texto" value={currentPlayer.titleColor} onChange={(v) => updateConfig(setPlayerConfig, "titleColor", v, playerConfig.linked)} />
                      </ElementSubItem>

                      <ElementSubItem
                        id="sub_products"
                        label="Produtos"
                        checked={currentPlayer.showProducts}
                        onToggle={(v) => updateConfig(setPlayerConfig, "showProducts", v, playerConfig.linked)}
                        openSubItem={openSubItem}
                        setOpenSubItem={setOpenSubItem}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <ColorInput label="Cor Nome" value={currentPlayer.productNameColor} onChange={(v) => updateConfig(setPlayerConfig, "productNameColor", v, playerConfig.linked)} />
                          <ColorInput label="Cor Preço" value={currentPlayer.productPriceColor} onChange={(v) => updateConfig(setPlayerConfig, "productPriceColor", v, playerConfig.linked)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tam. Nome (px)</label>
                            <Input type="number" value={currentPlayer.productNameSize} onChange={(e) => updateConfig(setPlayerConfig, "productNameSize", Number(e.target.value), playerConfig.linked)} className="h-7 rounded-md text-[12px]" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tam. Preço (px)</label>
                            <Input type="number" value={currentPlayer.productPriceSize} onChange={(e) => updateConfig(setPlayerConfig, "productPriceSize", Number(e.target.value), playerConfig.linked)} className="h-7 rounded-md text-[12px]" />
                          </div>
                        </div>
                      </ElementSubItem>

                      <ElementSubItem
                        id="sub_coupon"
                        label="Card do Cupom"
                        checked={currentPlayer.showCoupon}
                        onToggle={(v) => updateConfig(setPlayerConfig, "showCoupon", v, playerConfig.linked)}
                        openSubItem={openSubItem}
                        setOpenSubItem={setOpenSubItem}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={currentPlayer.couponCode} onChange={(e) => updateConfig(setPlayerConfig, "couponCode", e.target.value)} placeholder="Código" className="h-7 rounded-md text-[11px]" />
                          <Input value={currentPlayer.couponText} onChange={(e) => updateConfig(setPlayerConfig, "couponText", e.target.value)} placeholder="Desconto" className="h-7 rounded-md text-[11px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <ColorInput label="Cor Cód." value={currentPlayer.couponCodeColor} onChange={(v) => updateConfig(setPlayerConfig, "couponCodeColor", v, playerConfig.linked)} />
                          <ColorInput label="Fundo Cód." value={currentPlayer.couponCodeBgColor} onChange={(v) => updateConfig(setPlayerConfig, "couponCodeBgColor", v, playerConfig.linked)} />
                          <ColorInput label="Cor Texto" value={currentPlayer.couponTextColor} onChange={(v) => updateConfig(setPlayerConfig, "couponTextColor", v, playerConfig.linked)} />
                          <ColorInput label="Fundo Texto" value={currentPlayer.couponTextBgColor} onChange={(v) => updateConfig(setPlayerConfig, "couponTextBgColor", v, playerConfig.linked)} />
                        </div>
                      </ElementSubItem>

                      <ElementSubItem
                        id="sub_info"
                        label="Card Informativo"
                        checked={currentPlayer.showInfo}
                        onToggle={(v) => updateConfig(setPlayerConfig, "showInfo", v, playerConfig.linked)}
                        openSubItem={openSubItem}
                        setOpenSubItem={setOpenSubItem}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Input value={currentPlayer.infoText1} onChange={(e) => updateConfig(setPlayerConfig, "infoText1", e.target.value)} placeholder="Texto 1" className="h-7 rounded-md text-[11px]" />
                            <Input type="number" placeholder="Tam. px" value={currentPlayer.infoSize1} onChange={(e) => updateConfig(setPlayerConfig, "infoSize1", Number(e.target.value), playerConfig.linked)} className="h-6 rounded-md text-[11px]" />
                          </div>
                          <div className="space-y-1">
                            <Input value={currentPlayer.infoText2} onChange={(e) => updateConfig(setPlayerConfig, "infoText2", e.target.value)} placeholder="Texto 2" className="h-7 rounded-md text-[11px]" />
                            <Input type="number" placeholder="Tam. px" value={currentPlayer.infoSize2} onChange={(e) => updateConfig(setPlayerConfig, "infoSize2", Number(e.target.value), playerConfig.linked)} className="h-6 rounded-md text-[11px]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <ColorInput label="Cor Texto" value={currentPlayer.infoTextColor} onChange={(v) => updateConfig(setPlayerConfig, "infoTextColor", v, playerConfig.linked)} />
                          <ColorInput label="Cor Fundo" value={currentPlayer.infoBgColor} onChange={(v) => updateConfig(setPlayerConfig, "infoBgColor", v, playerConfig.linked)} />
                        </div>
                      </ElementSubItem>

                      <ElementSubItem
                        id="sub_share"
                        label="Card Compartilhar"
                        checked={currentPlayer.showShare}
                        onToggle={(v) => updateConfig(setPlayerConfig, "showShare", v, playerConfig.linked)}
                        openSubItem={openSubItem}
                        setOpenSubItem={setOpenSubItem}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <ColorInput label="Cor Texto" value={currentPlayer.shareTextColor} onChange={(v) => updateConfig(setPlayerConfig, "shareTextColor", v, playerConfig.linked)} />
                          <ColorInput label="Cor Fundo" value={currentPlayer.shareBgColor} onChange={(v) => updateConfig(setPlayerConfig, "shareBgColor", v, playerConfig.linked)} />
                        </div>
                      </ElementSubItem>

                      <ElementSubItem id="sub_viewers" label="Contador de espectadores" checked={currentPlayer.showViewerCount} onToggle={(v) => updateConfig(setPlayerConfig, "showViewerCount", v, playerConfig.linked)} openSubItem={openSubItem} setOpenSubItem={setOpenSubItem} hasSettings={false} />
                      <ElementSubItem id="sub_chat" label="Chat ao vivo" checked={currentPlayer.showChat} onToggle={(v) => updateConfig(setPlayerConfig, "showChat", v, playerConfig.linked)} openSubItem={openSubItem} setOpenSubItem={setOpenSubItem} hasSettings={false} />
                      <ElementSubItem id="sub_mute" label="Iniciar com som desativado" checked={currentPlayer.autoplayMuted} onToggle={(v) => updateConfig(setPlayerConfig, "autoplayMuted", v, playerConfig.linked)} openSubItem={openSubItem} setOpenSubItem={setOpenSubItem} hasSettings={false} />
                    </div>
                  </AccordionItem>
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW MAXIMIZADO */}
          <div className="flex-1 flex flex-col items-center justify-center p-2.5 sm:p-4 bg-slate-100/60 overflow-hidden min-h-0">
            <div className="w-full h-full bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-center p-2 sm:p-3 relative overflow-hidden min-h-0">
                
                {activeTab !== "player" ? (
                  /* WIDGET FLUTUANTE */
                  <div className={`relative bg-[#0a0a0a] transition-all duration-300 flex flex-col shrink-0 ${
                    device === "desktop" 
                      ? "w-full max-w-[1050px] aspect-video rounded-xl border-4 border-[#0a0a0a] overflow-hidden shadow-xl" 
                      : "h-full max-h-[96%] aspect-[9/18.5] rounded-[2rem] shadow-[0_0_0_3px_#e2e8f0] border-[6px] border-[#0a0a0a] overflow-hidden"
                  }`}>
                    {device === "mobile" && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] max-w-[120px] h-[18px] bg-[#0a0a0a] rounded-b-[0.9rem] z-[100]"></div>}
                    <div className="absolute inset-0 bg-white">
                      <div className="w-full h-full opacity-10" style={{backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format')", backgroundSize: "cover"}}></div>
                      
                      {(activeTab === "divulgacao" || activeTab === "aovivo") && 
                        [activeTab === "divulgacao" ? currentDivulgacao : currentAoVivo].map((config, i) => (
                          <div 
                            key={i}
                            className="absolute transition-all duration-300 flex flex-col items-center group cursor-pointer gap-2" 
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
                  
                  /* PLAYER */
                  <div className="w-full h-full flex justify-center items-center overflow-hidden">
                    {device === 'mobile' ? (
                      /* MOBILE COM 3 SMARTPHONES */
                      <div className="w-full h-full flex items-center justify-center gap-4 md:gap-7 overflow-x-auto overflow-y-hidden px-2 select-none">
                        {[
                          { id: "normal",   label: "Player" },
                          { id: "products", label: "Com Produtos" },
                          { id: "chat",     label: "Com Chat" },
                        ].map((phone) => (
                          <div key={phone.id} className="flex flex-col items-center shrink-0 h-full justify-center">
                            <div
                              className="relative bg-[#0a0a0a] rounded-[2.5rem] border-[6px] border-slate-200 shadow-2xl overflow-hidden shrink-0"
                              style={{ height: 'min(78vh, 660px)', aspectRatio: '9 / 19' }}
                            >
                              {/* Notch */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[36%] max-w-[110px] h-[18px] bg-slate-200 rounded-b-[0.9rem] z-30"></div>

                              <video
                                src="/demo-videos/demo1.mp4"
                                autoPlay loop muted playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none z-10"></div>

                              {/* TOPO ESQUERDO */}
                              <div className="absolute top-4 left-3 flex items-center gap-1.5 z-20">
                                <div className="w-6 h-6 rounded-full bg-[#1b4332] border border-white/50 flex items-center justify-center text-[7px] font-extrabold text-white shadow">USE</div>
                                {currentPlayer.showTitle && (
                                  <span className="font-bold text-[12.5px] drop-shadow-md tracking-tight leading-none" style={{ color: currentPlayer.titleColor }}>
                                    {currentPlayer.titleText}
                                  </span>
                                )}
                              </div>

                              {/* COLUNA ESQUERDA: CUPOM + INFO */}
                              <div className="absolute top-12 left-3 flex flex-col gap-1.5 z-20">
                                {currentPlayer.showCoupon && (
                                  <div className="rounded-[6px] overflow-hidden flex flex-col w-[60px] shadow-md border" style={{ borderColor: currentPlayer.borderColor }}>
                                    <div className="text-center py-0.5 text-[8px] font-black uppercase tracking-tight" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor }}>
                                      {currentPlayer.couponCode}
                                    </div>
                                    <div className="text-center py-0.5 text-[8px] font-bold" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor }}>
                                      {currentPlayer.couponText}
                                    </div>
                                  </div>
                                )}

                                {currentPlayer.showInfo && (
                                  <div className="rounded-[6px] overflow-hidden flex flex-col w-[60px] shadow-md border text-center" style={{ borderColor: currentPlayer.borderColor }}>
                                    <div className="py-1 text-[7px] font-black uppercase tracking-tight px-0.5 leading-tight" style={{ backgroundColor: currentPlayer.infoBgColor, color: currentPlayer.infoTextColor }}>
                                      {currentPlayer.infoText1}
                                    </div>
                                    <div className="py-0.5 text-[6.5px] font-semibold bg-white text-slate-800 px-0.5 leading-tight">
                                      {currentPlayer.infoText2}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* COLUNA DIREITA: AÇÕES */}
                              <div className="absolute top-4 right-2.5 flex flex-col items-center gap-2 z-20">
                                <div className="flex items-center gap-1 text-white text-[7.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow" style={{ backgroundColor: currentPlayer.borderColor }}>
                                  <PlaySquare className="w-2.5 h-2.5 fill-white"/> LIVE
                                </div>

                                {currentPlayer.showViewerCount && (
                                  <div className="flex items-center gap-1 bg-black/55 backdrop-blur-md text-white text-[7.5px] font-semibold px-1.5 py-0.5 rounded-full border border-white/15 shadow">
                                    <Eye className="w-2.5 h-2.5 text-white/90" /> 1.2k
                                  </div>
                                )}

                                {currentPlayer.autoplayMuted && (
                                  <div className="w-6 h-6 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow">
                                    <VolumeX className="w-3 h-3"/>
                                  </div>
                                )}

                                {currentPlayer.showChat && (
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white border shadow transition ${phone.id === 'chat' ? 'bg-white/30 border-white' : 'bg-black/45 border-white/20'}`}>
                                    <MessageCircle className="w-3 h-3"/>
                                  </div>
                                )}

                                {currentPlayer.showShare && (
                                  <div className="w-6 h-6 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow">
                                    <Send className="w-2.5 h-2.5 -ml-0.5 mt-0.5 transform -rotate-12"/>
                                  </div>
                                )}

                                <div className="w-6 h-6 bg-black/45 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow">
                                  <ShoppingBag className="w-3 h-3"/>
                                </div>

                                {currentPlayer.showProducts && (
                                  <div className="flex flex-col items-center -mt-0.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white border shadow transition ${phone.id === 'products' ? 'bg-white/30 border-white' : 'bg-black/45 border-white/20'}`}>
                                      <ShoppingCart className="w-3 h-3"/>
                                    </div>
                                    <span className="text-white text-[7px] font-bold drop-shadow mt-0.5">{MOCK_PRODUCTS.length}</span>
                                  </div>
                                )}

                                <div className="w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center text-white border border-white shadow-md">
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                </div>
                              </div>

                              {/* CHAT: 100% ACIMA DO CARD */}
                              {phone.id === 'chat' && currentPlayer.showChat && (
                                <div className="absolute bottom-[78px] left-2.5 right-2.5 z-20 flex flex-col justify-end pointer-events-none">
                                  <div className="flex flex-col gap-1.5 mb-2 overflow-hidden" style={{ maskImage: 'linear-gradient(to top, black 75%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 75%, transparent 100%)' }}>
                                    {[1,2,3].map(i => (
                                      <div key={i} className="flex items-center gap-1.5 drop-shadow">
                                        <img src={`https://i.pravatar.cc/100?img=${i+14}`} className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0" alt="Avatar"/>
                                        <span className="text-white text-[8.5px] font-medium drop-shadow leading-none">Nononononono</span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="bg-white/95 backdrop-blur-md rounded-full flex items-center justify-between pl-3 pr-1.5 py-1 shadow-md border border-white/60">
                                    <span className="text-slate-400 text-[9px] font-medium">Chat...</span>
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: currentPlayer.borderColor }}>
                                      <Heart className="w-2.5 h-2.5 text-white fill-white" />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* CARD DO PRODUTO FIXO NA BASE - FOTO SANGRADA */}
                              {phone.id !== 'products' && currentPlayer.showProducts && (
                                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20">
                                  <div
                                    className="bg-white flex items-center shadow-lg overflow-hidden h-[54px]"
                                    style={{
                                      border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                                      borderRadius: `${currentPlayer.borderRadius}px`
                                    }}
                                  >
                                    <img 
                                      src={MOCK_PRODUCTS[4].img} 
                                      className="w-[50px] h-full object-cover shrink-0"
                                      alt="Produto"
                                    />
                                    
                                    <div className="flex-1 min-w-0 px-2.5 py-1">
                                      <div className="flex items-center gap-1">
                                        <div
                                          className="font-bold leading-tight line-clamp-1 flex-1"
                                          style={{ fontSize: `${currentPlayer.productNameSize * 0.9}px`, color: currentPlayer.productNameColor }}
                                        >
                                          {MOCK_PRODUCTS[4].name}
                                        </div>
                                        <span 
                                          className="px-1 py-0.2 rounded text-[7.5px] font-black uppercase text-white shrink-0 animate-pulse leading-tight"
                                          style={{ backgroundColor: currentPlayer.borderColor }}
                                        >
                                          Na Live
                                        </span>
                                      </div>
                                      <div className="text-[8px] text-slate-400 line-through mt-0.5 leading-none">De: {MOCK_PRODUCTS[4].oldPrice}</div>
                                      <div
                                        className="font-extrabold leading-tight mt-0.5"
                                        style={{ fontSize: `${currentPlayer.productPriceSize * 0.9}px`, color: currentPlayer.productPriceColor }}
                                      >
                                        Por: {MOCK_PRODUCTS[4].price}
                                      </div>
                                    </div>

                                    <div className="shrink-0 pr-2">
                                      <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center shadow" 
                                        style={{ backgroundColor: currentPlayer.borderColor }}
                                      >
                                        <ShoppingCart className="w-3 h-3 text-white" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* GAVETA DE PRODUTOS DA LIVE */}
                              {phone.id === 'products' && currentPlayer.showProducts && (
                                <div className="absolute inset-x-2 bottom-2 top-7 z-50 flex flex-col overflow-hidden">
                                  <div
                                    className="bg-white flex-1 flex flex-col shadow-2xl overflow-hidden"
                                    style={{
                                      border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                                      borderRadius: `${currentPlayer.borderRadius}px`
                                    }}
                                  >
                                    <div
                                      className="text-white text-center py-2 font-bold text-[11px] tracking-wide uppercase shrink-0"
                                      style={{ backgroundColor: currentPlayer.borderColor }}
                                    >
                                      PRODUTOS DA LIVE
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin bg-slate-50">
                                      {MOCK_PRODUCTS.map((prod, idx) => {
                                        const isInCart = CART_PRODUCT_IDS.includes(prod.id);
                                        const isLiveActive = prod.id === CURRENT_LIVE_PRODUCT_ID;

                                        return (
                                          <div
                                            key={prod.id}
                                            className="bg-white flex items-center shadow-sm overflow-hidden h-[54px]"
                                            style={{
                                              border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                                              borderRadius: `${currentPlayer.borderRadius}px`
                                            }}
                                          >
                                            <div 
                                              className="w-[30px] h-full flex items-center justify-center font-black text-[12px] text-white shrink-0 tracking-tight"
                                              style={{ backgroundColor: currentPlayer.borderColor }}
                                            >
                                              {String(idx + 1).padStart(2, '0')}
                                            </div>

                                            <img 
                                              src={prod.img} 
                                              className="w-[48px] h-full object-cover shrink-0"
                                              alt={prod.name}
                                            />

                                            <div className="flex-1 min-w-0 px-2 py-0.5">
                                              <div className="flex items-center gap-1">
                                                <div
                                                  className="font-bold leading-tight line-clamp-1 flex-1"
                                                  style={{ fontSize: `${currentPlayer.productNameSize * 0.9}px`, color: currentPlayer.productNameColor }}
                                                >
                                                  {prod.name}
                                                </div>
                                                {isLiveActive && (
                                                  <span 
                                                    className="px-1 py-0.2 rounded text-[7px] font-black uppercase text-white shrink-0 animate-pulse leading-tight"
                                                    style={{ backgroundColor: currentPlayer.borderColor }}
                                                  >
                                                    Na Live
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[8px] text-slate-400 line-through mt-0.5 leading-none">De: {prod.oldPrice}</div>
                                              <div
                                                className="font-extrabold leading-tight mt-0.5"
                                                style={{ fontSize: `${currentPlayer.productPriceSize * 0.9}px`, color: currentPlayer.productPriceColor }}
                                              >
                                                Por: {prod.price}
                                              </div>
                                            </div>

                                            <div className="pr-2 pl-0.5 shrink-0">
                                              <div 
                                                className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm" 
                                                style={{ 
                                                  backgroundColor: isInCart ? currentPlayer.borderColor : "#f1f5f9"
                                                }}
                                              >
                                                <ShoppingCart 
                                                  className="w-2.5 h-2.5"
                                                  style={{
                                                    color: isInCart ? "#FFFFFF" : currentPlayer.borderColor
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="bg-white p-2 border-t flex flex-col items-center shrink-0" style={{ borderColor: `${currentPlayer.borderColor}30` }}>
                                      <ChevronDown className="w-3.5 h-3.5 mb-0.5" style={{ color: currentPlayer.borderColor }}/>
                                      <div className="flex justify-between items-center w-full text-[9.5px] font-bold" style={{ color: currentPlayer.borderColor }}>
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentPlayer.borderColor }}></span>
                                          6 Produtos adicionados
                                        </span>
                                        <span className="text-slate-600 flex items-center hover:underline cursor-pointer">Finalizar <ExternalLink className="w-2.5 h-2.5 ml-0.5"/></span>
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
                      /* DESKTOP COM 3 COLUNAS */
                      <div className="flex gap-4 sm:gap-5 w-full max-w-[1150px] mx-auto h-full max-h-[640px] justify-center items-stretch py-1">
                        
                        {/* COLUNA 1: Produtos da Live + Info */}
                        <div className="flex flex-col gap-3 w-full max-w-[340px] flex-1">
                          {currentPlayer.showProducts && (
                            <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden shadow-sm" style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: `${currentPlayer.borderRadius}px` }}>
                              <div className="text-white text-center py-2 font-bold text-[13px] tracking-wide uppercase shrink-0" style={{ backgroundColor: currentPlayer.borderColor }}>
                                PRODUTOS DA LIVE
                              </div>
                              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin bg-slate-50">
                                {MOCK_PRODUCTS.map((prod, idx) => {
                                  const isInCart = CART_PRODUCT_IDS.includes(prod.id);
                                  const isLiveActive = prod.id === CURRENT_LIVE_PRODUCT_ID;

                                  return (
                                    <div 
                                      key={prod.id} 
                                      className="flex items-center bg-white shadow-sm overflow-hidden h-[62px]" 
                                      style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: `${currentPlayer.borderRadius}px` }}
                                    >
                                        <div 
                                          className="w-[32px] h-full flex items-center justify-center font-black text-[13px] text-white shrink-0 tracking-tight"
                                          style={{ backgroundColor: currentPlayer.borderColor }}
                                        >
                                          {String(idx + 1).padStart(2, '0')}
                                        </div>

                                        <img 
                                          src={prod.img} 
                                          className="w-[56px] h-full object-cover shrink-0" 
                                          alt={prod.name} 
                                        />

                                        <div className="flex-1 min-w-0 px-2.5 py-1">
                                          <div className="flex items-center gap-1.5">
                                            <div 
                                              style={{ fontSize: currentPlayer.productNameSize, color: currentPlayer.productNameColor }} 
                                              className="leading-tight line-clamp-1 font-bold flex-1"
                                            >
                                              {prod.name}
                                            </div>
                                            {isLiveActive && (
                                              <span 
                                                className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white shrink-0 animate-pulse leading-none"
                                                style={{ backgroundColor: currentPlayer.borderColor }}
                                              >
                                                Na Live
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-slate-400 line-through mt-0.5">De: {prod.oldPrice}</div>
                                          <div style={{ fontSize: currentPlayer.productPriceSize, color: currentPlayer.productPriceColor }} className="font-extrabold leading-none mt-0.5">Por: {prod.price}</div>
                                        </div>

                                        <div className="pr-2.5 shrink-0">
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm" 
                                            style={{ 
                                              backgroundColor: isInCart ? currentPlayer.borderColor : "#f1f5f9"
                                            }}
                                          >
                                            <ShoppingCart 
                                              className="w-3.5 h-3.5" 
                                              style={{
                                                color: isInCart ? "#FFFFFF" : currentPlayer.borderColor
                                              }}
                                            />
                                          </div>
                                        </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="border-t p-2 flex justify-between items-center bg-white shrink-0" style={{ borderColor: `${currentPlayer.borderColor}40` }}>
                                  <div className="flex items-center text-[11px] font-bold text-slate-600">
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
                            <div className="h-[58px] flex-shrink-0 flex flex-col items-center justify-center shadow-sm w-full overflow-hidden" 
                                  style={{ backgroundColor: currentPlayer.infoBgColor, color: currentPlayer.infoTextColor, border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: `${currentPlayer.borderRadius}px` }}>
                                <div className="font-black tracking-tight leading-none" style={{ fontSize: currentPlayer.infoSize1 }}>{currentPlayer.infoText1}</div>
                                <div className="font-semibold opacity-90 mt-1" style={{ fontSize: currentPlayer.infoSize2 }}>{currentPlayer.infoText2}</div>
                            </div>
                          )}
                        </div>

                        {/* COLUNA 2: Vídeo + Cupom */}
                        <div className="flex flex-col gap-3 w-full max-w-[340px] flex-1">
                            <div className="flex-1 min-h-0 relative bg-black overflow-hidden shadow-lg w-full" style={{
                              border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`,
                              borderRadius: `${currentPlayer.borderRadius}px`,
                            }}>
                              <video src="/demo-videos/demo1.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-90" />
                              <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
                                 <div className="flex items-center gap-2 max-w-[60%]">
                                    <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-[12px] shrink-0">🦋</div>
                                    {currentPlayer.showTitle && (
                                      <span style={{ color: currentPlayer.titleColor }} className="font-bold text-[13px] drop-shadow-md truncate leading-tight">
                                        {currentPlayer.titleText}
                                      </span>
                                    )}
                                 </div>
                                 <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1.5 text-white text-[9.5px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm" style={{ backgroundColor: currentPlayer.borderColor }}>
                                       <Radio className="w-2.5 h-2.5 animate-pulse"/> Ao Vivo
                                    </div>
                                    {currentPlayer.showViewerCount && (
                                       <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-full border border-white/20 shadow-sm">
                                         <Eye className="w-2.5 h-2.5" /> 1.2K
                                       </div>
                                    )}
                                    {currentPlayer.autoplayMuted && (
                                       <div className="bg-black/40 backdrop-blur-md p-1 rounded-full text-white border border-white/20">
                                         <VolumeX className="w-3 h-3"/>
                                       </div>
                                    )}
                                 </div>
                              </div>
                            </div>

                            {currentPlayer.showCoupon && (
                              <div className="h-[58px] flex-shrink-0 flex overflow-hidden shadow-sm w-full" style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: `${currentPlayer.borderRadius}px` }}>
                                <div className="flex items-center justify-center px-4 font-black tracking-widest text-[16px]" style={{ backgroundColor: currentPlayer.couponCodeBgColor, color: currentPlayer.couponCodeColor, width: '50%' }}>
                                  {currentPlayer.couponCode}
                                </div>
                                <div className="flex items-center justify-center px-4 font-black text-[17px]" style={{ backgroundColor: currentPlayer.couponTextBgColor, color: currentPlayer.couponTextColor, width: '50%' }}>
                                  {currentPlayer.couponText}
                                </div>
                              </div>
                            )}
                        </div>

                        {/* COLUNA 3: Chat + Compartilhar */}
                        <div className="flex flex-col gap-3 w-full max-w-[340px] flex-1">
                          {currentPlayer.showChat && (
                            <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden shadow-sm" style={{ border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: `${currentPlayer.borderRadius}px` }}>
                              <div className="text-white text-center py-2 font-bold text-[13px] tracking-wide uppercase shrink-0" style={{ backgroundColor: currentPlayer.borderColor }}>
                                CHAT
                              </div>
                              <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                                  <div className="flex-1 overflow-y-auto p-3 space-y-3.5 pb-12 scrollbar-thin">
                                    {[1,2,3,4,5].map(i => (
                                      <div key={i} className="flex gap-2 items-start text-[11px] leading-tight">
                                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} className="w-5 h-5 rounded-full border border-slate-200 shrink-0" alt="Avatar" />
                                        <div className="text-slate-600 pt-0.5">
                                          <span className="font-bold text-slate-800">@usuario{i}</span> Oi, qual o valor? Vocês entregam para SP?
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-white via-white to-transparent">
                                    <div className="bg-white border rounded-full py-1.5 px-3 text-[11.5px] text-slate-400 flex justify-between items-center shadow-sm" style={{ borderColor: currentPlayer.borderColor }}>
                                        Chat...
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white cursor-pointer" style={{ backgroundColor: currentPlayer.borderColor }}>
                                          <Heart className="w-3 h-3 fill-current"/>
                                        </div>
                                    </div>
                                  </div>
                              </div>
                            </div>
                          )}

                          {currentPlayer.showShare && (
                            <button className="h-[58px] flex-shrink-0 w-full flex items-center justify-center gap-2 shadow-sm font-bold text-[15px] transition-transform hover:scale-[1.01] overflow-hidden" 
                                    style={{ backgroundColor: currentPlayer.shareBgColor, color: currentPlayer.shareTextColor, border: `${currentPlayer.borderWidth}px solid ${currentPlayer.borderColor}`, borderRadius: `${currentPlayer.borderRadius}px` }}>
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
        <div className="px-5 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 z-20">
          <Button variant="ghost" onClick={handleReset} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold px-2 text-[12px] h-8">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> RESETAR ESTA ABA
          </Button>

          <div className="flex items-center text-[11.5px] font-medium text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-full hidden sm:flex">
            <Info className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> 
            Preview ilustrativo. As proporções se adaptam ao tamanho de tela do seu visitante.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8 px-4 text-[12px] font-medium rounded-full">
              ✕ Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm h-8 px-5 text-[12px] font-medium rounded-full">
              <Save className="h-3.5 w-3.5 mr-1.5" /> {isSaving ? "Aplicando..." : "Salvar Configuração"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
