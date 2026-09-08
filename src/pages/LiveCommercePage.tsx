import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Radio, Play, Square, ExternalLink, Check, ShoppingBag, 
  Sparkles, AlertCircle, RefreshCw, Pin, Clock, Tag, 
  Users, Video, UploadCloud, Calendar
} from "lucide-react";
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
  youtube_url?: string;
  is_active: boolean;
  status: "scheduled" | "live" | "finished";
  featured_product_ids: string[];
  pinned_product_id?: string | null;
  scheduled_at?: string | null;
  show_countdown?: boolean;
  coupon_code?: string | null;
  coupon_discount?: string | null;
  teaser_video_url?: string | null;
  teaser_thumbnail_url?: string | null;
  notify_leads_enabled?: boolean;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

interface Subscriber {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

export function LiveCommercePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTeaser, setUploadingTeaser] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [allowsLive, setAllowsLive] = useState<boolean>(true);
  const [planName, setPlanName] = useState<string>("");

  // Formulário
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [extractedVideoId, setExtractedVideoId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [showCountdown, setShowCountdown] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("");
  const [teaserVideoUrl, setTeaserVideoUrl] = useState("");
  const [notifyLeadsEnabled, setNotifyLeadsEnabled] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [pinnedProductId, setPinnedProductId] = useState<string | null>(null);

  // Countdown Preview
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [activeLive, setActiveLive] = useState<LiveSession | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  // Extrai o ID do vídeo do YouTube
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

  // Atualiza o contador regressivo em tempo real
  useEffect(() => {
    if (!scheduledAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const target = new Date(scheduledAt).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledAt]);

  // Carrega informações da loja e plano
  useEffect(() => {
    async function loadStoreAndPlan() {
      if (!user) return;
      try {
        setLoading(true);

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

        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image_url, url")
          .eq("store_id", store.id)
          .order("name", { ascending: true });

        if (prods) setProducts(prods);

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
      const active = lives.find((l) => l.is_active || l.status === "scheduled");
      if (active) {
        setActiveLive(active);
        setTitle(active.title || "");
        setExtractedVideoId(active.youtube_video_id);
        setYoutubeUrl(active.youtube_url || `https://www.youtube.com/watch?v=${active.youtube_video_id}`);
        setSelectedProductIds(active.featured_product_ids || []);
        setPinnedProductId(active.pinned_product_id || null);
        setCouponCode(active.coupon_code || "");
        setCouponDiscount(active.coupon_discount || "");
        setTeaserVideoUrl(active.teaser_video_url || "");
        setShowCountdown(active.show_countdown ?? true);
        setNotifyLeadsEnabled(active.notify_leads_enabled ?? true);
        if (active.scheduled_at) {
          // Formata para datetime-local
          const date = new Date(active.scheduled_at);
          const tzOffset = date.getTimezoneOffset() * 60000;
          const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
          setScheduledAt(localISOTime);
        }

        // Carrega inscritos
        loadSubscribers(active.id);
      } else {
        setActiveLive(null);
      }
    }
  }

  async function loadSubscribers(liveId: string) {
    const { data } = await supabase
      .from("live_subscribers")
      .select("*")
      .eq("live_id", liveId)
      .order("created_at", { ascending: false });

    if (data) setSubscribers(data);
  }

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Upload do vídeo de convite (teaser vertical)
  const handleUploadTeaser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !storeId) return;
    const file = e.target.files[0];
    
    if (!file.type.startsWith("video/")) {
      toast.error("Por favor, selecione um arquivo de vídeo (MP4 ou WebM).");
      return;
    }

    try {
      setUploadingTeaser(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `store_${storeId}/live_teasers/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("videos")
        .getPublicUrl(filePath);

      setTeaserVideoUrl(publicUrlData.publicUrl);
      toast.success("Vídeo de convite enviado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload do vídeo.");
    } finally {
      setUploadingTeaser(false);
    }
  };

  // Salvar Agendamento ou Atualização
  const handleSaveScheduled = async () => {
    if (!storeId) return;
    if (!title.trim()) {
      toast.error("Dê um título para a sua Live.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        store_id: storeId,
        title: title.trim(),
        youtube_url: youtubeUrl.trim(),
        youtube_video_id: extractedVideoId || "",
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        show_countdown: showCountdown,
        coupon_code: couponCode.trim().toUpperCase() || null,
        coupon_discount: couponDiscount.trim() || null,
        teaser_video_url: teaserVideoUrl || null,
        notify_leads_enabled: notifyLeadsEnabled,
        featured_product_ids: selectedProductIds,
        status: "scheduled",
        is_active: false,
      };

      if (activeLive) {
        const { error } = await supabase.from("lives").update(payload).eq("id", activeLive.id);
        if (error) throw error;
        toast.success("Configurações da Live programada salvas com sucesso!");
      } else {
        const { data, error } = await supabase.from("lives").insert(payload).select().single();
        if (error) throw error;
        setActiveLive(data);
        toast.success("Live agendada! O convite e contador já podem ser exibidos na loja.");
      }

      await loadLives(storeId);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar a live.");
    } finally {
      setSaving(false);
    }
  };

  // Entrar Ao Vivo
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

      // Desativa outras anteriores
      await supabase
        .from("lives")
        .update({ is_active: false, status: "finished", ended_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .eq("is_active", true);

      const payload = {
        store_id: storeId,
        title: title.trim(),
        youtube_url: youtubeUrl.trim(),
        youtube_video_id: extractedVideoId,
        is_active: true,
        status: "live",
        featured_product_ids: selectedProductIds,
        pinned_product_id: pinnedProductId || selectedProductIds[0] || null,
        coupon_code: couponCode.trim().toUpperCase() || null,
        coupon_discount: couponDiscount.trim() || null,
        teaser_video_url: teaserVideoUrl || null,
        show_countdown: false,
        started_at: new Date().toISOString(),
      };

      if (activeLive) {
        const { data, error } = await supabase.from("lives").update(payload).eq("id", activeLive.id).select().single();
        if (error) throw error;
        setActiveLive(data);
      } else {
        const { data, error } = await supabase.from("lives").insert(payload).select().single();
        if (error) throw error;
        setActiveLive(data);
      }

      toast.success("🔴 Transmissão AO VIVO iniciada! Badge ativo na loja.");
      await loadLives(storeId);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar a live.");
    } finally {
      setSaving(false);
    }
  };

  // Destacar produto em tempo real (Pin)
  const handlePinProduct = async (prodId: string) => {
    if (!activeLive) return;
    try {
      const newPin = pinnedProductId === prodId ? null : prodId;
      setPinnedProductId(newPin);

      const { error } = await supabase
        .from("lives")
        .update({ pinned_product_id: newPin })
        .eq("id", activeLive.id);

      if (error) throw error;
      toast.success(newPin ? "📌 Produto destacado no vídeo!" : "Destaque removido.");
    } catch (err: any) {
      toast.error("Erro ao destacar produto.");
    }
  };

  // Encerrar Live
  const handleEndLive = async () => {
    if (!activeLive || !storeId) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("lives")
        .update({
          is_active: false,
          status: "finished",
          ended_at: new Date().toISOString(),
        })
        .eq("id", activeLive.id);

      if (error) throw error;

      setActiveLive(null);
      toast.info("A Live foi encerrada e desativada da sua loja.");
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

  const isLiveNow = activeLive?.is_active && activeLive?.status === "live";

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isLiveNow ? "bg-rose-500 text-white animate-pulse" : "bg-rose-500/10 text-rose-500"}`}>
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Live Shopping</h1>
              <p className="text-muted-foreground text-sm">
                Transmissões ao vivo, convites em vídeo, contagem regressiva e vendas com 1 clique.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLiveNow ? (
            <Badge className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 flex items-center gap-2 animate-pulse shadow-lg shadow-rose-500/20">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              🔴 TRANSMISSÃO AO VIVO NO AR
            </Badge>
          ) : activeLive?.status === "scheduled" ? (
            <Badge variant="outline" className="border-amber-500 text-amber-500 px-3 py-1.5 flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5" />
              LIVE PROGRAMADA
            </Badge>
          ) : null}
        </div>
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

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Transmissão, Teaser e Programação */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Transmissão YouTube */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Configurar Transmissão do YouTube
              </CardTitle>
              <CardDescription>
                Cole o link da transmissão ao vivo ou gravação do YouTube.
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
                  disabled={!allowsLive}
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
                  disabled={!allowsLive}
                  className="mt-1.5"
                />
              </div>

              {/* Preview Player YouTube */}
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
                <div className="mt-4 rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground bg-muted/20">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Insira um link do YouTube para ver a pré-visualização</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Vídeo Teaser / Convite Vertical e Programação */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-indigo-500" />
                Vídeo de Convite (Teaser Vertical) & Agendamento
              </CardTitle>
              <CardDescription>
                Exiba um Story vertical convidando seus clientes com contagem regressiva antes da live começar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Upload do Teaser */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <Label>Vídeo Vertical de Convite (Story)</Label>
                  <div className="border border-dashed border-border/80 rounded-xl p-4 text-center bg-muted/10 space-y-3">
                    <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Envie um vídeo gravado na vertical (9:16)</p>
                      <p className="text-[11px] text-muted-foreground/60">MP4 ou WebM até 50MB</p>
                    </div>
                    <label className="inline-block">
                      <Button variant="outline" size="sm" disabled={uploadingTeaser || !allowsLive} asChild>
                        <span>{uploadingTeaser ? "Enviando..." : "Selecionar Vídeo"}</span>
                      </Button>
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={handleUploadTeaser}
                        className="hidden"
                        disabled={uploadingTeaser || !allowsLive}
                      />
                    </label>
                  </div>
                </div>

                {/* Preview do Story com Contador */}
                <div>
                  <Label>Pré-visualização na Loja</Label>
                  <div className="mt-2 w-44 mx-auto aspect-[9/16] rounded-2xl bg-zinc-950 border-2 border-border overflow-hidden relative shadow-lg flex items-center justify-center">
                    {teaserVideoUrl ? (
                      <video
                        src={teaserVideoUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="text-center p-3 text-zinc-500 text-xs">
                        <Video className="h-6 w-6 mx-auto mb-1 opacity-40" />
                        Sem vídeo de convite
                      </div>
                    )}

                    {/* Sticker Contador no Preview */}
                    {showCountdown && scheduledAt && (
                      <div className="absolute bottom-4 inset-x-2 bg-black/80 backdrop-blur-md rounded-lg p-2 text-center text-white border border-white/20">
                        <p className="text-[10px] uppercase font-semibold text-rose-400">Ao Vivo Em Breve</p>
                        <p className="text-xs font-mono font-bold mt-0.5">
                          {timeLeft ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m` : "Hoje!"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data e Hora + Contador */}
              <div className="border-t border-border/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="live-schedule" className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" />
                    Data e Hora Programada
                  </Label>
                  <Input
                    id="live-schedule"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    disabled={!allowsLive}
                    className="mt-1.5"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-xs">Exibir Contador Regressivo</Label>
                      <p className="text-[11px] text-muted-foreground">Mostra dias/horas restantes na loja</p>
                    </div>
                    <Switch
                      checked={showCountdown}
                      onCheckedChange={setShowCountdown}
                      disabled={!allowsLive}
                    />
                  </div>
                </div>
              </div>

              {/* Visualização do Timer Ativo */}
              {timeLeft && (
                <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-around text-center">
                  <div>
                    <span className="text-xl font-bold font-mono text-primary">{timeLeft.days}</span>
                    <span className="block text-[10px] text-muted-foreground">DIAS</span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <div>
                    <span className="text-xl font-bold font-mono text-primary">{timeLeft.hours}</span>
                    <span className="block text-[10px] text-muted-foreground">HORAS</span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <div>
                    <span className="text-xl font-bold font-mono text-primary">{timeLeft.minutes}</span>
                    <span className="block text-[10px] text-muted-foreground">MIN</span>
                  </div>
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <div>
                    <span className="text-xl font-bold font-mono text-primary">{timeLeft.seconds}</span>
                    <span className="block text-[10px] text-muted-foreground">SEG</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Cupom Relâmpago e Captura de Leads */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-500" />
                Cupom Exclusivo & Captura de Leads
              </CardTitle>
              <CardDescription>
                Incentive compras imediatas com cupons e colete contatos interessados em assistir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coupon-code">Código do Cupom</Label>
                  <Input
                    id="coupon-code"
                    placeholder="Ex: LIVEX15"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!allowsLive}
                    className="mt-1.5 font-mono uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-discount">Texto do Desconto</Label>
                  <Input
                    id="coupon-discount"
                    placeholder="Ex: 15% OFF na Live"
                    value={couponDiscount}
                    onChange={(e) => setCouponDiscount(e.target.value)}
                    disabled={!allowsLive}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <Label className="text-sm">Permitir Cadastro de Visitantes (Avisar da Live)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exibe um botão no teaser para o cliente deixar WhatsApp/E-mail e ser lembrado.
                  </p>
                </div>
                <Switch
                  checked={notifyLeadsEnabled}
                  onCheckedChange={setNotifyLeadsEnabled}
                  disabled={!allowsLive}
                />
              </div>

              {/* Contador de Inscritos */}
              {subscribers.length > 0 && (
                <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    👥 <strong>{subscribers.length}</strong> pessoas inscritas para serem avisadas.
                  </span>
                  <Badge variant="secondary" className="font-mono">{subscribers.length} LEADS</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões de Ação Principais */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSaveScheduled}
              disabled={saving || !allowsLive}
            >
              Salvar Programação
            </Button>

            {isLiveNow ? (
              <Button
                variant="destructive"
                onClick={handleEndLive}
                disabled={saving}
                className="gap-2 shadow-lg shadow-destructive/20"
              >
                <Square className="h-4 w-4" />
                Encerrar Transmissão
              </Button>
            ) : (
              <Button
                onClick={handleStartLive}
                disabled={saving || !extractedVideoId || !allowsLive}
                className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
              >
                <Radio className="h-4 w-4" />
                {saving ? "Iniciando..." : "Entrar Ao Vivo Agora"}
              </Button>
            )}
          </div>
        </div>

        {/* Coluna Direita: Produtos e Controle de Destaque (PIN) */}
        <div className="space-y-6">
          <Card className="border-border/60 sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Produtos da Live
                </CardTitle>
                <Badge variant="secondary">{selectedProductIds.length} selecionados</Badge>
              </div>
              <CardDescription>
                {isLiveNow
                  ? "Clique no alfinete (📌) para destacar o produto na tela dos clientes agora."
                  : "Marque os produtos que serão ofertados durante a live."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
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
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {products.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    const isPinned = pinnedProductId === product.id;

                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isPinned
                            ? "border-rose-500 bg-rose-500/10 shadow-sm"
                            : isSelected
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/60 hover:border-border"
                        }`}
                      >
                        {/* Imagem do Produto */}
                        <div className="h-12 w-12 rounded-lg bg-muted/60 overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Nome e Preço */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs font-bold text-primary mt-0.5">
                            R$ {Number(product.price || 0).toFixed(2).replace(".", ",")}
                          </p>
                          {isPinned && (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5 animate-pulse">
                              📌 DESTACADO NA LIVE
                            </span>
                          )}
                        </div>

                        {/* Ações: Selecionar (checkbox) e Destacar (PIN) */}
                        <div className="flex items-center gap-1.5">
                          {isLiveNow && isSelected && (
                            <Button
                              size="icon"
                              variant={isPinned ? "default" : "outline"}
                              className={`h-8 w-8 rounded-lg ${isPinned ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
                              onClick={() => handlePinProduct(product.id)}
                              title={isPinned ? "Remover destaque" : "Destacar produto no vídeo"}
                            >
                              <Pin className={`h-4 w-4 ${isPinned ? "rotate-45" : ""}`} />
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => allowsLive && toggleProduct(product.id)}
                            className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-muted-foreground"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </button>
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
