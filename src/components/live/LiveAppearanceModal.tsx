import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Monitor, Smartphone, MessageSquare, Users, VolumeX, Radio, Maximize,
  Save, LayoutTemplate, PlaySquare
} from "lucide-react";

export interface LiveWidgetConfig {
  enabled: boolean;
  position: string;
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widgetConfig: LiveWidgetConfig, playerConfig: LivePlayerConfig) => void;
  initialWidgetConfig: LiveWidgetConfig;
  initialPlayerConfig: LivePlayerConfig;
  isSaving: boolean;
}

export default function LiveAppearanceModal({
  isOpen, onClose, onSave, initialWidgetConfig, initialPlayerConfig, isSaving
}: Props) {
  const [activeTab, setActiveTab] = useState<"widget" | "player">("widget");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const [widget, setWidget] = useState<LiveWidgetConfig>(initialWidgetConfig);
  const [player, setPlayer] = useState<LivePlayerConfig>(initialPlayerConfig);

  useEffect(() => {
    if (isOpen) {
      setWidget(initialWidgetConfig);
      setPlayer(initialPlayerConfig);
    }
  }, [isOpen, initialWidgetConfig, initialPlayerConfig]);

  const handleSave = () => {
    onSave(widget, player);
  };

  const CustomSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={elative inline-flex h-6 w-11 items-center rounded-full transition-colors }
        onClick={() => onChange(!checked)}
      >
        <span className={inline-block h-4 w-4 transform rounded-full bg-white transition-transform } />
      </div>
    </label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between sticky top-0 bg-background z-10">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-500" />
            Aparência da Live
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 min-w-[320px] border-r border-border flex flex-col bg-muted/10">
            <div className="flex p-2 gap-1 border-b border-border bg-background">
              <button onClick={() => setActiveTab("widget")} className={lex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-colors }><LayoutTemplate className="h-4 w-4" />Divulgação</button>
              <button onClick={() => setActiveTab("player")} className={lex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm font-medium rounded-md transition-colors }><PlaySquare className="h-4 w-4" />Player</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === "widget" ? (
                <div className="space-y-5">
                  <div><h3 className="text-lg font-semibold mb-1">Widget Flutuante</h3></div>
                  <CustomSwitch checked={widget.enabled} onChange={(v) => setWidget({...widget, enabled: v})} label="Habilitar Widget na loja" />
                  {widget.enabled && (
                    <>
                      <div className="space-y-2"><label className="text-sm font-medium">Texto do Balão</label><Input value={widget.label_text} onChange={(e) => setWidget({...widget, label_text: e.target.value})} placeholder="Ex: 🔴 AO VIVO AGORA"/></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">Cor de Fundo</label><div className="flex gap-2"><Input type="color" value={widget.bubble_color} onChange={(e) => setWidget({...widget, bubble_color: e.target.value})} className="w-12 p-1 h-10 cursor-pointer"/><Input value={widget.bubble_color} onChange={(e) => setWidget({...widget, bubble_color: e.target.value})} className="flex-1 font-mono uppercase text-xs"/></div></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Cor do Texto</label><div className="flex gap-2"><Input type="color" value={widget.text_color} onChange={(e) => setWidget({...widget, text_color: e.target.value})} className="w-12 p-1 h-10 cursor-pointer"/><Input value={widget.text_color} onChange={(e) => setWidget({...widget, text_color: e.target.value})} className="flex-1 font-mono uppercase text-xs"/></div></div>
                      </div>
                      <div className="space-y-2"><label className="text-sm font-medium">Posição</label><select className="w-full h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={widget.position} onChange={(e) => setWidget({...widget, position: e.target.value})}><option value="bottom-right">Inferior Direito</option><option value="bottom-left">Inferior Esquerdo</option></select></div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div><h3 className="text-lg font-semibold mb-1">Player da Live</h3></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Cor Principal</label><div className="flex gap-2"><Input type="color" value={player.primary_color} onChange={(e) => setPlayer({...player, primary_color: e.target.value})} className="w-12 p-1 h-10 cursor-pointer"/><Input value={player.primary_color} onChange={(e) => setPlayer({...player, primary_color: e.target.value})} className="flex-1 font-mono uppercase text-xs"/></div></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Fundo</label><div className="flex gap-2"><Input type="color" value={player.background_color} onChange={(e) => setPlayer({...player, background_color: e.target.value})} className="w-12 p-1 h-10 cursor-pointer"/><Input value={player.background_color} onChange={(e) => setPlayer({...player, background_color: e.target.value})} className="flex-1 font-mono uppercase text-xs"/></div></div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <CustomSwitch checked={player.show_chat} onChange={(v) => setPlayer({...player, show_chat: v})} label="Exibir Chat" />
                    <CustomSwitch checked={player.show_viewer_count} onChange={(v) => setPlayer({...player, show_viewer_count: v})} label="Exibir Número de Espectadores" />
                    <CustomSwitch checked={player.autoplay_muted} onChange={(v) => setPlayer({...player, autoplay_muted: v})} label="Autoplay Mutado" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-muted/30 relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-background border border-border rounded-lg shadow-sm z-10">
              <button onClick={() => setDevice("desktop")} className={p-2 rounded-md transition-colors }><Monitor className="h-4 w-4" /></button>
              <button onClick={() => setDevice("mobile")} className={p-2 rounded-md transition-colors }><Smartphone className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
              <div className={elative bg-background border border-border shadow-xl overflow-hidden transition-all duration-500 flex flex-col } style={activeTab === "player" ? { backgroundColor: player.background_color } : {}}>
                {activeTab === "widget" && (
                  <div className="absolute inset-0 bg-muted/10">
                    <div className="w-full h-12 border-b border-border bg-background flex items-center px-4 shadow-sm"><div className="w-24 h-4 bg-muted rounded-full"></div></div>
                    {widget.enabled && (
                      <div className="absolute p-3 px-4 rounded-full shadow-lg cursor-pointer flex items-center gap-2" style={{ backgroundColor: widget.bubble_color, color: widget.text_color, bottom: '24px', right: widget.position === 'bottom-right' ? '24px' : 'auto', left: widget.position === 'bottom-left' ? '24px' : 'auto' }}>
                        <Radio className="h-5 w-5 animate-pulse" /><span className="font-bold text-sm tracking-wide">{widget.label_text}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "player" && (
                  <div className="absolute inset-0 flex flex-col">
                    <div className="p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/50 to-transparent">
                      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pr-3 border border-white/10">
                        <div className="bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><Radio className="w-3 h-3" /> Ao Vivo</div>
                        {player.show_viewer_count && <div className="text-white text-xs font-medium flex items-center gap-1 opacity-90"><Users className="w-3 h-3" /> 1.2k</div>}
                      </div>
                      {player.autoplay_muted && <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white/90 border border-white/10"><VolumeX className="w-4 h-4" /></div>}
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                       <PlaySquare className="w-16 h-16 opacity-20" style={{ color: player.primary_color }} />
                    </div>

                    <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                      <div className="flex-1"><h2 className="text-white font-bold text-lg mb-1 drop-shadow-md">Lançamento Exclusivo</h2><p className="text-white/80 text-sm">Compre agora com descontos imperdíveis!</p></div>
                      <div className="flex flex-col gap-2 items-end">
                        {player.show_chat && <div className="bg-black/50 backdrop-blur-md p-2.5 rounded-full text-white cursor-pointer border border-white/10" style={{ backgroundColor: ${player.primary_color}40 }}><MessageSquare className="w-5 h-5" /></div>}
                        <div className="bg-black/50 backdrop-blur-md p-2.5 rounded-full text-white cursor-pointer border border-white/10"><Maximize className="w-5 h-5" /></div>
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
