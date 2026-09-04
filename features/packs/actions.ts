"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type TakePackActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type TakeMissionActionResult =
  | { ok: true; status: "committed" | "already_committed"; activeMissionId: string }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failedTake(message: string): TakePackActionResult {
  return { ok: false, error: message };
}

function failedTakeMission(message: string): TakeMissionActionResult {
  return { ok: false, error: message };
}

export async function takePackAction(packId: string): Promise<TakePackActionResult> {
  if (!UUID_PATTERN.test(packId)) return failedTake("That Pack is unavailable.");

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedTake("Please log in to take a Pack.");
    return failedTake("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return failedTake("Please log in to take a Pack.");

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id,slug")
    .eq("id", packId)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) return failedTake("We couldn't verify this Pack. Please try again.");
  if (!pack) return failedTake("That Pack is unavailable.");

  const { error: insertError } = await supabase
    .from("pack_memberships")
    .insert({ user_id: user.id, pack_id: pack.id });

  if (insertError && insertError.code !== "23505") {
    return failedTake("We couldn't take this Pack right now. Please try again.");
  }

  revalidatePath(`/pack/${pack.slug}`);
  return { ok: true };
}

export async function takeMissionAction(packId: string, missionId: string): Promise<TakeMissionActionResult> {
  if (!UUID_PATTERN.test(packId) || !UUID_PATTERN.test(missionId)) {
    return failedTakeMission("That Mission is unavailable.");
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedTakeMission("Please log in to take a Mission.");
    return failedTakeMission("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return failedTakeMission("Please log in to take a Mission.");

  const { data, error } = await supabase.rpc("take_mission", {
    p_pack_id: packId,
    p_mission_id: missionId,
  });

  if (error) {
    if (error.code === "55000") return failedTakeMission("Another Mission is already active for this Pack.");
    return failedTakeMission("We couldn't take this Mission right now. Please try again.");
  }

  const result = data[0];
  if (!result || (result.status !== "committed" && result.status !== "already_committed") || !result.active_mission_id) {
    return failedTakeMission("We couldn't take this Mission right now. Please try again.");
  }

  return {
    ok: true,
    status: result.status,
    activeMissionId: result.active_mission_id,
  };
}
