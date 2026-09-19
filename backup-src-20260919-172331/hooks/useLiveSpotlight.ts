import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SpotlightState {
  productId: string | null;
  couponCode: string | null;
  advantageIdx: number | null;
}

export function useLiveSpotlight(liveId: string | null, initial: SpotlightState) {
  const [spotlight, setSpotlight] = useState<SpotlightState>(initial);

  useEffect(() => {
    setSpotlight(initial);
  }, [initial.productId, initial.couponCode, initial.advantageIdx]);

  const updateSpotlight = (partial: Partial<SpotlightState>) => {
    setSpotlight(prev => {
      const next = { ...prev, ...partial };
      if (liveId) {
        supabase
          .from("lives")
          .update({
            spotlight_product_id: next.productId,
            spotlight_coupon_code: next.couponCode,
            spotlight_advantage_idx: next.advantageIdx
          })
          .eq("id", liveId)
          .then(() => {});
      }
      return next;
    });
  };

  return { spotlight, updateSpotlight };
}