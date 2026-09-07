import "server-only";

import type { PackMembership } from "@/data/contracts/pack-membership";
import type { CurrentUser } from "@/data/contracts/current-user";
import type { PackSummary } from "@/data/contracts/pack-summary";
import { mapPackMembershipRow } from "@/data/mappers/pack-membership-mapper";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";
import { getPacks } from "./get-packs";

export async function getCurrentPackMembership(packId: string, currentUser?: CurrentUser): Promise<PackMembership | null> {
  const user = currentUser ?? await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pack_memberships")
    .select("active_mission_id,pack_id,joined_at")
    .eq("user_id", user.id)
    .eq("pack_id", packId)
    .maybeSingle();

  if (error) throw new Error("Failed to read Pack membership.");

  return data ? mapPackMembershipRow(data) : null;
}

export async function getJoinedPacks(currentUser?: CurrentUser | null): Promise<readonly PackSummary[]> {
  const supabase = await createClient();
  const user = currentUser ?? await getCurrentUser();

  if (!user) return [];

  const [packs, memberships] = await Promise.all([
    getPacks(),
    supabase
      .from("pack_memberships")
      .select("pack_id")
      .eq("user_id", user.id),
  ]);

  if (memberships.error) throw new Error("Failed to read Pack memberships.");

  const joinedPackIds = new Set(memberships.data.map((membership) => membership.pack_id));
  return packs.filter((pack) => joinedPackIds.has(pack.id));
}
