import { useInsights, type Insight, type InsightType } from "@/hooks/useInsights";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, CheckCircle, Lightbulb, X, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// ── Props que vêm da PerformancePage ──
interface InsightsTabProps {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
}

// ── Mapas visuais ──
const iconMap: Record<InsightType, React.ElementType> = {
  warning: AlertTriangle,
  positive: CheckCircle,
  suggestion: Lightbulb,
};

// 🆕 Fundo do card: branco (claro) / escuro (dark)
//    Borda lateral colorida mantida com ajuste para dark mode
const cardStyleMap: Record<InsightType, string> = {
  warning:
    "bg-white dark:bg-slate-800/90 border-2 border-amber-500 dark:border-amber-400 border-l-[8px]",
  positive:
    "bg-white dark:bg-slate-800/90 border-2 border-emerald-500 dark:border-emerald-400 border-l-[8px]",
  suggestion:
    "bg-white dark:bg-slate-800/90 border-2 border-blue-500 dark:border-blue-400 border-l-[8px]",
};

// 🆕 Cores do ícone + label — mantém a cor temática, mais clara no dark
const accentColorMap: Record<InsightType, string> = {
  warning: "text-amber-600 dark:text-amber-400",
  positive: "text-emerald-600 dark:text-emerald-400",
  suggestion: "text-blue-600 dark:text-blue-400",
};

const labelMap: Record<InsightType, string> = {
  warning: "Atenção",
  positive: "Destaque",
  suggestion: "Sugestão",
};

// ── Tempo relativo ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

// ── Card individual ──
function InsightCard({ insight }: { insight: Insight }) {
  const queryClient = useQueryClient();
  const Icon = iconMap[insight.insight_type];

  const handleDismiss = async () => {
    await supabase.from("insights").update({ dismissed: true }).eq("id", insight.id);
    queryClient.invalidateQueries({ queryKey: ["insights"] });
  };

  return (
<div
  className={cn(
    "rounded-xl p-4 transition-all hover:shadow-md",
    cardStyleMap[insight.insight_type]
  )}
>
      <div className="flex items-start gap-3">
        {/* Ícone colorido */}
        <div className={cn("mt-0.5 shrink-0", accentColorMap[insight.insight_type])}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Label + tempo */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wide",
                accentColorMap[insight.insight_type]
              )}
            >
              {labelMap[insight.insight_type]}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {timeAgo(insight.created_at)}
            </span>
          </div>

          {/* Título */}
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            {insight.title}
          </h4>

          {/* Descrição */}
          <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
            {insight.description}
          </p>

          {/* Métrica */}
          {insight.metric_value !== null && insight.metric_key && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Métrica:{" "}
              <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                {insight.metric_key} = {insight.metric_value}
                {insight.metric_comparison_value !== null &&
                  ` (média: ${insight.metric_comparison_value})`}
              </span>
            </p>
          )}

          {/* Ação */}
          {insight.action_label && (
            <button className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0094EB] dark:text-[#38b2f8] hover:underline">
              {insight.action_label}
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Botão dispensar */}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
          title="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──
export function InsightsTab({ timeRange, customFrom, customTo }: InsightsTabProps) {
  const { data: insights, isLoading, isError, error } = useInsights();

  // Estado de loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  // Estado de erro
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Erro ao carregar insights: {(error as Error).message}
        </p>
      </div>
    );
  }

  // Estado vazio
  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lightbulb className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
          Nenhum insight ainda
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">
          Assim que tivermos dados suficientes de visualizações e cliques nos seus vídeos, os
          insights aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  // Ordena: warning → suggestion → positive
  const sorted = [...insights].sort((a, b) => {
    const order: Record<InsightType, number> = { warning: 0, suggestion: 1, positive: 2 };
    return order[a.insight_type] - order[b.insight_type];
  });

  return (
    <div className="space-y-3">
      {sorted.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
