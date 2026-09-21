import "server-only";

import type { ExplorePackDetailData } from "@/features/packs/model/explore-pack-content";
import { getExplorePackPreview } from "@/features/packs/model/explore-pack-content";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";
import type { NavigationUserState } from "./get-navigation-user-state";
import { getPackBySlug } from "./get-packs";

export type ExplorePackPageData = ExplorePackDetailData & {
  navigationState: NavigationUserState;
};

export async function getExplorePackBySlug(slug: string): Promise<ExplorePackPageData | null> {
  const preview = getExplorePackPreview(slug);
  if (!preview) return null;

  const [pack, currentUser] = await Promise.all([
    getPackBySlug(slug),
    getCurrentUser(),
  ]);
  if (!pack) return null;

  const visualBySlug = new Map(preview.missions.map((mission) => [mission.id, mission]));
  const missions = pack.missions.flatMap((mission) => {
    const visual = visualBySlug.get(mission.slug);
    if (!visual) return [];

    return [{
      ...visual,
      id: mission.id,
      title: mission.title,
      card: visual.card
        ? { ...visual.card, description: mission.note }
        : visual.card,
    }];
  });

  if (missions.length === 0) return null;

  let joined = false;
  let activeMissionId: string | null = null;
  let completedMissionIds: readonly string[] = [];
  let navigationState: NavigationUserState = {
    currentUser: null,
    joinedPackIds: [],
    completedMissionIds: [],
    completedDates: [],
    completionCountsByPack: {},
    activeMissionByPack: {},
    unlockedFinalMissionsByPack: {},
    registeredOn: null,
  };

  if (currentUser) {
    const supabase = await createClient();
    const [membershipResult, completionResult] = await Promise.all([
      supabase
        .from("pack_memberships")
        .select("active_mission_id,pack_id,joined_at")
        .eq("user_id", currentUser.id),
      supabase
        .from("mission_completions")
        .select("mission_id,completed_local_date")
        .eq("user_id", currentUser.id),
    ]);

    if (membershipResult.error) throw new Error("Failed to read Explore Pack membership.");
    if (completionResult.error) throw new Error("Failed to read Explore Mission completions.");

    const joinedPackIds = membershipResult.data.map((membership) => membership.pack_id);
    const activeMissionByPack = Object.fromEntries(
      membershipResult.data.map((membership) => [membership.pack_id, membership.active_mission_id]),
    );
    const visibleMissionIds = new Set(missions.map((mission) => mission.id));
    const allCompletedMissionIds = [...new Set(
      completionResult.data.map((completion) => completion.mission_id),
    )];
    completedMissionIds = allCompletedMissionIds.filter((missionId) => visibleMissionIds.has(missionId));
    const completedDates = [...new Set(
      completionResult.data.map((completion) => completion.completed_local_date),
    )].sort();

    joined = joinedPackIds.includes(pack.id);
    activeMissionId = activeMissionByPack[pack.id] ?? null;
    navigationState = {
      currentUser,
      joinedPackIds,
      completedMissionIds: allCompletedMissionIds,
      completedDates,
      completionCountsByPack: { [pack.id]: completedMissionIds.length },
      activeMissionByPack,
      unlockedFinalMissionsByPack: {},
      registeredOn: currentUser.createdAt.slice(0, 10),
    };
  }

  return {
    ...preview,
    id: pack.id,
    slug: pack.slug,
    title: pack.title,
    authenticated: currentUser !== null,
    joined,
    activeMissionId,
    completedMissionIds,
    completedMissionCount: completedMissionIds.length,
    visibleMissionCount: missions.length,
    missions,
    navigationState,
  };
}
