import "server-only";

import type { ExplorePackDetailData } from "@/features/packs/model/explore-pack-content";
import { getExplorePackPreview } from "@/features/packs/model/explore-pack-content";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";
import { getPackBySlug } from "./get-packs";

export async function getExplorePackBySlug(slug: string): Promise<ExplorePackDetailData | null> {
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

  if (currentUser) {
    const supabase = await createClient();
    const [membershipResult, completionResult] = await Promise.all([
      supabase
        .from("pack_memberships")
        .select("active_mission_id")
        .eq("user_id", currentUser.id)
        .eq("pack_id", pack.id)
        .maybeSingle(),
      supabase
        .from("mission_completions")
        .select("mission_id")
        .eq("user_id", currentUser.id)
        .in("mission_id", missions.map((mission) => mission.id)),
    ]);

    if (membershipResult.error) throw new Error("Failed to read Explore Pack membership.");
    if (completionResult.error) throw new Error("Failed to read Explore Mission completions.");

    joined = Boolean(membershipResult.data);
    activeMissionId = membershipResult.data?.active_mission_id ?? null;
    completedMissionIds = completionResult.data.map((completion) => completion.mission_id);
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
    missions,
  };
}
