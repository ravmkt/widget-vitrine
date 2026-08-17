"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db, Comment, Video } from "@/lib/db";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";
import {
  Search,
  MessageSquare,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import CustomDialog from "@/components/CustomDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

interface CommentReply {
  id: string;
  user_name: string;
  user_logo?: string;
  text: string;
  created_at: string;
  is_store_reply?: boolean;
}

interface CommentWithReplies extends Comment {
  replies?: CommentReply[];
  is_store_reply?: boolean;
}

const CommentsPage = () => {
  const { storeId, loading: tenantLoading } = useTenant();

  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVideo, setFilterVideo] = useState<string>("all");

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState({
    top: 0,
    left: 0,
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    commentId: string | null;
  }>({
    isOpen: false,
    commentId: null,
  });

  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");

  const [autoApprove, setAutoApprove] = useState(false);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const EMOJIS = [
    "😀",
    "😁",
    "😂",
    "🤣",
    "😊",
    "😍",
    "😘",
    "😎",
    "👍",
    "👏",
    "🙌",
    "🙏",
    "💪",
    "🔥",
    "❤️",
    "💙",
    "✨",
    "🎉",
    "✅",
    "⭐",
    "😢",
    "😡",
    "🤔",
    "👀",
  ];

  /*
   * Busca os dados da loja.
   * Este é o único useEffect responsável por buscar app_settings.
   */
useEffect(() => {
    const fetchStoreSettings = async () => {
      if (!storeId) return;
            try {
        const settings = await db.generalSettings.getAll();
        if (settings.length > 0) {
          const s = settings[0];
          setStoreName(s.store_name || '');
          setStoreLogoUrl(s.logo_url || '');
        }

        // 🆕 Busca configuração de aprovação automática
        if (storeId) {
          const { data: storeConfig } = await supabase
            .from('store_settings')
            .select('auto_approve_comments')
            .eq('store_id', storeId)
            .maybeSingle();

          if (storeConfig) {
            setAutoApprove(!!storeConfig.auto_approve_comments);
          }
        }
      } catch (error) {
        console.error(
          "[CommentsPage] erro ao buscar configurações da loja:",
          error,
        );
      }
    };

    fetchStoreSettings();
  }, [storeId]);

  const handleAutoApproveToggle = async () => {
    if (!storeId) return;

    const newValue = !autoApprove;
    setAutoApprove(newValue);
    setAutoApproveLoading(true);

    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          auto_approve_comments: newValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'store_id'
        });

      if (error) throw error;

      showSuccess(
        newValue
          ? 'Comentários serão aprovados automaticamente.'
          : 'Comentários passarão por moderação.'
      );
    } catch (err) {
      console.error('[CommentsPage] erro ao salvar config:', err);
      setAutoApprove(!newValue); // Reverte
      showError('Erro ao salvar configuração.');
    } finally {
      setAutoApproveLoading(false);
    }
  };

  /*
   * Verifica a sessão atual do usuário.
   * O userId é obtido automaticamente da sessão autenticada.
   */
  useEffect(() => {
    const verificarSessao = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      console.log("[CommentsPage] userId:", user?.id ?? null);
      console.log("[CommentsPage] usuário autenticado:", user);
      console.log("[CommentsPage] erro de autenticação:", error);
    };

    verificarSessao();
  }, []);

  const normalizeStatus = (status?: string) => {
    const value = String(status || "")
      .toLowerCase()
      .trim();

    if (
      [
        "pending",
        "pendente",
        "pendente aprovação",
        "em análise",
      ].includes(value)
    ) {
      return "pending";
    }

    if (["approved", "aprovado", "aprovada"].includes(value)) {
      return "approved";
    }

    if (["rejected", "rejeitado", "rejeitada"].includes(value)) {
      return "rejected";
    }

    return value;
  };

  const loadComments = async () => {
    try {
      setLoading(true);

      if (!storeId) {
        setComments([]);
        setVideos([]);
        return;
      }

      const [allComments, allVideos] = await Promise.all([
        db.comments.getAll(storeId),
        db.videos.getAll(storeId),
      ]);

      setComments((allComments || []) as CommentWithReplies[]);
      setVideos(allVideos || []);
    } catch (error) {
      console.error(
        "[CommentsPage] erro ao carregar comentários:",
        error,
      );

      showError("Erro ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Carrega os comentários somente depois que o TenantContext
   * terminar de identificar a loja atual.
   */
  useEffect(() => {
    if (!tenantLoading) {
      loadComments();
    }
  }, [storeId, tenantLoading]);

  const getStatusLabel = (status: Comment["status"]) => {
    switch (normalizeStatus(status)) {
      case "pending":
        return "Pendente";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      default:
        return "Pendente";
    }
  };

  const getStatusColor = (status: Comment["status"]) => {
    switch (normalizeStatus(status)) {
      case "pending":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "approved":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "rejected":
        return "text-rose-700 bg-rose-50 border-rose-200";
      default:
        return "text-amber-700 bg-amber-50 border-amber-200";
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        (comment.user_name || "").toLowerCase().includes(search) ||
        (comment.text || "").toLowerCase().includes(search);

      const normalizedStatus = normalizeStatus(comment.status);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "Pendente" && normalizedStatus === "pending") ||
        (filterStatus === "Aprovado" && normalizedStatus === "approved") ||
        (filterStatus === "Rejeitado" && normalizedStatus === "rejected");

      const matchesVideo =
        filterVideo === "all" || comment.video_id === filterVideo;

      return matchesSearch && matchesStatus && matchesVideo;
    });
  }, [comments, searchTerm, filterStatus, filterVideo]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  };

  const sortedComments = useMemo(() => {
    const rows = [...filteredComments];

    if (!sortColumn) {
      return rows;
    }

    const getSortValue = (comment: CommentWithReplies) => {
      const normalizedStatus = normalizeStatus(comment.status);

      switch (sortColumn) {
        case "autor":
          return (comment.user_name || "").toLowerCase();

        case "status":
          return normalizedStatus === "pending"
            ? 1
            : normalizedStatus === "approved"
              ? 2
              : 3;

        default:
          return "";
      }
    };

    rows.sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (
        typeof valueA === "number" &&
        typeof valueB === "number"
      ) {
        return sortDirection === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB), "pt-BR")
        : String(valueB).localeCompare(String(valueA), "pt-BR");
    });

    return rows;
  }, [filteredComments, sortColumn, sortDirection]);

  const handleStatusChange = async (
    commentId: string,
    newStatus: Comment["status"],
  ) => {
    try {
      const current = comments.find(
        (comment) => comment.id === commentId,
      );

      if (!current || !storeId) {
        showError("Não foi possível identificar a loja atual.");
        return;
      }

      // 🔥 Usa Supabase diretamente, sem passar pelo db.comments.save
      const { error } = await supabase
        .from('comments')
        .update({ status: newStatus })
        .eq('id', commentId)
        .eq('store_id', storeId);

      if (error) throw error;

      await loadComments();

      showSuccess("Status atualizado com sucesso!");
    } catch (error) {
      console.error(
        "[CommentsPage] erro ao atualizar status:",
        error,
      );

      showError("Erro ao atualizar status.");
    }
  };

  const openStatusDropdown = (
    event: React.MouseEvent,
    commentId: string,
  ) => {
    event.stopPropagation();

    const rect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();

    setStatusDropdownPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    setEditingCommentId(commentId);
    setShowStatusDropdown(true);
  };

  const closeStatusDropdown = () => {
    setShowStatusDropdown(false);
    setEditingCommentId(null);
  };

  const handleDeleteClick = (
    event: React.MouseEvent,
    comment: Comment,
  ) => {
    event.stopPropagation();

    setDeleteModal({
      isOpen: true,
      commentId: comment.id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.commentId) {
      return;
    }

    try {
      await db.comments.delete(deleteModal.commentId);
      await loadComments();

      setDeleteModal({
        isOpen: false,
        commentId: null,
      });

      showSuccess("Comentário excluído com sucesso!");
    } catch (error) {
      console.error(
        "[CommentsPage] erro ao excluir comentário:",
        error,
      );

      showError("Erro ao excluir comentário.");
    }
  };

  const handleReply = (
    event: React.MouseEvent,
    comment: CommentWithReplies,
  ) => {
    event.stopPropagation();

    setEditingCommentId(comment.id);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

const submitReply = async () => {
  if (!editingCommentId || !textareaRef.current) {
    return;
  }

  const text = commentText.trim();

  if (!text) {
    showError("Digite um comentário.");
    return;
  }

  const currentComment = comments.find(
    (comment) => comment.id === editingCommentId,
  );

  if (!currentComment) {
    showError("Comentário não encontrado.");
    return;
  }

  try {
    // 🔥 Atualiza diretamente no Supabase os campos de resposta
    const { error } = await supabase
      .from('comments')
      .update({
        reply_content: text,
        reply_status: 'replied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingCommentId)
      .eq('store_id', storeId);

    if (error) throw error;

    // Atualiza o estado local
    setComments((previousComments) =>
      previousComments.map((comment) =>
        comment.id === editingCommentId
          ? {
              ...comment,
              reply_content: text,
              reply_status: 'replied',
            }
          : comment,
      ),
    );

    setCommentText("");
    setShowEmoji(false);
    setEditingCommentId(null);

    showSuccess("Resposta enviada.");
  } catch (error) {
    console.error(
      "[CommentsPage] erro ao enviar resposta:",
      error,
    );

    showError("Erro ao enviar resposta.");
  }
};

  const insertEmojiAtCursor = (emoji: string) => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    const start = element.selectionStart;
    const end = element.selectionEnd;

    const newValue =
      element.value.substring(0, start) +
      emoji +
      element.value.substring(end);

    const newCursorPosition = start + emoji.length;

    setCommentText(newValue);

    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(
        newCursorPosition,
        newCursorPosition,
      );
    });
  };

  const handleViewVideo = (row: CommentWithReplies) => {
    const video =
      videos.find((item) => item.id === row.video_id) || null;

    if (video) {
      setViewingVideo(video);
      setIsViewingModalOpen(true);
    }
  };

  if (loading || tenantLoading) {
    return null;
  }

return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      {/* ── CABEÇALHO DA PÁGINA ── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Comentários
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-[#c0c5d4]">
            Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
          </p>
        </div>
      </div>

{/* ── MÓDULOS DE CONFIGURAÇÃO DE MODERAÇÃO E FILTROS ── */}
      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        {/* Card: Moderação de Comentários (Dual-Theme) */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#0094EB] dark:bg-[#ff7a29] text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_15px_rgba(255,122,41,0.4)] shrink-0">
              <ShieldCheck size={18} className="!text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Moderação de Conteúdo
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-[#8a90a0]">
                Controle de publicação na loja.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#0f1220]/70 border border-slate-100 dark:border-white/5">
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-white block">
                {autoApprove ? "Aprovação automática ativada" : "Moderação manual ativada"}
              </span>
              <p className="text-[11px] font-medium text-slate-500 dark:text-[#8a90a0] mt-0.5">
                {autoApprove ? "Publicados imediatamente." : "Requer aprovação prévia."}
              </p>
            </div>

            {/* Switch com Trilha e Bolinha Perfeitamente Alinhadas */}
            <button
              type="button"
              onClick={handleAutoApproveToggle}
              disabled={autoApproveLoading}
              aria-label="Alternar aprovação automática de comentários"
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50",
                autoApprove 
                  ? "bg-[#0094EB] dark:bg-[#ff7a29] shadow-sm shadow-blue-500/30 dark:shadow-orange-500/30" 
                  : "bg-slate-300 dark:bg-slate-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out",
                  autoApprove ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Card: Barra de Pesquisa e Filtros (Dual-Theme com Foco Azul/Laranja) */}
        <div className="rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md p-6 shadow-sm lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-[#8a90a0]">
                Filtros & Busca
              </span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-[#0094EB] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-3 py-0.5 rounded-full border border-blue-100 dark:border-[#ff7a29]/20">
              {filteredComments.length} {filteredComments.length === 1 ? 'Comentário' : 'Comentários'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8a90a0]" size={16} />
              <input
                type="text"
                placeholder="Pesquisar autor ou texto..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29]"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-[#e8ecf4] outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29]"
            >
              <option value="all">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>

            <select
              value={filterVideo}
              onChange={(event) => setFilterVideo(event.target.value)}
              className="bg-slate-50 dark:bg-[#0f1220] border border-slate-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-[#e8ecf4] outline-none transition focus:border-[#0094EB] dark:focus:border-[#ff7a29] truncate"
            >
              <option value="all">Todos os Vídeos</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

{/* ── TABELA MODULAR DE COMENTÁRIOS (PADRÃO TOP VÍDEOS DASHBOARD) ── */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-orange-500/15 bg-white dark:bg-[#1a1f35]/80 dark:backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0f1220]/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#8a90a0]">
                <th className="w-48 px-6 py-4 rounded-l-2xl">
                  <button
                    type="button"
                    onClick={() => handleSort("autor")}
                    className="flex items-center gap-1.5 transition-colors hover:text-slate-800 dark:hover:text-white"
                  >
                    Autor
                    {sortColumn === "autor" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>

                <th className="px-6 py-4">
                  Conteúdo / Vídeo
                </th>

                <th className="w-36 px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="mx-auto flex items-center gap-1.5 transition-colors hover:text-slate-800 dark:hover:text-white"
                  >
                    Status
                    {sortColumn === "status" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>

                <th className="w-32 px-6 py-4 text-center rounded-r-2xl">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {sortedComments.map((row) => {
                const video = videos.find((item) => item.id === row.video_id);
                const isMainStoreReply = row.is_store_reply === true;
                const mainAuthorName = isMainStoreReply ? storeName || "Loja" : row.user_name;
                const mainAuthorLogo = isMainStoreReply ? storeLogoUrl : undefined;
                const normalizedSt = normalizeStatus(row.status);

                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                  >
{/* Autor (Avatar Dual-Theme: Azul no Light / Laranja no Dark) */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-[#0f1220] border border-slate-200 dark:border-white/10 shrink-0 shadow-xs">
                          {mainAuthorLogo ? (
                            <img
                              src={mainAuthorLogo}
                              alt={mainAuthorName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#0094EB] dark:bg-[#ff7a29] text-xs font-black text-white shadow-xs">
                              {mainAuthorName?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 dark:text-[#e8ecf4] block truncate">
                            {mainAuthorName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-[#8a90a0]">
                            Cliente
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Conteúdo & Resposta da Loja */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700 dark:text-[#e8ecf4] leading-relaxed">
                        &quot;{row.text}&quot;
                      </p>

                      {row.reply_content && row.reply_status !== 'hidden' && (
                        <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-[#0f1220]/80 border border-slate-200/60 dark:border-white/5 p-3.5 space-y-1">
                          <div className="flex items-center gap-2">
                            {storeLogoUrl ? (
                              <img
                                src={storeLogoUrl}
                                alt={storeName || 'Loja'}
                                className="h-5 w-5 rounded-full object-cover border border-[#0094EB] dark:border-[#ff7a29]"
                              />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0094EB] dark:bg-[#ff7a29] text-[9px] font-black text-white">
                                {(storeName || 'L').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <span className="text-xs font-black text-slate-800 dark:text-white">
                              {storeName || 'Loja'}
                            </span>

                            <span className="text-[9px] font-black uppercase text-[#0094EB] dark:text-[#ff7a29] bg-blue-50 dark:bg-[#ff7a29]/10 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-[#ff7a29]/20">
                              Resposta Oficial
                            </span>
                          </div>

                          <p className="text-xs font-medium text-slate-600 dark:text-[#c0c5d4] pl-7">
                            {row.reply_content}
                          </p>
                        </div>
                      )}
                      
                      {video && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                          <span className="text-slate-400 dark:text-[#8a90a0]">VÍDEO:</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleViewVideo(row);
                            }}
                            className="text-[#0094EB] dark:text-[#ff7a29] hover:underline cursor-pointer font-black truncate max-w-xs"
                          >
                            {video.title}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status com Estilo de Tag Arredondada */}
                    <td className="px-6 py-4 text-center align-middle">
                      <button
                        type="button"
                        onClick={(event) => openStatusDropdown(event, row.id)}
                        className={cn(
                          "cursor-pointer rounded-full border px-3.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all",
                          normalizedSt === "approved"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/40"
                            : normalizedSt === "rejected"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700/40"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40"
                        )}
                      >
                        {getStatusLabel(row.status)}
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(event) => handleReply(event, row)}
                          className="p-2 rounded-xl text-slate-400 hover:text-[#0094EB] dark:hover:text-[#ff7a29] hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                          title="Responder comentário"
                        >
                          <MessageSquare size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => handleDeleteClick(event, row)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                          title="Excluir comentário"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedComments.length === 0 && (
            <div className="py-16 text-center space-y-2">
              <MessageSquare size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                Nenhum comentário encontrado.
              </p>
              <p className="text-xs text-slate-400 dark:text-[#8a90a0]">
                Ajuste os filtros de busca ou aguarde novas interações dos clientes nos seus vídeos.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <CustomDialog
        isOpen={!!editingCommentId && !showStatusDropdown}
        type="form"
        title="Responder Comentário"
        maxWidth="max-w-lg"
        onCancel={() => {
          setEditingCommentId(null);
          setCommentText("");
          setShowEmoji(false);
        }}
        onConfirm={submitReply}
        confirmText="Enviar Resposta"
      >
        <div className="flex flex-col items-center">
          <div className="space-y-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Resposta da Loja
            </p>

            {storeLogoUrl && (
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#0094EB]">
                <img
                  src={storeLogoUrl}
                  alt="Logo da loja"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <p className="text-sm font-medium italic text-slate-600">
              &quot;
              {
                comments.find(
                  (comment) => comment.id === editingCommentId,
                )?.text
              }
              &quot;
            </p>
          </div>

          <div className="relative mt-4 w-full">
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
              Sua Resposta
            </label>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={(event) =>
                  setCommentText(event.target.value)
                }
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
                placeholder="Escreva aqui a resposta pública..."
              />

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowEmoji((previous) => !previous);
                }}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-[#0094EB] p-2 text-white shadow-lg transition-colors hover:bg-[#0E4787]"
                aria-label="Inserir emoji"
              >
                <span className="text-lg">😊</span>
              </button>

              {showEmoji && (
                <div
                  className="absolute bottom-full right-0 z-[99999] mb-2 grid w-64 grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        insertEmojiAtCursor(emoji);
                        setShowEmoji(false);
                      }}
                      className="rounded-xl p-2 text-lg transition-colors hover:bg-slate-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CustomDialog>

      {showStatusDropdown && editingCommentId && (
        <div
          className="fixed inset-0 z-[9999]"
          onClick={closeStatusDropdown}
        >
          <div
            className="fixed min-w-[120px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
            style={{
              top: statusDropdownPosition.top,
              left: statusDropdownPosition.left,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {["Pendente", "Aprovado", "Rejeitado"].map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  className="block w-full rounded-lg p-2 text-left hover:bg-slate-50"
                  onClick={async () => {
                    const statusMap: Record<
                      string,
                      Comment["status"]
                    > = {
                      Pendente: "pending",
                      Aprovado: "approved",
                      Rejeitado: "rejected",
                    };

                    await handleStatusChange(
                      editingCommentId,
                      statusMap[option],
                    );

                    closeStatusDropdown();
                  }}
                >
                  <span className="text-sm font-bold text-slate-800">
                    {option}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      )}

      <CustomDialog
        isOpen={isViewingModalOpen}
        type="form"
        title="Visualizar Vídeo"
        maxWidth="max-w-3xl"
        onCancel={() => {
          setIsViewingModalOpen(false);
          setViewingVideo(null);
        }}
      >
        {viewingVideo && (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="mx-auto w-[240px] shrink-0">
              <div className="relative aspect-[9/16] max-h-[60vh] overflow-hidden rounded-[1.5rem] border-[4px] border-slate-900 bg-slate-950 shadow-lg">
                <video
                  src={viewingVideo.video_url}
                  className="h-full w-full object-contain"
                  poster={viewingVideo.thumbnail_url}
                  controls
                  autoPlay
                  loop
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col pt-1">
              <div className="mb-4">
                <h3 className="mb-1 text-lg font-black text-slate-900">
                  {viewingVideo.title}
                </h3>

                <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#0094EB]">
                  {viewingVideo.source_type === "upload"
                    ? "UPLOAD"
                    : "URL"}
                </span>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">
                    Status
                  </p>

                  <p className="text-xs font-black text-emerald-600">
                    Ativo
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400">
                    Vídeo ID
                  </p>

                  <p className="text-[10px] font-bold text-slate-500">
                    {viewingVideo.id?.substring(0, 8) || "---"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsViewingModalOpen(false);
                  setViewingVideo(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0094EB] py-3 text-xs font-black text-white transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </CustomDialog>

      <ConfirmDeleteDialog
        isOpen={deleteModal.isOpen}
        title="EXCLUIR COMENTÁRIO"
        itemName="Comentário"
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal({
            isOpen: false,
            commentId: null,
          })
        }
      />
    </div>
  );
};

export default CommentsPage;
