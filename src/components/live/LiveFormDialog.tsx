import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Radio, Play, Trash2, RefreshCw, UploadCloud,
  Calendar, Check, Search, Plus, ArrowRight, ArrowLeft,
  ShoppingBag, ExternalLink, Tag, Gift, Sparkles, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { fetchYouTubeOEmbed, extractYouTubeVideoId } from "@/services/youtube";

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  url?: string;
  sku?: string;
  stock?: number;
  category?: string;
}

export interface PromotionCoupon {
  id: string;
  code: string;
  description: string;
}

export interface PromotionAdvantage {
  id: string;
  title: string;
  description: string;
}

export interface LiveProductItem {
  product_id: string;
  coupon_code?: string;
  cta_text?: string;
}

interface LiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  liveId: string | null;
  allowsLive: boolean;
  products: Product[];
  onSaved: () => void;
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
  // Controle de Etapas: 1 | 2 | 3 | 4
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [loadingLive, setLoadingLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingYoutube, setFetchingYoutube] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // --- PASSO 1: YOUTUBE & TRANSMISSÃO ---
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [extractedVideoId, setExtractedVideoId] = useState("");
  const [title, setTitle] = useState("");
  const [youtubeThumbnailUrl, setYoutubeThumbnailUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // --- PASSO 2: AÇÕES PROMOCIONAIS ---
  const [coupons, setCoupons] = useState<PromotionCoupon[]>([
    { id: "c_1", code: "", description: "" }
  ]);
  const [advantages, setAdvantages] = useState<PromotionAdvantage[]>([
    { id: "a_1", title: "", description: "" }
  ]);

  // --- PASSO 3: PRODUTOS ---
  const [liveProducts, setLiveProducts] = useState<LiveProductItem[]>([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalCategory, setModalCategory] = useState("all");
  const [modalPageSize, setModalPageSize] = useState<number>(10);
  const [modalCurrentPage, setModalCurrentPage] = useState<number>(1);
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());

  // --- PASSO 4: DIVULGAÇÃO ---
  const [promoStartAt, setPromoStartAt] = useState("");
  const [promoEndAt, setPromoEndAt] = useState("");
  const [promoTargetType, setPromoTargetType] = useState("all");
  const [promoTargetValue, setPromoTargetValue] = useState("");
  const [promoCtaText, setPromoCtaText] = useState("Assista Agora");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [promoMediaUrl, setPromoMediaUrl] = useState("");
  const [promoMediaType, setPromoMediaType] = useState<"image" | "video" | "">("");

  // Reseta formulário
  const resetForm = () => {
    setCurrentStep(1);
    setYoutubeUrl("");
    setExtractedVideoId("");
    setTitle("");
    setYoutubeThumbnailUrl("");
    setScheduledAt("");
    setCoupons([{ id: "c_1", code: "", description: "" }]);
    setAdvantages([{ id: "a_1", title: "", description: "" }]);
    setLiveProducts([]);
    setPromoStartAt("");
    setPromoEndAt("");
    setPromoTargetType("all");
    setPromoTargetValue("");
    setPromoCtaText("Assista Agora");
    setWhatsappGroupUrl("");
    setPromoMediaUrl("");
    setPromoMediaType("");
  };

  // Carrega live se estiver editando
  useEffect(() => {
    if (!open) return;
    if (!liveId) {
      resetForm();
      return;
    }

    async function loadLive() {
      try {
        setLoadingLive(true);
        const { data, error } = await supabase
          .from("lives")
          .select("*")
          .eq("id", liveId)
          .maybeSingle();

        if (error || !data) {
          toast.error("Erro ao carregar dados da live.");
          return;
        }

        setTitle(data.title || "");
        setExtractedVideoId(data.youtube_video_id || "");
        setYoutubeUrl(data.youtube_url || (data.youtube_video_id ? `https://www.youtube.com/watch?v=${data.youtube_video_id}` : ""));
        setYoutubeThumbnailUrl(data.youtube_thumbnail_url || "");

        const toLocalInput = (iso?: string | null) => {
          if (!iso) return "";
          const date = new Date(iso);
          const tzOffset = date.getTimezoneOffset() * 60000;
          return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
        };

        setScheduledAt(toLocalInput(data.scheduled_at));
        setPromoStartAt(toLocalInput(data.promo_start_at));
        setPromoEndAt(toLocalInput(data.promo_end_at));
        setPromoTargetType(data.promo_target_type || "all");
        setPromoTargetValue(data.promo_target_value || "");
        setPromoCtaText(data.promo_cta_text || "Assista Agora");
        setWhatsappGroupUrl(data.whatsapp_group_url || "");
        setPromoMediaUrl(data.promo_media_url || "");
        setPromoMediaType((data.promo_media_type as any) || "");

        // Carrega Cupons
        if (data.coupons && Array.isArray(data.coupons) && data.coupons.length > 0) {
          setCoupons([...data.coupons, { id: "c_" + Date.now(), code: "", description: "" }]);
        } else if (data.coupon_code) {
          setCoupons([
            { id: "c_1", code: data.coupon_code, description: data.coupon_discount || "" },
            { id: "c_2", code: "", description: "" }
          ]);
        } else {
          setCoupons([{ id: "c_1", code: "", description: "" }]);
        }

        // Carrega Vantagens
        if (data.advantages && Array.isArray(data.advantages) && data.advantages.length > 0) {
          setAdvantages([...data.advantages, { id: "a_" + Date.now(), title: "", description: "" }]);
        } else {
          setAdvantages([{ id: "a_1", title: "", description: "" }]);
        }

        // Carrega Produtos
        if (Array.isArray(data.featured_product_ids)) {
          const ctaTexts = data.product_cta_texts || {};
          const mapped: LiveProductItem[] = data.featured_product_ids.map((pid: string) => ({
            product_id: pid,
            cta_text: ctaTexts[pid] || "",
            coupon_code: ""
          }));
          setLiveProducts(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLive(false);
      }
    }

    loadLive();
  }, [open, liveId]);

  // Busca dados do YouTube automaticamente
  useEffect(() => {
    const id = extractYouTubeVideoId(youtubeUrl);
    setExtractedVideoId(id || "");
    if (!id) return;

    const timeout = setTimeout(async () => {
      try {
        setFetchingYoutube(true);
        const data = await fetchYouTubeOEmbed(youtubeUrl);
        if (data.thumbnailUrl && !youtubeThumbnailUrl) {
          setYoutubeThumbnailUrl(data.thumbnailUrl);
        }
        if (!title.trim() && data.title) {
          setTitle(data.title);
        }
      } catch {
        if (!youtubeThumbnailUrl) {
          setYoutubeThumbnailUrl(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
        }
      } finally {
        setFetchingYoutube(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [youtubeUrl]);

  // --- HANDLERS PASSO 2: AUTO-CRIAÇÃO DE LINHAS DE CUPONS & VANTAGENS ---
  const handleCouponChange = (index: number, field: "code" | "description", val: string) => {
    const updated = [...coupons];
    updated[index] = { ...updated[index], [field]: field === "code" ? val.toUpperCase() : val };

    // Se editou a última linha e ela tem algum valor, cria a próxima automaticamente
    const isLast = index === updated.length - 1;
    if (isLast && (updated[index].code.trim() || updated[index].description.trim())) {
      updated.push({ id: "c_" + Date.now(), code: "", description: "" });
    }
    setCoupons(updated);
  };

  const handleRemoveCoupon = (index: number) => {
    if (coupons.length === 1) {
      setCoupons([{ id: "c_" + Date.now(), code: "", description: "" }]);
      return;
    }
    const updated = coupons.filter((_, i) => i !== index);
    setCoupons(updated);
  };

  const handleAdvantageChange = (index: number, field: "title" | "description", val: string) => {
    const updated = [...advantages];
    updated[index] = { ...updated[index], [field]: val };

    const isLast = index === updated.length - 1;
    if (isLast && (updated[index].title.trim() || updated[index].description.trim())) {
      updated.push({ id: "a_" + Date.now(), title: "", description: "" });
    }
    setAdvantages(updated);
  };

  const handleRemoveAdvantage = (index: number) => {
    if (advantages.length === 1) {
      setAdvantages([{ id: "a_" + Date.now(), title: "", description: "" }]);
      return;
    }
    const updated = advantages.filter((_, i) => i !== index);
    setAdvantages(updated);
  };

  // --- HANDLERS PASSO 3: PRODUTOS & MODAL COM PAGINAÇÃO ---
  const openProductSelectionModal = () => {
    const initialSet = new Set(liveProducts.map(p => p.product_id));
    setModalSelectedIds(initialSet);
    setModalSearch("");
    setModalCategory("all");
    setModalCurrentPage(1);
    setProductModalOpen(true);
  };

  const handleToggleModalProduct = (productId: string) => {
    setModalSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleConfirmProductsFromModal = () => {
    const currentMap = new Map(liveProducts.map(p => [p.product_id, p]));
    const newItems: LiveProductItem[] = Array.from(modalSelectedIds).map(pid => {
      if (currentMap.has(pid)) return currentMap.get(pid)!;
      return { product_id: pid, coupon_code: "", cta_text: "Comprar Agora" };
    });
    setLiveProducts(newItems);
    setProductModalOpen(false);
  };

  const handleRemoveLiveProduct = (productId: string) => {
    setLiveProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const handleProductCouponChange = (productId: string, couponCode: string) => {
    setLiveProducts(prev => prev.map(p => p.product_id === productId ? { ...p, coupon_code: couponCode } : p));
  };

  // Filtros e paginação do modal
  const filteredModalProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(modalSearch.toLowerCase()));
      const matchCat = modalCategory === "all" || (p.category && p.category === modalCategory);
      return matchSearch && matchCat;
    });
  }, [products, modalSearch, modalCategory]);

  const totalModalPages = Math.ceil(filteredModalProducts.length / modalPageSize) || 1;
  const paginatedModalProducts = useMemo(() => {
    const start = (modalCurrentPage - 1) * modalPageSize;
    return filteredModalProducts.slice(start, start + modalPageSize);
  }, [filteredModalProducts, modalCurrentPage, modalPageSize]);

  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats);
  }, [products]);

  // Lista de cupons válidos para o dropdown do produto
  const validCouponCodes = useMemo(() => {
    return coupons.map(c => c.code.trim()).filter(Boolean);
  }, [coupons]);

  // --- UPLOADS ---
  const handleUploadThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !storeId) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (JPG ou PNG).");
      return;
    }
    try {
      setUploadingThumb(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `store_${storeId}/live_thumbs/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("videos").upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("videos").getPublicUrl(filePath);
      setYoutubeThumbnailUrl(data.publicUrl);
      toast.success("Thumbnail atualizada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem.");
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleUploadPromoMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !storeId) return;
    const file = e.target.files[0];
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Selecione uma imagem ou vídeo.");
      return;
    }
    try {
      setUploadingPromo(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `store_${storeId}/live_promo/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("videos").upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("videos").getPublicUrl(filePath);
      setPromoMediaUrl(data.publicUrl);
      setPromoMediaType(isVideo ? "video" : "image");
      toast.success("Mídia de divulgação enviada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mídia.");
    } finally {
      setUploadingPromo(false);
    }
  };

  // --- SALVAR FINAL ---
  const handleFinalSave = async () => {
    if (!title.trim()) {
      toast.error("Informe o título da live no Passo 1.");
      setCurrentStep(1);
      return;
    }

    try {
      setSaving(true);

      const cleanedCoupons = coupons.filter(c => c.code.trim().length > 0);
      const cleanedAdvantages = advantages.filter(a => a.title.trim().length > 0);
      const productIds = liveProducts.map(p => p.product_id);
      const productCtaMap: Record<string, string> = {};
      liveProducts.forEach(p => {
        if (p.cta_text) productCtaMap[p.product_id] = p.cta_text;
      });

      const payload: Record<string, any> = {
        store_id: storeId,
        title: title.trim(),
        youtube_url: youtubeUrl.trim(),
        youtube_video_id: extractedVideoId || "",
        youtube_thumbnail_url: youtubeThumbnailUrl || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        featured_product_ids: productIds,
        product_cta_texts: productCtaMap,
        coupons: cleanedCoupons,
        advantages: cleanedAdvantages,
        coupon_enabled: cleanedCoupons.length > 0,
        coupon_code: cleanedCoupons[0]?.code || null,
        coupon_discount: cleanedCoupons[0]?.description || null,
        promo_start_at: promoStartAt ? new Date(promoStartAt).toISOString() : null,
        promo_end_at: promoEndAt ? new Date(promoEndAt).toISOString() : null,
        promo_target_type: promoTargetType,
        promo_target_value: promoTargetValue.trim() || null,
        promo_cta_text: promoCtaText.trim() || "Assista Agora",
        promo_media_url: promoMediaUrl || null,
        promo_media_type: promoMediaType || null,
        whatsapp_group_url: whatsappGroupUrl.trim() || null,
      };

      if (liveId) {
        const { error } = await supabase.from("lives").update(payload).eq("id", liveId);
        if (error) throw error;
        toast.success("Live atualizada com sucesso!");
      } else {
        payload.status = "scheduled";
        payload.is_active = false;
        const { error } = await supabase.from("lives").insert(payload);
        if (error) throw error;
        toast.success("Live criada com sucesso!");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar a live.");
    } finally {
      setSaving(false);
    }
  };

  // Navegações com validação
  const handleNextFromStep1 = () => {
    if (!title.trim()) {
      toast.error("Por favor, preencha o título da live.");
      return;
    }
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    setCurrentStep(3);
  };

  const handleNextFromStep3 = () => {
    setCurrentStep(4);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl rounded-2xl border-0">
          
          {/* CABEÇALHO */}
          <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <Radio className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {liveId ? "Editar Live" : "Nova Live"}
              </DialogTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-sm">
              ✕
            </button>
          </div>

          {/* STEPPER VISUAL (EXATO AO PRINT) */}
          <div className="py-5 px-8 bg-slate-50/70 border-b border-slate-100 flex items-center justify-center">
            <div className="flex items-center w-full max-w-md justify-between">
              
              {/* PASSO 01 */}
              <button 
                onClick={() => setCurrentStep(1)}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm ${
                  currentStep === 1 
                    ? "bg-[#e11d48] text-white ring-4 ring-rose-100 scale-105" 
                    : "bg-[#cbd5e1] text-slate-800 hover:bg-slate-300"
                }`}
              >
                01
              </button>

              <div className="flex-1 mx-3 border-t-2 border-dashed border-slate-300" />

              {/* PASSO 02 */}
              <button 
                onClick={() => handleNextFromStep1()}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm ${
                  currentStep === 2 
                    ? "bg-[#e11d48] text-white ring-4 ring-rose-100 scale-105" 
                    : "bg-[#cbd5e1] text-slate-800 hover:bg-slate-300"
                }`}
              >
                02
              </button>

              <div className="flex-1 mx-3 border-t-2 border-dashed border-slate-300" />

              {/* PASSO 03 */}
              <button 
                onClick={() => { if (title.trim()) setCurrentStep(3); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm ${
                  currentStep === 3 
                    ? "bg-[#e11d48] text-white ring-4 ring-rose-100 scale-105" 
                    : "bg-[#cbd5e1] text-slate-800 hover:bg-slate-300"
                }`}
              >
                03
              </button>

              <div className="flex-1 mx-3 border-t-2 border-dashed border-slate-300" />

              {/* PASSO 04 */}
              <button 
                onClick={() => { if (title.trim()) setCurrentStep(4); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm ${
                  currentStep === 4 
                    ? "bg-[#e11d48] text-white ring-4 ring-rose-100 scale-105" 
                    : "bg-[#cbd5e1] text-slate-800 hover:bg-slate-300"
                }`}
              >
                04
              </button>
            </div>
          </div>

          {/* CORPO DO FORMULÁRIO (CONFORME A ETAPA ATIVA) */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {loadingLive ? (
              <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-7 w-7 animate-spin text-rose-600" />
              </div>
            ) : (
              <>
                {/* ========================================================
                    1. CONFIGURAR TRANSMISSÃO DO YOUTUBE
                   ======================================================== */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="border-b pb-3">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-rose-600" /> 1. Configurar Transmissão do YouTube
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cole o link da live para carregar automaticamente o título e a capa oficial.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="yt-url" className="text-xs font-semibold text-slate-700">Link da Live no YouTube</Label>
                        <Input
                          id="yt-url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="h-10 text-sm"
                        />
                        {fetchingYoutube && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                            <RefreshCw className="h-3 w-3 animate-spin text-rose-600" /> Buscando informações do YouTube...
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="live-title" className="text-xs font-semibold text-slate-700">Título da Live</Label>
                        <Input
                          id="live-title"
                          placeholder="Ex: Super Live Black Friday com Cupons Exclusivos"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="h-10 text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="live-date" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Programação (Data e Hora)
                        </Label>
                        <Input
                          id="live-date"
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="h-10 text-sm max-w-xs"
                        />
                      </div>

                      {/* THUMBNAIL COM OPÇÃO DE ALTERAR */}
                      <div className="pt-2">
                        <Label className="text-xs font-semibold text-slate-700 mb-2 block">Thumbnail / Capa da Live</Label>
                        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-xl bg-slate-50/50">
                          <div className="w-48 aspect-video bg-slate-200 rounded-lg overflow-hidden border flex items-center justify-center relative shadow-sm shrink-0">
                            {youtubeThumbnailUrl ? (
                              <img src={youtubeThumbnailUrl} alt="Thumb" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                            )}
                          </div>

                          <div className="space-y-2 flex-1">
                            <p className="text-xs text-slate-600">
                              {youtubeThumbnailUrl ? "Capa carregada. Você pode mantê-la ou enviar uma personalizada." : "Nenhuma thumbnail carregada ainda."}
                            </p>
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer">
                                <Button variant="outline" size="sm" type="button" disabled={uploadingThumb} asChild className="h-8 text-xs font-semibold">
                                  <span>{uploadingThumb ? "Enviando..." : "Substituir Capa"}</span>
                                </Button>
                                <input type="file" accept="image/*" onChange={handleUploadThumb} className="hidden" />
                              </label>
                              {youtubeThumbnailUrl && (
                                <Button variant="ghost" size="sm" type="button" onClick={() => setYoutubeThumbnailUrl("")} className="h-8 text-xs text-rose-600 hover:bg-rose-50">
                                  Remover
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {extractedVideoId && (
                        <div className="pt-2">
                          <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Pré-visualização do Vídeo</Label>
                          <div className="rounded-xl overflow-hidden border aspect-video bg-black max-w-lg">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${extractedVideoId}?autoplay=0&rel=0`}
                              title="Live Preview"
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================
                    2. AÇÕES PROMOCIONAIS (CUPONS & VANTAGENS COM AUTO-LINHA)
                   ======================================================== */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="border-b pb-3">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-rose-600" /> 2. Ações Promocionais
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cadastre cupons de desconto e vantagens exclusivas da transmissão. Ao digitar na linha, outra será criada automaticamente.
                      </p>
                    </div>

                    {/* BLOCO CUPONS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-rose-500" /> Cupons de Desconto
                        </Label>
                        <span className="text-[11px] text-slate-400">Preencha o código para adicionar mais</span>
                      </div>

                      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                            <tr>
                              <th className="py-2 px-3 w-[200px]">Código do Cupom</th>
                              <th className="py-2 px-3">Descrição / Regra (ex: 15% OFF acima de R$150)</th>
                              <th className="py-2 px-3 w-[60px] text-center">Excluir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {coupons.map((coupon, idx) => (
                              <tr key={coupon.id} className="hover:bg-slate-50/50">
                                <td className="p-2">
                                  <Input
                                    placeholder="Ex: LIVE15"
                                    value={coupon.code}
                                    onChange={(e) => handleCouponChange(idx, "code", e.target.value)}
                                    className="h-8 text-xs font-mono font-bold uppercase"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input
                                    placeholder="Ex: 15% OFF em todo o catálogo"
                                    value={coupon.description}
                                    onChange={(e) => handleCouponChange(idx, "description", e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCoupon(idx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Excluir cupom"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* BLOCO VANTAGENS */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-amber-500" /> Vantagens da Live (Frete Grátis, Brindes, Mimos)
                        </Label>
                        <span className="text-[11px] text-slate-400">Preencha o título para adicionar mais</span>
                      </div>

                      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                            <tr>
                              <th className="py-2 px-3 w-[220px]">Título da Vantagem</th>
                              <th className="py-2 px-3">Descrição / Condição</th>
                              <th className="py-2 px-3 w-[60px] text-center">Excluir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {advantages.map((adv, idx) => (
                              <tr key={adv.id} className="hover:bg-slate-50/50">
                                <td className="p-2">
                                  <Input
                                    placeholder="Ex: FRETE GRÁTIS ou BRINDE EXCLUSIVO"
                                    value={adv.title}
                                    onChange={(e) => handleAdvantageChange(idx, "title", e.target.value)}
                                    className="h-8 text-xs font-bold"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input
                                    placeholder="Ex: Válido para compras acima de R$ 200,00"
                                    value={adv.description}
                                    onChange={(e) => handleAdvantageChange(idx, "description", e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAdvantage(idx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Excluir vantagem"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    3. PRODUTOS DA LIVE
                   ======================================================== */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-rose-600" /> 3. Produtos da Live
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Selecione os produtos que aparecerão na transmissão e vincule os cupons.
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={openProductSelectionModal}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-4 text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Selecionar Produtos
                      </Button>
                    </div>

                    {liveProducts.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center bg-slate-50/50">
                        <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-700">Nenhum produto adicionado</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Clique no botão "Selecionar Produtos" acima para escolher os itens do catálogo que serão vendidos nesta live.
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">Thumb</th>
                              <th className="py-2.5 px-3">Nome do Produto</th>
                              <th className="py-2.5 px-3 w-28">Preço</th>
                              <th className="py-2.5 px-3 w-24">Estoque</th>
                              <th className="py-2.5 px-3 w-40">Cupom Vinculado</th>
                              <th className="py-2.5 px-3 w-16 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {liveProducts.map((item) => {
                              const prod = products.find(p => p.id === item.product_id);
                              if (!prod) return null;

                              return (
                                <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="p-2 text-center">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 border overflow-hidden mx-auto flex items-center justify-center">
                                      {prod.image_url ? (
                                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2 font-medium text-slate-800">
                                    <div className="line-clamp-1">{prod.name}</div>
                                    {prod.sku && <span className="text-[10px] text-slate-400">SKU: {prod.sku}</span>}
                                  </td>
                                  <td className="p-2 font-bold text-slate-700">
                                    R$ {Number(prod.price || 0).toFixed(2).replace(".", ",")}
                                  </td>
                                  <td className="p-2 text-slate-500">
                                    {prod.stock !== undefined ? prod.stock : "Disponível"}
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={item.coupon_code || ""}
                                      onChange={(e) => handleProductCouponChange(prod.id, e.target.value)}
                                      className="w-full h-7 rounded border border-slate-200 bg-white text-[11px] px-1 text-slate-700 outline-none"
                                    >
                                      <option value="">Sem cupom específico</option>
                                      {validCouponCodes.map(code => (
                                        <option key={code} value={code}>{code}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLiveProduct(prod.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                      title="Remover produto da live"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================
                    4. DIVULGAÇÃO DA LIVE
                   ======================================================== */}
                {currentStep === 4 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="border-b pb-3">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-rose-600" /> 4. Divulgação da Live na Loja
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Defina o período, páginas onde o teaser aparecerá e os botões de ação.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Início da Divulgação</Label>
                        <Input
                          type="datetime-local"
                          value={promoStartAt}
                          onChange={(e) => setPromoStartAt(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Fim da Divulgação</Label>
                        <Input
                          type="datetime-local"
                          value={promoEndAt}
                          onChange={(e) => setPromoEndAt(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Onde Exibir o Teaser na Loja</Label>
                      <select
                        value={promoTargetType}
                        onChange={(e) => setPromoTargetType(e.target.value)}
                        className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                      >
                        <option value="all">Todas as páginas da loja</option>
                        <option value="home">Somente na página inicial (Home)</option>
                        <option value="url_contains">URL contém o texto abaixo</option>
                        <option value="url_not_contains">URL NÃO contém o texto abaixo</option>
                      </select>
                    </div>

                    {(promoTargetType === "url_contains" || promoTargetType === "url_not_contains") && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Trecho da URL</Label>
                        <Input
                          placeholder="Ex: /colecao-inverno ou /promocao"
                          value={promoTargetValue}
                          onChange={(e) => setPromoTargetValue(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Texto do Botão (CTA)</Label>
                        <Input
                          placeholder="Ex: Assista Agora ou Entrar na Live"
                          value={promoCtaText}
                          onChange={(e) => setPromoCtaText(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Link do Grupo de WhatsApp (opcional)</Label>
                        <Input
                          placeholder="https://chat.whatsapp.com/..."
                          value={whatsappGroupUrl}
                          onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>

                    {/* MÍDIA DE DIVULGAÇÃO */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-semibold text-slate-700">Mídia de Divulgação (Banner ou Vídeo 9:16)</Label>
                      <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 space-y-3">
                        <UploadCloud className="h-7 w-7 mx-auto text-slate-400" />
                        <p className="text-xs text-slate-500">Envie um vídeo vertical (MP4) ou banner promocional</p>
                        <label className="inline-block">
                          <Button variant="outline" size="sm" type="button" disabled={uploadingPromo} asChild className="h-8 text-xs font-semibold">
                            <span>{uploadingPromo ? "Enviando..." : "Selecionar Arquivo"}</span>
                          </Button>
                          <input type="file" accept="image/*,video/mp4,video/webm" onChange={handleUploadPromoMedia} className="hidden" />
                        </label>
                      </div>

                      {promoMediaUrl && (
                        <div className="rounded-xl overflow-hidden border max-w-xs mt-2 relative">
                          {promoMediaType === "video" ? (
                            <video src={promoMediaUrl} className="w-full" controls muted />
                          ) : (
                            <img src={promoMediaUrl} alt="Mídia" className="w-full object-cover" />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => { setPromoMediaUrl(""); setPromoMediaType(""); }}
                            className="absolute top-2 right-2 h-6 text-[10px] px-2 rounded-md"
                          >
                            Remover
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RODAPÉ COM NAVEGAÇÃO DOS PASSOS */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="h-9 px-4 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 text-xs font-semibold text-slate-600 rounded-xl"
              >
                Cancelar
              </Button>

              {currentStep === 1 && (
                <Button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  Avançar <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  type="button"
                  onClick={handleNextFromStep2}
                  className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  Avançar <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  type="button"
                  onClick={handleNextFromStep3}
                  className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  Avançar <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {currentStep === 4 && (
                <Button
                  type="button"
                  onClick={handleFinalSave}
                  disabled={saving}
                  className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-6 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? "Salvando..." : "Salvar Live"}
                </Button>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL SECUNDÁRIO: SELEÇÃO DE PRODUTOS DO CATÁLOGO
         ======================================================== */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
          
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Selecionar Produtos do Catálogo
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha os produtos que serão vinculados à transmissão
              </p>
            </div>
            <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>

          {/* FILTROS & BUSCA */}
          <div className="p-4 border-b bg-slate-50 flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou SKU..."
                  value={modalSearch}
                  onChange={(e) => { setModalSearch(e.target.value); setModalCurrentPage(1); }}
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>

              {categoriesList.length > 0 && (
                <select
                  value={modalCategory}
                  onChange={(e) => { setModalCategory(e.target.value); setModalCurrentPage(1); }}
                  className="h-8 rounded-md border border-slate-200 bg-white text-xs px-2 text-slate-700"
                >
                  <option value="all">Todas Categorias</option>
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Exibir:</span>
              <select
                value={modalPageSize}
                onChange={(e) => { setModalPageSize(Number(e.target.value)); setModalCurrentPage(1); }}
                className="h-8 rounded-md border border-slate-200 bg-white text-xs px-2 font-bold"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* LISTA DE PRODUTOS PAGINADA */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {paginatedModalProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum produto encontrado com os filtros informados.
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">✓</th>
                      <th className="py-2.5 px-2 w-12 text-center">Thumb</th>
                      <th className="py-2.5 px-3">Nome / SKU</th>
                      <th className="py-2.5 px-3 w-28">Preço</th>
                      <th className="py-2.5 px-3 w-24">Estoque</th>
                      <th className="py-2.5 px-3 w-24 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedModalProducts.map(prod => {
                      const isSelected = modalSelectedIds.has(prod.id);

                      return (
                        <tr 
                          key={prod.id} 
                          onClick={() => handleToggleModalProduct(prod.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-rose-50/40" : "hover:bg-slate-50/60"}`}
                        >
                          <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleModalProduct(prod.id)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border overflow-hidden mx-auto flex items-center justify-center">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <ShoppingBag className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 font-medium text-slate-800">
                            <div className="line-clamp-1">{prod.name}</div>
                            {prod.sku && <span className="text-[10px] text-slate-400">SKU: {prod.sku}</span>}
                          </td>
                          <td className="p-2 font-bold text-slate-700">
                            R$ {Number(prod.price || 0).toFixed(2).replace(".", ",")}
                          </td>
                          <td className="p-2 text-slate-500">
                            {prod.stock !== undefined ? prod.stock : "Disponível"}
                          </td>
                          <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              size="sm"
                              variant={isSelected ? "outline" : "default"}
                              onClick={() => handleToggleModalProduct(prod.id)}
                              className={`h-7 text-[11px] px-2.5 rounded-lg ${isSelected ? "text-rose-600 border-rose-200" : "bg-rose-600 hover:bg-rose-700 text-white"}`}
                            >
                              {isSelected ? "Remover" : "Adicionar"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RODAPÉ DO MODAL DE PRODUTOS */}
          <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 bg-white border px-2.5 py-1 rounded-lg">
                {modalSelectedIds.size} {modalSelectedIds.size === 1 ? "selecionado" : "selecionados"}
              </span>

              {totalModalPages > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={modalCurrentPage === 1}
                    onClick={() => setModalCurrentPage(prev => Math.max(1, prev - 1))}
                    className="h-7 text-xs px-2"
                  >
                    Ant.
                  </Button>
                  <span>{modalCurrentPage} / {totalModalPages}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={modalCurrentPage === totalModalPages}
                    onClick={() => setModalCurrentPage(prev => Math.min(totalModalPages, prev + 1))}
                    className="h-7 text-xs px-2"
                  >
                    Próx.
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProductModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmProductsFromModal}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 rounded-lg"
              >
                ADICIONAR
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
