"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type MissionProofUploadTargetResult =
  | { ok: true; pathBase: string }
  | { ok: false; error: string };

export type CompleteMissionWithAudioResult =
  | { ok: true; status: "completed"; completedAt: string }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failedProof(message: string): MissionProofUploadTargetResult {
  return { ok: false, error: message };
}

function failedCompletion(message: string): CompleteMissionWithAudioResult {
  return { ok: false, error: message };
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
  if (!user || user.is_anonymous) return failedProof("Please log in to complete a mission.");

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("pack_id")
    .eq("id", missionId)
    .eq("is_published", true)
    .maybeSingle();

  if (missionError) return failedProof("We couldn't verify this mission. Please try again.");
  if (!mission) return failedProof("That mission is unavailable.");

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id")
    .eq("id", mission.pack_id)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) return failedProof("We couldn't verify this Pack. Please try again.");
  if (!pack) return failedProof("That mission is unavailable.");

  const { data: membership, error: membershipError } = await supabase
    .from("pack_memberships")
    .select("pack_id")
    .eq("user_id", user.id)
    .eq("pack_id", pack.id)
    .maybeSingle();

  if (membershipError) return failedProof("We couldn't verify this Pack. Please try again.");
  if (!membership) return failedProof("Take this Pack before completing a Mission.");

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
