import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
Building2
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { showSuccess, showError } from '@/utils/toast';

export function BillingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingFiscal, setSavingFiscal] = useState(false);

  // Estados de Assinatura & Plano
  const [storeId, setStoreId] = useState<string | null>(null);
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
        const settings = await db.getSettings();
        if (!settings?.store_id) return;
        setStoreId(settings.store_id);

        if (supabase) {
          // 1. Busca dados da loja e plano ativo
          const { data: storeRow } = await supabase
            .from('stores')
            .select('storage_used_bytes, storage_limit_bytes, plan_id')
            .eq('id', settings.store_id)
            .single();

          if (storeRow) {
            setStorageUsedBytes(Number(storeRow.storage_used_bytes || 0));
            if (storeRow.storage_limit_bytes) {
              setStorageLimitBytes(Number(storeRow.storage_limit_bytes));
            }
          }

          // 2. Busca Assinatura Corrente e sincroniza o limite oficial do plano
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*, plans(*)')
            .eq('store_id', settings.store_id)
            .eq('is_current', true)
            .maybeSingle();

          if (subData) {
            setSubscription(subData);
            setPlan(subData.plans);
            if (subData.plans?.storage_limit_bytes) {
              setStorageLimitBytes(Number(subData.plans.storage_limit_bytes));
            }
          }

          // 3. Busca Histórico de Faturas
          const { data: invData } = await supabase
            .from('invoices')
            .select('*')
            .eq('store_id', settings.store_id)
            .order('created_at', { ascending: false });

          setInvoices(invData || []);

          // 4. Busca Dados Fiscais
          const { data: billData } = await supabase
            .from('billing_info')
            .select('*')
            .eq('store_id', settings.store_id)
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
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Minha Assinatura & Financeiro</h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gerencie seu plano atual, acompanhe o consumo de recursos e gerencie faturas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0094EB] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#0E4787]"
        >
          <Sparkles size={16} />
          Alterar / Fazer Upgrade de Plano
        </button>
      </div>

      {/* Card do Plano Ativo & Consumo de Recursos */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Detalhes do Plano */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-[#0094EB] dark:bg-blue-950/40">
                Plano Ativo
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={14} /> Ativo
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              {plan?.name ? `Plano ${plan.name}` : 'Plano Pro'}
            </h2>
            <p className="mt-1 text-3xl font-black text-[#0094EB]">
              R$ {plan?.price_cents ? (plan.price_cents / 100).toFixed(2).replace('.', ',') : '97,00'}
              <span className="text-xs font-bold text-slate-400">/mês</span>
            </p>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Renovação em:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                  : 'Em 30 dias'}
              </strong>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => navigate('/plans')}
              className="flex w-full items-center justify-between text-xs font-bold text-[#0094EB] hover:underline"
            >
              Ver comparativo de planos <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Consumo de Cotas / Limites com Destaque em Armazenamento */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Consumo de Recursos</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
              {formatSize(Math.max(0, storageLimitBytes - storageUsedBytes))} livres
            </span>
          </div>

          {/* Card Destacado de Armazenamento */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0094EB] text-white shadow-md shadow-blue-500/20">
                  <HardDrive size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Armazenamento em Nuvem</span>
                  <span className="text-[10px] font-semibold text-slate-400">Vídeos, mídias e assets</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900 dark:text-white block">
                  {formatSize(storageUsedBytes)}
                  <span className="text-xs font-bold text-slate-400"> / {formatSize(storageLimitBytes)}</span>
                </span>
                <span className="text-[10px] font-bold text-[#0094EB]">
                  {storagePct}% utilizado
                </span>
              </div>
            </div>

            {/* Barra de Progresso Encorpada */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 shadow-sm",
                  storagePct > 90 
                    ? "bg-red-500" 
                    : storagePct > 70 
                    ? "bg-amber-500" 
                    : "bg-[#0094EB]"
                )}
                style={{ width: `${Math.max(1, storagePct)}%` }}
              />
            </div>
          </div>

          {/* Cards de Métricas Secundárias */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Eye size={16} className="text-[#0094EB]" />
                <span className="text-xs font-bold">Limite de Views</span>
              </div>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                {plan?.views_limit ? `${(plan.views_limit / 1000).toFixed(0)}k views` : '10k views'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <FileCode size={16} className="text-[#0094EB]" />
                <span className="text-xs font-bold">Páginas Ativas</span>
              </div>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                {plan?.pages_limit ? `${plan.pages_limit} páginas` : '100 páginas'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Faturas */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-[#0094EB]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Histórico de Faturas</h3>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            Nenhuma fatura anterior registrada para esta loja.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 font-bold">Data</th>
                  <th className="py-2.5 font-bold">Descrição</th>
                  <th className="py-2.5 font-bold">Valor</th>
                  <th className="py-2.5 font-bold">Status</th>
                  <th className="py-2.5 font-bold text-right">Nota Fiscal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-semibold text-slate-600 dark:text-slate-300">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-white">{inv.description}</td>
                    <td className="py-3 font-black text-slate-900 dark:text-white">
                      R$ {(inv.amount_cents / 100).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40">
                        {inv.status === 'paid' ? 'Pago' : inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {inv.invoice_pdf_url ? (
                        <a
                          href={inv.invoice_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#0094EB] hover:underline"
                        >
                          Visualizar
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dados Fiscais para Faturamento */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[#0094EB]" />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Dados da Nota Fiscal</h3>
            <p className="text-[11px] font-semibold text-slate-400">Informações utilizadas na emissão das faturas.</p>
          </div>
        </div>

        <form onSubmit={handleSaveFiscal} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">CNPJ ou CPF</label>
              <input
                type="text"
                value={fiscalData.cnpj_cpf}
                onChange={(e) => setFiscalData({ ...fiscalData, cnpj_cpf: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nome / Razão Social</label>
              <input
                type="text"
                value={fiscalData.legal_name}
                onChange={(e) => setFiscalData({ ...fiscalData, legal_name: e.target.value })}
                placeholder="Nome da sua empresa"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">E-mail de Cobrança</label>
              <input
                type="email"
                value={fiscalData.email}
                onChange={(e) => setFiscalData({ ...fiscalData, email: e.target.value })}
                placeholder="financeiro@empresa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">CEP</label>
              <input
                type="text"
                value={fiscalData.cep}
                onChange={(e) => setFiscalData({ ...fiscalData, cep: e.target.value })}
                placeholder="00000-000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Endereço</label>
              <input
                type="text"
                value={fiscalData.address}
                onChange={(e) => setFiscalData({ ...fiscalData, address: e.target.value })}
                placeholder="Rua, Avenida..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Número</label>
              <input
                type="text"
                value={fiscalData.number}
                onChange={(e) => setFiscalData({ ...fiscalData, number: e.target.value })}
                placeholder="123"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none transition focus:border-[#0094EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingFiscal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
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
