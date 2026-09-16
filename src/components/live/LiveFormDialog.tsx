import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Radio, Play, Square, Check, ShoppingBag,
  Sparkles, RefreshCw, Pin, Clock, Tag,
  Users, Video, UploadCloud, Calendar, Megaphone, Eye, MousePointerClick, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { fetchYouTubeOEmbed, extractYouTubeVideoId } from "@/services/youtube";

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
  youtube_thumbnail_url?: string | null;
  is_active: boolean;
  status: "scheduled" | "live" | "finished";
  featured_product_ids: string[];
  pinned_product_id?: string | null;
  scheduled_at?: string | null;
  show_countdown?: boolean;
  coupon_enabled?: boolean;
  coupon_code?: string | null;
  coupon_discount?: string | null;
  teaser_video_url?: string | null;
  notify_leads_enabled?: boolean;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  promo_target_type?: string | null;
  promo_target_value?: string | null;
  promo_cta_text?: string | null;
  promo_media_url?: string | null;
  promo_media_type?: string | null;
  whatsapp_group_url?: string | null;
  product_cta_texts?: Record<string, string>;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

interface LiveMetrics {
  views: number;
  peakViewers: number;
  productClicks: number;
  sales: number;
}

interface Subscriber {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

interface LiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  liveId: string | null; // null = criando nova live
  allowsLive: boolean;
  products: Product[];
  onSaved: () => void; // callback pra recarregar a lista
}

