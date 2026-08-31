import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import type { MissionProgressByMission } from "@/data/contracts/mission-progress";
import { mapMissionProgressRows } from "@/data/mappers/mission-progress-mapper";
import { createClient } from "@/lib/supabase/server";

export async function getMissionProgressForMissions(
  missionIds: readonly string[],
): Promise<MissionProgressByMission> {
  const uniqueMissionIds = [...new Set(missionIds)];
  if (uniqueMissionIds.length === 0) return {};

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return {};
    throw new Error("Failed to read the current Auth user.");
  }

  if (!userData.user) return {};

  const { data, error } = await supabase
    .from("mission_progress")
    .select("mission_id,status,taken_at,completed_at")
    .eq("user_id", userData.user.id)
    .in("mission_id", uniqueMissionIds);

  if (error) throw new Error("Failed to read mission progress.");

  return mapMissionProgressRows(data);
}
