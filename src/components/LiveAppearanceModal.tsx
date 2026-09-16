'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  Smartphone,
  Link as LinkIcon,
  Link2Off,
  Share2,
  PlaySquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ──────────────────── TIPOS E ESTRUTURAS ────────────────────

type DeviceType = 'desktop' | 'mobile';
type LiveTab = 'divulgacao' | 'player';

// Estrutura responsiva baseada no seu padrão
type ResponsiveConfig<T> = {
  linked: boolean; // Equivale ao seu "same_for_all"
  desktop: T;
  mobile: T;
};

// Configurações da Aba de Divulgação
type DivulgacaoConfig = {
  title: string;
  titleColor: string;
  description: string;
  ctaText: string;
  ctaBgColor: string;
  ctaTextColor: string;
  showShareButton: boolean;
  borderRadius: string;
};

// Configurações da Aba de Player
type PlayerConfig = {
  autoPlay: boolean;
  muted: boolean;
  showControls: boolean;
  primaryColor: string;
  objectFit: 'cover' | 'contain';
};

// Estado Global do Modal
export type LiveAppearanceData = {
  divulgacao: ResponsiveConfig<DivulgacaoConfig>;
  player: ResponsiveConfig<PlayerConfig>;
};

// ──────────────────── DADOS INICIAIS ────────────────────

const defaultDivulgacao: DivulgacaoConfig = {
  title: 'Nossa Live Imperdível!',
  titleColor: '#0F172A',
  description: 'Acompanhe as novidades exclusivas.',
  ctaText: 'ENTRAR NA LIVE',
  ctaBgColor: '#0094EB',
  ctaTextColor: '#FFFFFF',
  showShareButton: true,
  borderRadius: '12',
};

const defaultPlayer: PlayerConfig = {
  autoPlay: true,
  muted: true,
  showControls: true,
  primaryColor: '#0094EB',
  objectFit: 'cover',
};

const defaultAppearanceData: LiveAppearanceData = {
  divulgacao: { linked: false, desktop: { ...defaultDivulgacao }, mobile: { ...defaultDivulgacao } },
  player: { linked: false, desktop: { ...defaultPlayer }, mobile: { ...defaultPlayer } },
};

// ──────────────────── COMPONENTES DE UI ────────────────────

const inputClass =
  'w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29] focus:bg-white dark:focus:bg-[#111524] disabled:cursor-not-allowed disabled:opacity-50';

