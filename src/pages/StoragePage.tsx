import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import {
  HardDrive,
  Eye,
  FileText,
  AlertTriangle,
  Sparkles,
  CreditCard,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface BillingData {
  planName: string;
  planPrice: number;
  trialUntil: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  viewsUsed: number;
  viewsLimit: number;
  pagesUsed: number;
  pagesLimit: number;
  cnpjCpf: string;
  companyName: string;
  billingEmail: string;
  cep: string;
  address: string;
  number: string;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [updatingFiscal, setUpdatingFiscal] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Dados com fallbacks idênticos ao seu print de tela
  const [billing, setBilling] = useState<BillingData>({
    planName: 'Plano Iniciante',
    planPrice: 59.00,
    trialUntil: '08/09/2026',
    storageUsedBytes: 97 * 1024 * 1024, // 97 MB
    storageLimitBytes: 1024 * 1024 * 1024, // 1 GB
    viewsUsed: 1250, // Exemplo de consumo real
    viewsLimit: 5000, // 5k views do print
    pagesUsed: 12, // Exemplo de consumo real
    pagesLimit: 50, // 50 páginas do print
    cnpjCpf: '00.000.000/0000-00',
    companyName: 'Nome da sua empresa',
    billingEmail: 'financeiro@empresa.com',
    cep: '00000-000',
    address: 'Rua, Avenida...',
    number: '123'
  });

  const [invoices] = useState<any[]>([]); // Histórico de faturas (vazio no print)

  // ── RESOLUÇÃO DE STORE ID ULTRA RESILIENTE ──
  const resolveStoreId = useCallback(async (): Promise<string | null> => {
    if (storeId) return storeId;
    const keys = ['vidlytics_current_store_id', 'current_store_id', 'store_id'];
    for (const key of keys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val !== 'undefined' && val !== 'null') {
        setStoreId(val);
        return val;
      }
    }
    return null;
  }, [storeId]);

  // Carrega as informações reais do banco de dados (Supabase)
  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const activeStoreId = await resolveStoreId();
      if (!activeStoreId || !supabase) {
        setLoading(false);
        return;
      }

      // 1. Busca os limites e consumo da tabela 'stores'
      const { data: storeRow, error: storeErr } = await supabase
        .from('stores')
        .select(`
          storage_used_bytes, 
          storage_limit_bytes, 
          views_used, 
          views_limit, 
          pages_used, 
          pages_limit,
          plan_id, 
          plans(name, price, storage_limit_bytes),
          trial_ends_at
        `)
        .eq('id', activeStoreId)
        .maybeSingle();

      if (!storeErr && storeRow) {
        // Busca a quantidade real de páginas criadas na loja se não houver coluna direta de cache
        let calculatedPages = Number(storeRow.pages_used || 0);
        try {
          const { count } = await supabase
            .from('pages')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', activeStoreId);
          if (count !== null) calculatedPages = count;
        } catch (_) {}

        setBilling(prev => ({
          ...prev,
          planName: (storeRow as any).plans?.name || prev.planName,
          planPrice: (storeRow as any).plans?.price || prev.planPrice,
          trialUntil: storeRow.trial_ends_at 
            ? new Date(storeRow.trial_ends_at).toLocaleDateString('pt-BR') 
            : prev.trialUntil,
          storageUsedBytes: storeRow.storage_used_bytes !== null ? Number(storeRow.storage_used_bytes) : prev.storageUsedBytes,
          storageLimitBytes: storeRow.storage_limit_bytes ? Number(storeRow.storage_limit_bytes) : prev.storageLimitBytes,
          viewsUsed: storeRow.views_used !== null ? Number(storeRow.views_used) : prev.viewsUsed,
          viewsLimit: storeRow.views_limit ? Number(storeRow.views_limit) : prev.viewsLimit,
          pagesUsed: calculatedPages,
          pagesLimit: storeRow.pages_limit ? Number(storeRow.pages_limit) : prev.pagesLimit,
        }));
      }

      // 2. Busca dados fiscais (geralmente salvos em store_settings ou store_details)
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('cnpj_cpf, company_name, billing_email, cep, address, address_number')
        .eq('store_id', activeStoreId)
        .maybeSingle();

      if (settingsData) {
        setBilling(prev => ({
          ...prev,
          cnpjCpf: settingsData.cnpj_cpf || prev.cnpjCpf,
          companyName: settingsData.company_name || prev.companyName,
          billingEmail: settingsData.billing_email || prev.billingEmail,
          cep: settingsData.cep || prev.cep,
          address: settingsData.address || prev.address,
          number: settingsData.address_number || prev.number,
        }));
      }

    } catch (err) {
      console.error('Erro ao buscar dados de faturamento:', err);
    } finally {
      setLoading(false);
    }
  }, [resolveStoreId]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Cálculos de Percentual de Consumo
  const storagePercentage = useMemo(() => {
    const pct = (billing.storageUsedBytes / billing.storageLimitBytes) * 100;
    return Math.max(0.1, Math.min(100, Number(pct.toFixed(1))));
  }, [billing]);

  const viewsPercentage = useMemo(() => {
    const pct = (billing.viewsUsed / billing.viewsLimit) * 100;
    return Math.max(0.1, Math.min(100, Number(pct.toFixed(1))));
  }, [billing]);

  const pagesPercentage = useMemo(() => {
    const pct = (billing.pagesUsed / billing.pagesLimit) * 100;
    return Math.max(0.1, Math.min(100, Number(pct.toFixed(1))));
  }, [billing]);

  // Utilitário de formatação de tamanho
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // ── REGRAS ESTABELECIDAS DE CORES BASEADAS NO CONSUMO ──
  const getResourceVisuals = (percentage: number) => {
    if (percentage >= 90) {
      return {
        colorHex: '#ef4444',
        progressBarClass: 'bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.45)]',
        bgPill: 'bg-rose-50 dark:bg-rose-950/20 text-rose-500 border-rose-200/40',
        textClass: 'text-rose-500 dark:text-rose-400'
      };
    }
    if (percentage >= 70) {
      return {
        colorHex: '#ff7a29',
        progressBarClass: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]',
        bgPill: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200/40',
        textClass: 'text-amber-600 dark:text-amber-400'
      };
    }
    return {
      colorHex: '#0094EB',
      progressBarClass: 'bg-[#0094EB] dark:bg-[#ff7a29]',
      bgPill: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200/40',
      textClass: 'text-slate-500 dark:text-[#c0c5d4]'
    };
  };

  const storageVisuals = getResourceVisuals(storagePercentage);
  const viewsVisuals = getResourceVisuals(viewsPercentage);
  const pagesVisuals = getResourceVisuals(pagesPercentage);

  const handleUpdateFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingFiscal(true);
      const activeStoreId = await resolveStoreId();
      if (!activeStoreId || !supabase) {
        throw new Error('ID da loja ou conexão indisponível.');
      }

      const { error } = await supabase
        .from('store_settings')
        .update({
          cnpj_cpf: billing.cnpjCpf,
          company_name: billing.companyName,
          billing_email: billing.billingEmail,
          cep: billing.cep,
          address: billing.address,
          address_number: billing.number,
        })
        .eq('store_id', activeStoreId);

      if (error) throw error;
      showSuccess('Dados fiscais atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar dados fiscais:', err);
      showError(err.message || 'Falha ao salvar dados fiscais.');
    } finally {
      setUpdatingFiscal(false);
    }
  };

  const handleTriggerUpgrade = () => {
    showSuccess('Redirecionando para a área de planos...');
  };

  return (
    <div className="animate-fade-in space-y-8 pb-20 font-sans">
      
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Minha Assinatura & Financeiro
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
            Gerencie seu plano atual, acompanhe o consumo de recursos e visualize seu histórico de faturas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerUpgrade}
          className="flex items-center justify-center gap-2 rounded-full bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 dark:shadow-orange-500/30 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
        >
          <Sparkles size={14} className="!text-white stroke-[2.5]" />
          Alterar / Fazer Upgrade
        </button>
      </div>

      {/* ── GRID PRINCIPAL: PLANO vs CONSUMO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD PLANO ATUAL */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35]/80 p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Plano Atual
              </span>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0094EB] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0094EB] animate-pulse" />
                Em Teste
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {billing.planName}
              </h2>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black text-[#0094EB] dark:text-[#ff7a29]">
                  R$ {billing.planPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-slate-400">/mês</span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-[#0f1220] p-4 border border-transparent dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-[#c0c5d4] leading-relaxed">
              Período de teste até: <strong className="text-slate-800 dark:text-white font-bold">{billing.trialUntil}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTriggerUpgrade}
            className="text-left text-xs font-black text-[#0094EB] dark:text-[#ff7a29] hover:underline flex items-center gap-1 mt-8 transition-all cursor-pointer"
          >
            Ver comparativo de planos
            <span className="translate-y-[0.5px]">&gt;</span>
          </button>
        </div>

        {/* CARD CONSUMO DE RECURSOS */}
        <div className="lg:col-span-2 rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35]/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Consumo de Recursos
            </span>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {formatSize(billing.storageLimitBytes - billing.storageUsedBytes)} Livres
            </span>
          </div>

          {/* 1. Armazenamento em Nuvem */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0094EB] shrink-0">
                  <HardDrive size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    Armazenamento em Nuvem
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400">Vídeos, mídias e assets</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-black text-slate-800 dark:text-white block">
                  {formatSize(billing.storageUsedBytes)} <span className="text-slate-400 font-bold">/ {formatSize(billing.storageLimitBytes)}</span>
                </span>
                {/* 🚀 FONTE DA PORCENTAGEM AUMENTADA */}
                <span className={cn("text-base font-black tracking-tight", storageVisuals.textClass)}>
                  {storagePercentage}% utilizado
                </span>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#0f1220] p-0.5 border border-transparent dark:border-white/5">
              <div
                className={cn("h-full rounded-full transition-all duration-500", storageVisuals.progressBarClass)}
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
          </div>

          {/* Sub-grid para Views e Páginas Ativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* 2. Limite de Views (PROPORCIONAL COM PROGRESSO) */}
            <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1220]/40 p-4 space-y-3.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 shrink-0">
                    <Eye size={15} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-slate-700 dark:text-[#c0c5d4] uppercase tracking-tight">
                      Limite de Views
                    </h5>
                    {/* Exibe a proporção real de views como requisitado */}
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {billing.viewsUsed.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-bold">/ {billing.viewsLimit.toLocaleString('pt-BR')}</span>
                    </p>
                  </div>
                </div>

                <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black border uppercase tracking-wider", viewsVisuals.bgPill)}>
                  {viewsPercentage}%
                </span>
              </div>

              {/* Barra de Progresso Proporcional */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-[#0f1220] p-0.5">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", viewsVisuals.progressBarClass)}
                  style={{ width: `${viewsPercentage}%` }}
                />
              </div>
            </div>

            {/* 3. Páginas Ativas (PROPORCIONAL COM PROGRESSO) */}
            <div className="rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1220]/40 p-4 space-y-3.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-500 shrink-0">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-slate-700 dark:text-[#c0c5d4] uppercase tracking-tight">
                      Páginas Ativas
                    </h5>
                    {/* Exibe a proporção real de páginas como requisitado */}
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {billing.pagesUsed} <span className="text-xs text-slate-400 font-bold">/ {billing.pagesLimit} páginas</span>
                    </p>
                  </div>
                </div>

                <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black border uppercase tracking-wider", pagesVisuals.bgPill)}>
                  {pagesPercentage}%
                </span>
              </div>

              {/* Barra de Progresso Proporcional */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-[#0f1220] p-0.5">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", pagesVisuals.progressBarClass)}
                  style={{ width: `${pagesPercentage}%` }}
                />
              </div>
            </div>

          </div>

          {/* ── BANNERS DE UPGRADE AUTOMÁTICOS (REGRAS ESTABELECIDAS) ── */}
          {(storagePercentage >= 70 || viewsPercentage >= 70 || pagesPercentage >= 70) && (
            <div
              className={cn(
                'flex items-start gap-3 rounded-2xl p-4 text-xs font-bold leading-relaxed border animate-fade-in',
                (storagePercentage >= 90 || viewsPercentage >= 90 || pagesPercentage >= 90)
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-rose-500/20'
                  : 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border-orange-500/20'
              )}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  {(storagePercentage >= 90 || viewsPercentage >= 90 || pagesPercentage >= 90)
                    ? 'Limite Crítico Atingido! Você alcançou 90% ou mais de seus recursos disponíveis. Faça um upgrade agora para evitar pausas na exibição dos seus Stories.'
                    : 'Atenção! Você ultrapassou 70% do limite de seus recursos em uso. Considere fazer um upgrade preventivo.'}
                </p>
                <button
                  type="button"
                  onClick={handleTriggerUpgrade}
                  className="text-xs font-black underline hover:opacity-80 block cursor-pointer"
                >
                  Fazer Upgrade do Plano &rarr;
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── HISTÓRICO DE FATURAS ── */}
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35]/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0094EB] shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Histórico de Faturas
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-[#c0c5d4] mt-0.5">
                Demonstrativo financeiro dos ciclos e pagamentos processados.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-[#0f1220] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 border border-transparent dark:border-white/5">
            {invoices.length} Faturas
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 dark:text-[#8a90a0]">
            Nenhuma fatura anterior registrada para esta loja.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Tabela de faturas se houver faturas futuras */}
          </div>
        )}
      </div>

      {/* ── DADOS DA NOTA FISCAL ── */}
      <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a1f35]/80 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0094EB] shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Dados da Nota Fiscal
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-[#c0c5d4] mt-0.5">
                Informações fiscais e cadastrais utilizadas na emissão das suas faturas.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateFiscal} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                CNPJ ou CPF
              </label>
              <input
                type="text"
                value={billing.cnpjCpf}
                onChange={e => setBilling({ ...billing, cnpjCpf: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0f1220] px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094EB] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nome / Razão Social
              </label>
              <input
                type="text"
                value={billing.companyName}
                onChange={e => setBilling({ ...billing, companyName: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0f1220] px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094EB] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                E-mail de Cobrança
              </label>
              <input
                type="email"
                value={billing.billingEmail}
                onChange={e => setBilling({ ...billing, billingEmail: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0f1220] px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094EB] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                CEP
              </label>
              <input
                type="text"
                value={billing.cep}
                onChange={e => setBilling({ ...billing, cep: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0f1220] px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094EB] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Endereço
              </label>
              <input
                type="text"
                value={billing.address}
                onChange={e => setBilling({ ...billing, address: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0f1220] px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094EB] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Número
              </label>
              <input
                type="text"
                value={billing.number}
                onChange={e => setBilling({ ...billing, number: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0f1220] px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#0094EB] focus:bg-white dark:focus:bg-[#0f1220] transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updatingFiscal}
              className="flex items-center gap-2 rounded-2xl bg-[#0094EB] hover:bg-[#0081cc] dark:bg-[#ff7a29] dark:hover:bg-[#e66c22] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/15 hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={15} className="!text-white" />
              {updatingFiscal ? 'Salvando...' : 'Atualizar Dados Fiscais'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
