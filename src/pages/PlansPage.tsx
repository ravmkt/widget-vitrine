import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  ArrowLeft, 
  Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { showSuccess, showError, showWarning } from '@/lib/toast';

type BillingCycle = 'monthly' | 'semiannual' | 'annual';

export function PlansPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  const [storeId, setStoreId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  
  // Estado para controlar a periodicidade selecionada
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  // Carrega a lista oficial de planos do Supabase e o plano atual da loja
  useEffect(() => {
    const loadPlansData = async () => {
      try {
        setLoading(true);

        // 1. Resolve o storeId ativo com segurança multi-tenant
        let activeStoreId =
          localStorage.getItem('vidlytics_current_store_id') ||
          localStorage.getItem('current_store_id') ||
          localStorage.getItem('store_id');

        if (!activeStoreId && supabase) {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;
          if (user) {
            const { data: userStore } = await supabase
              .from('stores')
              .select('id, plan_id')
              .eq('owner_user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (userStore) {
              activeStoreId = userStore.id;
              setCurrentPlanId(userStore.plan_id);
              localStorage.setItem('vidlytics_current_store_id', userStore.id);
            }
          }
        }

        if (activeStoreId) {
          setStoreId(activeStoreId);
        }

        if (supabase) {
          // 2. Se já tem o activeStoreId, busca o plano atual da loja
          if (activeStoreId) {
            const { data: storeRow } = await supabase
              .from('stores')
              .select('plan_id')
              .eq('id', activeStoreId)
              .maybeSingle();

            if (storeRow?.plan_id) {
              setCurrentPlanId(storeRow.plan_id);
            }
          }

          // 3. Busca todos os planos cadastrados ordenados por preço (independente de loja)
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

  // Simula e calcula o preço mensal proporcional e o total do ciclo com base na escolha
  const calculatePrice = (priceCents: number, cycle: BillingCycle) => {
    const basePrice = priceCents / 100;
    
    if (cycle === 'semiannual') {
      const monthlyDiscounted = basePrice * 0.90; // 10% de desconto no preço mensal
      return {
        monthly: monthlyDiscounted,
        total: monthlyDiscounted * 6,
        text: 'semestral'
      };
    }
    
    if (cycle === 'annual') {
      const monthlyDiscounted = basePrice * 0.80; // 20% de desconto no preço mensal
      return {
        monthly: monthlyDiscounted,
        total: monthlyDiscounted * 12,
        text: 'anual'
      };
    }

    return {
      monthly: basePrice,
      total: basePrice,
      text: 'mensal'
    };
  };

  // Processa o Checkout e Assinatura via Edge Function do Asaas
  const handleSelectPlan = async (
    targetPlan: any, 
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED'
  ) => {
    console.log('🔥 handleSelectPlan CHAMADO', targetPlan.id, 'Ciclo:', billingCycle);
    if (!storeId || !supabase) return;
    if (targetPlan.id === currentPlanId) return;

    try {
      setUpdatingPlanId(targetPlan.id);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        showError('Sessão expirada. Faça login novamente.');
        navigate('/login');
        return;
      }

      // Invoca a Edge Function do Asaas enviando o plano, loja e a periodicidade escolhida
      const { data, error } = await supabase.functions.invoke('create-asaas-subscription', {
        body: {
          plan_id: targetPlan.id,
          store_id: storeId,
          billing_type: billingType,
          billing_cycle: billingCycle.toUpperCase() // Passa 'MONTHLY', 'SEMIANNUAL' ou 'ANNUAL'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Extrai a resposta mesmo em caso de erro HTTP 400
      let responseBody = data;
      if (error && (error as any).context) {
        try {
          responseBody = await (error as any).context.json();
        } catch (_) {}
      }

      // Tratamento de Dados Fiscais Pendentes
      if (responseBody?.error === 'DADOS_FISCAIS_OBRIGATORIOS') {
        showWarning(responseBody.message || 'Preencha seus dados de faturamento (CPF/CNPJ) antes de assinar.');
        navigate('/billing');
        return;
      }

      if (error || responseBody?.error) {
        console.error('Erro ao invocar create-asaas-subscription:', error || responseBody);
        showError(responseBody?.message || 'Erro ao processar sua assinatura. Tente novamente.');
        return;
      }

      if (data?.invoice_url) {
        showSuccess('Redirecionando para o checkout do Asaas...');
        window.location.href = data.invoice_url;
      } else {
        showError('Assinatura criada, mas não foi possível gerar o link de pagamento.');
      }
    } catch (err: any) {
      console.error('Erro inesperado ao escolher plano:', err);
      showError('Erro inesperado. Tente novamente em alguns instantes.');
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
        <Loader2 className="h-8 w-8 animate-spin text-[#0091ff]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 pb-20 font-sans animate-fade-in">
      {/* ── CABEÇALHO & RETORNO ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/billing')}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-[#8a90a0] transition-colors hover:text-[#0091ff] dark:hover:text-[#ff7a29] mb-4 group cursor-pointer"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Voltar para Minha Assinatura
        </button>

        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#0091ff] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-3.5 py-1 rounded-full border border-blue-100 dark:border-[#ff7a29]/25 dark:shadow-[0_0_12px_rgba(255,122,41,0.2)]">
            Planos & Assinaturas
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Escolha o melhor plano para o seu negócio
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-[#c0c5d4]">
            Faça upgrade ou downgrade a qualquer momento com cálculo proporcional automático.
          </p>

          {/* ── SELETOR DE PERIODICIDADE (SWITCH) ── */}
          <div className="flex justify-center pt-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#131725] rounded-2xl border border-slate-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all duration-200",
                  billingCycle === 'monthly'
                    ? "bg-white dark:bg-[#1a1f35] text-[#0091ff] dark:text-[#ff7a29] shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:text-[#8a90a0] dark:hover:text-white"
                )}
              >
                Mensal
              </button>
              
              <button
                type="button"
                onClick={() => setBillingCycle('semiannual')}
                className={cn(
                  "px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-1.5",
                  billingCycle === 'semiannual'
                    ? "bg-white dark:bg-[#1a1f35] text-[#0091ff] dark:text-[#ff7a29] shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:text-[#8a90a0] dark:hover:text-white"
                )}
              >
                Semestral
                <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md font-black">
                  -10%
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={cn(
                  "px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-1.5",
                  billingCycle === 'annual'
                    ? "bg-white dark:bg-[#1a1f35] text-[#0091ff] dark:text-[#ff7a29] shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:text-[#8a90a0] dark:hover:text-white"
                )}
              >
                Anual
                <span className="text-[9px] bg-[#ff7a29] text-white px-1.5 py-0.5 rounded-md font-black">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID DE CARDS MODULARES DE PLANOS ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-4 items-stretch">
        {plans.map((p, idx) => {
          const isCurrent = p.id === currentPlanId;
          const isUpdating = updatingPlanId === p.id;
          const isPopular = p.is_popular || p.slug === 'nivel_2' || idx === 1;

          // Calcula os valores com desconto com base no ciclo selecionado
          const priceDetails = calculatePrice(p.price_cents, billingCycle);

          return (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 shadow-sm",
                isPopular
                  ? "border-[#0091ff] dark:border-[#ff7a29]/70 shadow-lg shadow-blue-500/10 dark:shadow-[0_12px_35px_rgba(255,122,41,0.22)] ring-1 ring-[#0091ff]/30 dark:ring-[#ff7a29]/30"
                  : "border-slate-200 dark:border-orange-500/15 dark:hover:border-orange-500/35 dark:hover:shadow-[0_10px_25px_rgba(255,122,41,0.1)]",
                isCurrent && "bg-slate-50/70 dark:bg-[#1a1f35]/95"
              )}
            >
              {/* Badge Arredondado "Mais Popular" Dual-Theme */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0091ff] dark:bg-[#ff7a29] px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-blue-500/30 dark:shadow-orange-500/40">
                  Mais Popular
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {p.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/40 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Atual
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-all duration-300">
                      R$ {priceDetails.monthly.toFixed(0)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">/mês</span>
                  </div>
                  
                  {/* Informativo de Cobrança do Ciclo Selecionado */}
                  {billingCycle !== 'monthly' ? (
                    <span className="text-[10px] font-bold text-emerald-500 mt-1">
                      Cobrado R$ {priceDetails.total.toFixed(2).replace('.', ',')} {priceDetails.text}mente
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#8a90a0] mt-1">
                      Cobrado mensalmente
                    </span>
                  )}
                </div>

                {/* Lista de Recursos com Checkmark Dual-Theme */}
                <div className="mt-6 space-y-3.5 border-t border-slate-100 dark:border-white/5 pt-5">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-[#c0c5d4]">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#0091ff] dark:bg-[#ff7a29] text-white shrink-0 shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                      <Check size={11} className="text-white stroke-[3]" />
                    </div>
                    <span><strong className="text-slate-900 dark:text-white">{(p.views_limit / 1000).toFixed(0)}k</strong> visualizações/mês</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-[#c0c5d4]">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#0091ff] dark:bg-[#ff7a29] text-white shrink-0 shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                      <Check size={11} className="text-white stroke-[3]" />
                    </div>
                    <span><strong className="text-slate-900 dark:text-white">{p.pages_limit}</strong> páginas ativas</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-[#c0c5d4]">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#0091ff] dark:bg-[#ff7a29] text-white shrink-0 shadow-xs shadow-blue-500/20 dark:shadow-orange-500/30">
                      <Check size={11} className="text-white stroke-[3]" />
                    </div>
                    <span><strong className="text-slate-900 dark:text-white">{formatSize(p.storage_limit_bytes)}</strong> armazenamento</span>
                  </div>
                </div>
              </div>

              {/* Botão de Ação Dual-Theme */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  disabled={isCurrent || !!updatingPlanId}
                  onClick={() => handleSelectPlan(p)}
                  className={cn(
                    "w-full rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
                    isCurrent
                      ? "bg-slate-100 dark:bg-[#111524] text-slate-400 dark:text-slate-500 border border-transparent dark:border-white/5 cursor-default shadow-none"
                      : isPopular
                      ? "bg-[#0091ff] hover:bg-[#0070f3] dark:bg-[#ff7a29] dark:hover:bg-[#e05e10] text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02]"
                      : "bg-slate-100 dark:bg-[#111524] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:border-[#0091ff] dark:hover:border-[#ff7a29]/60 hover:bg-slate-200 dark:hover:bg-white/5 shadow-xs"
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
