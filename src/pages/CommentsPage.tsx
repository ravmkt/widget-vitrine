"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { db, Comment, Video } from "@/lib/db";
import {
  MessageSquare,
  Trash2,
  Send,
  Mail,
  User,
  Video as VideoIcon,
  Filter,
  ArrowUpDown,
  ArrowLeftRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Smile,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import CustomDialog from "@/components/CustomDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

const CommentsPage = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVideo, setFilterVideo] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Comment; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [statusOptionsAnchorEl, setStatusOptionsAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; commentId: string | null }>({
    isOpen: false,
    commentId: null,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const EMOJIS = [
    '😀', '😍', '🔥', '👏', '❤️', '😂', '😮', '😢', '👍', '🙏', '🎉', '💪', '🚀', '🤩', '😎', '✨', '💜', '🙌', '🥰', '💯', '🛍️'
  ];

  const loadData = async () => {
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

  useEffect(() => { loadData(); }, []);

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
      const matchesStatus = filterStatus === "all" || (
        filterStatus === "Pendente" ? c.status === "pending" :
        filterStatus === "Aprovado" ? c.status === "approved" :
        c.status === "rejected"
      );
      const matchesVideo = filterVideo === "all" || c.video_id === filterVideo;
      return matchesSearch && matchesStatus && matchesVideo;
    });
  }, [comments, searchTerm, filterStatus, filterVideo]);

  const handleSort = (key: keyof Comment) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { ...prev, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const isSortedBy = (key: keyof Comment) => {
    return sortConfig.key === key;
  };

  const sortDirectionIcon = (key: keyof Comment) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  const handleStatusChange = async (commentId: string, newStatus: Comment["status"]) => {
    try {
      await db.comments.save({ ...comments.find(c => c.id === commentId)!, status: newStatus });
      loadData();
      showSuccess("Status atualizado com sucesso!");
    } catch (error) {
      showError("Erro ao atualizar status.");
    }
  };

  const openStatusOptions = (anchorEl: HTMLElement | null, commentId: string) => {
    setStatusOptionsAnchorEl(anchorEl);
    setEditingCommentId(commentId);
    setShowStatusOptions(true);
  };

  const closeStatusOptions = () => {
    setShowStatusOptions(false);
    setEditingCommentId(null);
    setStatusOptionsAnchorEl(null);
  };

  const handleDeleteClick = (comment: Comment) => {
    setDeleteModal({
      isOpen: true,
      commentId: comment.id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.commentId) return;
    try {
      await db.comments.delete(deleteModal.commentId);
      loadData();
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      showSuccess("Comentário excluído com sucesso!");
    } catch (error) {
      showError("Erro ao excluir comentário.");
    }
  };

  const handleCancelDelete = () => {
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleReply = (comment: Comment) => {
    setEditingCommentId(comment.id);
    // Focus the textarea when replying
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const submitReply = async () => {
    if (!editingCommentId || !textareaRef.current) return;
    const text = commentText.trim();
    const author = commentAuthor.trim();
    if (!author) {
      showError("Digite seu nome");
      return;
    }
    if (!text) {
      showError("Digite um comentário");
      return;
    }

    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      story_id: comments.find(c => c.id === editingCommentId)?.story_id || "",
      video_id: comments.find(c => c.id === editingCommentId)?.video_id || "",
      user_name: author,
      text,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    await db.comments.save(newComment);
    setComments(prev => [...prev, newComment]);
    setCommentText("");
    setCommentAuthor("");
    setShowEmoji(false);
    showSuccess("Comentário enviado");
  };

  const insertEmojiAtCursor = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const textBefore = el.value.substring(0, start);
    const textAfter = el.value.substring(end);
    const newValue = textBefore + emoji + textAfter;
    const newCursorPos = start + emoji.length;

    el.value = newValue;
    el.setSelectionRange(newCursorPos, newCursorPos);
    setCommentText(newValue);
  };

  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
            <input
              type="text"
              placeholder="Pesquisar autor ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
          <select
            value={filterVideo}
            onChange={(e) => setFilterVideo(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos os Vídeos</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Colunas</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSort("author")}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isSortedBy("author") ? "bg-[#0094EB] text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Autor {isSortedBy("author") && sortDirectionIcon("author")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("video_title")}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isSortedBy("video_title") ? "bg-[#0094EB] text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Conteúdo/Vídeo {isSortedBy("video_title") && sortDirectionIcon("video_title")}
            </button>
            <button
              type="button"
              onClick={() => handleSort("status")}
              className={cn(
                "px-4 py-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isSortedBy-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isSortedBy("status") ? "bg-[#0094EB] text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Status {isSortedBy("status") && sortDirectionIcon("status")}
            </button>
          </div>
        </div>

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
              {filteredComments.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/50 transition-colors"
                  onClick={() => !editingCommentId && !showStatusOptions && handleReply(row)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0094EB] flex items-center justify-center font-black text-xs">
                        {row.user_name ? row.user_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{row.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 mb-1">"{row.text}"</p>
                    <div className="flex items-center gap-1 text-[10px] font-black text-[#0094EB] uppercase tracking-wider">
                      <VideoIcon size={12} /> Vídeo: {videos.find((v) => v.id === row.video_id)?.title || "Desconhecido"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      onClick={() => openStatusOptions(row.id ? document.getElementById(`status-badge-${row.id}`) : null, row.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer",
                        getStatusColor(row.status)
                      )}
                      id={`status-badge-${row.id}`}
                    >
                      {getStatusLabel(row.status)}
                    </span>
                    {showStatusOptions && editingCommentId === row.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-[1000]">
                        <XCircle size={12} className="text-rose-500" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleReply(row)}
                        className="p-2 text-[#0094EB] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Responder"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(row)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL PARA RESPOSTA ==================== */}
      <CustomDialog
        isOpen={!!editingCommentId && !showStatusOptions}
        type="form"
        title="Responder Comentário"
        maxWidth="max-w-lg"
        onCancel={() => {
          setEditingCommentId(null);
          setCommentText("");
          setCommentAuthor("");
          setShowEmoji(false);
        }}
        onConfirm={submitReply}
        confirmText="Enviar Resposta"
      >
        <div className="flex flex-col items-center">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Resposta ao comentário de {comments.find((c) => c.id === editingCommentId)?.user_name || "Cliente"}
            </p>
            <p className="text-sm text-slate-600 font-medium italic">
              "{comments.find((c) => c.id === editingCommentId)?.text}"
            </p>
          </div>
          <div className="relative">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sua Resposta</label>
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
              placeholder="Escreva aqui a resposta pública..."
            />
            <button
              type="button"
              onClick={() => setShowEmoji((prev) => !prev)}
              className="absolute right-3 top-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <Smile className="h-4 w-4" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-2 grid w-64 grid-cols-7 gap-1 rounded-2xl border border-white/10 bg-black p-3 shadow-2xl">
                {EMOJIS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => insertEmojiAtCursor(item)}
                    className={cn(
                      "rounded-xl p-2 text-lg hover:bg-white/10",
                      emoji === item && "bg-violet-600"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CustomDialog>

      {/* ==================== STATUS OPTIONS POPUP ==================== */}
      {showStatusOptions && editingCommentId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Alterar Status</h3>
              <button onClick={() => closeStatusOptions()} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {["Pendente", "Aprovado", "Rejeitado"].map((option) => (
                <div
                  key={option}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-100"
                  onClick={() => {
                    const statusMap: Record<string, Comment["status"]> = {
                      Pendente: "pending",
                      Aprovado: "approved",
                      Rejeitado: "rejected",
                    };
                    handleStatusChange(editingCommentId!, statusMap[option]);
                    closeStatusOptions();
                  }}
                >
                  <span className="font-bold text-slate-800">{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRM DELETE MODAL ==================== */}
      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="EXCLUIR COMENTÁRIO"
        itemName="Comentário"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default CommentsPage;