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
  Calendar, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
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
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Banner de Destaque */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase mb-4">
            <Sparkles size={14} className="text-amber-300" />
            Programa de Parceiros Vidlytics
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ganhe 10% Recorrente em Cada Indicação
          </h1>
          <p className="mt-3 text-sm sm:text-base text-blue-100 leading-relaxed">
            Indique outros lojistas para o Vidlytics. Enquanto a loja indicada mantiver a assinatura ativa, você recebe <strong>10% todo mês</strong> sobre o valor do plano contratado — inclusive se ela fizer upgrade!
          </p>

          {/* Área de Compartilhamento do Link */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full flex items-center bg-zinc-950/40 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-xs font-mono text-zinc-200">
              <span className="truncate">{referralUrl || 'Carregando seu link...'}</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyLink}
                disabled={!referralUrl}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition cursor-pointer shadow-md"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={handleShareWhatsApp}
                disabled={!referralUrl}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition cursor-pointer shadow-md"
              >
                <Share2 size={16} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Lojas Indicadas */}
        <div className="bg-white dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Indicados</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.total_referrals || 0}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">Lojas cadastradas via seu link</span>
        </div>

        {/* Assinantes Ativos */}
        <div className="bg-white dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lojas Ativas</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {loading ? '...' : data?.active_subscribers || 0}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">Gerando comissão recorrente</span>
        </div>

        {/* Previsão do Próximo Ciclo */}
        <div className="bg-white dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Próximo Ciclo (10%)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-500">
            {loading
              ? '...'
              : (data?.monthly_recurring_earnings || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">Previsão recorrente mensal</span>
        </div>

        {/* Total Acumulado */}
        <div className="bg-white dark:bg-[#1a1f35] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Acumulado</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
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
          <span className="text-xs text-zinc-500 mt-1 block">Receita de parcerias</span>
        </div>
      </div>

      {/* Relatório Detalhado de Indicados */}
      <div className="bg-white dark:bg-[#1a1f35] rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lojas que Você Indicou</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Acompanhe em tempo real o status de adesão e seu retorno financeiro.
            </p>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl text-xs font-semibold">
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
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  periodFilter === f.value
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
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
            <thead className="bg-slate-50 dark:bg-zinc-900/50 text-zinc-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-3.5 px-6">Loja Indicada</th>
                <th className="py-3.5 px-6">Data de Cadastro</th>
                <th className="py-3.5 px-6">Plano Atual</th>
                <th className="py-3.5 px-6">Status da Assinatura</th>
                <th className="py-3.5 px-6 text-right">Sua Comissão Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/60 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500">
                    Carregando dados dos indicados...
                  </td>
                </tr>
              ) : filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Nenhuma loja indicada neste período. Compartilhe seu link acima para começar a faturar!
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((item) => {
                  const isActive = item.status?.toLowerCase() === 'active';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                        {item.store_name}
                      </td>
                      <td className="py-4 px-6 text-zinc-400">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          {item.plan_name}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {isActive ? 'Assinatura Ativa' : 'Em Trial / Gratuito'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white">
                        {isActive ? (
                          <span className="text-emerald-400 text-sm">
                            +{item.monthly_commission.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                            <span className="text-[10px] text-zinc-500 font-normal"> /mês</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-xs">Aguardando ativação</span>
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
