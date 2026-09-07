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
  ExternalLink, 
  History, 
  X, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface MasterStats {
  total_stores: number;
  active_stores: number;
  total_views: number;
  total_revenue: number;
}

interface MasterStore {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  plan_tier: string;
  created_at: string;
  views_count?: number;
  owner_email?: string;
}

interface LogEntry {
  id: string;
  created_at: string;
  action: string;
  details?: any;
  user_email?: string;
}

export default function MasterAdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [stores, setStores] = useState<MasterStore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Logs
  const [selectedStoreForLogs, setSelectedStoreForLogs] = useState<MasterStore | null>(null);
  const [storeLogs, setStoreLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      
      const { data: statsData } = await supabase.rpc('get_master_overview_stats');
      if (statsData) setStats(statsData[0] || statsData);

      const { data: storesData } = await supabase.rpc('get_master_stores_list', {
        search_query: searchTerm || null,
        limit_count: 100,
        offset_count: 0
      });
      if (storesData) setStores(storesData);
    } catch (err: any) {
      console.error('[MasterAdmin] Erro ao carregar dados:', err);
      toast.error('Erro ao buscar dados do painel Master');
    } finally {
      setLoading(false);
    }
  };

  // Função para Deslogar do Master Admin
  const handleMasterLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sessão encerrada.');
      navigate('/master/login');
    } catch (err: any) {
      toast.error('Erro ao sair: ' + err.message);
    }
  };

  // Abrir Modal e Buscar Logs da Loja
  const handleOpenLogs = async (store: MasterStore) => {
    setSelectedStoreForLogs(store);
    setLoadingLogs(true);
    try {
      // Tenta buscar da tabela audit_logs ou dos stories_events/logs do sistema
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        // Fallback: se a tabela de audit não existir com esse nome exato, buscamos atualizações gerais da loja
        const { data: fallbackData } = await supabase
          .from('stories')
          .select('id, title, created_at, is_active')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(20);

        const formatted = (fallbackData || []).map((s: any) => ({
          id: s.id,
          created_at: s.created_at,
          action: `Story ${s.is_active ? 'Publicado' : 'Desativado'}: "${s.title}"`,
          details: s
        }));
        setStoreLogs(formatted);
      } else {
        setStoreLogs(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      setStoreLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredStores = stores.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <p className="text-sm text-zinc-400">Visão consolidada de todas as lojas, assinaturas e histórico.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão Sair da Plataforma */}
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
                    <th className="py-3.5 px-4">Loja</th>
                    <th className="py-3.5 px-4">Plano</th>
                    <th className="py-3.5 px-4">Cadastro</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-500">
                        Carregando lojas...
                      </td>
                    </tr>
                  ) : filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-500">
                        Nenhuma loja encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((store) => (
                      <tr key={store.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{store.name}</div>
                          <div className="text-xs text-zinc-500">{store.subdomain}.vidlytics.com.br</div>
                          {store.owner_email && (
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{store.owner_email}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                            {store.plan_tier || 'Trial'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          {new Date(store.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {/* Botão Ver Logs / Auditoria */}
                          <button
                            type="button"
                            onClick={() => handleOpenLogs(store)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer border border-zinc-700/60"
                            title="Ver histórico de ações e logs"
                          >
                            <History size={14} className="text-emerald-400" />
                            <span>Logs</span>
                          </button>
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

      {/* Modal de Logs / Auditoria da Loja */}
      {selectedStoreForLogs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Histórico e Logs da Loja</h3>
                  <p className="text-xs text-zinc-400">{selectedStoreForLogs.name} ({selectedStoreForLogs.subdomain})</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStoreForLogs(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo / Linha do Tempo de Logs */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {loadingLogs ? (
                <div className="py-12 text-center text-zinc-500 text-xs">Buscando histórico da loja...</div>
              ) : storeLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <AlertCircle size={24} className="text-zinc-600" />
                  <span>Nenhum log ou alteração registrada para esta loja até o momento.</span>
                </div>
              ) : (
                storeLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="font-semibold text-emerald-400">{log.action}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {log.user_email && (
                      <div className="text-[11px] text-zinc-400">
                        Por: <span className="font-mono text-zinc-300">{log.user_email}</span>
                      </div>
                    )}
                    {log.details && (
                      <pre className="text-[10px] bg-black/40 p-2 rounded border border-zinc-800/60 overflow-x-auto text-zinc-400 mt-1">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
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
