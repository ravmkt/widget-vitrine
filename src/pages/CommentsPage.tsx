import React, { useEffect, useState, useMemo } from 'react';
import { db, Comment, Story, Video, CommentStatus } from '@/lib/db';
import {
  MessageSquare,
  Check,
  X,
  AlertTriangle,
  Search,
  Trash2,
  Reply,
  Info
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

const CommentsPage = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CommentStatus | 'all'>('all');

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'confirm', title: '', description: '', onConfirm: () => {} });

  const loadData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];

      if (mainStore) {
        const allComments = await db.comments.getAll();
        setComments(allComments);

        const allStories = await db.stories.getAll(mainStore.id);
        setStories(allStories);
      }
    } catch (error) {
      showError('Erro ao carregar comentários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const matchesSearch = c.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [comments, searchTerm, filterStatus]);

  const handleUpdateStatus = async (comment: Comment, newStatus: CommentStatus) => {
    try {
      await db.comments.save({ ...comment, status: newStatus });
      showSuccess(`Status atualizado!`);
      loadData();
    } catch (e) {
      showError('Erro ao atualizar status.');
    }
  };

  const handleDelete = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Comentário?',
      description: `Deseja remover este comentário permanentemente?`,
      onConfirm: async () => {
        await db.comments.delete(id);
        showSuccess('Comentário excluído.');
        setDialog(prev => ({ ...prev, isOpen: false }));
        loadData();
      },
      onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Comentários</h1>
        <p className="text-slate-500 font-medium mt-1">Gerencie a interação dos clientes nos seus stories.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar autor ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0094EB] focus:ring-2 focus:ring-[#0094EB]/10 rounded-xl text-sm font-bold text-slate-700"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 focus:outline-none"
        >
          <option value="all">Todos os Status</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Rejeitados</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Autor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Comentário</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredComments.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0094EB] flex items-center justify-center font-black text-xs">
                      {row.user_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{row.user_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">"{row.text}"</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    row.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    row.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {row.status !== 'approved' && (
                      <button onClick={() => handleUpdateStatus(row, 'approved')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><Check size={18} /></button>
                    )}
                    <button onClick={() => handleDelete(row.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredComments.length === 0 && (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Nenhum comentário encontrado.</p>
          </div>
        )}
      </div>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </div>
  );
};

export default CommentsPage;