import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// UTILS LOCAIS (cópia isolada de AppearancePage.tsx)
// ============================================================
const isValidHexColor = (value?: string) =>
  /^#[0-9A-Fa-f]{6}$/.test(value || '');

// ============================================================
// COMPONENTES LOCAIS (cópia isolada, sem acoplamento com AppearancePage.tsx)
// ============================================================

const ToggleSwitch = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  description?: string;
}) => {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-[#ff7a29]/30 bg-white dark:bg-[#111524] px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50/20 dark:hover:border-[#ff7a29]/60 dark:hover:bg-[#ff7a29]/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-[#0091ff] accent-[#0091ff] focus:ring-2 focus:ring-[#0091ff]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-slate-800 dark:text-white">{label}</span>
        {description && (
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
    </label>
  );
};

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const safeColor = isValidHexColor(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div
        className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-[#ff7a29]/30 shadow-xs overflow-hidden"
        style={{ backgroundColor: safeColor }}
      >
        <input
          type="color"
          aria-label={label}
          value={safeColor}
          onChange={onChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-2 py-1.5 font-mono text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0091ff] dark:focus:border-[#ff7a29]"
      />
    </div>
  );
};

const SectionCard = ({
  title,
  description,
  children,
  className,
  onReset,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  onReset?: () => void;
}) => {
  return (
    <div
      className={cn(
        'space-y-5 rounded-2xl border border-slate-200/80 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35] p-5 shadow-xs transition-all duration-300 hover:shadow-md',
        className,
      )}
    >
      <div className="border-b border-slate-100 dark:border-[#ff7a29]/20 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 px-2.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-500/25 transition-all cursor-pointer shrink-0"
          >
            Resetar Aba
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

const AccordionSection = ({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35] shadow-xs transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-slate-50/50 dark:bg-[#111524]/60 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-[#111524] transition-colors"
      >
        {title}
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-500 dark:text-slate-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>
      {isOpen && <div className="border-t border-slate-100 dark:border-[#ff7a29]/20 p-4">{children}</div>}
    </div>
  );
};

// ============================================================
// TIPOS DE CONFIGURAÇÃO DA LIVE
// ============================================================

export interface LiveWidgetConfig {
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left';
  bubble_color: string;
  text_color: string;
  label_text: string;
}

export interface LivePlayerConfig {
  primary_color: string;
  background_color: string;
  show_viewer_count: boolean;
  show_chat: boolean;
  autoplay_muted: boolean;
}

interface LiveAppearanceTabProps {
  widgetConfig: LiveWidgetConfig;
  playerConfig: LivePlayerConfig;
  onWidgetChange: (config: LiveWidgetConfig) => void;
  onPlayerChange: (config: LivePlayerConfig) => void;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const LiveAppearanceTab: React.FC<LiveAppearanceTabProps> = ({
  widgetConfig,
  playerConfig,
  onWidgetChange,
  onPlayerChange,
}) => {
  const [widgetAccordionOpen, setWidgetAccordionOpen] = useState(true);
  const [playerAccordionOpen, setPlayerAccordionOpen] = useState(true);

  return (
    <div className="space-y-5">
      {/* ===== CONFIGURAÇÃO DO WIDGET (bolinha flutuante de divulgação) ===== */}
      <SectionCard
        title="Widget de Divulgação"
        description="Bolinha flutuante que aparece na loja anunciando a live ativa"
      >
        <ToggleSwitch
          label="Exibir widget de divulgação"
          checked={widgetConfig.enabled}
          onChange={(e) => onWidgetChange({ ...widgetConfig, enabled: e.target.checked })}
          description="Ativa/desativa a bolha flutuante enquanto a live estiver ao vivo"
        />

        <AccordionSection
          title="Personalização visual"
          isOpen={widgetAccordionOpen}
          onToggle={() => setWidgetAccordionOpen((v) => !v)}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Posição na tela
              </label>
              <select
                value={widgetConfig.position}
                onChange={(e) =>
                  onWidgetChange({
                    ...widgetConfig,
                    position: e.target.value as LiveWidgetConfig['position'],
                  })
                }
                className="w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
              >
                <option value="bottom-right">Inferior direita</option>
                <option value="bottom-left">Inferior esquerda</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Texto do rótulo
              </label>
              <input
                type="text"
                value={widgetConfig.label_text}
                onChange={(e) => onWidgetChange({ ...widgetConfig, label_text: e.target.value })}
                placeholder="Ex: 🔴 AO VIVO AGORA"
                className="w-full rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-slate-50 dark:bg-[#111524] px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0091ff]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cor da bolha
                </label>
                <ColorInput
                  label="Cor da bolha"
                  value={widgetConfig.bubble_color}
                  onChange={(e) => onWidgetChange({ ...widgetConfig, bubble_color: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cor do texto
                </label>
                <ColorInput
                  label="Cor do texto"
                  value={widgetConfig.text_color}
                  onChange={(e) => onWidgetChange({ ...widgetConfig, text_color: e.target.value })}
                />
              </div>
            </div>
          </div>
        </AccordionSection>
      </SectionCard>

      {/* ===== CONFIGURAÇÃO DO PLAYER (tela cheia da live) ===== */}
      <SectionCard
        title="Player da Live"
        description="Aparência da tela de reprodução quando o cliente clica no widget"
      >
        <AccordionSection
          title="Personalização visual"
          isOpen={playerAccordionOpen}
          onToggle={() => setPlayerAccordionOpen((v) => !v)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cor primária (botões/destaques)
                </label>
                <ColorInput
                  label="Cor primária"
                  value={playerConfig.primary_color}
                  onChange={(e) => onPlayerChange({ ...playerConfig, primary_color: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cor de fundo do player
                </label>
                <ColorInput
                  label="Cor de fundo"
                  value={playerConfig.background_color}
                  onChange={(e) => onPlayerChange({ ...playerConfig, background_color: e.target.value })}
                />
              </div>
            </div>

            <ToggleSwitch
              label="Exibir contador de espectadores"
              checked={playerConfig.show_viewer_count}
              onChange={(e) => onPlayerChange({ ...playerConfig, show_viewer_count: e.target.checked })}
            />

            <ToggleSwitch
              label="Exibir chat ao vivo"
              checked={playerConfig.show_chat}
              onChange={(e) => onPlayerChange({ ...playerConfig, show_chat: e.target.checked })}
            />

            <ToggleSwitch
              label="Iniciar reprodução com som desativado"
              checked={playerConfig.autoplay_muted}
              onChange={(e) => onPlayerChange({ ...playerConfig, autoplay_muted: e.target.checked })}
              description="Recomendado para evitar bloqueio de autoplay pelos navegadores"
            />
          </div>
        </AccordionSection>
      </SectionCard>
    </div>
  );
};

export default LiveAppearanceTab;
