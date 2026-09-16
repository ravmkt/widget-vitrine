import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio, Plus, Search, AlertCircle, RefreshCw, Clock, Trash2, Pencil, Share2, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LiveFormDialog } from "@/components/live/LiveFormDialog";
import { ShareLiveModal } from "@/components/live/ShareLiveModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LiveAppearanceTab, { LiveWidgetConfig, LivePlayerConfig } from "@/components/live/LiveAppearanceTab";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  url?: string;
}

interface LiveRow {
  id: string;
  title: string;
  youtube_video_id: string;
  youtube_thumbnail_url?: string | null;
  status: "scheduled" | "live" | "finished";
  is_active: boolean;
  scheduled_at?: string | null;
  created_at: string;
}

export function LiveCommercePage() {
  const { storeId: tenantStoreId } = useTenant();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [allowsLive, setAllowsLive] = useState<boolean>(true);
  const [planName, setPlanName] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [lives, setLives] = useState<LiveRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "live" | "finished">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingLiveId, setEditingLiveId] = useState<string | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLive, setShareLive] = useState<LiveRow | null>(null);

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<LiveWidgetConfig>({
    enabled: true,
    position: "bottom-right",
    bubble_color: "#e11d48",
    text_color: "#ffffff",
    label_text: "🔴 AO VIVO AGORA",
  });
  const [playerConfig, setPlayerConfig] = useState<LivePlayerConfig>({
    primary_color: "#e11d48",
    background_color: "#000000",
    show_viewer_count: true,
    show_chat: true,
    autoplay_muted: true,
  });

  useEffect(() => {
    async function loadStoreAndPlan() {
      if (!tenantStoreId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data: store, error: storeErr } = await supabase
          .from("stores")
          .select("id, plan_id, plan:plan_id(id, name, allows_live)")
          .eq("id", tenantStoreId)
          .maybeSingle();

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
          .select("id, name, price, image_url, product_url")
          .eq("store_id", store.id)
          .order("name", { ascending: true });
        if (prods) setProducts(prods);

        await loadLives(store.id);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStoreAndPlan();
  }, [tenantStoreId]);

  async function loadLives(currentStoreId: string) {
    const { data, error } = await supabase
      .from("lives")
      .select("id, title, youtube_video_id, youtube_thumbnail_url, status, is_active, scheduled_at, created_at")
      .eq("store_id", currentStoreId)
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (!error && data) setLives(data as LiveRow[]);
  }

  async function loadAppearanceConfig(currentStoreId: string) {
    const { data, error } = await supabase
      .from("store_settings")
      .select("live_widget_config, live_player_config")
      .eq("store_id", currentStoreId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar aparência da live:", error);
      return;
    }
    if (data?.live_widget_config && Object.keys(data.live_widget_config).length > 0) {
      setWidgetConfig(data.live_widget_config as LiveWidgetConfig);
    }
    if (data?.live_player_config && Object.keys(data.live_player_config).length > 0) {
      setPlayerConfig(data.live_player_config as LivePlayerConfig);
    }
  }

  async function handleSaveAppearance() {
    if (!storeId) return;
    try {
      setSavingAppearance(true);
      const { error } = await supabase
        .from("store_settings")
        .update({
          live_widget_config: widgetConfig,
          live_player_config: playerConfig,
        })
        .eq("store_id", storeId);

      if (error) throw error;
      toast.success("Aparência da Live salva com sucesso!");
      setAppearanceOpen(false);
    } catch (err) {
      console.error("Erro ao salvar aparência:", err);
      toast.error("Erro ao salvar aparência da Live.");
    } finally {
      setSavingAppearance(false);
    }
  }

  const filteredLives = useMemo(() => {
    return lives.filter((l) => {
      const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [lives, search, statusFilter]);

  const handleCreateNew = () => {
    setEditingLiveId(null);
    setFormOpen(true);
  };

  const handleEdit = (liveId: string) => {
    setEditingLiveId(liveId);
    setFormOpen(true);
  };

  const handleDelete = async (liveId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta live? Essa ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase.from("lives").delete().eq("id", liveId);
      if (error) throw error;
      toast.success("Live excluída.");
      if (storeId) await loadLives(storeId);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir a live.");
    }
  };

  const handleShare = (live: LiveRow) => {
    setShareLive(live);
    setShareModalOpen(true);
  };

  const onFormSaved = async () => {
    if (storeId) await loadLives(storeId);
  };

  const statusBadge = (live: LiveRow) => {
    if (live.is_active && live.status === "live") {
      return (
        <Badge className="bg-rose-600 text-white flex items-center gap-1.5 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          AO VIVO
        </Badge>
      );
    }
    if (live.status === "scheduled") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500 flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Programada
        </Badge>
      );
    }
    return <Badge variant="secondary">Finalizada</Badge>;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Shopping</h1>
            <p className="text-muted-foreground text-sm">
              Programe, divulgue e gerencie todas as suas lives em um só lugar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (storeId) loadAppearanceConfig(storeId);
              setAppearanceOpen(true);
            }}
            className="gap-2"
          >
            <Palette className="h-4 w-4" />
            Aparência
          </Button>
          <Button onClick={handleCreateNew} disabled={!allowsLive} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="h-4 w-4" />
            Nova Live
          </Button>
        </div>
      </div>

      {!allowsLive && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Recurso Exclusivo dos Planos Pro e Scale</h3>
              <p className="text-sm text-muted-foreground">
                Seu plano atual ({planName || "Starter"}) não inclui Live Shopping.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/billing")} className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap">
            Fazer Upgrade Agora
          </Button>
        </div>
      )}

      {/* Busca e filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar live pelo título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="scheduled">Programadas</option>
          <option value="live">Ao vivo</option>
          <option value="finished">Finalizadas</option>
        </select>
      </div>

      {/* Lista de lives */}
      {filteredLives.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma live encontrada.</p>
            <Button variant="link" onClick={handleCreateNew} disabled={!allowsLive} className="mt-2 text-primary">
              Criar sua primeira live
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLives.map((live) => (
            <Card key={live.id} className="border-border/60 hover:border-border transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-16 w-24 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40">
                  {live.youtube_thumbnail_url ? (
                    <img src={live.youtube_thumbnail_url} alt={live.title} className="h-full w-full object-cover" />
                  ) : (
                    <Radio className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(live)}
                  </div>
                  <p className="font-semibold text-sm truncate">{live.title}</p>
                  {live.scheduled_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(live.scheduled_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleShare(live)} title="Divulgar">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleEdit(live.id)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(live.id)} title="Excluir" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {storeId && (
        <LiveFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          storeId={storeId}
          liveId={editingLiveId}
          allowsLive={allowsLive}
          products={products}
          onSaved={onFormSaved}
        />
      )}

      {shareLive && (
        <ShareLiveModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          liveTitle={shareLive.title}
          youtubeVideoId={shareLive.youtube_video_id}
          isLiveNow={Boolean(shareLive.is_active && shareLive.status === "live")}
        />
      )}

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aparência da Live</DialogTitle>
          </DialogHeader>
          <LiveAppearanceTab
            widgetConfig={widgetConfig}
            playerConfig={playerConfig}
            onWidgetChange={setWidgetConfig}
            onPlayerChange={setPlayerConfig}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAppearanceOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAppearance} disabled={savingAppearance} className="bg-rose-600 hover:bg-rose-700 text-white">
              {savingAppearance ? "Salvando..." : "Salvar Aparência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
