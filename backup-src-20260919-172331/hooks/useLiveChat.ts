import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export interface LiveChatMessage {
  id: string;
  live_id: string;
  store_id: string;
  author_name: string;
  message: string;
  is_from_store: boolean;
  created_at: string;
}

export function useLiveChat(liveId: string | null, storeId: string | null) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!liveId) return;

    async function loadInitial() {
      setLoading(true);
      const { data, error } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("live_id", liveId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!error && data) setMessages(data as LiveChatMessage[]);
      setLoading(false);
    }
    loadInitial();

    const channel = supabase
      .channel(`live_chat_${liveId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_id=eq.${liveId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as LiveChatMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [liveId]);

  const sendMessage = useCallback(
    async (authorName: string, message: string, isFromStore: boolean) => {
      if (!liveId || !storeId || !message.trim()) return;
      const { error } = await supabase.from("live_chat_messages").insert({
        live_id: liveId,
        store_id: storeId,
        author_name: authorName.trim() || "Visitante",
        message: message.trim(),
        is_from_store: isFromStore,
      });
      if (error) throw error;
    },
    [liveId, storeId]
  );

  return { messages, loading, sendMessage };
}
