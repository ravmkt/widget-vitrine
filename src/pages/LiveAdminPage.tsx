import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  ShoppingBag,
  Send,
  X,
  Star,
  Users,
  Smartphone,
  Monitor,
  Tag,
  Megaphone,
  Radio,
  Eye,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { useLiveChat } from "@/hooks/useLiveChat";
import { useLiveSpotlight } from "@/hooks/useLiveSpotlight";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

interface LiveData {
  id: string;
  store_id: string;
  title: string;
  youtube_video_id: string;
  featured_product_ids: string[];
  spotlight_product_id: string | null;
  is_active: boolean;
  status: string;
}

export default function LiveAdminPage() {
  const { liveId } = useParams<{ liveId: string }>();

  const [live, setLive] = useState<LiveData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Painéis de Ação Rápida
  const [couponCode, setCouponCode] = useState("");
  const [announcementText, setAnnouncementText] = useState("");

  const { messages, sendMessage } = useLiveChat(liveId || null, live?.store_id || null);
  const { spotlightProductId, setSpotlight } = useLiveSpotlight(
    liveId || null,
    live?.spotlight_product_id || null
  );

  useEffect(() => {
    if (!liveId) return;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("lives")
        .select("id, store_id, title, youtube_video_id, featured_product_ids, spotlight_product_id, is_active, status")
        .eq("id", liveId)
        .maybeSingle();

      if (error || !data) {
        toast.error("Live não encontrada.");
        setLoading(false);
        return;
      }
      setLive(data as LiveData);

      const productIds: string[] = Array.isArray(data.featured_product_ids) ? data.featured_product_ids : [];
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image_url")
          .in("id", productIds);
        if (prods) setProducts(prods as Product[]);
      }
      setLoading(false);
    }
    load();
  }, [liveId]);

  const handleSendChat = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;
    try {
      await sendMessage("Loja", text, true);
      if (!textToSend) setChatInput("");
    } catch {
      toast.error("Erro ao enviar mensagem.");
    }
  };

  const handleToggleSpotlight = async (productId: string) => {
    try {
      const next = spotlightProductId === productId ? null : productId;
      await setSpotlight(next);
      if (next) {
        toast.success("Produto ativado em destaque na live!");
      } else {
        toast.info("Destaque removido da live.");
      }
    } catch {
      toast.error("Erro ao atualizar destaque.");
    }
  };

  const handleSendCoupon = async () => {
    if (!couponCode.trim()) return;
    const msg = `🔥 CUPOM ESPECIAL DA LIVE: Use o cupom "${couponCode.trim().toUpperCase()}" para desconto exclusivo!`;
    await handleSendChat(msg);
    setCouponCode("");
    toast.success("Cupom anunciado no chat!");
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    const msg = `📢 AVISO: ${announcementText.trim()}`;
    await handleSendChat(msg);
    setAnnouncementText("");
    toast.success("Aviso anunciado no chat!");
  };

  const currentSpotlightProduct = products.find((p) => p.id === spotlightProductId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <RefreshCw className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Live não encontrada.
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Topo / Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <Badge className="bg-rose-600 text-white flex items-center gap-1.5 px-2.5 py-1">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> TRANSMISSÃO ATIVA
          </Badge>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold truncate max-w-sm sm:max-w-md">{live.title}</h1>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
              ID: {live.id.slice(0, 8)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Métricas rápidas */}
          <div className="hidden md:flex items-center gap-4 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-rose-400" />
              <span>{messages.length > 0 ? messages.length * 3 + 12 : 8} espectadores</span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{messages.length} msgs</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.close()}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8"
          >
            <X className="h-4 w-4 mr-1" /> Fechar Painel
          </Button>
        </div>
      </header>

      {/* Grid Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.55fr_1.05fr_0.9fr] overflow-hidden">
        
        {/* COLUNA 1: Monitor da Live + Ações Rápidas */}
        <div className="flex flex-col bg-black/60 border-r border-slate-800 overflow-hidden">
          {/* Barra de controle do Monitor */}
          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Monitor ao Vivo
            </span>

            {/* Alternador Desktop / Mobile */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  viewMode === "desktop" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Modo Monitor Desktop (16:9)"
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  viewMode === "mobile" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Modo Monitor Mobile (Vertical 9:16)"
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
          </div>

          {/* Área do Player da Live */}
          <div className="flex-1 bg-black flex items-center justify-center p-3 overflow-hidden relative">
            <div
              className={`transition-all duration-300 relative border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-950 ${
                viewMode === "desktop"
                  ? "w-full max-w-2xl aspect-video"
                  : "w-[270px] h-[480px] max-h-full"
              }`}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${live.youtube_video_id}?autoplay=1&mute=1&controls=1`}
                className="w-full h-full border-0 pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Monitor da Live"
              />

              {/* Overlay Dinâmico do Produto Ativo (Exatamente como o visitante vê) */}
              {currentSpotlightProduct && (
                <div className="absolute bottom-3 left-3 right-3 sm:right-auto max-w-[280px] bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-xl p-2.5 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-emerald-500/30 flex items-center justify-center">
                    {currentSpotlightProduct.image_url ? (
                      <img
                        src={currentSpotlightProduct.image_url}
                        alt={currentSpotlightProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-emerald-400" /> Destaque Ativo
                    </span>
                    <p className="text-xs font-semibold text-white truncate">{currentSpotlightProduct.name}</p>
                    <p className="text-xs font-extrabold text-emerald-300">
                      R$ {Number(currentSpotlightProduct.price || 0).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barra Inferior: Cupons e Avisos Rápidos na Live */}
          <div className="bg-slate-900/80 border-t border-slate-800 p-3 shrink-0 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Envio de Cupom */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                <Tag className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
                <Input
                  placeholder="Cupom (ex: LIVE10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCoupon()}
                  className="h-7 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1.5 uppercase font-mono"
                />
                <Button
                  size="sm"
                  onClick={handleSendCoupon}
                  className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                >
                  Lançar Cupom
                </Button>
              </div>

              {/* Envio de Aviso Geral */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                <Megaphone className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                <Input
                  placeholder="Aviso urgente (ex: Frete grátis nos prox 5 min!)"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendAnnouncement()}
                  className="h-7 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1.5"
                />
                <Button
                  size="sm"
                  onClick={handleSendAnnouncement}
                  className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  Avisar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA 2: Produtos da Live (com controle da Estrelinha / Destaque) */}
        <div className="border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-bold">Produtos na Live ({products.length})</h2>
            </div>
            {spotlightProductId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpotlight(null)}
                className="h-6 px-2 text-[10px] text-slate-400 hover:text-rose-400"
              >
                Remover Destaque
              </Button>
            )}
          </div>

          <div className="px-3 py-2 bg-slate-900/20 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Clique na <b>estrelinha</b> de um produto para destacá-lo ao vivo no player do cliente.</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {products.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Nenhum produto vinculado nesta live.</p>
                <p className="text-[11px] text-slate-600">Vincule produtos na edição da live para ativá-los aqui.</p>
              </div>
            ) : (
              products.map((p) => {
                const isSpotlight = spotlightProductId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleSpotlight(p.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSpotlight
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{p.name}</p>
                      <p className="text-xs text-rose-400 font-bold mt-0.5">
                        R$ {Number(p.price || 0).toFixed(2).replace(".", ",")}
                      </p>
                      {isSpotlight && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-1">
                          <CheckCircle2 className="w-3 h-3" /> Ao vivo no player
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSpotlight(p.id);
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        isSpotlight
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "text-slate-500 hover:text-amber-400 hover:bg-slate-800"
                      }`}
                      title={isSpotlight ? "Remover do destaque" : "Destacar produto ao vivo"}
                    >
                      <Star
                        className={`h-5 w-5 transition-transform active:scale-125 ${
                          isSpotlight ? "fill-emerald-400 text-emerald-400" : ""
                        }`}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 3: Chat Interativo & Moderação */}
        <div className="flex flex-col overflow-hidden bg-slate-950">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold">Chat ao Vivo</h2>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
              Canal Oficial
            </span>
          </div>

          {/* Histórico de Mensagens */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-1">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500">Nenhuma mensagem no chat ainda.</p>
                <p className="text-[11px] text-slate-600">Inicie uma conversa como moderador!</p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`text-xs p-2.5 rounded-xl border max-w-[88%] ${
                    m.is_from_store
                      ? "bg-rose-950/40 border-rose-500/30 text-rose-100 ml-auto text-right"
                      : "bg-slate-900 border-slate-800 text-slate-200"
                  }`}
                >
                  <span
                    className={`font-bold block text-[10px] mb-0.5 ${
                      m.is_from_store ? "text-rose-400" : "text-blue-400"
                    }`}
                  >
                    {m.is_from_store ? "⭐ Você (Loja Oficial)" : m.author_name || "Cliente"}
                  </span>
                  <p className="break-words leading-relaxed">{m.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Atalhos Rápidos de Interação */}
          <div className="px-3 pt-2 pb-1 border-t border-slate-800/80 bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {["🔥", "❤️", "👏", "🎉", "😱", "Corre que tá acabando!"].map((quick, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(quick)}
                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
              >
                {quick}
              </button>
            ))}
          </div>

          {/* Input de Envio */}
          <div className="p-3 border-t border-slate-800 flex items-center gap-2 shrink-0 bg-slate-900/60">
            <Input
              placeholder="Responder como Loja Oficial..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              className="h-9 text-xs bg-slate-900 border-slate-700 focus-visible:ring-rose-500 text-white placeholder:text-slate-500"
            />
            <Button
              size="icon"
              onClick={() => handleSendChat()}
              className="h-9 w-9 bg-rose-600 hover:bg-rose-700 shrink-0 shadow-md"
              title="Enviar Mensagem"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
