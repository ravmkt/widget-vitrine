import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface SpotlightState {
  productId: string | null;
  couponCode: string | null;
  advantageIdx: number | null;
}

export function useLiveSpotlight(liveId: string | null, initial: SpotlightState) {
  const [spotlight, setSpotlight] = useState<SpotlightState>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSpotlight(initial);
  }, [initial.productId, initial.couponCode, initial.advantageIdx]);

  const updateSpotlight = useCallback(
    async (partial: Partial<SpotlightState>) => {
      const next = { ...spotlight, ...partial };
      setSpotlight(next);

      if (!liveId) return;

      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase não configurado.");
        return;
      }

      const { error: updateError } = await supabase
        .from("lives")
        .update({
          spotlight_product_id: next.productId,
          spotlight_coupon_code: next.couponCode,
          spotlight_advantage_idx: next.advantageIdx,
        })
        .eq("id", liveId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setError(null);
      }
    },
    [liveId, spotlight]
  );

  return { spotlight, updateSpotlight, error };
}
