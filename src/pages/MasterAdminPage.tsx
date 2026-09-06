import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Users,
  Video,
  Eye,
  CreditCard,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ChevronRight,
  TrendingUp,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface OverviewStats {
  total_stores: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  total_videos: number;
  current_month_views: number;
}

interface MasterStoreItem {
  store_id: string;
  store_name: string;
  store_slug: string;
  created_at: string;
  owner_name: string;
  owner_email: string;
  plan_name: string;
  subscription_status: string;
  current_period_end: string | null;
  videos_count: number;
  month_views: number;
}

export default function MasterAdminPage() {
  const navigate = useNavigate();
  const { setStoreId } = useTenant();

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [stores, setStores] = useState<MasterStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega Estatísticas Globais
      const { data: statsData, error: statsError } = await supabase.rpc('get_master_overview_stats');
      if (statsError) throw statsError;
      setStats(statsData);

      // 2. Carrega Lojas
      const { data: storesData, error: storesError } = await supabase.rpc('get_master_stores_list', {
        p_search: search.trim() ? search.trim() : null,
        p_status: statusFilter || null,
        p_limit: 100,
        p_offset: 0,
      });

      if (storesError) throw storesError;
      setStores(storesData || []);
    } catch (err: any) {
      console.error('[MasterAdmin] Erro ao carregar dados:', err);
      toast.error('Erro ao buscar dados do painel Master: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Modo Suporte / Impersonação: Alterna o tenant ativo e redireciona para o dashboard
  const handleAccessStore = (storeId: string, storeName: string) => {
    try {
      localStorage.setItem('vidlytics_current_store_id', storeId);
      localStorage.setItem('current_store_id', storeId);
      localStorage.setItem('store_id', storeId);
      if (setStoreId) {
        setStoreId(storeId);
      }
      toast.success(`Acessando ${storeName} em Modo Suporte!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Não foi possível alternar de loja.');
    }
  };

  const handleEmailContact = (ownerEmail: string, ownerName: string, storeName: string) => {
    if (!ownerEmail || ownerEmail === 'Não identificado') {
      toast.error('E-mail do proprietário não encontrado.');
      return;
    }
    const subject = encodeURIComponent(`Vidlytics - Contato sobre a loja ${storeName}`);
    const body = encodeURIComponent(
      `Olá, ${ownerName || 'lojista'}!\n\nTudo bem?\n\nAqui é da equipe Vidlytics. Estamos entrando em contato a respeito da sua loja "${storeName}". Como podemos ajudar com seus stories e conversões hoje?\n\nAbraços,\nEquipe Vidlytics`
    );
    window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleWhatsAppContact = (ownerName: string, storeName: string) => {
    const rawNumber = window.prompt(
      `Digite o WhatsApp de ${ownerName || 'contato'} com DDD (somente números, ex: 11999998888):`
    );
    if (!rawNumber) return;

    const cleanNumber = rawNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      toast.error('Número de WhatsApp inválido.');
      return;
    }

    const fullPhone = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    const text = encodeURIComponent(
      `Olá, ${ownerName || 'lojista'}! Tudo bem? Aqui é o Rodrigo da Vidlytics. Vi que você administra a loja "${storeName}" na nossa plataforma. Como estão suas vendas com os stories? Precisa de algum suporte?`
    );

    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 p-6 md:p-10">
      {/* Topo / Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> VIDLYTICS GOD MODE
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">Painel Master Admin</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Visão consolidada de todas as lojas, assinaturas e infraestrutura em produção.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0091ff] hover:bg-[#0081e6] text-white text-sm font-medium transition"
            >
              Voltar ao Meu Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cards de Métricas Consolidadas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Store className="w-4 h-4 text-blue-400" /> Total de Lojas
            </div>
            <div className="text-2xl font-bold text-white mt-2">{stats?.total_stores ?? '--'}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Assinaturas Ativas
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">
              {stats?.active_subscriptions ?? '--'}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Em Trial (7 dias)
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">
              {stats?.trialing_subscriptions ?? '--'}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <CreditCard className="w-4 h-4 text-red-400" /> Inadimplentes
            </div>
            <div className="text-2xl font-bold text-red-400 mt-2">
              {stats?.past_due_subscriptions ?? '--'}
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Video className="w-4 h-4 text-purple-400" /> Total de Vídeos
            </div>
            <div className="text-2xl font-bold text-purple-400 mt-2">{stats?.total_videos ?? '--'}</div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Eye className="w-4 h-4 text-cyan-400" /> Views no Mês
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-2">
              {stats?.current_month_views ? Number(stats.current_month_views).toLocaleString('pt-BR') : '0'}
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da loja ou e-mail..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none"
            >
              <option value="">Todos os Status de Cobrança</option>
              <option value="active">Ativo (Pago)</option>
              <option value="trialing">Em Trial</option>
              <option value="past_due">Atrasado / Inadimplente</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Tabela de Lojas */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-medium text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Loja & Dono</th>
                  <th className="py-3.5 px-4">Plano</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Vídeos</th>
                  <th className="py-3.5 px-4">Views Mês</th>
                  <th className="py-3.5 px-4">Criada em</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-400" />
                      Carregando ecossistema Vidlytics...
                    </td>
                  </tr>
                ) : stores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      Nenhuma loja encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  stores.map((s) => (
                    <tr key={s.store_id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{s.store_name}</div>
                        <div className="text-xs text-zinc-400">
                          {s.owner_name} • <span className="text-zinc-500">{s.owner_email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded bg-zinc-800 text-xs font-medium text-zinc-200 uppercase">
                          {s.plan_name || 'Free/Trial'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {s.subscription_status === 'active' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ativo
                          </span>
                        )}
                        {s.subscription_status === 'trialing' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Trial
                          </span>
                        )}
                        {s.subscription_status === 'past_due' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            Atrasado
                          </span>
                        )}
                        {s.subscription_status === 'canceled' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Cancelado
                          </span>
                        )}
                        {(!s.subscription_status || s.subscription_status === 'nenhum') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-800 text-zinc-500 border border-zinc-700">
                            Sem dados
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-xs">
                        {s.videos_count} vídeos
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-xs">
                        {Number(s.month_views).toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-zinc-400">
                        {new Date(s.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão E-mail */}
                          <button
                            onClick={() => handleEmailContact(s.owner_email, s.owner_name, s.store_name)}
                            className="inline-flex items-center p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition"
                            title={`Enviar e-mail para ${s.owner_email}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão WhatsApp */}
                          <button
                            onClick={() => handleWhatsAppContact(s.owner_name, s.store_name)}
                            className="inline-flex items-center p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                            title={`Abrir WhatsApp com ${s.owner_name}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão Acessar Loja (Impersonate) */}
                          <button
                            onClick={() => handleAccessStore(s.store_id, s.store_name)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition"
                            title="Entrar na loja em modo suporte"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Acessar Loja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
