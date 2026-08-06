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

// ── Sanitiza URL do backend ──
function sanitizeActionUrl(raw: string | null): string | null {
  if (!raw) return null;
  let url = raw.replace(/^\/dashboard/, "");
  const videoMatch = url.match(/^\/videos\/([a-f0-9-]+)$/);
  if (videoMatch) {
    url = `/videos/${videoMatch[1]}/edit`;
  }
  return url;
}

// ── 🆕 Fallback inteligente de URL baseado no label ──
function resolveActionUrl(insight: Insight): string | null {
  // 1. action_url do backend (sanitizado)
  if (insight.action_url) {
    return sanitizeActionUrl(insight.action_url);
  }

  // 2. related_video_id
  if (insight.related_video_id) {
    return `/videos/${insight.related_video_id}/edit`;
  }

  // 3. related_placement_id
  if (insight.related_placement_id) {
    return "/produtos";
  }

  // 4. Fallback pelo texto do action_label
  const label = (insight.action_label || "").toLowerCase();
  if (label.includes("produto")) return "/produtos";
  if (label.includes("vídeo")) return "/videos";
if (label.includes("página")) return "/stories";
if (label.includes("posi")) return "/stories";

  // 5. Último recurso — vai pro dashboard (nunca retorna null)
  return "/dashboard";
}

// ── Modal de confirmação ──
function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Excluindo..." : "Sim, excluir"}
          </button>
        </div>
      </div>
    </div>
  );
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

  const resolvedUrl = resolveActionUrl(insight);

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

          {/* Ação — 🆕 nunca fica desabilitado */}
          {insight.action_label && (
            <button
              onClick={handleAction}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0094EB] dark:text-[#38b2f8] hover:underline cursor-pointer transition-colors"
            >
              {insight.action_label}
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Botões de ação do card */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => onDelete(insight.id)}
            className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Excluir insight"
          >
            <Trash2 className="h-4 w-4" />
          </button>

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRequest = (id: string) => {
    setDeleteTarget(id);
  };

  // 🆕 Delete corrigido — usa só invalidate (chave correta), sem remoção otimista quebrada
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const id = deleteTarget;

    const { error: deleteError } = await supabase
      .from("insights")
      .delete()
      .eq("id", id);

    setDeleting(false);
    setDeleteTarget(null);

    // Pequeno delay para o Supabase processar o delete, depois recarrega
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    }, 400);
  };

  const handleToggleCompleted = async (id: string, current: boolean) => {
    queryClient.setQueryData(["insights"], (old: Insight[] | undefined) => {
      if (!old) return old;
      return old.map((i) => (i.id === id ? { ...i, completed: !current } : i));
    });

    await supabase.from("insights").update({ completed: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["insights"] });
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
    <>
      <div className="space-y-4">
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center gap-3">
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
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Excluir insight"
        message="Tem certeza que deseja excluir este insight? Essa ação é irreversível."
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </>
  );
}
