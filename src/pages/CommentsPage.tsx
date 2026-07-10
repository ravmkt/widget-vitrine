"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { db, Comment, Video } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import {
  Search,
  MessageSquare,
  Trash2,
  Smile,
  X,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import CustomDialog from "@/components/CustomDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

interface CommentWithReplies extends Comment {
  replies?: Array<{
    id: string;
    user_name: string;
    user_logo?: string;
    text: string;
    created_at: string;
    is_store_reply?: boolean;
  }>;
  is_store_reply?: boolean;
}

const CommentsPage = () => {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVideo, setFilterVideo] = useState<string>("all");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState({ top: 0, left: 0 });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; commentId: string | null }>({
    isOpen: false,
    commentId: null,
  });
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Store identity from app_settings
  const [storeName, setStoreName] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from("app_settings")
          .select("settings")
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data && data.settings) {
          setStoreName(data.settings.store_name || "");
          setStoreLogoUrl(data.settings.store_logo_url || "");
        }
      } catch (err) {
        console.error("Error fetching store settings:", err);
      }
    };
    fetchStoreSettings();
  }, []);

  const EMOJIS = [
    "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
    "👍", "👏", "🙌", "🙏", "💪", "🔥", "❤️", "💙",
    "✨", "🎉", "✅", "⭐", "😢", "😡", "🤔", "👀"
  ];

  const normalizeStatus = (status?: string) => {
    const value = String(status || "").toLowerCase().trim();
    if (["pending", "pendente", "pendente aprovação", "em análise"].includes(value)) return "pending";
    if (["approved", "aprovado", "aprovada"].includes(value)) return "approved";
    if (["rejected", "rejeitado", "rejeitada"].includes(value)) return "rejected";
    return value;
  };

  const loadComments = async () => {
    try {
      const [allComments, allVideos] = await Promise.all([
        db.comments.getAll(),
        db.videos.getAll(),
      ]);
      setComments(allComments || []);
      setVideos(allVideos);
    } catch (error) {
      showError("Erro ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, []);

  const getStatusLabel = (status: Comment["status"]) => {
    switch (status) {
      case "approved": return "Aprovado";
      case "rejected": return "Rejeitado";
      default: return "Pendente";
    }
  };

  const getStatusColor = (status: Comment["status"]) => {
    switch (status) {
      case "approved": return "text-emerald-600 bg-emerald-50";
      case "rejected": return "text-rose-600 bg-rose-50";
      default: return "text-amber-600 bg-amber-50";
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const matchesSearch = (c.user_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.text || "").toLowerCase().includes(searchTerm.toLowerCase());
      const normalizedStatus = normalizeStatus(c.status);
      const matchesStatus = filterStatus === "all" || (
        filterStatus === "Pendente" ? normalizedStatus === "pending" :
        filterStatus === "Aprovado" ? normalizedStatus === "approved" :
        normalizedStatus === "rejected"
      );
      const matchesVideo = filterVideo === "all" || c.video_id === filterVideo;
      return matchesSearch && matchesStatus && matchesVideo;
    });
  }, [comments, searchTerm, filterStatus, filterVideo]);

  const handleStatusChange = async (commentId: string, newStatus: Comment["status"]) => {
    try {
      await db.comments.save({ ...comments.find(c => c.id === commentId)!, status: newStatus });
      loadComments();
      showSuccess("Status atualizado com sucesso!");
    } catch (error) {
      showError("Erro ao atualizar status.");
    }
  };

  const openStatusDropdown = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setStatusDropdownPosition({ top: rect.bottom + 8, left: rect.left });
    setEditingCommentId(commentId);
    setShowStatusDropdown(true);
  };

  const closeStatusDropdown = () => {
    setShowStatusDropdown(false);
    setEditingCommentId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, comment: Comment) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, commentId: comment.id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.commentId) return;
    try {
      await db.comments.delete(deleteModal.commentId);
      loadComments();
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      showSuccess("Comentário excluído com sucesso!");
    } catch (error) {
      showError("Erro ao excluir comentário.");
    }
  };

  const handleReply = (e: React.MouseEvent, comment: CommentWithReplies) => {
    e.stopPropagation();
    setEditingCommentId(comment.id);
    setTimeout(() => { textareaRef.current?.focus(); }, 100);
  };

  const submitReply = async () => {
    if (!editingCommentId || !textareaRef.current) return;
    const text = commentText.trim();
    if (!text) {
      showError("Digite um comentário");
      return;
    }
    const newReply = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_name: storeName || "Loja",
      user_logo: storeLogoUrl || undefined,
      text,
      created_at: new Date().toISOString(),
      is_store_reply: true,
    };
    setComments(prev => prev.map(c => {
      if (c.id === editingCommentId) {
        const updated = { ...c, replies: [...(c.replies || []), newReply] };
        db.comments.save(updated);
        return updated;
      }
      return c;
    }));
    setCommentText("");
    setShowEmoji(false);
    setEditingCommentId(null);
    showSuccess("Resposta enviada");
  };

  const insertEmojiAtCursor = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newValue = el.value.substring(0, start) + emoji + el.value.substring(end);
    const newCursorPos = start + emoji.length;
    el.value = newValue;
    el.setSelectionRange(newCursorPos, newCursorPos);
    setCommentText(newValue);
  };

  const handleViewVideo = (row: any) => {
    const video = videos.find(v => v.id === row.video_id) || null;
    if (video) {
      setViewingVideo(video);
      setIsViewingModalOpen(true);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Comentários</h1>
          <p className="text-slate-500 font-medium mt-1">Gerencie a interação dos clientes nos seus stories.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar autor ou conteúdo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[#0094EB]">
            <option value="all">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
          <select value={filterVideo} onChange={(e) => setFilterVideo(e.target.value)} className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[#0094EB]">
            <option value="all">Todos os Vídeos</option>
            {videos.map((v) => (<option key={v.id} value={v.id}>{v.title}</option>))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-20">Autor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-40">Conteúdo / Vídeo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-28 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-36 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComments.map((row) => {
                const video = videos.find(v => v.id === row.video_id);
                const isMainStoreReply = row.is_store_reply === true;
                const mainAuthorName = isMainStoreReply ? (storeName || "Loja") : row.user_name;
                const mainAuthorLogo = isMainStoreReply ? storeLogoUrl : undefined;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden">
                          {isMainStoreReply ? (
                            mainAuthorLogo ? (
                              <img src={mainAuthorLogo} alt={mainAuthorName} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0094EB] flex items-center justify-center font-black text-xs">
                                {mainAuthorName.charAt(0).toUpperCase()}
                              </div>
                            )
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0094EB] flex items-center justify-center font-black text-xs">
                              {row.user_name ? row.user_name.charAt(0).toUpperCase() : "?"}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{mainAuthorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 mb-1">"{row.text}"</p>
                      {row.replies && row.replies.length > 0 && (
                        <div className="mt-3 ml-4 border-l-2 border-[#0094EB]/20 pl-3 space-y-2">
                          {row.replies.map((reply) => {
                            const isReplyStore = reply.is_store_reply === true;
                            const replyName = isReplyStore ? (storeName || "Loja") : reply.user_name;
                            const replyLogo = isReplyStore ? storeLogoUrl : reply.user_logo;
                            return (
                              <div key={reply.id} className="bg-blue-50/50 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  {replyLogo ? (
                                    <img src={replyLogo} alt={replyName} className="w-6 h-6 rounded-full object-cover border border-[#0094EB]" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#0094EB] flex items-center justify-center text-white font-black text-xs">
                                      {replyName?.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-bold text-xs text-slate-700">{replyName}</span>
                                  <span className="text-[9px] text-slate-400">{new Date(reply.created_at).toLocaleString('pt-BR')}</span>
                                </div>
                                <p className="text-sm text-slate-600 ml-8">{reply.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {video && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-[#0094EB] uppercase tracking-wider mt-2">
                          VÍDEO:{" "}
                          <span onClick={(e) => { e.stopPropagation(); handleViewVideo(row); }} className="cursor-pointer hover:underline">{video.title}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span onClick={(e) => openStatusDropdown(e, row.id)} className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer", getStatusColor(row.status))} id={`status-badge-${row.id}`}>{getStatusLabel(row.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={(e) => handleReply(e, row)} className="p-2 text-[#0094EB] hover:bg-blue-50 rounded-lg transition-colors" title="Responder"><MessageSquare size={18} /></button>
                        <button type="button" onClick={(e) => handleDeleteClick(e, row)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CustomDialog isOpen={!!editingCommentId && !showStatusDropdown} type="form" title="Responder Comentário" maxWidth="max-w-lg" onCancel={() => { setEditingCommentId(null); setCommentText(""); setShowEmoji(false); }} onConfirm={submitReply} confirmText="Enviar Resposta">
        <div className="flex flex-col items-center">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resposta da Loja</p>
            {storeLogoUrl && (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#0094EB] flex items-center justify-center">
                <img src={storeLogoUrl} alt="Logo da loja" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-sm text-slate-600 font-medium italic">"{comments.find((c) => c.id === editingCommentId)?.text}"</p>
          </div>
          <div className="relative w-full mt-4">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sua Resposta</label>
            <div className="relative">
              <textarea ref={textareaRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]" placeholder="Escreva aqui a resposta pública..." />
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowEmoji((prev) => !prev); }} className="absolute right-3 bottom-3 rounded-full bg-[#0094EB] p-2 text-white hover:bg-[#0E4787] transition-colors shadow-lg z-10" aria-label="Inserir emoji"><span className="text-lg">😊</span></button>
              {showEmoji && (
                <div className="absolute bottom-full right-0 mb-2 grid w-64 grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-[99999]" onClick={(e) => e.stopPropagation()}>
                  {EMOJIS.map((item) => (
                    <button key={item} type="button" onClick={() => { insertEmojiAtCursor(item); setShowEmoji(false); }} className="rounded-xl p-2 text-lg hover:bg-slate-100 transition-colors">{item}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CustomDialog>

      {showStatusDropdown && editingCommentId && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-start" style={{ top: statusDropdownPosition.top, left: statusDropdownPosition.left }} onClick={closeStatusDropdown}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-2 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
            {["Pendente", "Aprovado", "Rejeitado"].map((option) => (
              <div key={option} className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => { const statusMap: Record<string, Comment["status"]> = { Pendente: "pending", Aprovado: "approved", Rejeitado: "rejected" }; handleStatusChange(editingCommentId!, statusMap[option]); closeStatusDropdown(); }}>
                <span className="text-sm font-bold text-slate-800">{option}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CustomDialog isOpen={isViewingModalOpen} type="form" title="Visualizar Vídeo" maxWidth="max-w-3xl" onCancel={() => setIsViewingModalOpen(false)}>
        {viewingVideo && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-[240px] mx-auto shrink-0">
              <div className="aspect-[9/16] bg-slate-950 rounded-[1.5rem] overflow-hidden shadow-lg relative border-[4px] border-slate-900 max-h-[60vh]">
                <video src={viewingVideo.video_url} className="w-full max-w-full h-auto max-h-[400px] object-fit contain" poster={viewingVideo.thumbnail_url} controls autoPlay loop />
              </div>
            </div>
            <div className="flex-1 flex flex-col pt-1">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-900 mb-1">{viewingVideo.title}</h3>
                <span className="bg-blue-50 text-[#0094EB] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{viewingVideo.source_type}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Status</p><p className="text-xs font-black text-emerald-600">Ativo</p></div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Vídeo ID</p><p className="text-[10px] font-bold text-slate-500">{viewingVideo.id?.substr(0,8) || '---'}</p></div>
              </div>
              <button onClick={() => setIsViewingModalOpen(false)} className="w-full py-3 bg-[#0094EB] text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2">Fechar</button>
            </div>
          </div>
        )}
      </CustomDialog>

      <ConfirmDeleteDialog isOpen={deleteModal.isOpen} title="EXCLUIR COMENTÁRIO" itemName="Comentário" onConfirm={handleConfirmDelete} onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
};

export default CommentsPage;