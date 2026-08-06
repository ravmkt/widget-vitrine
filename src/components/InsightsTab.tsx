import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, CheckCircle, Lightbulb, X, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Store ID ──
const STORE_ID = "eccb3093-8f8e-4cba-b598-6ab8d6326b8f";

// ── Tipos ──
export type InsightType = "warning" | "positive" | "suggestion";

export interface Insight {
  id: string;
  store_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  action_label: string | null;
  related_video_id: string | null;
  related_placement_id: string | null;
  metric_key: string | null;
  metric_value: number | null;
  metric_comparison_value: number | null;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}

// ── Hook ──
function useInsights(storeId: string) {
  return useQuery({
    queryKey: ["insights", storeId],
    queryFn: async (): Promise<Insight[]> => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .eq("store_id", storeId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as Insight[];
    },
    enabled: !!storeId,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ── Helpers ──
const iconMap: Record<InsightType, React.ElementType> = {
  warning: AlertTriangle,
  positive: CheckCircle,
  suggestion: Lightbulb,
};

const colorMap: Record<InsightType, string> = {
  warning: "border-l-amber-500 bg-amber-50/50",
  positive: "border-l-emerald-500 bg-emerald-50/50",
  suggestion: "border-l-blue-500 bg-blue-50/50",
};

const iconColorMap: Record<InsightType, string> = {
  warning: "text-amber-600",
  positive: "text-emerald-600",
  suggestion: "text-blue-600",
};

const labelMap: Record<InsightType, string> = {
  warning: "Atenção",
  positive: "Destaque",
  suggestion: "Sugestão",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

// ── Card individual ──
function InsightCard({ insight }: { insight: Insight }) {
  const Icon = iconMap[insight.insight_type];

  const handleDismiss = async () => {
    await supabase
      .from("insights")
      .update({ dismissed: true })
      .eq("id", insight.id);
    // O React Query fará o refetch ou você pode invalidar a query
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 p-4 transition-all hover:shadow-sm",
        colorMap[insight.insight_type]
      )}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={cn("mt-0.5 shrink-0", iconColorMap[insight.insight_type])}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                iconColorMap[insight.insight_type]
              )}
            >
              {labelMap[insight.insight_type]}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(insight.created_at)}
            </span>
          </div>

          <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.description}
          </p>

          {/* Métrica (se houver) */}
          {insight.metric_value !== null && insight.metric_key && (
            <p className="mt-2 text-xs text-muted-foreground">
              Métrica:{" "}
              <span className="font-mono font-medium">
                {insight.metric_key} = {insight.metric_value}
                {insight.metric_comparison_value !== null &&
                  ` (média: ${insight.metric_comparison_value})`}
              </span>
            </p>
          )}

          {/* Botão de ação */}
          {insight.action_label && (
            <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {insight.action_label}
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Dispensar */}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──
export default function InsightsTab() {
  const { data: insights, isLoading, isError, error } = useInsights(STORE_ID);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">
          Erro ao carregar insights: {(error as Error).message}
        </p>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lightbulb className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">Nenhum insight ainda</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Assim que tivermos dados suficientes de visualizações e cliques nos seus
          vídeos, os insights aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  // Ordena: warnings primeiro, depois sugestões, depois positivos
  const sorted = [...insights].sort((a, b) => {
    const order: Record<InsightType, number> = { warning: 0, suggestion: 1, positive: 2 };
    return order[a.insight_type] - order[b.insight_type];
  });

  return (
    <div className="space-y-3 p-4">
      {sorted.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
