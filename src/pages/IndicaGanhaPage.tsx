import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Copy, 
  Check, 
  Share2, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Wallet,
  ArrowUpRight,
  KeyRound,
  AlertCircle,
  Loader2
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

interface WithdrawalItem {
  id: string;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requested_at: string;
  processed_at?: string;
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

  // Controle de Saque e Chave PIX
  const [storeId, setStoreId] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [isSavingPix, setIsSavingPix] = useState(false);
  
  // Saldos e Saques
  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [isRequestingWithdraw, setIsRequestingWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);

      // 1. Dados gerais do Afiliado via RPC
      const { data: res, error } = await supabase.rpc('get_my_affiliate_data');
      if (error) throw error;
      setData(res as AffiliateData);

      // 2. Busca a loja do usuário autenticado para obter a chave PIX e store_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase
        .from('stores')
        .select('id, pix_key, pix_key_type')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (store) {
        setStoreId(store.id);
        if (store.pix_key) setPixKey(store.pix_key);
        if (store.pix_key_type) setPixKeyType(store.pix_key_type);

        // 3. Busca histórico de saques
        const { data: wData } = await supabase
          .from('affiliate_withdrawals')
          .select('*')
          .eq('store_id', store.id)
          .order('requested_at', { ascending: false });

        const withdrawalList = (wData || []) as WithdrawalItem[];
        setWithdrawals(withdrawalList);

        // 4. Calcula Saldo Disponível (Total de recompensas pagas/confirmadas - saques pendentes/pagos)
        const totalEarned = Number(res?.accumulated_earnings || 0);
        const totalWithdrawn = withdrawalList
          .filter(w => w.status === 'paid' || w.status === 'pending' || w.status === 'approved')
          .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

        setAvailableBalance(Math.max(0, Math.round((totalEarned - totalWithdrawn) * 100) / 100));
      }
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

  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error('Loja não encontrada.');
      return;
    }
    if (!pixKey.trim()) {
      toast.error('Informe a chave PIX.');
      return;
    }

    try {
      setIsSavingPix(true);
      const { error } = await supabase
        .from('stores')
        .update({
          pix_key: pixKey.trim(),
          pix_key_type: pixKeyType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storeId);

      if (error) throw error;
      toast.success('Chave PIX atualizada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar PIX:', err);
      toast.error(err.message || 'Erro ao salvar chave PIX.');
    } finally {
      setIsSavingPix(false);
    }
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    if (!pixKey.trim()) {
      toast.error('Cadastre sua chave PIX antes de solicitar o saque.');
      return;
    }

    const val = parseFloat(withdrawAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      toast.error('Informe um valor de saque válido.');
      return;
    }

    if (val < 50) {
      toast.error('O valor mínimo para solicitação de saque é de R$ 50,00.');
      return;
    }

    if (val > availableBalance) {
      toast.error('O valor solicitado é maior do que o seu saldo disponível.');
      return;
    }

    try {
      setIsRequestingWithdraw(true);

      const { error } = await supabase
        .from('affiliate_withdrawals')
        .insert({
          store_id: storeId,
          amount: val,
          pix_key: pixKey.trim(),
          pix_key_type: pixKeyType,
          status: 'pending',
          requested_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(`Solicitação de saque de ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} enviada com sucesso!`);
      setWithdrawAmount('');
      await fetchAffiliateData();
    } catch (err: any) {
      console.error('Erro ao solicitar saque:', err);
      toast.error(err.message || 'Falha ao solicitar saque.');
    } finally {
      setIsRequestingWithdraw(false);
    }
  };

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
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Indica & Ganha
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Indique outros lojistas para o Vidlytics e receba 10% de comissão recorrente em cada pagamento.
          </p>
        </div>
      </div>

      {/* Banner de Destaque com o Link */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0091ff] p-6 sm:p-8 text-white shadow-md shadow-blue-500/20 border border-blue-400/30">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase mb-3 text-white">
            <Sparkles size={13} className="text-amber-300" />
            Programa de Parceiros Vidlytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Ganhe 10% de Comissão em Cada Pagamento
          </h2>
          <p className="mt-2 text-sm text-blue-50 leading-relaxed max-w-2xl">
            Indique outros lojistas para o Vidlytics. Você recebe <strong>10% sobre o valor real pago</strong> de cada fatura (mensal, semestral ou anual) enquanto a loja mantiver a assinatura ativa.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full flex items-center bg-black/20 backdrop-blur-md border border-white/25 rounded-xl px-4 py-2.5 text-xs font-mono text-white">
              <span className="truncate">
                {loading
                  ? 'Carregando seu link...'
                  : referralUrl || 'Nenhum código de afiliado encontrado para esta conta'}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleCopyLink}
                disabled={!referralUrl}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              >
                {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={handleShareWhatsApp}
                disabled={!referralUrl}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
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
        {/* Total Indicados */}
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

        {/* Lojas Ativas */}
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

        {/* Previsão Recorrente Mensal */}
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Previsão Recorrente</span>
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
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Previsão mensal recorrente</span>
        </div>

        {/* Total Já Faturado */}
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
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Receita total gerada</span>
        </div>
      </div>

      {/* SEÇÃO FINANCEIRA: SALDO & SOLICITAÇÃO DE SAQUE & CHAVE PIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco 1: Carteira & Solicitar Saque */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Carteira de Afiliado</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Saques via PIX direto para sua conta bancária</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Saldo Disponível</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          <form onSubmit={handleRequestWithdraw} className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="50"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0,00 (Mínimo R$ 50,00)"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0091ff]"
                />
              </div>
              <button
                type="submit"
                disabled={isRequestingWithdraw || availableBalance < 50 || !pixKey}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              >
                {isRequestingWithdraw ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowUpRight size={16} />
                )}
                Solicitar Saque PIX
              </button>
            </div>
            {!pixKey && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                <AlertCircle size={13} />
                Cadastre sua Chave PIX ao lado para habilitar a solicitação de saque.
              </p>
            )}
            {pixKey && availableBalance < 50 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                O valor mínimo de saque é de R$ 50,00. Assim que acumular esse saldo, o botão será liberado.
              </p>
            )}
          </form>

          {/* Histórico de Saques */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Histórico de Solicitações</h4>
            {withdrawals.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Nenhum saque solicitado até o momento.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {withdrawals.slice(0, 5).map((w) => (
                  <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {Number(w.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Chave: {w.pix_key} ({w.pix_key_type?.toUpperCase()}) • {new Date(w.requested_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      w.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                        : w.status === 'rejected'
                        ? 'bg-red-50 text-red-600 dark:bg-red-500/10'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
                    }`}>
                      {w.status === 'paid' ? 'Pago' : w.status === 'rejected' ? 'Recusado' : 'Em Análise'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bloco 2: Configuração da Chave PIX */}
        <div className="bg-white dark:bg-[#111625] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base mb-1">
              <KeyRound size={18} className="text-[#0091ff]" />
              Dados para Pagamento PIX
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Informe a chave para onde suas comissões serão transferidas.
            </p>

            <form onSubmit={handleSavePix} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Tipo de Chave
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0091ff]"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone / Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Informe sua chave PIX..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0091ff]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPix || !pixKey.trim()}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingPix ? <Loader2 size={14} className="animate-spin" /> : null}
                Salvar Chave PIX
              </button>
            </form>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-400 leading-tight block">
              🛡️ Os pagamentos são processados em até 48 horas úteis após a solicitação.
            </span>
          </div>
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
                <th className="py-3.5 px-6 text-right">Sua Comissão Recorrente</th>
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
