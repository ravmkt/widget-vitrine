// src/components/performance/insights-tab.tsx

import { useState } from "react";
import { useInsights, type Insight, type InsightType } from "@/hooks/useInsights";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  X,
  ExternalLink,
  Loader2,
  Check,
  Filter,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// ── Props ──
interface InsightsTabProps {
  timeRange: string;
  customFrom?: string;
  customTo?: string;
}

type FilterStatus = "all" | "pending" | "completed";
type FilterType = "all" | InsightType;

// ── Mapas visuais ──
const iconMap: Record<InsightType, React.ElementType> = {
  warning: AlertTriangle,
  positive: CheckCircle,
  suggestion: Lightbulb,
};

const cardStyleMap: Record<InsightType, string> = {
  warning:
    "bg-white dark:bg-slate-800/90 border-2 border-amber-500 dark:border-amber-400 border-l-[8px]",
  positive:
    "bg-white dark:bg-slate-800/90 border-2 border-emerald-500 dark:border-emerald-400 border-l-[8px]",
  suggestion:
    "bg-white dark:bg-slate-800/90 border-2 border-blue-500 dark:border-blue-400 border-l-[8px]",
};

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
function InsightCard({
  insight,
  onToggleCompleted,
  onDelete,
}: {
  insight: Insight;
  onToggleCompleted: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const Icon = iconMap[insight.insight_type];
  const isCompleted = insight.completed ?? false;

  const handleDismiss = async () => {
    await supabase.from("insights").update({ dismissed: true }).eq("id", insight.id);
    queryClient.invalidateQueries({ queryKey: ["insights"] });
  };

  // Fallback: action_url → related_video_id → related_placement_id → null
  const resolvedUrl =
    insight.action_url ||
    (insight.related_video_id
      ? `/dashboard/videos/${insight.related_video_id}`
      : insight.related_placement_id
        ? `/dashboard/placements/${insight.related_placement_id}`
        : null);

  const handleAction = () => {
    if (resolvedUrl) {
      window.location.href = resolvedUrl;
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all hover:shadow-md",
        isCompleted && "opacity-60",
        cardStyleMap[insight.insight_type]
      )}
    >
      <div className="flex items-start gap-3">
        {/* Check de concluído */}
        <button
          onClick={() => onToggleCompleted(insight.id, isCompleted)}
          className={cn(
            "mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-slate-300 dark:border-slate-600 hover:border-emerald-400 text-transparent hover:text-slate-400"
          )}
          title={isCompleted ? "Marcar como pendente" : "Marcar como concluído"}
        >
          {isCompleted && <Check className="h-3 w-3" />}
        </button>

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
            {isCompleted && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                Concluído
              </span>
            )}
          </div>

          {/* Título */}
          <h4
            className={cn(
              "font-bold text-sm mb-1",
              "text-slate-900 dark:text-white",
              isCompleted && "line-through text-slate-400 dark:text-slate-500"
            )}
          >
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
            <button
              onClick={handleAction}
              disabled={!resolvedUrl}
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-xs font-bold transition-colors",
                resolvedUrl
                  ? "text-[#0094EB] dark:text-[#38b2f8] hover:underline cursor-pointer"
                  : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
              )}
              title={!resolvedUrl ? "Em breve" : insight.action_label}
            >
              {insight.action_label}
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Botões de ação do card */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          {/* Excluir permanentemente */}
          <button
            onClick={() => onDelete(insight.id)}
            className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Excluir insight"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Dispensar (esconder) */}
          <button
            onClick={handleDismiss}
            className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
            title="Dispensar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──
export function InsightsTab({ timeRange, customFrom, customTo }: InsightsTabProps) {
  const { data: insights, isLoading, isError, error } = useInsights();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Toggle completed
  const handleToggleCompleted = async (id: string, current: boolean) => {
    queryClient.setQueryData(["insights"], (old: Insight[] | undefined) => {
      if (!old) return old;
      return old.map((i) => (i.id === id ? { ...i, completed: !current } : i));
    });

    await supabase.from("insights").update({ completed: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["insights"] });
  };

  // Excluir permanentemente
  const handleDelete = async (id: string) => {
    queryClient.setQueryData(["insights"], (old: Insight[] | undefined) => {
      if (!old) return old;
      return old.filter((i) => i.id !== id);
    });

    const { error } = await supabase.from("insights").delete().eq("id", id);
    if (error) {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  // ── Erro ──
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

  // ── Ordena + filtra ──
  const sorted = [...(insights || [])].sort((a, b) => {
    const order: Record<InsightType, number> = { warning: 0, suggestion: 1, positive: 2 };
    return order[a.insight_type] - order[b.insight_type];
  });

  const filtered = sorted.filter((i) => {
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && !i.completed) ||
      (filterStatus === "completed" && i.completed);

    const matchType = filterType === "all" || i.insight_type === filterType;

    return matchStatus && matchType;
  });

  // Contadores
  const statusCounts = {
    all: sorted.length,
    pending: sorted.filter((i) => !i.completed).length,
    completed: sorted.filter((i) => i.completed).length,
  };

  const typeCounts = {
    all: sorted.length,
    warning: sorted.filter((i) => i.insight_type === "warning").length,
    suggestion: sorted.filter((i) => i.insight_type === "suggestion").length,
    positive: sorted.filter((i) => i.insight_type === "positive").length,
  };

  // ── Vazio ──
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

  return (
    <div className="space-y-4">
      {/* Barra de filtros: Status + Tipo */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro por status */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {([
              { key: "all", label: "Todos", count: statusCounts.all },
              { key: "pending", label: "Pendentes", count: statusCounts.pending },
              { key: "completed", label: "Concluídos", count: statusCounts.completed },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                  filterStatus === key
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {label}
                <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por tipo */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {([
            { key: "all", label: "Todos", color: "" },
            { key: "warning", label: "Atenção", color: "bg-amber-500" },
            { key: "suggestion", label: "Sugestão", color: "bg-blue-500" },
            { key: "positive", label: "Destaque", color: "bg-emerald-500" },
          ] as const).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilterType(key as FilterType)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                filterType === key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {color && <span className={cn("w-2 h-2 rounded-full", color)} />}
              {label}
              <span className="ml-1 text-slate-400 dark:text-slate-500 font-normal">
                {typeCounts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista filtrada */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-300 dark:text-emerald-700 mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Nenhum insight encontrado com esses filtros.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onToggleCompleted={handleToggleCompleted}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
