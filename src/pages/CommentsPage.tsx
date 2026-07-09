import React, { useEffect, useState, useMemo } from 'react';
import { db, Comment, CommentStatus, Video } from '@/lib/db';
import {
  MessageSquare, Check, Search, Trash2, User, X, Send, Video as VideoIcon, Filter
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';
import { cn } from '@/lib/utils';

const CommentsPage = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVideo, setFilterVideo] = useState<string>('all');

  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [activeComment, setActiveComment] = useState<Comment | null>(null);

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
      const allComments = await db.comments.getAll();
      setComments(allComments || []);
      const allVideos = await db.videos.getAll();
      setVideos(allVideos);
    } catch (error) {
      showError('Erro ao carregar comentários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return 'Pendente';
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const matchesSearch = (c.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.text || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || (
        filterStatus === 'Pendente' ? c.status === 'pending' :
        filterStatus === 'Aprovado' ? c.status === 'approved' :
        c.status === 'rejected'
      );
      const matchesVideo = filterVideo === 'all' || c.video_id === filterVideo;
      
      return matchesSearch && matchesStatus && matchesVideo;
    });
  }, [comments, searchTerm, filterStatus, filterVideo]);

  const handleUpdateStatus = async (comment: Comment, newStatus: CommentStatus) => {
    await db.comments.save({ ...comment, status: newStatus });
    showSuccess(`Status atualizado para ${getStatusLabel(newStatus)}!`);
    loadData();
  };

  const handleReply = (comment: Comment) => {
    setActiveComment(comment);
    setIsReplyModalOpen(true);
  };

  const submitReply = () => {
    if (!replyText.trim()) return;
    showSuccess('Resposta enviada com sucesso!');
    setIsReplyModalOpen(false);
    setReplyText('');
    setActiveComment(null);
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
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
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-[#0094EB] outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none"
        >
          <option value="all">Todos os Status</option>
          <option value="Pendente">Pendentes</option>
          <option value="Aprovado">Aprovados</option>
          <option value="Rejeitado">Rejeitados</option>
        </select>
        <select
          value={filterVideo}
          onChange={(e) => setFilterVideo(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none"
        >
          <option value="all">Todos os Vídeos</option>
          {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Autor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Conteúdo / Vídeo</th>
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
                      {row.user_name ? row.user_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{row.user_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 mb-1">"{row.text}"</p>
                  <div className="flex items-center gap-1 text-[10px] font-black text-[#0094EB] uppercase tracking-wider">
                    <VideoIcon size={12} /> Vídeo: {videos.find(v => v.id === row.video_id)?.title || 'Desconhecido'}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    row.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    row.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  )}>
                    {getStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleReply(row)} className="p-2 text-[#0094EB] hover:bg-blue-50 rounded-lg" title="Responder">
                      <MessageSquare size={18} />
                    </button>
                    {row.status !== 'approved' && (
                      <button onClick={() => handleUpdateStatus(row, 'approved')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Aprovar">
                        <Check size={18} />
                      </button>
                    )}
                    {row.status !== 'rejected' && (
                      <button onClick={() => handleUpdateStatus(row, 'rejected')} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="Rejeitar">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Resposta */}
      <CustomDialog
        isOpen={isReplyModalOpen}
        type="form"
        title="Responder Comentário"
        maxWidth="max-w-lg"
        onCancel={() => setIsReplyModalOpen(false)}
        onConfirm={submitReply}
        confirmText="Enviar Resposta"
      >
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comentário de {activeComment?.user_name}</p>
            <p className="text-sm text-slate-600 font-medium italic">"{activeComment?.text}"</p>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sua Resposta</label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB] resize-none"
              placeholder="Escreva aqui a resposta pública..."
            />
          </div>
        </div>
      </CustomDialog>
    </div>
  );
};

export default CommentsPage;