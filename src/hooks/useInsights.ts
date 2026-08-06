import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const STORE_ID = "eccb3093-8f8e-4cba-b598-6ab8d6326b8f";

export type InsightType = "warning" | "positive" | "suggestion";

export interface Insight {
  id: string;
  store_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  action_label: string | null;
  related_video_id: string | null;
  related_placement_id: string | null;
  metric_key: string | null;
  metric_value: number | null;
  metric_comparison_value: number | null;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights", STORE_ID],
    queryFn: async (): Promise<Insight[]> => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .eq("store_id", STORE_ID)
        .eq("dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as Insight[];
    },
    staleTime: 2 * 60 * 1000,
  });
}
