import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface ReferralItem {
  id: string;
  store_name: string;
  created_at: string;
  plan_name: string;
  plan_price: number;
  status: string;
  monthly_commission: number;
}

interface AffiliateData {
  referral_code: string;
  total_referrals: number;
  active_subscribers: number;
  monthly_recurring_earnings: number;
  accumulated_earnings: number;
  referrals: ReferralItem[];
}

export const IndicaGanhaPage = () => {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | '30d' | '90d' | '1y'>('all');

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase.rpc('get_my_affiliate_data');
      if (error) throw error;
      setData(res as AffiliateData);
    } catch (err: any) {
      console.error('Erro ao buscar dados do Indica & Ganha:', err);
      toast.error('Não foi possível carregar os dados de afiliados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const referralUrl = data?.referral_code 
    ? `${window.location.origin}/register?ref=${data.referral_code}` 
    : '';

  const handleCopyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Link de indicação copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!referralUrl) return;
    const text = encodeURIComponent(
      `Olá! Estou usando o Vidlytics Stories na minha loja para aumentar as conversões com vídeos em formato stories. Crie sua conta por este link com teste gratuito: ${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Filtro de período nos indicados
  const filteredReferrals = (data?.referrals || []).filter((item) => {
    if (periodFilter === 'all') return true;
    const itemDate = new Date(item.created_at).getTime();
    const now = Date.now();
    const days = (now - itemDate) / (1000 * 60 * 60 * 24);
    if (periodFilter === '7d') return days <= 7;
    if (periodFilter === '30d') return days <= 30;
    if (periodFilter === '90d') return days <= 90;
    if (periodFilter === '1y') return days <= 365;
    return true;
  });

  return (
    <div className="space-y-6 p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Cabeçalho Padrão (igual a Produtos) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Indica & Ganha
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Indique outros lojistas para o Vidlytics e receba 10% de comissão recorrente todo mês.
          </p>
        </div>
      </div>

      {/* Banner de Destaque com gradiente garantido e legibilidade impecável */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-700 dark:via-indigo-800 dark:to-slate-900 p-6 sm:p-8 text-white shadow-sm border border-blue-500/20">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase mb-3 text-white">
            <Sparkles size={13} className="text-amber-300" />
            Programa de Parceiros Vidlytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Ganhe 10% Recorrente em Cada Indicação
          </h2>
          <p className="mt-2 text-sm text-blue-50 leading-relaxed max-w-2xl">
            Indique outros lojistas para o Vidlytics. Enquanto a loja indicada mantiver a assinatura ativa, você recebe <strong>10% todo mês</strong> sobre o valor do plano contratado — inclusive se ela fizer upgrade!
          </p>

          {/* Área de Compartilhamento do Link */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full flex items-center bg-black/25 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-xs font-mono text-white">
              <span className="truncate">{referralUrl || 'Carregando seu link...'}</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleCopyLink}
                disabled={!referralUrl}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
              >
                {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={handleShareWhatsApp}
                disabled={!referralUrl}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-colors cursor-pointer shadow-xs"
              >
                <Share2 size={15} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lojas Indicadas */}
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Indicados</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0091ff]">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.total_referrals || 0}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Lojas cadastradas via seu link</span>
        </div>

        {/* Assinantes Ativos */}
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lojas Ativas</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : data?.active_subscribers || 0}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Gerando comissão recorrente</span>
        </div>

        {/* Previsão do Próximo Ciclo */}
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Próximo Ciclo (10%)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {loading
              ? '...'
              : (data?.monthly_recurring_earnings || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Previsão recorrente mensal</span>
        </div>

        {/* Total Acumulado */}
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Acumulado</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading
              ? '...'
              : (data?.accumulated_earnings || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Receita total de parcerias</span>
        </div>
      </div>

      {/* Relatório Detalhado de Indicados */}
      <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Lojas que Você Indicou</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhe em tempo real o status de adesão e seu retorno financeiro.
            </p>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-xs font-semibold">
            {[
              { label: 'Tudo', value: 'all' },
              { label: '7 dias', value: '7d' },
              { label: '30 dias', value: '30d' },
              { label: '90 dias', value: '90d' },
              { label: '1 ano', value: '1y' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setPeriodFilter(f.value as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodFilter === f.value
                    ? 'bg-white dark:bg-slate-700 text-[#0091ff] dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Indicados */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Loja Indicada</th>
                <th className="py-3.5 px-6">Data de Cadastro</th>
                <th className="py-3.5 px-6">Plano Atual</th>
                <th className="py-3.5 px-6">Status da Assinatura</th>
                <th className="py-3.5 px-6 text-right">Sua Comissão Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Carregando dados dos indicados...
                  </td>
                </tr>
              ) : filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhuma loja indicada neste período. Compartilhe seu link acima para começar a faturar!
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((item) => {
                  const isActive = item.status?.toLowerCase() === 'active';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                        {item.store_name}
                      </td>
                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.plan_name}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {isActive ? 'Assinatura Ativa' : 'Em Trial / Gratuito'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white">
                        {isActive ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                            +{item.monthly_commission.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                            <span className="text-[10px] text-slate-400 font-normal"> /mês</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">Aguardando ativação</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
