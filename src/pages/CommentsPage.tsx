"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db, Comment, Video } from "@/lib/db";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";
import {
  Search,
  MessageSquare,
  Trash2,
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

interface StoreSettings {
  store_name?: string;
  store_logo_url?: string;
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
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("settings")
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        const settings = data?.settings as StoreSettings | null;

        if (settings) {
          setStoreName(settings.store_name || "");
          setStoreLogoUrl(settings.store_logo_url || "");
        }
      } catch (error) {
        console.error(
          "[CommentsPage] erro ao buscar configurações da loja:",
          error,
        );
      }
    };

    fetchStoreSettings();
  }, []);

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

      console.log("[CommentsPage] storeId:", storeId);
      console.log("[CommentsPage] iniciando busca de comentários");

      if (!storeId) {
        setComments([]);
        setVideos([]);
        return;
      }

      const [allComments, allVideos] = await Promise.all([
        db.comments.getAll(storeId),
        db.videos.getAll(storeId),
      ]);

      console.log(
        "[CommentsPage] comentários recebidos:",
        allComments,
      );

      console.log("[CommentsPage] vídeos recebidos:", allVideos);

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

      await db.comments.save({
        ...(current as Comment & Record<string, unknown>),
        status: newStatus,
        store_id: storeId,
      } as Comment);

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

    const newReply: CommentReply = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`,
      user_name: storeName || "Loja",
      user_logo: storeLogoUrl || undefined,
      text,
      created_at: new Date().toISOString(),
      is_store_reply: true,
    };

    try {
      const updatedComment: CommentWithReplies = {
        ...currentComment,
        replies: [
          ...(currentComment.replies || []),
          newReply,
        ],
      };

      await db.comments.save(updatedComment as Comment);

      setComments((previousComments) =>
        previousComments.map((comment) =>
          comment.id === editingCommentId
            ? updatedComment
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
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Comentários
          </h1>

          <p className="mt-1 font-medium text-slate-500">
            Gerencie a interação dos clientes nos seus stories.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              type="text"
              placeholder="Pesquisar autor ou conteúdo..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-[#0094EB]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(event) =>
              setFilterStatus(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-[#0094EB]"
          >
            <option value="all">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>

          <select
            value={filterVideo}
            onChange={(event) =>
              setFilterVideo(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-[#0094EB]"
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

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-20 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleSort("autor")}
                    className="flex items-center gap-1.5 transition-colors hover:text-slate-700"
                  >
                    Autor

                    {sortColumn === "autor" && (
                      <span>
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>

                <th className="w-40 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Conteúdo / Vídeo
                </th>

                <th className="w-28 px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="mx-auto flex items-center gap-1.5 transition-colors hover:text-slate-700"
                  >
                    Status

                    {sortColumn === "status" && (
                      <span>
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>

                <th className="w-36 px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedComments.map((row) => {
                const video = videos.find(
                  (item) => item.id === row.video_id,
                );

                const isMainStoreReply =
                  row.is_store_reply === true;

                const mainAuthorName = isMainStoreReply
                  ? storeName || "Loja"
                  : row.user_name;

                const mainAuthorLogo = isMainStoreReply
                  ? storeLogoUrl
                  : undefined;

                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
                          {mainAuthorLogo ? (
                            <img
                              src={mainAuthorLogo}
                              alt={mainAuthorName}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-[#0094EB]">
                              {mainAuthorName
                                ?.charAt(0)
                                .toUpperCase() || "?"}
                            </div>
                          )}
                        </div>

                        <span className="text-sm font-bold text-slate-800">
                          {mainAuthorName}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="mb-1 text-sm text-slate-600">
                        &quot;{row.text}&quot;
                      </p>

                      {row.replies && row.replies.length > 0 && (
                        <div className="mt-3 ml-4 space-y-2 border-l-2 border-[#0094EB]/20 pl-3">
                          {row.replies.map((reply) => {
                            const isReplyStore =
                              reply.is_store_reply === true;

                            const replyName = isReplyStore
                              ? storeName || "Loja"
                              : reply.user_name;

                            const replyLogo = isReplyStore
                              ? storeLogoUrl
                              : reply.user_logo;

                            return (
                              <div
                                key={reply.id}
                                className="rounded-xl bg-blue-50/50 p-3"
                              >
                                <div className="mb-1 flex items-center gap-2">
                                  {replyLogo ? (
                                    <img
                                      src={replyLogo}
                                      alt={replyName}
                                      className="h-6 w-6 rounded-full border border-[#0094EB] object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0094EB] text-xs font-black text-white">
                                      {replyName
                                        ?.charAt(0)
                                        .toUpperCase() || "?"}
                                    </div>
                                  )}

                                  <span className="text-xs font-bold text-slate-700">
                                    {replyName}
                                  </span>

                                  <span className="text-[9px] text-slate-400">
                                    {new Date(
                                      reply.created_at,
                                    ).toLocaleString("pt-BR")}
                                  </span>
                                </div>

                                <p className="ml-8 text-sm text-slate-600">
                                  {reply.text}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {video && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#0094EB]">
                          VÍDEO:

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleViewVideo(row);
                            }}
                            className="cursor-pointer hover:underline"
                          >
                            {video.title}
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={(event) =>
                          openStatusDropdown(event, row.id)
                        }
                        className={cn(
                          "cursor-pointer rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                          getStatusColor(row.status),
                        )}
                      >
                        {getStatusLabel(row.status)}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={(event) =>
                            handleReply(event, row)
                          }
                          className="rounded-lg p-2 text-[#0094EB] transition-colors hover:bg-blue-50"
                          title="Responder"
                        >
                          <MessageSquare size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={(event) =>
                            handleDeleteClick(event, row)
                          }
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedComments.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-400">
                Nenhum comentário encontrado.
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
