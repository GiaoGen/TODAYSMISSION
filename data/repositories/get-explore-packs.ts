import "server-only";

import type { ExplorePackSummary } from "@/features/packs/model/explore-pack-content";
import { EXPLORE_PACK_SUMMARIES } from "@/features/packs/model/explore-pack-content";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";
import { getPacks } from "./get-packs";

const EXPLORE_PACK_VISUALS = new Map(
  EXPLORE_PACK_SUMMARIES.map((pack) => [pack.slug, pack]),
);

/**
 * Read the published Packs that have an approved Explore visual registry entry.
 *
 * Pack content and ordering come from Supabase. Covers and colors intentionally
 * remain local presentation assets until they have a stable remote asset key.
 */
export async function getExplorePacks(): Promise<readonly ExplorePackSummary[]> {
  const [packs, currentUser] = await Promise.all([
    getPacks(),
    getCurrentUser(),
  ]);

  const visiblePacks = packs
    .map((pack) => {
      const visual = EXPLORE_PACK_VISUALS.get(pack.slug);
      if (!visual) return null;

      return {
        ...visual,
        id: pack.id,
        slug: pack.slug,
        title: pack.title,
      } satisfies ExplorePackSummary;
    })
    .filter((pack): pack is ExplorePackSummary & { id: string } => pack !== null);

  if (!currentUser || visiblePacks.length === 0) {
    return visiblePacks;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pack_memberships")
    .select("pack_id")
    .eq("user_id", currentUser.id)
    .in("pack_id", visiblePacks.map((pack) => pack.id));

  if (error) {
    throw new Error("Failed to read Explore Pack memberships.");
  }

  const joinedPackIds = new Set(data.map((membership) => membership.pack_id));
  return visiblePacks.map((pack) => ({
    ...pack,
    joined: joinedPackIds.has(pack.id),
  }));
}
