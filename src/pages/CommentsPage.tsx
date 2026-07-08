import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { db, Comment, Story, Video, CommentStatus } from '@/lib/db';
import {
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  CornerDownRight,
  Trash2,
  Reply,
  Calendar,
  Eye,
  Send,
  Film,
  Info
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import CustomDialog from '@/components/CustomDialog';

interface CommentWithReply extends Comment {
  reply_text?: string;
  replied_at?: string;
}

const CommentsPage = () => {
  const [comments, setComments] = useState<CommentWithReply[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CommentStatus | 'all'>('all');
  const [filterStoryId, setFilterStoryId] = useState<string>('all');

  // Reply Modal State
  const [replyingComment, setReplyimgComment] = useState<CommentWithReply | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Custom Dialog state
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
        const allComments = await db.comments.getAll() as CommentWithReply[];
        setComments(allComments);

        const allStories = await db.stories.getAll(mainStore.id);
        setStories(allStories);

        const allVideos = await db.videos.getAll(mainStore.id);
        setVideos(allVideos);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do módulo de comentários:', error);
      showError('Erro ao carregar comentários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredComments = useMemo(() => {
    const searchNormalized = String(searchTerm ?? '').toLowerCase().trim();
    return comments.filter((c) => {
      const uName = String(c.user_name ?? '').toLowerCase();
      const txt = String(c.text ?? '').toLowerCase();
      const repTxt = String(c.reply_text ?? '').toLowerCase();

      const matchesSearch =
        uName.includes(searchNormalized) ||
        txt.includes(searchNormalized) ||
        repTxt.includes(searchNormalized);

      const matchesStatus = filterStatus === 'all' || String(c.status ?? '') === filterStatus;
      const matchesStory = filterStoryId === 'all' || String(c.story_id ?? '') === filterStoryId;

      return matchesSearch && matchesStatus && matchesStory;
    });
  }, [comments, searchTerm, filterStatus, filterStoryId]);

  const handleUpdateStatus = async (comment: CommentWithReply, newStatus: CommentStatus) => {
    try {
      const updated: CommentWithReply = {
        ...comment,
        status: newStatus,
      };
      await db.comments.save(updated as any);
      showSuccess(`Comentário atualizado para ${newStatus}`);
      loadData();
    } catch (e) {
      showError('Erro ao atualizar status do comentário.');
    }
  };

  const handleDelete = (id: string, userName: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Excluir Comentário?',
      description: `Tem certeza que deseja excluir permanentemente o comentário de "${userName}"? Esta ação é irreversível.`,
      onConfirm: async () => {
        try {
          await db.comments.delete(id);
          showSuccess('Comentário excluído com sucesso!');
          setDialog(prev => ({ ...prev, isOpen: false }));
          loadData();
        } catch (e) {
          showError('Erro ao excluir comentário.');
        }
      },
      onCancel: () => setDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleOpenReplyModal = (comment: CommentWithReply) => {
    setReplyimgComment(comment);
    setReplyText(comment.reply_text || '');
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingComment) return;

    if (!replyText.trim()) {
      showError('O texto da resposta não pode ficar em branco.');
      return;
    }

    try {
      setIsSubmittingReply(true);
      const updated: CommentWithReply = {
        ...replyingComment,
        reply_text: replyText.trim(),
        replied_at: new Date().toISOString(),
        status: 'approved',
      };

      await db.comments.save(updated as any);
      showSuccess(`Resposta salva com sucesso!`);
      setReplyimgComment(null);
      setReplyText('');
      loadData();
    } catch (e) {
      showError('Erro ao salvar resposta.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: CommentStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-black uppercase px-2.5 py-1 rounded-full">
            <Check className="w-3.5 h-3.5" /> Aprovado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-black uppercase px-2.5 py-1 rounded-full">
            <Info className="w-3.5 h-3.5 animate-pulse" /> Pendente
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 text-xs font-black uppercase px-2.5 py-1 rounded-full">
            <X className="w-3.5 h-3.5" /> Rejeitado
          </span>
        );
      case 'spam':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/25 text-xs font-black uppercase px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" /> Spam
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        <p className="text-base text-slate-400 font-semibold font-mono">Carregando central de comentários...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Moderação de Comentários</h1>
          <p className="text-slate-400 text-sm md:text-base mt-1">
            Gerencie e responda às perguntas que seus clientes deixam nas caixas de interação dos stories.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row gap-4 items-center shadow-xl">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs uppercase tracking-wider">Busca</span>
            <input
              type="text"
              placeholder="Pesquisar por autor, palavras-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl text-sm md:text-base text-slate-200"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="flex-1 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-slate-300"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
              <option value="spam">Spam</option>
            </select>

            <select
              value={filterStoryId}
              onChange={(e) => setFilterStoryId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-slate-300"
            >
              <option value="all">Todos os Stories</option>
              {stories.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredComments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-xl">
            <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-200">Nenhum comentário correspondente</h3>
            <p className="text-slate-400 text-sm mt-1">
              Ajuste seus filtros de busca ou aguarde novas interações dos clientes em sua loja virtual.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 bg-slate-950/40 uppercase font-bold text-[10px] md:text-xs tracking-wider">
                    <th className="p-4 pl-6 w-[200px]">Usuário</th>
                    <th className="p-4">Comentário / Resposta</th>
                    <th className="p-4">Origem</th>
                    <th className="p-4 text-center">Data</th>
                    <th className="p-4 text-center w-[120px]">Status</th>
                    <th className="p-4 pr-6 text-right w-[240px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {filteredComments.map((row) => {
                    const story = stories.find(s => s.id === row.story_id);
                    const video = videos.find(v => v.id === row.video_id);
                    const safeUserName = String(row.user_name ?? 'Anônimo');

                    return (
                      <tr key={row.id} className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-violet-500/20">
                              {safeUserName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-100 font-bold truncate text-sm md:text-base">{safeUserName}</p>
                              {row.user_email && (
                                <p className="text-[10px] md:text-xs text-slate-500 font-mono truncate">{row.user_email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 max-w-[320px]">
                          <p className="text-slate-200 font-medium leading-relaxed break-words whitespace-pre-wrap text-sm md:text-base">
                            "{row.text ?? ''}"
                          </p>
                          {row.reply_text && (
                            <div className="mt-3 bg-slate-950 border-l-2 border-violet-500 rounded-r-xl p-2.5 flex items-start gap-2 border-y border-r border-slate-800">
                              <CornerDownRight className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Resposta da Loja</p>
                                <p className="text-xs text-slate-400 italic break-words mt-0.5">"{row.reply_text}"</p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-4 max-w-[200px]">
                          <p className="text-slate-200 font-bold truncate">🎬 {story?.title || 'Story'}</p>
                          {video ? (
                            <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">🎥 {video.title}</p>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">Sem vídeo</p>
                          )}
                        </td>

                        <td className="p-4 text-center font-mono text-slate-400">
                          {row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                        </td>

                        <td className="p-4 text-center">
                          {getStatusBadge(row.status)}
                        </td>

                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                              onClick={() => handleOpenReplyModal(row)}
                              className="p-1.5 rounded-lg hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 transition-all inline-flex items-center"
                              title="Responder"
                            >
                              <Reply className="w-4 h-4" />
                            </button>

                            {row.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateStatus(row, 'approved')}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all inline-flex items-center"
                                title="Aprovar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {row.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(row, 'rejected')}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all inline-flex items-center"
                                title="Rejeitar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {row.status !== 'spam' && (
                              <button
                                onClick={() => handleUpdateStatus(row, 'spam')}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"
                                title="Spam"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(row.id, safeUserName)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all inline-flex items-center"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Resposta Embutido com Tema Dark e Altamente Responsivo */}
        {replyingComment && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-lg w-full relative p-6 shadow-2xl">
              <button
                onClick={() => setReplyimgComment(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="pb-4 border-b border-slate-800 mb-6 flex items-center gap-2">
                <Reply className="w-5 h-5 text-violet-400" />
                <h3 className="font-extrabold text-slate-100 text-lg">Responder Comentário</h3>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-400 font-extrabold text-xs flex items-center justify-center">
                    {String(replyingComment.user_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-300">{replyingComment.user_name || 'Usuário'}</span>
                </div>
                <p className="text-sm text-slate-400 italic">
                  "{replyingComment.text ?? ''}"
                </p>
              </div>

              <form onSubmit={handleSaveReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Sua resposta pública no player
                  </label>
                  <textarea
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Escreva uma resposta explicativa..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-2xl p-4 text-sm md:text-base text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReplyimgComment(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 font-semibold text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
                  >
                    Enviar Resposta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      <CustomDialog
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        description={dialog.description}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText="Confirmar"
        cancelText="Voltar"
      />
    </div>
  );
};

export default CommentsPage;