const ToggleSwitch = ({ label, checked, onChange, description }: any) => (
  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/20 dark:hover:border-[#ff7a29]/60 dark:hover:bg-[#ff7a29]/5">
    <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-[#0091ff] accent-[#0091ff] focus:ring-2 focus:ring-[#0091ff]" />
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-bold text-slate-800 dark:text-white">{label}</span>
      {description && <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{description}</span>}
    </span>
  </label>
);

const ColorInput = ({ value, onChange }: any) => (
  <div className="flex items-center gap-1.5 w-full">
    <div className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-[#ff7a29]/30 overflow-hidden" style={{ backgroundColor: value }}>
      <input type="color" value={value} onChange={onChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </div>
    <input type="text" value={value} onChange={onChange} className={cn(inputClass, 'w-full')} />
  </div>
);

// Accordion Customizado baseado no seu layout
const AccordionSection = ({ title, children, defaultOpen = false }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl overflow-hidden mb-3 bg-white dark:bg-[#1a1f35]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-sm font-black text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-[#111524] transition-colors"
      >
        {title}
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {isOpen && <div className="p-4 border-t border-slate-100 dark:border-[#ff7a29]/20 space-y-4">{children}</div>}
    </div>
  );
};

// ──────────────────── COMPONENTE PRINCIPAL ────────────────────

interface LiveAppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: LiveAppearanceData;
  onSave: (data: LiveAppearanceData) => void;
}

export default function LiveAppearanceModal({ isOpen, onClose, initialData, onSave }: LiveAppearanceModalProps) {
  const [activeTab, setActiveTab] = useState<LiveTab>('divulgacao');
  const [activeDevice, setActiveDevice] = useState<DeviceType>('mobile');
  
  const [formData, setFormData] = useState<LiveAppearanceData>(initialData || defaultAppearanceData);

  // Atualiza os dados quando o modal abre com dados existentes
  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  // ──────────────────── HELPERS DE ATUALIZAÇÃO ────────────────────

  const updateConfig = (tab: LiveTab, field: string, value: any) => {
    setFormData((prev) => {
      const tabData = prev[tab];
      const isLinked = tabData.linked;

      // Se estiver linkado e o usuário estiver no desktop, replica pro mobile
      if (isLinked && activeDevice === 'desktop') {
        return {
          ...prev,
          [tab]: {
            ...tabData,
            desktop: { ...tabData.desktop, [field]: value },
            mobile: { ...tabData.mobile, [field]: value },
          },
        };
      }

      // Comportamento normal
      return {
        ...prev,
        [tab]: {
          ...tabData,
          [activeDevice]: { ...tabData[activeDevice], [field]: value },
        },
      };
    });
  };

  const toggleLink = () => {
    setFormData((prev) => {
      const tabData = prev[activeTab];
      const newLinkedState = !tabData.linked;

      return {
        ...prev,
        [activeTab]: {
          ...tabData,
          linked: newLinkedState,
          // Se ativou o link, sobrescreve o mobile com os dados atuais do desktop
          mobile: newLinkedState ? { ...tabData.desktop } : tabData.mobile,
        },
      };
    });
  };

  const currentConfig = formData[activeTab][activeDevice] as any;
  const isLinked = formData[activeTab].linked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      {/* Container Principal do Modal */}
      <div className="w-full max-w-7xl h-[90vh] bg-slate-50 dark:bg-[#0b0e17] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-[#ff7a29]/20">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#ff7a29]/20 bg-white dark:bg-[#111524]">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Editar Estilo da Live</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#1a1f35] text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* TABS SUPERIORES */}
        <div className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-[#111524] border-b border-slate-200 dark:border-[#ff7a29]/20">
          <button
            onClick={() => setActiveTab('divulgacao')}
            className={cn('flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all', activeTab === 'divulgacao' ? 'bg-[#0091ff] text-white' : 'bg-slate-100 dark:bg-[#1a1f35] text-slate-500 hover:text-slate-800 dark:hover:text-white')}
          >
            <Share2 size={16} /> Divulgação
          </button>
          <button
            onClick={() => setActiveTab('player')}
            className={cn('flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all', activeTab === 'player' ? 'bg-[#0091ff] text-white' : 'bg-slate-100 dark:bg-[#1a1f35] text-slate-500 hover:text-slate-800 dark:hover:text-white')}
          >
            <PlaySquare size={16} /> Player
          </button>
        </div>

        {/* CORPO: Esquerda (Controles) | Direita (Preview) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* MENU ESQUERDO */}
          <div className="w-[400px] flex-shrink-0 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0b0e17] border-r border-slate-200 dark:border-[#ff7a29]/20">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">
              Configurações {activeTab === 'divulgacao' ? 'da Divulgação' : 'do Player'}
            </h3>

            {/* SELETOR DE DISPOSITIVO (Idêntico ao seu print) */}
            <div className="flex items-center justify-between p-1 bg-white dark:bg-[#111524] rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 mb-6 shadow-sm">
              <span className="px-3 text-xs font-bold text-slate-600 dark:text-slate-400">Dispositivo</span>
              <div className="flex items-center p-1 bg-slate-100 dark:bg-[#1a1f35] rounded-xl border border-slate-200 dark:border-[#ff7a29]/20">
                <button
                  onClick={() => setActiveDevice('desktop')}
                  className={cn('p-1.5 rounded-lg transition-all', activeDevice === 'desktop' ? 'bg-white dark:bg-[#0b0e17] shadow text-[#0091ff] dark:text-[#ff7a29]' : 'text-slate-400')}
                >
                  <Monitor size={16} />
                </button>
                <button
                  onClick={toggleLink}
                  title="Sincronizar Desktop e Mobile"
                  className={cn('p-1.5 rounded-lg mx-1 transition-all', isLinked ? 'text-[#0091ff] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10' : 'text-slate-400')}
                >
                  {isLinked ? <LinkIcon size={16} /> : <Link2Off size={16} />}
                </button>
                <button
                  onClick={() => {
                    if (isLinked) toggleLink(); // Se clicar no mobile, quebra o link automaticamente
                    setActiveDevice('mobile');
                  }}
                  className={cn('p-1.5 rounded-lg transition-all', activeDevice === 'mobile' ? 'bg-white dark:bg-[#0b0e17] shadow text-[#0091ff] dark:text-[#ff7a29]' : 'text-slate-400')}
                >
                  <Smartphone size={16} />
                </button>
              </div>
            </div>

            {/* AVISO DE LINK ATIVO */}
            {isLinked && activeDevice === 'desktop' && (
              <div className="mb-6 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-600 dark:text-blue-400 font-medium">
                🔗 As alterações feitas no <strong>Desktop</strong> serão aplicadas automaticamente no <strong>Mobile</strong>.
              </div>
            )}

            {/* CONTROLES: DIVULGAÇÃO */}
            {activeTab === 'divulgacao' && (
              <>
                <AccordionSection title="1. Textos e Chamadas" defaultOpen={true}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Título Principal</label>
                      <input type="text" value={currentConfig.title} onChange={(e) => updateConfig('divulgacao', 'title', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cor do Título</label>
                      <ColorInput value={currentConfig.titleColor} onChange={(e: any) => updateConfig('divulgacao', 'titleColor', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Texto do Botão (CTA)</label>
                      <input type="text" value={currentConfig.ctaText} onChange={(e) => updateConfig('divulgacao', 'ctaText', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </AccordionSection>

                <AccordionSection title="2. Estilo do Botão">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cor de Fundo (CTA)</label>
                      <ColorInput value={currentConfig.ctaBgColor} onChange={(e: any) => updateConfig('divulgacao', 'ctaBgColor', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cor do Texto (CTA)</label>
                      <ColorInput value={currentConfig.ctaTextColor} onChange={(e: any) => updateConfig('divulgacao', 'ctaTextColor', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Arredondamento (px)</label>
                      <input type="number" value={currentConfig.borderRadius} onChange={(e) => updateConfig('divulgacao', 'borderRadius', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </AccordionSection>

                <AccordionSection title="3. Elementos Visíveis">
                  <ToggleSwitch
                    label="Mostrar Botão de Compartilhar"
                    checked={currentConfig.showShareButton}
                    onChange={(e: any) => updateConfig('divulgacao', 'showShareButton', e.target.checked)}
                  />
                </AccordionSection>
              </>
            )}

            {/* CONTROLES: PLAYER */}
            {activeTab === 'player' && (
              <>
                <AccordionSection title="1. Comportamento de Vídeo" defaultOpen={true}>
                  <div className="space-y-4">
                    <ToggleSwitch label="Autoplay" checked={currentConfig.autoPlay} onChange={(e: any) => updateConfig('player', 'autoPlay', e.target.checked)} />
                    <ToggleSwitch label="Iniciar Mutado" checked={currentConfig.muted} onChange={(e: any) => updateConfig('player', 'muted', e.target.checked)} />
                  </div>
                </AccordionSection>
                
                <AccordionSection title="2. Controles Visuais">
                  <div className="space-y-4">
                    <ToggleSwitch label="Mostrar Controles do Player" checked={currentConfig.showControls} onChange={(e: any) => updateConfig('player', 'showControls', e.target.checked)} />
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cor Principal (Barra de progresso)</label>
                      <ColorInput value={currentConfig.primaryColor} onChange={(e: any) => updateConfig('player', 'primaryColor', e.target.value)} />
                    </div>
                  </div>
                </AccordionSection>
              </>
            )}
          </div>

          {/* ÁREA DIREITA: PREVIEW */}
          <div className="flex-1 bg-slate-100 dark:bg-[#111524] flex items-center justify-center p-8 overflow-y-auto">
            
            {/* Simulador de Dispositivo */}
            <div
              className={cn(
                'relative bg-white dark:bg-black shadow-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-500',
                activeDevice === 'mobile' ? 'w-[320px] h-[640px] rounded-[40px] border-[10px] border-slate-900' : 'w-[800px] h-[450px] rounded-xl border border-slate-300 dark:border-slate-800'
              )}
            >
              {/* Fake UI baseado na tab ativa */}
              {activeTab === 'divulgacao' ? (
                <div className="flex flex-col items-center justify-center text-center p-6 w-full h-full bg-slate-50 dark:bg-slate-900">
                  <h3 style={{ color: currentConfig.titleColor }} className="text-2xl font-black mb-2">{currentConfig.title}</h3>
                  <p className="text-slate-500 mb-6 text-sm">{currentConfig.description}</p>
                  <button
                    style={{
                      backgroundColor: currentConfig.ctaBgColor,
                      color: currentConfig.ctaTextColor,
                      borderRadius: `${currentConfig.borderRadius}px`,
                    }}
                    className="px-6 py-3 font-bold shadow-lg"
                  >
                    {currentConfig.ctaText}
                  </button>
                  {currentConfig.showShareButton && (
                    <button className="mt-4 flex items-center gap-2 text-slate-400 text-sm hover:text-slate-600">
                      <Share2 size={16} /> Compartilhar
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-black relative flex items-center justify-center group">
                  {/* Fake Video Player */}
                  <PlaySquare size={64} className="text-white/20" />
                  
                  {/* Fake Controls */}
                  {currentConfig.showControls && (
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full w-1/3" style={{ backgroundColor: currentConfig.primaryColor }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-[#ff7a29]/20 bg-white dark:bg-[#111524] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFormData(defaultAppearanceData)}
              className="text-xs font-black uppercase tracking-wider text-rose-500 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition-all"
            >
              Resetar
            </button>
            <span className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Preview visual.
            </span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-5 py-2 text-sm font-bold text-white bg-[#0091ff] hover:bg-blue-600 rounded-xl shadow-md transition-all"
            >
              Salvar Configurações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
