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

  const loadData = async () => {
    try {
      const stores = await db.stores.getAll();
      const mainStore = stores[0];

      if (mainStore) {
        // Load all comments
        const allComments = await db.comments.getAll() as CommentWithReply[];
        setComments(allComments);

        // Load stories & videos for lookup mapping
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

  // Filtered comments logic with secure String casting to avoid 'toLowerCase of undefined' crashes
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

  // Handle Comment Actions
  const handleUpdateStatus = async (comment: CommentWithReply, newStatus: CommentStatus) => {
    try {
      const updated: CommentWithReply = {
        ...comment,
        status: newStatus,
      };
      await db.comments.save(updated as any);
      showSuccess(`Comentário de ${comment.user_name || 'Usuário'} foi marcado como "${newStatus}"!`);
      loadData();
    } catch (e) {
      showError('Erro ao atualizar status do comentário.');
    }
  };

  const handleDelete = async (id: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o comentário de ${userName || 'Usuário'}?`)) {
      try {
        await db.comments.delete(id);
        showSuccess('Comentário excluído com sucesso!');
        loadData();
      } catch (e) {
        showError('Erro ao excluir comentário.');
      }
    }
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
        status: 'approved', // Auto-approves the original comment when replying
      };

      await db.comments.save(updated as any);
      showSuccess(`Resposta enviada para ${replyingComment.user_name || 'Usuário'}!`);
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
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            <Check className="w-3 h-3" /> Aprovado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            <Info className="w-3 h-3 animate-pulse" /> Pendente
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            <X className="w-3 h-3" /> Rejeitado
          </span>
        );
      case 'spam':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/25 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Spam
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
        <p className="text-sm text-slate-400 font-semibold">Carregando central de comentários...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Central de Comentários
          </h1>
          <p className="text-slate-500 mt-1">
            Modere as perguntas dos clientes, responda dúvidas de produtos e gerencie spams nos players de stories.
          </p>
        </div>

        {/* Filters and Searches */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row gap-4 items-center shadow-sm">
          
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por palavra-chave no texto ou autor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Filters Grid */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="flex-1 sm:min-w-[180px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-1.5"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendentes ⏳</option>
                <option value="approved">Aprovados ✅</option>
                <option value="rejected">Rejeitados ❌</option>
                <option value="spam">Spam ⚠️</option>
              </select>
            </div>

            {/* Story Filter */}
            <div className="flex-1 sm:min-w-[200px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
              <Film className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={filterStoryId}
                onChange={(e) => setFilterStoryId(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-1.5"
              >
                <option value="all">Todos os Stories</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Comments Listing */}
        {filteredComments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-sm">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Nenhum comentário correspondente</h3>
            <p className="text-slate-500 text-sm mt-1">
              Ajuste seus filtros de busca ou aguarde novas interações dos clientes em sua loja virtual.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-4 pl-6 w-[200px]">Usuário</th>
                    <th className="p-4">Comentário / Resposta</th>
                    <th className="p-4">Story & Vídeo Relacionado</th>
                    <th className="p-4 text-center">Data</th>
                    <th className="p-4 text-center w-[120px]">Status</th>
                    <th className="p-4 pr-6 text-right w-[240px]">Ações de Moderação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredComments.map((row) => {
                    const story = stories.find(s => s.id === row.story_id);
                    const video = videos.find(v => v.id === row.video_id);
                    const safeUserName = String(row.user_name ?? 'Anônimo');

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-all">
                        {/* Usuário */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 font-extrabold text-sm flex items-center justify-center shrink-0">
                              {safeUserName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-800 font-bold truncate">{safeUserName}</p>
                              {row.user_email && (
                                <p className="text-[10px] text-slate-400 font-mono truncate">{row.user_email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Comentário */}
                        <td className="p-4 max-w-[320px]">
                          <p className="text-slate-800 font-medium leading-relaxed break-words whitespace-pre-wrap">
                            "{row.text ?? ''}"
                          </p>
                          {row.reply_text && (
                            <div className="mt-3 bg-slate-50 border-l-2 border-violet-500/50 rounded-r-lg p-2.5 flex items-start gap-2">
                              <CornerDownRight className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-violet-600">Resposta da Loja</p>
                                <p className="text-[11px] text-slate-600 italic break-words mt-0.5">"{row.reply_text}"</p>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Story Relacionado */}
                        <td className="p-4 max-w-[200px]">
                          <p className="text-slate-800 font-bold truncate">🎬 {story?.title || 'Story desconhecido'}</p>
                          {video ? (
                            <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">🎥 {video.title}</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">Sem vídeo específico</p>
                          )}
                        </td>

                        {/* Data */}
                        <td className="p-4 text-center font-mono text-slate-500">
                          {row.created_at ? (
                            <>
                              <p>{new Date(row.created_at).toLocaleDateString('pt-BR')}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </>
                          ) : (
                            'Recente'
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center">
                          {getStatusBadge(row.status)}
                        </td>

                        {/* Ações */}
                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            
                            {/* Responder */}
                            <button
                              onClick={() => handleOpenReplyModal(row)}
                              className="p-1.5 rounded-lg bg-white hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-all inline-flex items-center shadow-sm"
                              title="Responder Comentário"
                            >
                              <Reply className="w-4 h-4" />
                            </button>

                            {/* Aprovar (Apenas se não for aprovado) */}
                            {row.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateStatus(row, 'approved')}
                                className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-all inline-flex items-center shadow-sm"
                                title="Aprovar Comentário"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {/* Rejeitar (Apenas se não for rejeitado) */}
                            {row.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus(row, 'rejected')}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all inline-flex items-center shadow-sm"
                                title="Rejeitar Comentário"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {/* Spam (Apenas se não for spam) */}
                            {row.status !== 'spam' && (
                              <button
                                onClick={() => handleUpdateStatus(row, 'spam')}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all inline-flex items-center shadow-sm"
                                title="Marcar como Spam"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Excluir */}
                            <button
                              onClick={() => handleDelete(row.id, safeUserName)}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all inline-flex items-center shadow-sm"
                              title="Excluir Comentário"
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

        {/* Reply Dialog Modal */}
        {replyingComment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-lg w-full relative p-6 shadow-2xl">
              <button
                onClick={() => setReplyimgComment(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="pb-4 border-b border-slate-100 mb-6 flex items-center gap-2">
                <Reply className="w-5 h-5 text-violet-600" />
                <h3 className="font-extrabold text-slate-800 text-lg">Responder Comentário</h3>
              </div>

              {/* Original message */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {String(replyingComment.user_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{replyingComment.user_name || 'Usuário'}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-auto">
                    {replyingComment.created_at ? new Date(replyingComment.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  "{replyingComment.text ?? ''}"
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Sua resposta (Exibida publicamente no Player)
                  </label>
                  <textarea
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Escreva uma resposta amigável, tire dúvidas do produto ou envie links de suporte..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-800 placeholder-slate-400 resize-none font-medium leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    💡 Dica: Responder a um comentário aprova-o automaticamente no player público.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReplyimgComment(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition-all"
                    disabled={isSubmittingReply}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all"
                    disabled={isSubmittingReply}
                  >
                    {isSubmittingReply ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isSubmittingReply ? 'Enviando...' : 'Enviar Resposta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default CommentsPage;