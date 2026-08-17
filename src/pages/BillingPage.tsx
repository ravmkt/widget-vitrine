import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  HardDrive, 
  Eye, 
  FileCode,
  Save,
  Loader2,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

export function BillingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingFiscal, setSavingFiscal] = useState(false);

  // Estados de Assinatura & Plano
  const [storeId, setStoreId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trialing');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Consumo Real
  const [storageUsedBytes, setStorageUsedBytes] = useState<number>(0);
  const [storageLimitBytes, setStorageLimitBytes] = useState<number>(1073741824); // 1 GB fallback

  // Formulário de Dados Fiscais
  const [fiscalData, setFiscalData] = useState({
    cnpj_cpf: '',
    legal_name: '',
    email: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // Utilitário de formatação de bytes
  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

// Carrega todos os dados financeiros
  useEffect(() => {
    const loadBillingData = async () => {
      try {
        setLoading(true);
        if (!supabase) {
          console.error('[Billing] Cliente Supabase não inicializado.');
          return;
        }

        // 1. Resolve o store_id da loja ativa com amarração ao usuário autenticado
        let activeStoreId =
          localStorage.getItem('vidlytics_current_store_id') ||
          localStorage.getItem('current_store_id') ||
          localStorage.getItem('store_id');

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!activeStoreId && user) {
          const { data: userStore } = await supabase
            .from('stores')
            .select('id')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (userStore) {
            activeStoreId = userStore.id;
            localStorage.setItem('vidlytics_current_store_id', userStore.id);
          }
        }

        if (!activeStoreId) {
          console.warn('[Billing] Nenhuma loja localizada para carregar faturamento.');
          return;
        }

        setStoreId(activeStoreId);

        // 2. Busca dados da loja, plano e status oficial da assinatura via maybeSingle
        const { data: storeRow, error: storeErr } = await supabase
          .from('stores')
          .select('storage_used_bytes, storage_limit_bytes, plan_id, subscription_status, trial_ends_at, plans(*)')
          .eq('id', activeStoreId)
          .maybeSingle();

        if (storeErr) {
          console.error('[Billing] Erro ao buscar loja:', storeErr);
        }

        if (storeRow) {
          setStorageUsedBytes(Number(storeRow.storage_used_bytes || 0));
          if (storeRow.storage_limit_bytes) {
            setStorageLimitBytes(Number(storeRow.storage_limit_bytes));
          }
          if (storeRow.subscription_status) {
            setSubscriptionStatus(storeRow.subscription_status);
          }
          setTrialEndsAt(storeRow.trial_ends_at || null);

          if ((storeRow as any).plans) {
            setPlan((storeRow as any).plans);
            if ((storeRow as any).plans?.storage_limit_bytes) {
              setStorageLimitBytes(Number((storeRow as any).plans.storage_limit_bytes));
            }
          }
        }

        // 3. Busca Assinatura Corrente mais recente
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('store_id', activeStoreId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subData) {
          setSubscription(subData);
          if (subData.plans) {
            setPlan(subData.plans);
            if (subData.plans?.storage_limit_bytes) {
              setStorageLimitBytes(Number(subData.plans.storage_limit_bytes));
            }
          }
        }

        // 4. Busca Histórico de Faturas
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('store_id', activeStoreId)
          .order('created_at', { ascending: false });

        setInvoices(invData || []);

        // 5. Busca Dados Fiscais
        const { data: billData } = await supabase
          .from('billing_info')
          .select('*')
          .eq('store_id', activeStoreId)
          .maybeSingle();

        if (billData) {
          setFiscalData({
            cnpj_cpf: billData.cnpj_cpf || '',
            legal_name: billData.legal_name || '',
            email: billData.email || '',
            phone: billData.phone || '',
            cep: billData.cep || '',
            address: billData.address || '',
            number: billData.number || '',
            complement: billData.complement || '',
            neighborhood: billData.neighborhood || '',
            city: billData.city || '',
            state: billData.state || '',
          });
        }
      } catch (err) {
        console.error('Erro ao carregar módulo financeiro:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBillingData();
  }, []);
  
  // Salvar Dados Fiscais
  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !supabase) return;

    try {
      setSavingFiscal(true);
      const payload = {
        store_id: storeId,
        ...fiscalData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('billing_info')
        .upsert(payload, { onConflict: 'store_id' });

      if (error) throw error;
      showSuccess('Dados fiscais atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar dados fiscais:', err);
      showError(err.message || 'Falha ao salvar dados fiscais.');
    } finally {
      setSavingFiscal(false);
    }
  };

  const storagePct = useMemo(() => {
    if (!storageLimitBytes || storageLimitBytes === 0) return 0;
    return Math.min(100, Number(((storageUsedBytes / storageLimitBytes) * 100).toFixed(1)));
  }, [storageUsedBytes, storageLimitBytes]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 pb-20">
{/* Banner de Alerta para Assinaturas Canceladas ou Pendentes */}
      {subscriptionStatus === 'canceled' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-5 dark:border-red-950/60 dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-md shadow-red-500/20">
              <XCircle size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-900 dark:text-red-300">Assinatura Cancelada</h3>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                Os widgets de vídeo estão pausados na sua loja virtual. Assine um plano para reativá-los imediatamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700"
          >
            <Sparkles size={15} />
            Reativar Assinatura
          </button>
        </div>
      )}

      {subscriptionStatus === 'past_due' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-950/60 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 dark:text-amber-300">Pagamento Pendente</h3>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Identificamos uma fatura pendente. Regularize o pagamento para evitar o bloqueio dos widgets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/plans')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:bg-amber-700"
          >
            Regularizar Pagamento
          </button>
        </div>
      )}

{/* ── CABEÇALHO DA PÁGINA (DUAL-THEME: AZUL NO LIGHT / LARANJA NO DARK) ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Minha Assinatura & Financeiro
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-[#c0c5d4] mt-1">
            Gerencie seu plano atual, acompanhe o consumo de recursos e visualize seu histórico de faturas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
        >
          <Sparkles size={16} className="!text-white stroke-[2.5]" />
          Alterar / Fazer Upgrade
        </button>
      </div>

      {/* ── MÓDULOS SUPERIORES: PLANO ATUAL & CONSUMO DE RECURSOS (DUAL-THEME) ── */}
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {/* Card: Detalhes do Plano */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
              <span className="rounded-full bg-blue-50 dark:bg-[#ff7a29]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0094EB] dark:text-[#ff7a29] border border-blue-100 dark:border-[#ff7a29]/20">
                Plano Atual
              </span>

              {/* Badge de Status */}
              {subscriptionStatus === 'active' && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/40 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Ativo
                </span>
              )}
              {subscriptionStatus === 'canceled' && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-700/40 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:text-rose-400">
                  <XCircle size={13} /> Cancelada
                </span>
              )}
              {subscriptionStatus === 'past_due' && (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/40 px-2.5 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={13} /> Pendente
                </span>
              )}
              {subscriptionStatus === 'trialing' && (
                <span className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-[#ff7a29]/15 border border-blue-100 dark:border-[#ff7a29]/25 px-2.5 py-0.5 text-xs font-black text-[#0094EB] dark:text-[#ff7a29]">
                  <Clock size={13} /> Em Teste
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {plan?.name ? `Plano ${plan.name}` : 'Plano Iniciante'}
            </h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-[#0094EB] dark:text-[#ff7a29] tracking-tight">
                R$ {plan?.price_cents !== undefined ? (plan.price_cents / 100).toFixed(2).replace('.', ',') : '0,00'}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]">/mês</span>
            </div>

            <p className="mt-3 text-xs font-medium text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
              {subscriptionStatus === 'canceled' ? (
                <span className="text-rose-500 font-black">Assinatura desativada</span>
              ) : subscriptionStatus === 'trialing' ? (
                <>
                  Período de teste até:{' '}
                  <strong className="text-slate-800 dark:text-white font-bold">
                    {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('pt-BR') : '14 dias'}
                  </strong>
                </>
              ) : (
                <>
                  Próxima renovação em:{' '}
                  <strong className="text-slate-800 dark:text-white font-bold">
                    {subscription?.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                      : 'Em 30 dias'}
                  </strong>
                </>
              )}
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-white/5 pt-4">
            <button
              type="button"
              onClick={() => navigate('/plans')}
              className="flex w-full items-center justify-between text-xs font-black text-[#0094EB] dark:text-[#ff7a29] hover:underline cursor-pointer"
            >
              <span>Ver comparativo de planos</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Card: Consumo de Recursos */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 sm:p-7 shadow-sm md:col-span-2 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Consumo de Recursos
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/40 px-3 py-0.5 rounded-full">
              {formatSize(Math.max(0, storageLimitBytes - storageUsedBytes))} livres
            </span>
          </div>

          {/* Destaque de Armazenamento com Barra Shimmer */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_12px_rgba(255,122,41,0.35)] shrink-0">
                  <HardDrive size={18} className="!text-white stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    Armazenamento em Nuvem
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#8a90a0]">
                    Vídeos, mídias e assets
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-black text-slate-900 dark:text-white block">
                  {formatSize(storageUsedBytes)}
                  <span className="text-xs font-bold text-slate-400 dark:text-[#8a90a0]"> / {formatSize(storageLimitBytes)}</span>
                </span>
                <span className={cn(
                  "text-[11px] font-black",
                  storagePct >= 90 ? "text-rose-500" : storagePct >= 70 ? "text-[#ff7a29]" : "text-[#0094EB] dark:text-[#ff7a29]"
                )}>
                  {storagePct}% utilizado
                </span>
              </div>
            </div>

            {/* Barra de Progresso no padrão do dashboard */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#1a1f35] p-0.5 border border-transparent dark:border-white/5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 animate-shimmer",
                  storagePct >= 90 ? "!bg-[#ef4444]" : storagePct >= 70 ? "!bg-[#ff7a29]" : "!bg-[#22c55e]"
                )}
                style={{ width: `${Math.max(1, storagePct)}%` }}
              />
            </div>
          </div>

          {/* Cards de Métricas Secundárias */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-[#8a90a0]">
                <Eye size={16} className="text-[#0094EB] dark:text-[#ff7a29]" />
                <span className="text-xs font-bold">Limite de Views</span>
              </div>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                {plan?.views_limit ? `${(plan.views_limit / 1000).toFixed(0)}k views` : '10k views'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#0f1220]/70 p-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-[#8a90a0]">
                <FileCode size={16} className="text-[#0094EB] dark:text-[#ff7a29]" />
                <span className="text-xs font-bold">Páginas Ativas</span>
              </div>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                {plan?.pages_limit ? `${plan.pages_limit} páginas` : '100 páginas'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
{/* ── HISTÓRICO DE FATURAS (MODULAR NO PADRÃO TOP VÍDEOS DASHBOARD) ── */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div 
              style={{ backgroundColor: '#ff7a29' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,122,41,0.4)] shrink-0"
            >
              <Receipt size={18} className="!text-white stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Histórico de Faturas
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0]">
                Demonstrativo financeiro dos ciclos e pagamentos processados.
              </p>
            </div>
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-[#0094EB] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-3 py-1 rounded-full border border-blue-100 dark:border-[#ff7a29]/20">
            {invoices.length} {invoices.length === 1 ? 'Fatura' : 'Faturas'}
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-[#8a90a0]">
            Nenhuma fatura anterior registrada para esta loja.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1220]/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                  <th className="px-6 py-4 rounded-l-2xl">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right rounded-r-2xl">Nota Fiscal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600 dark:text-[#c0c5d4]">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-black text-xs text-slate-800 dark:text-[#e8ecf4]">
                      {inv.description}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-xs text-slate-900 dark:text-white">
                      R$ {(inv.amount_cents / 100).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {inv.status === 'paid' ? 'Pago' : inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.invoice_pdf_url ? (
                        <a
                          href={inv.invoice_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-black text-xs text-[#0094EB] dark:text-[#ff7a29] hover:underline"
                        >
                          Visualizar PDF &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-[#8a90a0] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DADOS DA NOTA FISCAL (MODULAR NO PADRÃO VIDLYTICS) ── */}
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
          <div 
            style={{ backgroundColor: '#ff7a29' }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,122,41,0.4)] shrink-0"
          >
            <Building2 size={18} className="!text-white stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Dados da Nota Fiscal
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-[#8a90a0]">
              Informações fiscais e cadastrais utilizadas na emissão das suas faturas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveFiscal} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1.5">
                CNPJ ou CPF
              </label>
              <input
                type="text"
                value={fiscalData.cnpj_cpf}
                onChange={(e) => setFiscalData({ ...fiscalData, cnpj_cpf: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#ff7a29]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1.5">
                Nome / Razão Social
              </label>
              <input
                type="text"
                value={fiscalData.legal_name}
                onChange={(e) => setFiscalData({ ...fiscalData, legal_name: e.target.value })}
                placeholder="Nome da sua empresa"
                className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#ff7a29]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1.5">
                E-mail de Cobrança
              </label>
              <input
                type="email"
                value={fiscalData.email}
                onChange={(e) => setFiscalData({ ...fiscalData, email: e.target.value })}
                placeholder="financeiro@empresa.com"
                className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#ff7a29]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1.5">
                CEP
              </label>
              <input
                type="text"
                value={fiscalData.cep}
                onChange={(e) => setFiscalData({ ...fiscalData, cep: e.target.value })}
                placeholder="00000-000"
                className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#ff7a29]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1.5">
                Endereço
              </label>
              <input
                type="text"
                value={fiscalData.address}
                onChange={(e) => setFiscalData({ ...fiscalData, address: e.target.value })}
                placeholder="Rua, Avenida..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#ff7a29]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0] mb-1.5">
                Número
              </label>
              <input
                type="text"
                value={fiscalData.number}
                onChange={(e) => setFiscalData({ ...fiscalData, number: e.target.value })}
                placeholder="123"
                className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f1220] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#ff7a29]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="submit"
              disabled={savingFiscal}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-[#0f1220] border border-slate-200 dark:border-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white hover:border-[#ff7a29]/60 hover:bg-slate-200 dark:hover:bg-white/5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {savingFiscal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Atualizar Dados Fiscais
            </button>
          </div>
        </form>
      </div>
          </div>
  );
}
