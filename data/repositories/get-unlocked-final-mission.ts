import "server-only";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import { mapMissionSummary } from "@/data/mappers/pack-mapper";
import type { Tables } from "@/data/database.types";
import { createClient } from "@/lib/supabase/server";

type FinalMissionRow = Pick<
  Tables<"missions">,
  "id" | "slug" | "title" | "note" | "tag" | "code" | "theme_key" | "artwork_key" | "sort_order"
>;

const FINAL_MISSION_SELECT = "id,slug,title,note,tag,code,theme_key,artwork_key,sort_order";

export async function getUnlockedFinalMission(packId: string): Promise<MissionSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("missions")
    .select(FINAL_MISSION_SELECT)
    .eq("pack_id", packId)
    .eq("slug", "stop-waiting")
    .eq("is_published", false)
    .maybeSingle();

  if (error) throw new Error("Failed to read the final Mission.");
  return data ? mapMissionSummary(data as FinalMissionRow) : null;
}
