import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Play, Square, ExternalLink, Check, ShoppingBag, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  url?: string;
}

interface LiveSession {
  id: string;
  store_id: string;
  title: string;
  youtube_video_id: string;
  is_active: boolean;
  featured_product_ids: string[];
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export function LiveCommercePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [allowsLive, setAllowsLive] = useState<boolean>(true);
  const [planName, setPlanName] = useState<string>("");

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [extractedVideoId, setExtractedVideoId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [activeLive, setActiveLive] = useState<LiveSession | null>(null);
  const [pastLives, setPastLives] = useState<LiveSession[]>([]);

  // Extrai o ID do vídeo do YouTube de qualquer formato comum
  const parseYouTubeId = (url: string): string => {
    if (!url) return "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.trim().match(regExp);
    return match && match[2].length === 11 ? match[2] : "";
  };

  useEffect(() => {
    const id = parseYouTubeId(youtubeUrl);
    setExtractedVideoId(id);
  }, [youtubeUrl]);

  // Carrega informações da loja e plano
  useEffect(() => {
    async function loadStoreAndPlan() {
      if (!user) return;
      try {
        setLoading(true);

        // Busca loja do usuário
        const { data: store, error: storeErr } = await supabase
          .from("stores")
          .select("id, plan_id, plan:plan_id(id, name, allows_live)")
          .eq("user_id", user.id)
          .single();

        if (storeErr || !store) {
          toast.error("Loja não encontrada.");
          return;
        }

        setStoreId(store.id);

        const currentPlan = (store as any).plan;
        if (currentPlan) {
          setPlanName(currentPlan.name || "Starter");
          setAllowsLive(currentPlan.allows_live !== false);
        }

        // Carrega produtos da loja
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image_url, url")
          .eq("store_id", store.id)
          .order("name", { ascending: true });

        if (prods) setProducts(prods);

        // Carrega lives
        await loadLives(store.id);
      } catch (err: any) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStoreAndPlan();
  }, [user]);

  async function loadLives(currentStoreId: string) {
    const { data: lives, error } = await supabase
      .from("lives")
      .select("*")
      .eq("store_id", currentStoreId)
      .order("created_at", { ascending: false });

    if (!error && lives) {
      const active = lives.find((l) => l.is_active);
      setActiveLive(active || null);
      setPastLives(lives.filter((l) => !l.is_active));

      if (active) {
        setTitle(active.title || "");
        setExtractedVideoId(active.youtube_video_id);
        setYoutubeUrl(`https://www.youtube.com/watch?v=${active.youtube_video_id}`);
        setSelectedProductIds(active.featured_product_ids || []);
      }
    }
  }

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleStartLive = async () => {
    if (!storeId) return;
    if (!extractedVideoId) {
      toast.error("Insira um link válido de transmissão ao vivo do YouTube.");
      return;
    }
    if (!title.trim()) {
      toast.error("Dê um título para a sua Live.");
      return;
    }

    try {
      setSaving(true);

      // Desativa qualquer live anterior por segurança
      await supabase
        .from("lives")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .eq("is_active", true);

      // Insere a nova live ativa
      const { data, error } = await supabase
        .from("lives")
        .insert({
          store_id: storeId,
          title: title.trim(),
          youtube_video_id: extractedVideoId,
          is_active: true,
          featured_product_ids: selectedProductIds,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveLive(data);
      toast.success("🔴 Live iniciada com sucesso! Já está visível na sua loja.");
      await loadLives(storeId);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar a live.");
    } finally {
      setSaving(false);
    }
  };

  const handleEndLive = async () => {
    if (!activeLive || !storeId) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("lives")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", activeLive.id);

      if (error) throw error;

      setActiveLive(null);
      toast.info("A Live foi encerrada e não será mais exibida no widget.");
      await loadLives(storeId);
    } catch (err: any) {
      toast.error("Erro ao encerrar a live.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Live Shopping</h1>
              <p className="text-muted-foreground text-sm">
                Transmita lives do YouTube diretamente na sua loja com produtos clicáveis.
              </p>
            </div>
          </div>
        </div>

        {activeLive && (
          <Badge className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 flex items-center gap-2 self-start animate-pulse">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            AO VIVO NA LOJA
          </Badge>
        )}
      </div>

      {/* Bloqueio de Plano se não for Pro/Scale */}
      {!allowsLive && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Recurso Exclusivo dos Planos Pro e Scale</h3>
              <p className="text-sm text-muted-foreground">
                Seu plano atual ({planName || "Starter"}) não inclui transmissões de Live Shopping. Faça upgrade para desbloquear vendas ao vivo com produtos interativos.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/billing")} className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap">
            Fazer Upgrade Agora
          </Button>
        </div>
      )}

      {/* Status da Live Atual ou Configuração */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Transmissão */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Configurar Transmissão
              </CardTitle>
              <CardDescription>
                Cole o link da sua Live ou vídeo no YouTube para transmitir no widget.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="live-title">Título da Live</Label>
                <Input
                  id="live-title"
                  placeholder="Ex: Super Live de Lançamento da Coleção 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!allowsLive || !!activeLive}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="youtube-url">Link da Live no YouTube</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={!allowsLive || !!activeLive}
                  className="mt-1.5"
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Você pode usar o link de uma live agendada, live em andamento ou vídeo de teste.
                </span>
              </div>

              {/* Preview do Player */}
              {extractedVideoId ? (
                <div className="mt-4 rounded-xl overflow-hidden border border-border aspect-video bg-black relative">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${extractedVideoId}?autoplay=0&rel=0`}
                    title="Live Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground bg-muted/20">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Insira um link válido do YouTube para ver a pré-visualização</p>
                </div>
              )}

              {/* Ações */}
              <div className="pt-4 flex items-center justify-end gap-3">
                {activeLive ? (
                  <Button
                    variant="destructive"
                    onClick={handleEndLive}
                    disabled={saving}
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Encerrar Live na Loja
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartLive}
                    disabled={saving || !extractedVideoId || !allowsLive}
                    className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <Radio className="h-4 w-4" />
                    {saving ? "Iniciando..." : "Iniciar Live Shopping"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Produtos em Destaque */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Produtos da Live
              </CardTitle>
              <CardDescription>
                Selecione os produtos que os clientes poderão comprar durante a live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum produto cadastrado.
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 block mx-auto text-primary"
                    onClick={() => navigate("/produtos")}
                  >
                    Cadastrar produtos
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {products.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => allowsLive && !activeLive && toggleProduct(product.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/60 hover:border-border text-muted-foreground"
                        } ${activeLive ? "cursor-not-allowed opacity-80" : ""}`}
                      >
                        <div className="h-10 w-10 rounded-md bg-muted/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs font-semibold text-primary">
                            R$ {Number(product.price || 0).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
