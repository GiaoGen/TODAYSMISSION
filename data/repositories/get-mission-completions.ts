import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import type { MissionCompletionByMission } from "@/data/contracts/mission-completion";
import { mapMissionCompletionRows } from "@/data/mappers/mission-completion-mapper";
import { createClient } from "@/lib/supabase/server";

export async function getMissionCompletionsForMissions(
  missionIds: readonly string[],
): Promise<MissionCompletionByMission> {
  const uniqueMissionIds = [...new Set(missionIds)];
  if (uniqueMissionIds.length === 0) return {};

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return {};
    throw new Error("Failed to read the current Auth user.");
  }

  if (!userData.user || userData.user.is_anonymous) return {};

  const { data, error } = await supabase
    .from("mission_completions")
    .select("mission_id,completed_at")
    .eq("user_id", userData.user.id)
    .in("mission_id", uniqueMissionIds);

  if (error) throw new Error("Failed to read Mission completions.");

  return mapMissionCompletionRows(data);
}
