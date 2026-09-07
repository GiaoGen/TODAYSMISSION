import "server-only";

import type { CurrentUser } from "@/data/contracts/current-user";
import type { PackDetail, PackSummary } from "@/data/contracts/pack-summary";
import { mapPackMembershipRows, type PackMembershipRow } from "@/data/mappers/pack-membership-mapper";
import { createClient } from "@/lib/supabase/server";
import type { SessionSnapshot } from "@/features/navigation/model/session-snapshot";

type CompletionRow = {
  mission_id: string;
  completed_local_date: string;
};

type PublicPack = PackSummary | PackDetail;

function getPackIdByMissionId(packs: readonly PublicPack[]): Map<string, string> {
  return new Map(packs.flatMap((pack) => {
    if (!("missions" in pack)) return [];
    return pack.missions.map((mission) => [mission.id, pack.id] as const);
  }));
}

export type NavigationUserState = Pick<
  SessionSnapshot,
  | "currentUser"
  | "joinedPackIds"
  | "completedMissionIds"
  | "completedDates"
  | "completionCountsByPack"
  | "activeMissionByPack"
  | "registeredOn"
>;

export async function getNavigationUserState(
  currentUser: CurrentUser | null,
  packs: readonly PublicPack[],
): Promise<NavigationUserState> {
  const registeredOn = currentUser?.createdAt.slice(0, 10) ?? null;
  if (!currentUser) {
    return {
      currentUser: null,
      joinedPackIds: [],
      completedMissionIds: [],
      completedDates: [],
      completionCountsByPack: {},
      activeMissionByPack: {},
      registeredOn,
    };
  }

  const supabase = await createClient();
  const [membershipsResult, completionsResult] = await Promise.all([
    supabase
      .from("pack_memberships")
      .select("active_mission_id,pack_id,joined_at")
      .eq("user_id", currentUser.id),
    supabase
      .from("mission_completions")
      .select("mission_id,completed_local_date")
      .eq("user_id", currentUser.id),
  ]);

  if (membershipsResult.error) throw new Error("Failed to read Pack memberships.");
  if (completionsResult.error) throw new Error("Failed to read Mission completions.");

  const memberships = mapPackMembershipRows(membershipsResult.data as PackMembershipRow[]);
  const missionToPack = getPackIdByMissionId(packs);
  const completions = completionsResult.data as CompletionRow[];
  const completionCountsByPack: Record<string, number> = {};

  for (const completion of completions) {
    const packId = missionToPack.get(completion.mission_id);
    if (packId) completionCountsByPack[packId] = (completionCountsByPack[packId] ?? 0) + 1;
  }

  return {
    currentUser,
    joinedPackIds: Object.keys(memberships),
    completedMissionIds: [...new Set(completions.map((completion) => completion.mission_id))],
    completedDates: [...new Set(completions.map((completion) => completion.completed_local_date))].sort(),
    completionCountsByPack,
    activeMissionByPack: Object.fromEntries(Object.values(memberships).map((membership) => [membership.packId, membership.activeMissionId])),
    registeredOn,
  };
}
