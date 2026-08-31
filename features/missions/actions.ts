"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import type { MissionProgressStatus } from "@/data/contracts/mission-progress";
import { mapMissionProgressRow } from "@/data/mappers/mission-progress-mapper";
import { createClient } from "@/lib/supabase/server";

export type TakeMissionActionResult =
  | { ok: true; status: MissionProgressStatus }
  | { ok: false; error: string };

export type MissionProofUploadTargetResult =
  | { ok: true; pathBase: string }
  | { ok: false; error: string };

export type CompleteMissionWithAudioResult =
  | { ok: true; status: "completed"; completedAt: string }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failedTake(message: string): TakeMissionActionResult {
  return { ok: false, error: message };
}

function failedProof(message: string): MissionProofUploadTargetResult {
  return { ok: false, error: message };
}

function failedCompletion(message: string): CompleteMissionWithAudioResult {
  return { ok: false, error: message };
}

async function getExistingProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  missionId: string,
) {
  const { data, error } = await supabase
    .from("mission_progress")
    .select("mission_id,status,taken_at,completed_at")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (error) throw new Error("Failed to read mission progress.");
  return data;
}

export async function takeMissionAction(missionId: string): Promise<TakeMissionActionResult> {
  if (!UUID_PATTERN.test(missionId)) return failedTake("That mission is unavailable.");

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedTake("Please log in to take a mission.");
    return failedTake("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user) return failedTake("Please log in to take a mission.");

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("id,pack_id")
    .eq("id", missionId)
    .eq("is_published", true)
    .maybeSingle();

  if (missionError) return failedTake("We couldn't verify this mission. Please try again.");
  if (!mission) return failedTake("That mission is unavailable.");

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id,slug")
    .eq("id", mission.pack_id)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) return failedTake("We couldn't verify this Pack. Please try again.");
  if (!pack) return failedTake("That mission is unavailable.");

  try {
    const existing = await getExistingProgress(supabase, user.id, mission.id);
    if (existing) return { ok: true, status: mapMissionProgressRow(existing).status };
  } catch {
    return failedTake("We couldn't read your mission progress. Please try again.");
  }

  const { error: insertError } = await supabase
    .from("mission_progress")
    .insert({ user_id: user.id, mission_id: mission.id });

  if (!insertError) {
    revalidatePath(`/pack/${pack.slug}`);
    return { ok: true, status: "taken" };
  }

  if (insertError.code === "23505") {
    try {
      const existing = await getExistingProgress(supabase, user.id, mission.id);
      if (existing) return { ok: true, status: mapMissionProgressRow(existing).status };
    } catch {
      return failedTake("We couldn't read your mission progress. Please try again.");
    }
  }

  return failedTake("We couldn't take this mission right now. Please try again.");
}

export async function createMissionProofUploadTarget(missionId: string): Promise<MissionProofUploadTargetResult> {
  if (!UUID_PATTERN.test(missionId)) return failedProof("That mission is unavailable.");

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedProof("Please log in to complete a mission.");
    return failedProof("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user) return failedProof("Please log in to complete a mission.");

  const { data: progress, error: progressError } = await supabase
    .from("mission_progress")
    .select("status")
    .eq("user_id", user.id)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (progressError) return failedProof("We couldn't verify this mission. Please try again.");
  if (!progress || progress.status !== "taken") return failedProof("Take this mission before completing it.");

  return {
    ok: true,
    pathBase: `${user.id}/${missionId}/${crypto.randomUUID()}`,
  };
}

export async function completeMissionWithAudioAction(
  missionId: string,
  proofPath: string,
): Promise<CompleteMissionWithAudioResult> {
  if (!UUID_PATTERN.test(missionId) || typeof proofPath !== "string" || proofPath.length > 300) {
    return failedCompletion("That mission proof is invalid.");
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedCompletion("Please log in to complete a mission.");
    return failedCompletion("We couldn't verify your login. Please try again.");
  }

  if (!userData.user) return failedCompletion("Please log in to complete a mission.");

  const { data, error } = await supabase.rpc("complete_mission_with_audio", {
    p_mission_id: missionId,
    p_proof_path: proofPath,
  });

  if (error) return failedCompletion("We couldn't verify the audio proof. Please try again.");

  const completion = data[0];
  if (!completion || completion.status !== "completed" || !completion.completed_at) {
    return failedCompletion("We couldn't complete this mission. Please try again.");
  }

  return {
    ok: true,
    status: "completed",
    completedAt: completion.completed_at,
  };
}
