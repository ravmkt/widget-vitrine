import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShoppingBag, Send, X, Star, Users } from "lucide-react";
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

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    try {
      await sendMessage("Loja", chatInput, true);
      setChatInput("");
    } catch {
      toast.error("Erro ao enviar mensagem.");
    }
  };

  const handleToggleSpotlight = async (productId: string) => {
    try {
      const next = spotlightProductId === productId ? null : productId;
      await setSpotlight(next);
      toast.success(next ? "Produto em destaque atualizado." : "Destaque removido.");
    } catch {
      toast.error("Erro ao atualizar destaque.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <RefreshCw className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        Live não encontrada.
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <Badge className="bg-rose-600 text-white flex items-center gap-1.5 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> AO VIVO
          </Badge>
          <h1 className="text-sm font-bold truncate max-w-md">{live.title}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.close()} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4 mr-1" /> Fechar Painel
        </Button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_0.9fr] overflow-hidden">
        <div className="bg-black flex items-center justify-center p-4 overflow-hidden">
          <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden border border-slate-800">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${live.youtube_video_id}?autoplay=1&mute=1`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 shrink-0">
            <ShoppingBag className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-bold">Produtos da Live</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {products.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Nenhum produto cadastrado nesta live.</p>
            ) : (
              products.map((p) => {
                const isSpotlight = spotlightProductId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleToggleSpotlight(p.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isSpotlight
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-lg bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-rose-400 font-bold">
                        R$ {Number(p.price || 0).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    {isSpotlight && (
                      <Star className="h-4 w-4 text-emerald-400 fill-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 shrink-0">
            <Users className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold">Chat da Live</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Nenhuma mensagem ainda.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`text-xs p-2 rounded-lg max-w-[90%] ${
                    m.is_from_store ? "bg-rose-600/20 ml-auto text-right" : "bg-slate-800"
                  }`}
                >
                  <span className="font-bold block text-[10px] text-slate-400">
                    {m.is_from_store ? "Você (Loja)" : m.author_name}
                  </span>
                  {m.message}
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <Input
              placeholder="Responder no chat..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              className="h-9 text-xs bg-slate-900 border-slate-700"
            />
            <Button size="icon" onClick={handleSendChat} className="h-9 w-9 bg-rose-600 hover:bg-rose-700 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
