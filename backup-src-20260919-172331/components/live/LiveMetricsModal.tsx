import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, TrendingUp, MessageSquare, ShoppingBag,
  MousePointerClick, RefreshCw, DollarSign,
  ShoppingCart, ArrowUpRight, CheckCircle2, Sparkles
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

interface LiveMetricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  live: {
    id: string;
    title: string;
    youtube_video_id: string;
    youtube_thumbnail_url?: string | null;
    status: string;
    scheduled_at?: string | null;
    created_at: string;
  } | null;
}

interface TimelinePoint {
  time: string;
  viewers: number;
  clicks: number;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  clicks: number;
  salesCount: number;
  revenue: number;
}

export function LiveMetricsModal({ open, onOpenChange, live }: LiveMetricsModalProps) {
  const [loading, setLoading] = useState(false);
  const [isDemoData, setIsDemoData] = useState(false);

  // Audiência
  const [totalViews, setTotalViews] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [avgViewTime, setAvgViewTime] = useState("0m");
  const [commentsCount, setCommentsCount] = useState(0);

  // Conversão e Vendas
  const [productClicks, setProductClicks] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [potentialRevenue, setPotentialRevenue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [productRank, setProductRank] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (!open || !live) return;

    async function loadMetrics() {
      try {
        setLoading(true);

        // 1. Busca eventos reais da live
        const { data: events } = await supabase
          .from("live_events")
          .select("event_type, metadata, created_at")
          .eq("live_id", live.id)
          .order("created_at", { ascending: true });

        // 2. Busca produtos vinculados à live
        const { data: liveData } = await supabase
          .from("lives")
          .select("featured_product_ids")
          .eq("id", live.id)
          .maybeSingle();

        let realProducts: any[] = [];
        if (liveData?.featured_product_ids && liveData.featured_product_ids.length > 0) {
          const { data: prods } = await supabase
            .from("products")
            .select("id, name, price")
            .in("id", liveData.featured_product_ids);
          realProducts = prods || [];
        }

        const hasRealEvents = events && events.length > 0;

        if (!hasRealEvents) {
          // ==============================
          // MODO DEMONSTRAÇÃO / MOCK VISUAL
          // ==============================
          setIsDemoData(true);

          const mockPeak = 48;
          const mockTotalViews = 342;
          const mockClicks = 46;
          const mockOrders = 7;

          setTotalViews(mockTotalViews);
          setPeakViewers(mockPeak);
          setAvgViewTime("14m 20s");
          setCommentsCount(89);
          setProductClicks(mockClicks);
          setOrdersCount(mockOrders);

          // Curva orgânica de live (esquenta, pico no meio com apresentação dos produtos, estabilização)
          const mockCurve: TimelinePoint[] = [
            { time: "00:00", viewers: 6, clicks: 0 },
            { time: "00:05", viewers: 18, clicks: 2 },
            { time: "00:10", viewers: 29, clicks: 5 },
            { time: "00:15", viewers: 42, clicks: 12 },
            { time: "00:20", viewers: 48, clicks: 18 }, // PICO
            { time: "00:25", viewers: 45, clicks: 26 },
            { time: "00:30", viewers: 41, clicks: 33 },
            { time: "00:35", viewers: 36, clicks: 39 },
            { time: "00:40", viewers: 31, clicks: 42 },
            { time: "00:45", viewers: 22, clicks: 46 },
            { time: "00:50", viewers: 12, clicks: 46 },
          ];
          setTimelineData(mockCurve);

          // Produtos com métricas de interesse e conversão
          let calculatedPotential = 0;
          let calculatedRevenue = 0;

          const fallbackProducts = [
            { id: "1", name: "Calça Confort - Rosa Pink 42/44 - M", price: 149.95, clicks: 18, salesCount: 3 },
            { id: "2", name: "Calça Confort Bicolor Preto e Rosa Pink 46/48 - G", price: 154.95, clicks: 14, salesCount: 2 },
            { id: "3", name: "Blusa Confort - Verde Jade 46/48 - G", price: 149.95, clicks: 9, salesCount: 1 },
            { id: "4", name: "Blusa Manga Longa Elegance", price: 299.90, clicks: 5, salesCount: 1 },
          ];

          const sourceProds = realProducts.length > 0 ? realProducts.map((p, i) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price || 99.9),
            clicks: [18, 14, 9, 5][i] || Math.floor(Math.random() * 8) + 2,
            salesCount: [3, 2, 1, 1][i] || 1
          })) : fallbackProducts;

          const mappedRank = sourceProds.map(p => {
            const rev = p.salesCount * p.price;
            const pot = p.clicks * p.price;
            calculatedRevenue += rev;
            calculatedPotential += pot;
            return {
              ...p,
              revenue: rev,
            };
          }).sort((a, b) => b.clicks - a.clicks);

          setProductRank(mappedRank);
          setTotalRevenue(calculatedRevenue);
          setPotentialRevenue(calculatedPotential);

        } else {
          // ==============================
          // MODO PRODUÇÃO / DADOS REAIS
          // ==============================
          setIsDemoData(false);

          let vCount = 0;
          let pClicks = 0;
          let peak = 0;
          const clickMap: Record<string, number> = {};

          events.forEach((ev) => {
            if (ev.event_type === "view") vCount++;
            if (ev.event_type === "product_click") {
              pClicks++;
              const pid = (ev.metadata as any)?.product_id;
              if (pid) clickMap[pid] = (clickMap[pid] || 0) + 1;
            }
            if (ev.event_type === "peak_viewers") {
              const c = Number((ev.metadata as any)?.count || 0);
              if (c > peak) peak = c;
            }
          });

          // Buscar vendas atribuídas à live
          const { data: liveOrders } = await supabase
            .from("orders")
            .select("total_amount, items")
            .eq("live_id", live.id);

          let liveRevenue = 0;
          let ordersQty = liveOrders?.length || 0;
          liveOrders?.forEach((ord: any) => {
            liveRevenue += Number(ord.total_amount || 0);
          });

          setTotalViews(vCount);
          setProductClicks(pClicks);
          setPeakViewers(peak);
          setTotalRevenue(liveRevenue);
          setOrdersCount(ordersQty);

          // Mapeamento real de produtos
          let calculatedPotential = 0;
          const mappedRank = realProducts.map(p => {
            const clicks = clickMap[p.id] || 0;
            const price = Number(p.price || 0);
            calculatedPotential += (clicks * price);
            return {
              id: p.id,
              name: p.name,
              price: price,
              clicks: clicks,
              salesCount: 0,
              revenue: 0,
            };
          }).sort((a, b) => b.clicks - a.clicks);

          setPotentialRevenue(calculatedPotential);
          setProductRank(mappedRank);
        }

      } catch (err) {
        console.error("Erro ao carregar dados do modal:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [open, live]);

  if (!live) return null;

  const convRate = productClicks > 0 ? ((ordersCount / productClicks) * 100).toFixed(1) : "0.0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border-0 [&>button]:hidden">
        
        {/* CABEÇALHO */}
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-slate-800">
                  {live.title}
                </DialogTitle>
                <Badge variant={live.status === "live" ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-wider">
                  {live.status === "live" ? "Ao Vivo" : "Finalizada"}
                </Badge>
                {isDemoData && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] gap-1 flex items-center font-medium">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Demonstração Visual
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dashboard de audiência, engajamento e atribuição de receita da Live
              </p>
            </div>
          </div>
        </div>

        {/* CORPO DE MÉTRICAS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-rose-600" />
            </div>
          ) : (
            <>
              {/* LINHA 1: KPIS FINANCEIROS & CONVERSÃO */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Performance Comercial da Live
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  
                  {/* Receita Gerada */}
                  <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">
                          R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {ordersCount} vendas atribuídas
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Intenção de Compra / Valor em Cliques */}
                  <Card className="border border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-slate-800">
                          R$ {potentialRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          Intenção Total Gerada
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cliques em Produtos */}
                  <Card className="border border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MousePointerClick className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-slate-800">
                          {productClicks.toLocaleString("pt-BR")}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          Cliques em Produtos
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Taxa de Conversão */}
                  <Card className="border border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-slate-800">
                          {convRate}%
                        </p>
                        <p className="text-[11px] font-medium text-slate-500">
                          Taxa de Conversão
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </div>

              {/* LINHA 2: KPIS DE AUDIÊNCIA */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Audiência e Engajamento
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <Eye className="w-3.5 h-3.5 text-blue-500" /> Visualizações Totais
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{totalViews.toLocaleString("pt-BR")}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> Pico Simultâneo
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{peakViewers.toLocaleString("pt-BR")} pessoas</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> Chat & Comentários
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{commentsCount.toLocaleString("pt-BR")}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      Tempo Médio Assistido
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{avgViewTime}</p>
                  </div>
                </div>
              </div>

              {/* GRÁFICO DE AUDIÊNCIA COM GRADIENTE */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-600" /> Curva de Audiência em Tempo Real
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Oscilação minuto a minuto de espectadores conectados na transmissão
                    </p>
                  </div>
                  <Badge variant="outline" className="border-rose-200 text-rose-600 text-xs font-bold">
                    Pico da Live: {peakViewers} simultâneos
                  </Badge>
                </div>

                <div className="h-64 w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="liveAudienceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 'dataMax + 5']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff", fontSize: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)" }}
                        formatter={(val: any) => [`${val} espectadores`, "Audiência"]}
                        labelFormatter={(label) => `Tempo de Transmissão: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="viewers"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#liveAudienceGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RANKING DE PRODUTOS E RECEITA INDIVIDUAL */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-rose-600" /> Produtos da Live: Cliques & Vendas
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desempenho de cada item apresentado e o valor total convertido
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{productRank.length} produtos monitorados</span>
                </div>

                {productRank.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum produto associado a esta transmissão.</p>
                ) : (
                  <div className="border rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {productRank.map((prod, idx) => (
                      <div key={prod.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                            {idx + 1}º
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{prod.name}</p>
                            <p className="text-[11px] text-slate-400">Preço Unitário: R$ {prod.price.toFixed(2).replace(".", ",")}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono text-slate-700 bg-slate-100 font-bold border-0">
                            {prod.clicks} {prod.clicks === 1 ? "clique" : "cliques"}
                          </Badge>

                          {prod.salesCount > 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                              {prod.salesCount} vendas (R$ {prod.revenue.toFixed(2).replace(".", ",")})
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sem vendas ainda</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 text-xs font-semibold rounded-xl"
          >
            Fechar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