export function LiveFormDialog({
  open,
  onOpenChange,
  storeId,
  liveId,
  allowsLive,
  products,
  onSaved,
}: LiveFormDialogProps) {
  const [loadingLive, setLoadingLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingTeaser, setUploadingTeaser] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const [fetchingYoutube, setFetchingYoutube] = useState(false);

  const [currentLive, setCurrentLive] = useState<LiveSession | null>(null);

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [extractedVideoId, setExtractedVideoId] = useState("");
  const [youtubeThumbnailUrl, setYoutubeThumbnailUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [showCountdown, setShowCountdown] = useState(true);

  const [couponEnabled, setCouponEnabled] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("");

  const [teaserVideoUrl, setTeaserVideoUrl] = useState("");
  const [notifyLeadsEnabled, setNotifyLeadsEnabled] = useState(true);

  const [promoStartAt, setPromoStartAt] = useState("");
  const [promoEndAt, setPromoEndAt] = useState("");
  const [promoTargetType, setPromoTargetType] = useState("all");
  const [promoTargetValue, setPromoTargetValue] = useState("");
  const [promoCtaText, setPromoCtaText] = useState("Assista Agora");
  const [promoMediaUrl, setPromoMediaUrl] = useState("");
  const [promoMediaType, setPromoMediaType] = useState<"image" | "video" | "">("");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [pinnedProductId, setPinnedProductId] = useState<string | null>(null);
  const [productCtaTexts, setProductCtaTexts] = useState<Record<string, string>>({});

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics>({ views: 0, peakViewers: 0, productClicks: 0, sales: 0 });

  const isLiveNow = currentLive?.is_active && currentLive?.status === "live";

  const resetForm = () => {
    setCurrentLive(null);
    setTitle("");
    setYoutubeUrl("");
    setExtractedVideoId("");
    setYoutubeThumbnailUrl("");
    setScheduledAt("");
    setShowCountdown(true);
    setCouponEnabled(false);
    setCouponCode("");
    setCouponDiscount("");
    setTeaserVideoUrl("");
    setNotifyLeadsEnabled(true);
    setPromoStartAt("");
    setPromoEndAt("");
    setPromoTargetType("all");
    setPromoTargetValue("");
    setPromoCtaText("Assista Agora");
    setPromoMediaUrl("");
    setPromoMediaType("");
    setWhatsappGroupUrl("");
    setSelectedProductIds([]);
    setPinnedProductId(null);
    setProductCtaTexts({});
    setSubscribers([]);
    setMetrics({ views: 0, peakViewers: 0, productClicks: 0, sales: 0 });
  };

  // Carrega a live ao abrir (se estiver editando)
  useEffect(() => {
    if (!open) return;

    if (!liveId) {
      resetForm();
      return;
    }

    async function loadLive() {
      setLoadingLive(true);
      const { data, error } = await supabase.from("lives").select("*").eq("id", liveId).maybeSingle();
      if (error || !data) {
        toast.error("Erro ao carregar dados da live.");
        setLoadingLive(false);
        return;
      }

      const active = data as LiveSession;
      setCurrentLive(active);
      setTitle(active.title || "");
      setExtractedVideoId(active.youtube_video_id);
      setYoutubeUrl(active.youtube_url || `https://www.youtube.com/watch?v=${active.youtube_video_id}`);
      setYoutubeThumbnailUrl(active.youtube_thumbnail_url || "");
      setSelectedProductIds(active.featured_product_ids || []);
      setPinnedProductId(active.pinned_product_id || null);
      setCouponEnabled(active.coupon_enabled ?? false);
      setCouponCode(active.coupon_code || "");
      setCouponDiscount(active.coupon_discount || "");
      setTeaserVideoUrl(active.teaser_video_url || "");
      setShowCountdown(active.show_countdown ?? true);
      setNotifyLeadsEnabled(active.notify_leads_enabled ?? true);
      setPromoTargetType(active.promo_target_type || "all");
      setPromoTargetValue(active.promo_target_value || "");
      setPromoCtaText(active.promo_cta_text || "Assista Agora");
      setPromoMediaUrl(active.promo_media_url || "");
      setPromoMediaType((active.promo_media_type as any) || "");
      setWhatsappGroupUrl(active.whatsapp_group_url || "");
      setProductCtaTexts(active.product_cta_texts || {});

      const toLocalInput = (iso?: string | null) => {
        if (!iso) return "";
        const date = new Date(iso);
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
      };

      setScheduledAt(toLocalInput(active.scheduled_at));
      setPromoStartAt(toLocalInput(active.promo_start_at));
      setPromoEndAt(toLocalInput(active.promo_end_at));

      loadSubscribers(active.id);
      loadMetrics(active.id);
      setLoadingLive(false);
    }

    loadLive();
  }, [open, liveId]);

  async function loadSubscribers(id: string) {
    const { data } = await supabase
      .from("live_subscribers")
      .select("*")
      .eq("live_id", id)
      .order("created_at", { ascending: false });
    if (data) setSubscribers(data);
  }

  async function loadMetrics(id: string) {
    const { data } = await supabase.from("live_events").select("event_type, metadata").eq("live_id", id);
    if (!data) return;

    const views = data.filter((e) => e.event_type === "view").length;
    const productClicks = data.filter((e) => e.event_type === "product_click").length;
    const sales = data.filter((e) => e.event_type === "sale").length;
    const peakEvents = data.filter((e) => e.event_type === "peak_viewers");
    const peakViewers = peakEvents.reduce((max, e) => {
      const val = Number((e.metadata as any)?.count || 0);
      return val > max ? val : max;
    }, 0);

    setMetrics({ views, peakViewers, productClicks, sales });
  }

  // Busca dados do YouTube automaticamente
  useEffect(() => {
    const id = extractYouTubeVideoId(youtubeUrl);
    setExtractedVideoId(id || "");
    if (!id) {
      setYoutubeThumbnailUrl("");
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setFetchingYoutube(true);
        const data = await fetchYouTubeOEmbed(youtubeUrl);
        setYoutubeThumbnailUrl(data.thumbnailUrl);
        if (!title.trim()) setTitle(data.title);
      } catch {
        setYoutubeThumbnailUrl(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
      } finally {
        setFetchingYoutube(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [youtubeUrl]);

  // Contador regressivo
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
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const updateProductCtaText = (productId: string, text: string) => {
    setProductCtaTexts((prev) => ({ ...prev, [productId]: text }));
  };

  const handleUploadTeaser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !storeId) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo (MP4 ou WebM).");
      return;
    }
    try {
      setUploadingTeaser(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `store_${storeId}/live_teasers/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("videos").getPublicUrl(filePath);
      setTeaserVideoUrl(publicUrlData.publicUrl);
      toast.success("Vídeo de convite enviado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload do vídeo.");
    } finally {
      setUploadingTeaser(false);
    }
  };

  const handleUploadPromoMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !storeId) return;
    const file = e.target.files[0];
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Selecione uma imagem (JPG/PNG) ou vídeo (MP4/WebM).");
      return;
    }
    try {
      setUploadingPromo(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `store_${storeId}/live_promo/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("videos").getPublicUrl(filePath);
      setPromoMediaUrl(publicUrlData.publicUrl);
      setPromoMediaType(isVideo ? "video" : "image");
      toast.success("Mídia de divulgação enviada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload da mídia.");
    } finally {
      setUploadingPromo(false);
    }
  };

  const buildPayload = (extra: Record<string, any> = {}) => ({
    store_id: storeId,
    title: title.trim(),
    youtube_url: youtubeUrl.trim(),
    youtube_video_id: extractedVideoId || "",
    youtube_thumbnail_url: youtubeThumbnailUrl || null,
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    show_countdown: showCountdown,
    coupon_enabled: couponEnabled,
    coupon_code: couponEnabled ? couponCode.trim().toUpperCase() || null : null,
    coupon_discount: couponEnabled ? couponDiscount.trim() || null : null,
    teaser_video_url: teaserVideoUrl || null,
    notify_leads_enabled: notifyLeadsEnabled,
    featured_product_ids: selectedProductIds,
    product_cta_texts: productCtaTexts,
    promo_start_at: promoStartAt ? new Date(promoStartAt).toISOString() : null,
    promo_end_at: promoEndAt ? new Date(promoEndAt).toISOString() : null,
    promo_target_type: promoTargetType,
    promo_target_value: promoTargetValue.trim() || null,
    promo_cta_text: promoCtaText.trim() || "Assista Agora",
    promo_media_url: promoMediaUrl || null,
    promo_media_type: promoMediaType || null,
    whatsapp_group_url: whatsappGroupUrl.trim() || null,
    ...extra,
  });

  const handleSaveScheduled = async () => {
    if (!storeId) return;
    if (!title.trim()) {
      toast.error("Dê um título para a sua Live.");
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload({ status: currentLive?.status === "live" ? "live" : "scheduled" });

      if (currentLive) {
        const { error } = await supabase.from("lives").update(payload).eq("id", currentLive.id);
        if (error) throw error;
        toast.success("Configurações da Live salvas com sucesso!");
      } else {
        const { data, error } = await supabase.from("lives").insert(payload).select().single();
        if (error) throw error;
        setCurrentLive(data);
        toast.success("Live agendada com sucesso!");
      }

      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar a live.");
    } finally {
      setSaving(false);
    }
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

      // Encerra qualquer outra live que porventura esteja marcada como ativa
      await supabase
        .from("lives")
        .update({ is_active: false, status: "finished", ended_at: new Date().toISOString() })
        .eq("store_id", storeId)
        .eq("is_active", true);

      const payload = buildPayload({
        is_active: true,
        status: "live",
        pinned_product_id: pinnedProductId || selectedProductIds[0] || null,
        show_countdown: false,
        started_at: new Date().toISOString(),
      });

      if (currentLive) {
        const { data, error } = await supabase.from("lives").update(payload).eq("id", currentLive.id).select().single();
        if (error) throw error;
        setCurrentLive(data);
      } else {
        const { data, error } = await supabase.from("lives").insert(payload).select().single();
        if (error) throw error;
        setCurrentLive(data);
      }

      toast.success("🔴 Transmissão AO VIVO iniciada!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar a live.");
    } finally {
      setSaving(false);
    }
  };

  const handlePinProduct = async (prodId: string) => {
    if (!currentLive) return;
    try {
      const newPin = pinnedProductId === prodId ? null : prodId;
      setPinnedProductId(newPin);
      const { error } = await supabase.from("lives").update({ pinned_product_id: newPin }).eq("id", currentLive.id);
      if (error) throw error;
      toast.success(newPin ? "📌 Produto destacado no vídeo!" : "Destaque removido.");
    } catch {
      toast.error("Erro ao destacar produto.");
    }
  };

  const handleEndLive = async () => {
    if (!currentLive) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("lives")
        .update({ is_active: false, status: "finished", ended_at: new Date().toISOString() })
        .eq("id", currentLive.id);
      if (error) throw error;
      toast.info("A Live foi encerrada.");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao encerrar a live.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-500" />
            {liveId ? "Editar Live" : "Nova Live"}
          </DialogTitle>
          <DialogDescription>
            Configure transmissão, divulgação, cupom e produtos desta live.
          </DialogDescription>
        </DialogHeader>

        {loadingLive ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
            <div className="lg:col-span-2 space-y-6">

              {currentLive && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-border/60">
                    <CardContent className="p-3 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <div><p className="text-lg font-bold">{metrics.views}</p><p className="text-[11px] text-muted-foreground">Views</p></div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardContent className="p-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <div><p className="text-lg font-bold">{metrics.peakViewers}</p><p className="text-[11px] text-muted-foreground">Pico</p></div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardContent className="p-3 flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4 text-amber-500" />
                      <div><p className="text-lg font-bold">{metrics.productClicks}</p><p className="text-[11px] text-muted-foreground">Cliques</p></div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardContent className="p-3 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-rose-500" />
                      <div><p className="text-lg font-bold">{metrics.sales}</p><p className="text-[11px] text-muted-foreground">Vendas</p></div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Configurar Transmissão do YouTube
                  </CardTitle>
                  <CardDescription>Cole o link da transmissão. Título e thumbnail são buscados automaticamente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="live-title">Título da Live</Label>
                    <Input id="live-title" placeholder="Ex: Super Live de Lançamento" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="youtube-url">Link da Live no YouTube</Label>
                    <Input id="youtube-url" placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                    {fetchingYoutube && <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" />Buscando dados do vídeo...</p>}
                  </div>
                  {extractedVideoId ? (
                    <div className="mt-4 rounded-xl overflow-hidden border border-border aspect-video bg-black relative">
                      <iframe src={`https://www.youtube-nocookie.com/embed/${extractedVideoId}?autoplay=0&rel=0`} title="Live Preview" className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground bg-muted/20">
                      <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Insira um link do YouTube para ver a pré-visualização</p>
                    </div>
                  )}
                  {youtubeThumbnailUrl && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <img src={youtubeThumbnailUrl} alt="Thumbnail" className="h-14 w-24 object-cover rounded-md" />
                      <div>
                        <p className="text-xs font-medium">Thumbnail capturada automaticamente</p>
                        <p className="text-[11px] text-muted-foreground">Usada nos cards de divulgação.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="h-5 w-5 text-indigo-500" />
                    Convite (Teaser) & Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-3">
                      <Label>Vídeo Vertical de Convite (Story)</Label>
                      <div className="border border-dashed border-border/80 rounded-xl p-4 text-center bg-muted/10 space-y-3">
                        <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">MP4 ou WebM até 50MB (9:16)</p>
                        <label className="inline-block">
                          <Button variant="outline" size="sm" disabled={uploadingTeaser || !allowsLive} asChild>
                            <span>{uploadingTeaser ? "Enviando..." : "Selecionar Vídeo"}</span>
                          </Button>
                          <input type="file" accept="video/mp4,video/webm" onChange={handleUploadTeaser} className="hidden" disabled={uploadingTeaser || !allowsLive} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <Label>Pré-visualização</Label>
                      <div className="mt-2 w-40 mx-auto aspect-[9/16] rounded-2xl bg-zinc-950 border-2 border-border overflow-hidden relative shadow-lg flex items-center justify-center">
                        {teaserVideoUrl ? (
                          <video src={teaserVideoUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        ) : (
                          <div className="text-center p-3 text-zinc-500 text-xs">
                            <Video className="h-6 w-6 mx-auto mb-1 opacity-40" />Sem vídeo
                          </div>
                        )}
                        {showCountdown && scheduledAt && (
                          <div className="absolute bottom-4 inset-x-2 bg-black/80 backdrop-blur-md rounded-lg p-2 text-center text-white border border-white/20">
                            <p className="text-[10px] uppercase font-semibold text-rose-400">Ao Vivo Em Breve</p>
                            <p className="text-xs font-mono font-bold mt-0.5">{timeLeft ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m` : "Hoje!"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="live-schedule" className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" />Data e Hora Programada</Label>
                      <Input id="live-schedule" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                        <div className="space-y-0.5">
                          <Label className="text-xs">Exibir Contador Regressivo</Label>
                          <p className="text-[11px] text-muted-foreground">Mostra dias/horas restantes na loja</p>
                        </div>
                        <Switch checked={showCountdown} onCheckedChange={setShowCountdown} disabled={!allowsLive} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5 text-emerald-500" />Cupom Exclusivo da Live</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Ativar Cupom</Label>
                      <p className="text-xs text-muted-foreground">Exibe o cupom durante a live.</p>
                    </div>
                    <Switch checked={couponEnabled} onCheckedChange={setCouponEnabled} disabled={!allowsLive} />
                  </div>
                  {couponEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="coupon-code">Código do Cupom</Label>
                        <Input id="coupon-code" placeholder="Ex: LIVEX15" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} disabled={!allowsLive} className="mt-1.5 font-mono uppercase" />
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          ⚠️ Este cupom precisa ser cadastrado também na configuração de cupons da sua loja para funcionar no checkout.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="coupon-discount">Texto do Desconto (apenas exibição)</Label>
                        <Input id="coupon-discount" placeholder="Ex: 15% OFF na Live" value={couponDiscount} onChange={(e) => setCouponDiscount(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><Label className="text-sm">Permitir Cadastro de Visitantes</Label></div>
                      <p className="text-xs text-muted-foreground">Botão no teaser para deixar WhatsApp/E-mail.</p>
                    </div>
                    <Switch checked={notifyLeadsEnabled} onCheckedChange={setNotifyLeadsEnabled} disabled={!allowsLive} />
                  </div>
                  {subscribers.length > 0 && (
                    <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">👥 <strong>{subscribers.length}</strong> pessoas inscritas.</span>
                      <Badge variant="secondary" className="font-mono">{subscribers.length} LEADS</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="h-5 w-5 text-violet-500" />Divulgação da Live na Loja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="promo-start">Início da Divulgação</Label>
                      <Input id="promo-start" type="datetime-local" value={promoStartAt} onChange={(e) => setPromoStartAt(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="promo-end">Fim da Divulgação</Label>
                      <Input id="promo-end" type="datetime-local" value={promoEndAt} onChange={(e) => setPromoEndAt(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="promo-target">Onde Exibir</Label>
                    <select id="promo-target" value={promoTargetType} onChange={(e) => setPromoTargetType(e.target.value)} disabled={!allowsLive} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="all">Todas as páginas da loja</option>
                      <option value="home">Somente página inicial</option>
                      <option value="url_contains">URL contém o texto abaixo</option>
                      <option value="url_not_contains">URL NÃO contém o texto abaixo</option>
                    </select>
                  </div>
                  {(promoTargetType === "url_contains" || promoTargetType === "url_not_contains") && (
                    <div>
                      <Label htmlFor="promo-target-value">Trecho da URL</Label>
                      <Input id="promo-target-value" placeholder="Ex: /produto/" value={promoTargetValue} onChange={(e) => setPromoTargetValue(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="promo-cta">Texto do Botão (CTA)</Label>
                    <Input id="promo-cta" placeholder="Ex: Assista Agora" value={promoCtaText} onChange={(e) => setPromoCtaText(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp-group">Link do Grupo de WhatsApp (opcional)</Label>
                    <Input id="whatsapp-group" placeholder="https://chat.whatsapp.com/..." value={whatsappGroupUrl} onChange={(e) => setWhatsappGroupUrl(e.target.value)} disabled={!allowsLive} className="mt-1.5" />
                  </div>
                  <div className="space-y-3">
                    <Label>Mídia de Divulgação (Banner/Vídeo)</Label>
                    <div className="border border-dashed border-border/80 rounded-xl p-4 text-center bg-muted/10 space-y-3">
                      <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                      <label className="inline-block">
                        <Button variant="outline" size="sm" disabled={uploadingPromo || !allowsLive} asChild>
                          <span>{uploadingPromo ? "Enviando..." : "Selecionar Arquivo"}</span>
                        </Button>
                        <input type="file" accept="image/*,video/mp4,video/webm" onChange={handleUploadPromoMedia} className="hidden" disabled={uploadingPromo || !allowsLive} />
                      </label>
                    </div>
                    {promoMediaUrl && (
                      <div className="rounded-lg overflow-hidden border border-border/60 max-w-xs">
                        {promoMediaType === "video" ? <video src={promoMediaUrl} className="w-full" controls muted /> : <img src={promoMediaUrl} alt="Mídia" className="w-full object-cover" />}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleSaveScheduled} disabled={saving || !allowsLive}>
                  Salvar
                </Button>
                {isLiveNow ? (
                  <Button variant="destructive" onClick={handleEndLive} disabled={saving} className="gap-2">
                    <Square className="h-4 w-4" />Encerrar Transmissão
                  </Button>
                ) : (
                  <Button onClick={handleStartLive} disabled={saving || !extractedVideoId || !allowsLive} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
                    <Radio className="h-4 w-4" />{saving ? "Iniciando..." : "Entrar Ao Vivo Agora"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Produtos da Live</CardTitle>
                    <Badge variant="secondary">{selectedProductIds.length} selecionados</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhum produto cadastrado.</div>
                  ) : (
                    <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                      {products.map((product) => {
                        const isSelected = selectedProductIds.includes(product.id);
                        const isPinned = pinnedProductId === product.id;
                        return (
                          <div key={product.id} className={`p-3 rounded-xl border transition-all ${isPinned ? "border-rose-500 bg-rose-500/10 shadow-sm" : isSelected ? "border-primary/50 bg-primary/5" : "border-border/60 hover:border-border"}`}>
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg bg-muted/60 overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40">
                                {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate text-foreground">{product.name}</p>
                                <p className="text-xs font-bold text-primary mt-0.5">R$ {Number(product.price || 0).toFixed(2).replace(".", ",")}</p>
                                {isPinned && <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">📌 DESTACADO</span>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isLiveNow && isSelected && (
                                  <Button size="icon" variant={isPinned ? "default" : "outline"} className={`h-8 w-8 rounded-lg ${isPinned ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`} onClick={() => handlePinProduct(product.id)}>
                                    <Pin className={`h-4 w-4 ${isPinned ? "rotate-45" : ""}`} />
                                  </Button>
                                )}
                                <button type="button" onClick={() => allowsLive && toggleProduct(product.id)} className={`h-6 w-6 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-muted-foreground"}`}>
                                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </button>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2.5 pt-2.5 border-t border-border/40">
                                <Label className="text-[11px] text-muted-foreground">Texto do Botão (CTA)</Label>
                                <Input placeholder="Ex: Comprar Agora" value={productCtaTexts[product.id] || ""} onChange={(e) => updateProductCtaText(product.id, e.target.value)} disabled={!allowsLive} className="mt-1 h-8 text-xs" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
