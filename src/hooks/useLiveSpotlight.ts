import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useLiveSpotlight(liveId: string | null, initialProductId: string | null) {
  const [spotlightProductId, setSpotlightProductId] = useState<string | null>(initialProductId);

  useEffect(() => {
    setSpotlightProductId(initialProductId);
  }, [initialProductId]);

  useEffect(() => {
    if (!liveId) return;
    const channel = supabase
      .channel(`live_spotlight_${liveId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${liveId}` },
        (payload) => {
          setSpotlightProductId((payload.new as any).spotlight_product_id || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId]);

  const setSpotlight = useCallback(
    async (productId: string | null) => {
      if (!liveId) return;
      setSpotlightProductId(productId);
      const { error } = await supabase
        .from("lives")
        .update({ spotlight_product_id: productId })
        .eq("id", liveId);
      if (error) throw error;
    },
    [liveId]
  );

  return { spotlightProductId, setSpotlight };
}
