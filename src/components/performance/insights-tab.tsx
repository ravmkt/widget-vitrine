import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Sparkles,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Zap,
  ChevronRight,
  RefreshCw,
  Video as VideoIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { db, resolveStoreId } from '@/lib/db';
import { useTenant } from '@/context/TenantContext';

interface InsightsTabProps {
  timeRange: string;
}

interface AiInsight {
  id: string;
  video_id: string | null;
  rule_code: string;
  insight_type: 'success' | 'warning' | 'tip';
  title: string;
  description: string;
  impact_label: string;
  action_text: string;
  priority: number;
  created_at: string;
}

const ICONS_BY_TYPE = {
  success: TrendingUp,
  warning: AlertTriangle,
  tip: Lightbulb,
} as const;

export function InsightsTab({ timeRange }: InsightsTabProps) {
  const { storeId: tenantStoreId } = useTenant();

  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [storeId, setStoreId] = useState<string>('');

  const periodDays = timeRange === '30d' ? 30 : 7;

  const resolveId = useCallback(async () => {
    const candidate =
      tenantStoreId ||
      localStorage.getItem('vidlytics_selected_store_id') ||
      localStorage.getItem('current_store_id') ||
      localStorage.getItem('store_id') ||
      '';
    return await resolveStoreId(candidate || undefined);
  }, [tenantStoreId]);

  const loadInsights = useCallback(async (safeStoreId: string) => {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('id, video_id, rule_code, insight_type, title, description, impact_label, action_text, priority, created_at')
      .eq('store_id', safeStoreId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(9);

    if (error) {
      console.error('Erro ao buscar insights:', error);
      return;
    }
    setInsights((data as AiInsight[]) || []);
  }, []);

  const generateInsights = useCallback(async (safeStoreId: string) => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-insights', {
        body: { store_id: safeStoreId, period_days: periodDays },
      });
      if (error) {
        console.error('Erro ao gerar insights:', error);
      }
      await loadInsights(safeStoreId);
    } catch (err) {
      console.error('Erro ao chamar calculate-insights:', err);
    } finally {
      setRefreshing(false);
    }
  }, [periodDays, loadInsights]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      const safeStoreId = await resolveId();
      if (!isMounted) return;

      if (!safeStoreId) {
        setInsights([]);
        setLoading(false);
        return;
      }

      setStoreId(safeStoreId);
      await loadInsights(safeStoreId);
      setLoading(false);

      // Gera/atualiza insights em background sem bloquear a exibição inicial
      generateInsights(safeStoreId);
    }

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const handleManualRefresh = () => {
    if (storeId) generateInsights(storeId);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0091ff] border-t-transparent dark:border-[#ff7a29]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header com chamada IA */}
      <div className="bg-white dark:bg-[#1a1f35] border border-slate-200 dark:border-[#ff7a29]/30 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="w-[45px] h-[45px] rounded-2xl bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/20 text-[#0091ff] dark:text-[#ff7a29] flex items-center justify-center shrink-0">
            <Sparkles className="w-[22px] h-[22px] animate-pulse" />
          </div>
          <div>
            <h3 className="text-[18px] font-black text-slate-900 dark:text-white flex items-center gap-2">
              Vidlytics AI Insights
            </h3>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Análise inteligente do comportamento dos seus Stories nos últimos <strong>{timeRange === '30d' ? '30 dias' : '7 dias'}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 px-3 py-2 text-[12px] font-black text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Analisando...' : 'Atualizar'}
          </button>
          <span className="inline-flex items-center gap-1.5 bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border border-[#0091ff]/20 dark:border-[#ff7a29]/30 text-[#0091ff] dark:text-[#ff7a29] px-4 py-2 rounded-2xl text-[12px] font-black">
            <Zap className="w-4 h-4 fill-current" /> Motor de Regras Ativo
          </span>
        </div>
      </div>

      {/* Estado vazio */}
      {insights.length === 0 && !refreshing && (
        <Card className="rounded-2xl border border-slate-200 dark:border-[#ff7a29]/30 bg-white dark:bg-[#1a1f35]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <VideoIcon className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              Sem insights para este período
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Precisamos de mais dados de visualizações e interações para gerar análises confiáveis. Volte em breve ou clique em "Atualizar".
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid de Recomendações */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {insights.map((insight) => {
            const IconComponent = ICONS_BY_TYPE[insight.insight_type] || Lightbulb;
            return (
              <Card
                key={insight.id}
                className={cn(
                  'rounded-2xl border bg-white dark:bg-[#1a1f35] p-5 shadow-xs transition-all duration-300 flex flex-col justify-between hover:shadow-md',
                  insight.insight_type === 'success' && 'border-slate-200 dark:border-[#ff7a29]/30 hover:border-emerald-500/50',
                  insight.insight_type === 'warning' && 'border-slate-200 dark:border-[#ff7a29]/30 hover:border-amber-500/50',
                  insight.insight_type === 'tip' && 'border-slate-200 dark:border-[#ff7a29]/30 hover:border-[#0091ff]/50 dark:hover:border-[#ff7a29]/50'
                )}
              >
                <div>
                  <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
                    <span className={cn(
                      'text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-2xl border',
                      insight.insight_type === 'success' && 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15',
                      insight.insight_type === 'warning' && 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/15',
                      insight.insight_type === 'tip' && 'text-[#0091ff] dark:text-[#ff7a29] bg-[#0091ff]/5 dark:bg-[#ff7a29]/5 border-[#0091ff]/10 dark:border-[#ff7a29]/15'
                    )}>
                      {insight.impact_label}
                    </span>
                    <div className={cn(
                      'w-[45px] h-[45px] rounded-2xl flex items-center justify-center shrink-0 border',
                      insight.insight_type === 'success' && 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                      insight.insight_type === 'warning' && 'bg-amber-50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
                      insight.insight_type === 'tip' && 'bg-[#0091ff]/10 dark:bg-[#ff7a29]/10 border-[#0091ff]/20 dark:border-[#ff7a29]/20 text-[#0091ff] dark:text-[#ff7a29]'
                    )}>
                      <IconComponent className="w-[22px] h-[22px]" />
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 pt-2">
                    <h4 className="text-[16px] font-black text-slate-800 dark:text-white leading-tight">
                      {insight.title}
                    </h4>
                    <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                      {insight.description}
                    </p>
                  </CardContent>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#ff7a29]/20 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Ação Sugerida:</span>
                  <span className="text-[12px] font-black text-[#0091ff] dark:text-[#ff7a29] flex items-center gap-1">
                    {insight.action_text} <ChevronRight size={14} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
