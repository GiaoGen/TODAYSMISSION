import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import type { PackMembership } from "@/data/contracts/pack-membership";
import type { PackSummary } from "@/data/contracts/pack-summary";
import { mapPackMembershipRow } from "@/data/mappers/pack-membership-mapper";
import { createClient } from "@/lib/supabase/server";
import { getPacks } from "./get-packs";

export async function getCurrentPackMembership(packId: string): Promise<PackMembership | null> {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return null;
    throw new Error("Failed to read the current Auth user.");
  }

  if (!userData.user || userData.user.is_anonymous) return null;

  const { data, error } = await supabase
    .from("pack_memberships")
    .select("pack_id,joined_at")
    .eq("user_id", userData.user.id)
    .eq("pack_id", packId)
    .maybeSingle();

  if (error) throw new Error("Failed to read Pack membership.");

  return data ? mapPackMembershipRow(data) : null;
}

export async function getJoinedPacks(): Promise<readonly PackSummary[]> {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return [];
    throw new Error("Failed to read the current Auth user.");
  }

  if (!userData.user || userData.user.is_anonymous) return [];

  const [packs, memberships] = await Promise.all([
    getPacks(),
    supabase
      .from("pack_memberships")
      .select("pack_id")
      .eq("user_id", userData.user.id),
  ]);

  if (memberships.error) throw new Error("Failed to read Pack memberships.");

  const joinedPackIds = new Set(memberships.data.map((membership) => membership.pack_id));
  return packs.filter((pack) => joinedPackIds.has(pack.id));
}
