import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Store,
  DollarSign,
  Eye,
  LogOut,
  Search,
  History,
  X,
  Clock,
  FileText,
  AlertCircle,
  Video,
  Mail,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Calendar,
  Send,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface MasterStats {
  total_stores: number;
  active_stores: number;
  total_views: number;
  total_revenue: number;
}

interface MasterStore {
  store_id: string;
  store_name: string;
  store_slug: string;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone?: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  videos_count: number;
  month_views: number;
}

interface FriendlyLog {
  id: string;
  timestamp: string;
  category: 'story' | 'config' | 'account' | 'system';
  title: string;
  description: string;
}

export default function MasterAdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [stores, setStores] = useState<MasterStore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Logs Amigáveis
  const [selectedStoreForLogs, setSelectedStoreForLogs] = useState<MasterStore | null>(null);
  const [storeLogs, setStoreLogs] = useState<FriendlyLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Estados do Modal de E-mail via Resend
  const [selectedStoreForEmail, setSelectedStoreForEmail] = useState<MasterStore | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, [searchTerm]);

  const loadMasterData = async () => {
    try {
      setLoading(true);

      // 1. Estatísticas gerais
      const { data: statsData, error: statsError } = await supabase.rpc('get_master_dashboard_stats');
      if (statsError) {
        console.error('Erro ao buscar stats:', statsError);
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // 2. Lista de lojas
      const { data: storesData, error: storesError } = await supabase.rpc('get_master_stores_list', {
        p_search: searchTerm.trim() || null,
        p_status: null,
      });

      if (storesError) {
        console.error('Erro ao buscar lojas:', storesError);
        toast.error('Erro ao carregar lojas: ' + storesError.message);
        return;
      }

      // 3. Tenta buscar telefones adicionais diretamente da tabela stores
      if (storesData && storesData.length > 0) {
        const storeIds = storesData.map((s: any) => s.store_id);
        const { data: storesDetails } = await supabase
          .from('stores')
          .select('id, phone, whatsapp')
          .in('id', storeIds);

        const phoneMap: Record<string, string> = {};
        storesDetails?.forEach((st: any) => {
          phoneMap[st.id] = st.whatsapp || st.phone || '';
        });

        const merged = storesData.map((s: any) => ({
          ...s,
          owner_phone: phoneMap[s.store_id] || null
        }));

        setStores(merged);
      } else {
        setStores([]);
      }
    } catch (err: any) {
      console.error('[MasterAdmin] Erro geral:', err);
      toast.error('Erro ao conectar com a base master.');
    } finally {
      setLoading(false);
    }
  };

  // Logout Master
  const handleMasterLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sessão encerrada com sucesso.');
      navigate('/master/login');
    } catch (err: any) {
      toast.error('Erro ao sair: ' + err.message);
    }
  };

  // Abertura do Modal de E-mail
  const handleOpenEmail = (store: MasterStore) => {
    if (!store.owner_email) {
      toast.error('Lojista não possui e-mail cadastrado.');
      return;
    }

    setSelectedStoreForEmail(store);
    setEmailSubject(`Vidlytics Stories - Contato com a loja ${store.store_name}`);
    setEmailMessage(
      `Olá ${store.owner_name || 'Lojista'},\n\nAqui é da equipe Vidlytics. Estamos acompanhando o desempenho da loja "${store.store_name}" e gostaríamos de saber se precisa de algum suporte técnico ou consultoria para alavancar suas conversões com Stories em vídeo.\n\nFicamos à total disposição!\n\nAtenciosamente,\nEquipe Vidlytics Stories`
    );
  };

  // Disparo do E-mail via Edge Function (Resend)
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreForEmail || !selectedStoreForEmail.owner_email) return;

    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Por favor, preencha o assunto e a mensagem.');
      return;
    }

    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedStoreForEmail.owner_email,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
          storeName: selectedStoreForEmail.store_name,
        },
      });

      if (error) {
        throw new Error(error.message || 'Falha ao processar envio do e-mail.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`E-mail enviado com sucesso para ${selectedStoreForEmail.owner_email}!`);
      setSelectedStoreForEmail(null);
    } catch (err: any) {
      console.error('Erro no disparo de e-mail:', err);
      toast.error(`Erro ao enviar e-mail: ${err.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  // Disparo de WhatsApp direto
  const handleOpenWhatsApp = (store: MasterStore) => {
    let phone = store.owner_phone;
    if (!phone) {
      const promptedPhone = window.prompt(
        `A loja "${store.store_name}" não tem WhatsApp cadastrado. Digite o número com DDD (ex: 41999998888):`
      );
      if (!promptedPhone) return;
      phone = promptedPhone;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const finalNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${store.owner_name || ''}! Aqui é da equipe Vidlytics. Tudo bem? Estou entrando em contato para saber como estão os resultados dos Stories na loja "${store.store_name}".`
    );

    window.open(`https://wa.me/${finalNumber}?text=${text}`, '_blank');
  };

  // Abre modal e carrega logs amigáveis
  const handleOpenLogs = async (store: MasterStore) => {
    setSelectedStoreForLogs(store);
    setLoadingLogs(true);
    setStoreLogs([]);

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('store_id', store.store_id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!data || data.length === 0) {
        setStoreLogs([
          {
            id: 'initial',
            timestamp: store.created_at,
            category: 'account',
            title: 'Conta Criada',
            description: `A loja "${store.store_name}" foi registrada na plataforma.`
          }
        ]);
        return;
      }

      const parsedLogs: FriendlyLog[] = data.map((item: any) => {
        const action = item.action || '';
        let category: FriendlyLog['category'] = 'system';
        let title = 'Atividade no Sistema';
        let description = item.details?.description || 'Ação registrada no sistema.';

        if (action.includes('video') || action.includes('story')) {
          category = 'story';
          title = action.includes('create') ? 'Novo Vídeo Adicionado' : 'Vídeo Atualizado ou Removido';
        } else if (action.includes('widget') || action.includes('config') || action.includes('customiz')) {
          category = 'config';
          title = 'Personalização do Widget';
        } else if (action.includes('login') || action.includes('auth') || action.includes('user')) {
          category = 'account';
          title = 'Acesso / Conta';
        }

        return {
          id: item.id,
          timestamp: item.created_at,
          category,
          title,
          description
        };
      });

      setStoreLogs(parsedLogs);
    } catch (err: any) {
      console.error('Erro ao carregar logs:', err);
      toast.error('Erro ao buscar o histórico da loja.');
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col">
      {/* Topbar */}
      <header className="border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="text-zinc-950" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                Painel Master Vidlytics
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">Visão Executiva & Gestão Global de Lojas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMasterLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-zinc-300 hover:text-rose-400 text-sm font-semibold transition duration-200 cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sair da Plataforma</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
        
        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total de Lojas</span>
              <Store size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.total_stores || 0}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Lojas Ativas</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.active_stores || 0}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Views Globais</span>
              <Eye size={18} className="text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {(stats?.total_views || 0).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Receita Mensal</span>
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              R$ {(stats?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa e Filtro */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-2xl">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por loja, slug ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div className="text-xs text-zinc-400 font-medium">
            Exibindo <span className="text-emerald-400 font-bold">{stores.length}</span> lojista(s) cadastrado(s)
          </div>
        </div>

        {/* Tabela de Lojas */}
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Loja & Dono</th>
                    <th className="py-3.5 px-4">Plano</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Stories</th>
                    <th className="py-3.5 px-4 text-center">Views (Mês)</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="animate-spin text-emerald-400" size={24} />
                          <span className="text-xs">Carregando dados das lojas...</span>
                        </div>
                      </td>
                    </tr>
                  ) : stores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        Nenhuma loja encontrada para o termo pesquisado.
                      </td>
                    </tr>
                  ) : (
                    stores.map((store) => (
                      <tr key={store.store_id} className="hover:bg-zinc-800/20 transition-colors">
                        {/* Loja / Dono */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{store.store_name}</div>
                          <div className="text-xs text-zinc-400">
                            {store.owner_name || 'Sem responsável'} • {store.owner_email || 'Sem e-mail'}
                          </div>
                          {store.owner_phone && (
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              Tel: {store.owner_phone}
                            </div>
                          )}
                        </td>

                        {/* Plano */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {store.plan_name || 'Free / Trial'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              store.subscription_status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {store.subscription_status === 'ACTIVE' ? 'Ativo' : 'Em Trial / Pendente'}
                          </span>
                        </td>

                        {/* Stories Cadastrados */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-zinc-300 text-xs font-medium">
                            <Video size={13} className="text-emerald-400" />
                            {store.videos_count || 0}
                          </span>
                        </td>

                        {/* Views do Mês */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-zinc-300 text-xs font-semibold">
                            {(store.month_views || 0).toLocaleString('pt-BR')}
                          </span>
                        </td>

                        {/* Contato & Ações */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(store)}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                              title="Chamar Lojista no WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>

                            {/* E-mail via Resend */}
                            <button
                              type="button"
                              onClick={() => handleOpenEmail(store)}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                              title="Enviar E-mail oficial via Vidlytics"
                            >
                              <Mail size={15} />
                            </button>

                            {/* Logs Amigáveis */}
                            <button
                              type="button"
                              onClick={() => handleOpenLogs(store)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer border border-zinc-700/60 ml-1"
                              title="Ver relatório de atividades da loja"
                            >
                              <History size={14} className="text-emerald-400" />
                              <span>Logs</span>
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

      {/* Modal de Disparo de E-mail via Resend */}
      {selectedStoreForEmail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Enviar E-mail para Lojista</h3>
                  <p className="text-xs text-zinc-400">
                    Loja: <span className="text-blue-400 font-medium">{selectedStoreForEmail.store_name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreForEmail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Destinatário
                </label>
                <input
                  type="email"
                  disabled
                  value={`${selectedStoreForEmail.owner_name || 'Lojista'} <${selectedStoreForEmail.owner_email}>`}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Assunto
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Ex: Atualizações importantes nos seus Stories"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Mensagem
                </label>
                <textarea
                  rows={6}
                  required
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Escreva a mensagem que deseja enviar..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStoreForEmail(null)}
                  disabled={sendingEmail}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Disparar E-mail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico e Logs em Linguagem Amigável */}
      {selectedStoreForLogs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Relatório de Atividades da Loja</h3>
                  <p className="text-xs text-zinc-400">
                    Loja: <span className="text-emerald-400 font-medium">{selectedStoreForLogs.store_name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreForLogs(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista dos Logs */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingLogs ? (
                <div className="py-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-emerald-400" size={24} />
                    <span className="text-xs">Buscando atividades registradas...</span>
                  </div>
                </div>
              ) : storeLogs.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs">
                  Nenhuma atividade encontrada para esta loja até o momento.
                </div>
              ) : (
                <div className="relative border-l-2 border-zinc-800 ml-3 space-y-6">
                  {storeLogs.map((log) => (
                    <div key={log.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-900 border-2 border-emerald-500 flex items-center justify-center" />
                      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            {log.title}
                          </span>
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {storeLogs.length} registro(s) no histórico
              </span>
              <button
                type="button"
                onClick={() => setSelectedStoreForLogs(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
