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
  Calendar
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

  useEffect(() => {
    loadMasterData();
  }, [searchTerm]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      
      // 1. Estatísticas globais
      const { data: statsData } = await supabase.rpc('get_master_overview_stats');
      if (statsData) setStats(Array.isArray(statsData) ? statsData[0] : statsData);

      // 2. Lista de lojas
      const { data: storesData, error: storesError } = await supabase.rpc('get_master_stores_list', {
        p_search: searchTerm.trim() || null,
        p_status: null,
        p_limit: 100,
        p_offset: 0
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

  // Disparo de E-mail direto
  const handleOpenEmail = (store: MasterStore) => {
    if (!store.owner_email) {
      toast.error('Lojista não possui e-mail cadastrado.');
      return;
    }
    const subject = encodeURIComponent(`Vidlytics - Contato com a loja ${store.store_name}`);
    const body = encodeURIComponent(
      `Olá ${store.owner_name || 'Lojista'},\n\nAqui é da equipe Vidlytics. Estamos acompanhando sua loja "${store.store_name}" e gostaríamos de saber se precisa de suporte ou ajuda com seus stories em vídeo!\n\nUm abraço!`
    );
    window.open(`mailto:${store.owner_email}?subject=${subject}&body=${body}`, '_blank');
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

  // Gerar Histórico em Linguagem Amigável
  const handleOpenLogs = async (store: MasterStore) => {
    setSelectedStoreForLogs(store);
    setLoadingLogs(true);
    const timeline: FriendlyLog[] = [];

    try {
      // 1. Evento de Inauguração/Criação da Loja
      timeline.push({
        id: `created-${store.store_id}`,
        timestamp: store.created_at,
        category: 'account',
        title: 'Loja Cadastrada na Plataforma',
        description: `A loja "${store.store_name}" iniciou seu cadastro oficial no Vidlytics sob o subdomínio "${store.store_slug || 'padrão'}".`
      });

      // 2. Busca Stories cadastrados
      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, title, created_at, is_active, style')
        .eq('store_id', store.store_id)
        .order('created_at', { ascending: false });

      if (storiesData && storiesData.length > 0) {
        storiesData.forEach((st: any) => {
          timeline.push({
            id: st.id,
            timestamp: st.created_at,
            category: 'story',
            title: st.is_active ? `Story Ativo: "${st.title || 'Sem título'}"` : `Story Pausado: "${st.title || 'Sem título'}"`,
            description: st.is_active 
              ? `O lojista ativou este story para ser renderizado no widget oficial da loja.`
              : `Este story foi desativado temporariamente da visualização dos clientes.`
          });
        });
      }

      // 3. Busca Configurações de Widget / Flutuante
      const { data: floatingData } = await supabase
        .from('floating_video_configs')
        .select('id, updated_at, position, is_active')
        .eq('store_id', store.store_id)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (floatingData && floatingData.length > 0) {
        floatingData.forEach((fc: any) => {
          timeline.push({
            id: fc.id,
            timestamp: fc.updated_at,
            category: 'config',
            title: 'Personalização do Widget Flutuante',
            description: `Configuração do widget flutuante ajustada (Posição: ${fc.position || 'inferior'}, Status: ${fc.is_active ? 'Ativo na Loja' : 'Pausado'}).`
          });
        });
      }

      // 4. Se tiver logs de auditoria brutos, traduz para linguagem amigável
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('store_id', store.store_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditData && auditData.length > 0) {
        auditData.forEach((ad: any) => {
          let amigavel = ad.action;
          if (ad.action?.includes('update_settings')) amigavel = 'Atualizou as cores e fontes do widget de Stories';
          if (ad.action?.includes('login')) amigavel = 'Lojista realizou login no painel administrativo';

          timeline.push({
            id: ad.id,
            timestamp: ad.created_at,
            category: 'system',
            title: 'Ajuste no Painel do Lojista',
            description: amigavel
          });
        });
      }

      // Ordenar todo o histórico por data mais recente
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setStoreLogs(timeline);
    } catch (err) {
      console.error('Erro ao processar relatório de logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 p-6 md:p-10 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Topo / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PORTAL GLOBAL DE GESTÃO
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white mt-2">Painel Master Admin</h1>
            <p className="text-sm text-zinc-400">Visão consolidada de todas as lojas, assinaturas e histórico de ações.</p>
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

        {/* Métricas Globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Total de Lojas</span>
              <Store size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.total_stores || 0}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Lojas Ativas</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats?.active_stores || 0}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Visualizações Globais</span>
              <Eye size={18} className="text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{(stats?.total_views || 0).toLocaleString('pt-BR')}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Receita Mensal (MRR)</span>
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.total_revenue || 0)}
            </div>
          </div>
        </div>

        {/* Tabela de Lojas */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Lojas Cadastradas</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Loja / Dono</th>
                    <th className="py-3.5 px-4">Plano / Status</th>
                    <th className="py-3.5 px-4">Vídeos</th>
                    <th className="py-3.5 px-4">Views Mês</th>
                    <th className="py-3.5 px-4">Cadastro</th>
                    <th className="py-3.5 px-4 text-center">Contato & Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        Carregando lojas...
                      </td>
                    </tr>
                  ) : stores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        Nenhuma loja encontrada.
                      </td>
                    </tr>
                  ) : (
                    stores.map((store) => (
                      <tr key={store.store_id} className="hover:bg-zinc-800/20 transition-colors">
                        {/* Loja / Dono */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{store.store_name}</div>
                          <div className="text-xs text-zinc-500">{store.store_slug || 'padrao'}.vidlytics.com.br</div>
                          {store.owner_email && (
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                              {store.owner_name ? `${store.owner_name} • ` : ''}{store.owner_email}
                            </div>
                          )}
                        </td>

                        {/* Plano / Status */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                              {store.plan_name || 'Sem Plano'}
                            </span>
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${
                              store.subscription_status === 'active' ? 'text-emerald-400' : 'text-zinc-500'
                            }`}>
                              {store.subscription_status || 'Nenhum'}
                            </span>
                          </div>
                        </td>

                        {/* Vídeos */}
                        <td className="py-3.5 px-4 text-xs text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Video size={13} className="text-zinc-500" />
                            <span>{store.videos_count || 0}</span>
                          </div>
                        </td>

                        {/* Views */}
                        <td className="py-3.5 px-4 text-xs text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Eye size={13} className="text-zinc-500" />
                            <span>{Number(store.month_views || 0).toLocaleString('pt-BR')}</span>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          {new Date(store.created_at).toLocaleDateString('pt-BR')}
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

                            {/* Email */}
                            <button
                              type="button"
                              onClick={() => handleOpenEmail(store)}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition cursor-pointer"
                              title="Enviar E-mail para o Lojista"
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
                    {selectedStoreForLogs.store_name} • <span className="font-mono text-zinc-300">{selectedStoreForLogs.owner_email}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStoreForLogs(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Linha do Tempo Amigável */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingLogs ? (
                <div className="py-12 text-center text-zinc-500 text-xs">Compilando linha do tempo da loja...</div>
              ) : storeLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <AlertCircle size={24} className="text-zinc-600" />
                  <span>Nenhuma atividade registrada para esta loja até o momento.</span>
                </div>
              ) : (
                <div className="relative border-l-2 border-zinc-800 ml-3 pl-5 space-y-6">
                  {storeLogs.map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Ponto na timeline */}
                      <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-emerald-500 group-hover:scale-125 transition-transform" />

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl space-y-1.5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-sm text-white flex items-center gap-1.5">
                            {log.category === 'story' && <Video size={14} className="text-emerald-400" />}
                            {log.category === 'config' && <Sparkles size={14} className="text-blue-400" />}
                            {log.category === 'account' && <Store size={14} className="text-purple-400" />}
                            {log.category === 'system' && <CheckCircle2 size={14} className="text-amber-400" />}
                            {log.title}
                          </span>
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
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
