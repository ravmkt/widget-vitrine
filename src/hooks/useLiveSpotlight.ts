import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface SpotlightState {
  productId: string | null;
  couponCode: string | null;
  advantageIdx: number | null;
}

export function useLiveSpotlight(liveId: string | null, initial: SpotlightState) {
  const [spotlight, setSpotlightState] = useState<SpotlightState>(initial);

  useEffect(() => {
    setSpotlightState(initial);
  }, [initial.productId, initial.couponCode, initial.advantageIdx]);

  useEffect(() => {
    if (!liveId) return;
    const channel = supabase
      .channel(`live_spotlight_${liveId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${liveId}` },
        (payload) => {
          const row = payload.new as any;
          setSpotlightState({
            productId: row.spotlight_product_id ?? null,
            couponCode: row.spotlight_coupon_code ?? null,
            advantageIdx: row.spotlight_advantage_idx ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId]);

  const updateSpotlight = useCallback(
    async (patch: Partial<SpotlightState>) => {
      if (!liveId) return;
      setSpotlightState((prev) => ({ ...prev, ...patch }));

      const dbPatch: Record<string, any> = {};
      if ("productId" in patch) dbPatch.spotlight_product_id = patch.productId;
      if ("couponCode" in patch) dbPatch.spotlight_coupon_code = patch.couponCode;
      if ("advantageIdx" in patch) dbPatch.spotlight_advantage_idx = patch.advantageIdx;

      const { error } = await supabase.from("lives").update(dbPatch).eq("id", liveId);
      if (error) throw error;
    },
    [liveId]
  );

  return { spotlight, updateSpotlight };
}
