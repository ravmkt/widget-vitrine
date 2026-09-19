import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Users,
  MessageCircle,
  Video,
  Sparkles,
  Laptop,
  HelpCircle,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface ShareLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveTitle: string;
  youtubeVideoId: string;
  isLiveNow: boolean;
}

export function ShareLiveModal({
  open,
  onOpenChange,
  liveTitle,
  youtubeVideoId,
  isLiveNow,
}: ShareLiveModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const youtubeUrl = youtubeVideoId
    ? `https://www.youtube.com/watch?v=${youtubeVideoId}`
    : "";

  const copyToClipboard = (text: string, key: string, message = "Copiado com sucesso!") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(message);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  const whatsappCustomerText = encodeURIComponent(
    `🔥 *${isLiveNow ? "ESTAMOS AO VIVO!" : "VEM AÍ NOSSA LIVE EXCLUSIVA!"}*\n\n` +
      `📌 *${liveTitle || "Live Commerce Vidlytics"}*\n` +
      `Assista agora, interaja conosco e aproveite os descontos especiais!\n\n` +
      `👉 Assista direto no YouTube: ${youtubeUrl}`
  );

  const whatsappCustomerShareUrl = `https://api.whatsapp.com/send?text=${whatsappCustomerText}`;

  const cohostMessageTemplate =
    `Olá! Tudo bem? Aqui estão as instruções para a nossa transmissão de hoje:\n\n` +
    `📌 Tema: ${liveTitle || "Live Commerce"}\n` +
    `🎥 Link de transmissão / estúdio: [Cole aqui seu link do StreamYard ou VDO.Ninja]\n` +
    `📺 Link público no YouTube: ${youtubeUrl}\n\n` +
    `Dicas: Use fones de ouvido para evitar eco e certifique-se de estar em um local bem iluminado. Até já!`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                Divulgar & Convidar Participantes
                {isLiveNow ? (
                  <Badge variant="destructive" className="animate-pulse text-[10px]">
                    <Radio className="h-3 w-3 mr-1" /> AO VIVO
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    PROGRAMADA
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Compartilhe com sua audiência ou convide influenciadores e parceiros para transmitir com você.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="customers" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customers" className="gap-2 text-xs">
              <Share2 className="h-3.5 w-3.5" />
              Divulgar para Clientes
            </TabsTrigger>
            <TabsTrigger value="cohost" className="gap-2 text-xs">
              <Users className="h-3.5 w-3.5" />
              Convidar Co-Host / Parceiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4 pt-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  Divulgar no WhatsApp
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300">
                  Alta Conversão
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Envie o convite formatado com um clique para suas listas de transmissão, grupos de clientes e status.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-2"
                  onClick={() => window.open(whatsappCustomerShareUrl, "_blank")}
                  disabled={!youtubeVideoId}
                >
                  <MessageCircle className="h-4 w-4" />
                  Abrir WhatsApp Web / App
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    copyToClipboard(
                      decodeURIComponent(whatsappCustomerText),
                      "wa_text",
                      "Texto formatado copiado!"
                    )
                  }
                  disabled={!youtubeVideoId}
                >
                  {copiedKey === "wa_text" ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copiar Texto
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Link da Live no YouTube</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={youtubeUrl || "Adicione o ID da Live no formulário"}
                  className="text-xs font-mono bg-muted/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => copyToClipboard(youtubeUrl, "yt_url")}
                  disabled={!youtubeVideoId}
                >
                  {copiedKey === "yt_url" ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copiar
                </Button>
                {youtubeUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(youtubeUrl, "_blank")}
                    title="Abrir no YouTube"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 border text-xs text-muted-foreground flex gap-2.5 items-start">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Dica de Conversão Máxima:</span>{" "}
                Quando a live estiver ativa, o story no seu e-commerce exibirá o badge piscante{" "}
                <span className="font-semibold text-rose-500">AO VIVO</span> com os produtos pinados clicáveis. Divulgue também o endereço da sua loja!
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cohost" className="space-y-4 pt-3">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                O YouTube não gera link de convidado nativo na transmissão padrão RTMP. Para transmitir em dupla com tela dividida, utilize ferramentas de estúdio que transmitem direto para o YouTube:
              </div>
            </div>

            <div className="rounded-xl border p-3.5 space-y-2.5 bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Opção 1: StreamYard (Mais Fácil e Recomendado)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      O convidado clica no link e entra pelo navegador do celular ou PC sem instalar nada.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                  onClick={() => window.open("https://streamyard.com", "_blank")}
                >
                  Abrir
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              <div className="bg-muted/40 p-2.5 rounded-md text-[11px] space-y-1 text-muted-foreground">
                <p>1. Crie a transmissão no StreamYard conectando seu canal do YouTube.</p>
                <p>2. Clique em <strong>Invite Guests</strong> (Convidar) e copie o link para o co-host.</p>
                <p>3. Os dois aparecem na live e o Vidlytics sincroniza na sua loja!</p>
              </div>
            </div>

            <div className="rounded-xl border p-3.5 space-y-2.5 bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
                    <Video className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Opção 2: OBS Studio + VDO.Ninja (100% Gratuito)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Para transmissões profissionais com layout customizado no OBS.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                  onClick={() => window.open("https://vdo.ninja", "_blank")}
                >
                  VDO.Ninja
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              <div className="bg-muted/40 p-2.5 rounded-md text-[11px] space-y-1 text-muted-foreground">
                <p>1. Crie uma sala no <strong>VDO.Ninja</strong> e envie o link de câmera para o convidado.</p>
                <p>2. Adicione a fonte de navegador (Browser Source) no seu OBS Studio.</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Modelo de Mensagem para o Convidado</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] gap-1 px-2 text-primary"
                  onClick={() =>
                    copyToClipboard(
                      cohostMessageTemplate,
                      "cohost_template",
                      "Instruções copiadas!"
                    )
                  }
                >
                  {copiedKey === "cohost_template" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copiar Instruções
                </Button>
              </div>
              <textarea
                readOnly
                value={cohostMessageTemplate}
                rows={4}
                className="w-full text-[11px] font-sans p-2 rounded-md border bg-muted/40 text-muted-foreground resize-none focus:outline-none"
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
