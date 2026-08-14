import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  Sparkles, 
  ArrowLeft, 
  Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

export function PlansPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

  // Carrega a lista oficial de planos do Supabase e o plano atual da loja
  useEffect(() => {
    const loadPlansData = async () => {
      try {
        setLoading(true);
        const settings = await db.getSettings();
        if (!settings?.store_id) return;
        setStoreId(settings.store_id);

        if (supabase) {
          // 1. Busca dados da loja para identificar o plano atual
          const { data: storeRow } = await supabase
            .from('stores')
            .select('plan_id')
            .eq('id', settings.store_id)
            .single();

          if (storeRow) {
            setCurrentPlanId(storeRow.plan_id);
          }

          // 2. Busca todos os planos cadastrados ordenados por preço
          const { data: plansData, error: plansErr } = await supabase
            .from('plans')
            .select('*')
            .order('price_cents', { ascending: true });

          if (plansErr) throw plansErr;
          setPlans(plansData || []);
        }
      } catch (err) {
        console.error('Erro ao carregar vitrine de planos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlansData();
  }, []);

  // Processa a troca de plano (Upgrade / Downgrade)
  const handleSelectPlan = async (targetPlan: any) => {
    if (!storeId || !supabase) return;
    if (targetPlan.id === currentPlanId) return;

    try {
      setUpdatingPlanId(targetPlan.id);

      // 1. Desativa a assinatura corrente anterior (respeita o índice único parcial)
      await supabase
        .from('subscriptions')
        .update({ is_current: false })
        .eq('store_id', storeId)
        .eq('is_current', true);

      // 2. Cria o novo registro de assinatura ativa (Trigger atualiza stores.plan_id no banco)
      const { error: subErr } = await supabase
        .from('subscriptions')
        .insert([{
          store_id: storeId,
          plan_id: targetPlan.id,
          status: 'active',
          is_current: true,
          billing_cycle: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }]);

      if (subErr) throw subErr;

      setCurrentPlanId(targetPlan.id);
      showSuccess(`Plano alterado para ${targetPlan.name} com sucesso!`);
      
      // Redireciona de volta para o Hub Financeiro
      setTimeout(() => {
        navigate('/billing');
      }, 800);
    } catch (err: any) {
      console.error('Erro ao migrar plano:', err);
      showError(err.message || 'Falha ao alterar plano.');
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb}GB`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-20">
      {/* Botão Voltar e Cabeçalho */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/billing')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={16} /> Voltar para Minha Assinatura
        </button>

        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-[#0094EB] dark:bg-blue-950/40">
            Planos & Assinaturas
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Escolha o melhor plano para o seu negócio
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Faça upgrade ou downgrade a qualquer momento com cálculo proporcional automático.
          </p>
        </div>
      </div>

      {/* Grid de Cards dos Planos */}
      <div className="grid gap-6 md:grid-cols-4 pt-4">
        {plans.map((p, idx) => {
          const isCurrent = p.id === currentPlanId;
          const isUpdating = updatingPlanId === p.id;
          const isPopular = p.is_popular || p.slug === 'nivel_2' || idx === 1;

          return (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all dark:bg-slate-950",
                isPopular
                  ? "border-[#0094EB] ring-2 ring-[#0094EB]/20 shadow-blue-500/10"
                  : "border-slate-200 dark:border-slate-800",
                isCurrent && "bg-slate-50/50 dark:bg-slate-900/30"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0094EB] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/30">
                  Mais Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {p.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:bg-emerald-950/40">
                      Atual
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    R$ {(p.price_cents / 100).toFixed(0)}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/mês</span>
                </div>

                {/* Recursos Principais */}
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Check size={14} className="text-[#0094EB] shrink-0" />
                    <span><strong>{(p.views_limit / 1000).toFixed(0)}k</strong> visualizações/mês</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Check size={14} className="text-[#0094EB] shrink-0" />
                    <span><strong>{p.pages_limit}</strong> páginas ativas</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Check size={14} className="text-[#0094EB] shrink-0" />
                    <span><strong>{formatSize(p.storage_limit_bytes)}</strong> armazenamento</span>
                  </div>
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isCurrent || !!updatingPlanId}
                  onClick={() => handleSelectPlan(p)}
                  className={cn(
                    "w-full rounded-xl py-2.5 px-4 text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2",
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-default dark:bg-slate-800 dark:text-slate-500 shadow-none"
                      : isPopular
                      ? "bg-[#0094EB] text-white hover:bg-[#0E4787] shadow-blue-500/20"
                      : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  )}
                >
                  {isUpdating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrent ? (
                    'Plano Atual'
                  ) : (
                    'Escolher Plano'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
