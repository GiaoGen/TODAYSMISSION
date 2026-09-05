import "server-only";

import type { CurrentUser } from "@/data/contracts/current-user";
import type { MissionCompletionByMission } from "@/data/contracts/mission-completion";
import { mapMissionCompletionRows } from "@/data/mappers/mission-completion-mapper";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";

export async function getMissionCompletionsForMissions(
  missionIds: readonly string[],
  currentUser?: CurrentUser,
): Promise<MissionCompletionByMission> {
  const uniqueMissionIds = [...new Set(missionIds)];
  if (uniqueMissionIds.length === 0) return {};

  const user = currentUser ?? await getCurrentUser();
  if (!user) return {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mission_completions")
    .select("mission_id,completed_at")
    .eq("user_id", user.id)
    .in("mission_id", uniqueMissionIds);

  if (error) throw new Error("Failed to read Mission completions.");

  return mapMissionCompletionRows(data);
}
