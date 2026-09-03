"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import type { MissionVoicePlayback } from "@/data/contracts/mission-voice";
import { getPublishedMissionVoicesForMission } from "@/data/repositories/get-mission-voices";
import { parseDateKey } from "@/features/calendar/model/calendar-month";
import { createClient } from "@/lib/supabase/server";

export type MissionProofUploadTargetResult =
  | { ok: true; pathBase: string }
  | { ok: false; error: string };

export type CompleteMissionWithAudioResult =
  | { ok: true; status: "completed"; completedAt: string; completedLocalDate: string }
  | { ok: false; error: string };

export type MissionVoiceUploadTargetResult =
  | { ok: true; pathBase: string }
  | { ok: false; error: string };

export type SubmitMissionVoiceResult =
  | { ok: true; status: "submitted" | "already_shared" }
  | { ok: false; error: string };

export type MissionVoicePlaybackResult =
  | { ok: true; voices: readonly MissionVoicePlayback[] }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failedProof(message: string): MissionProofUploadTargetResult {
  return { ok: false, error: message };
}

function failedCompletion(message: string): CompleteMissionWithAudioResult {
  return { ok: false, error: message };
}

function failedVoiceUpload(message: string): MissionVoiceUploadTargetResult {
  return { ok: false, error: message };
}

function failedVoiceSubmit(message: string): SubmitMissionVoiceResult {
  return { ok: false, error: message };
}

function failedVoicePlayback(message: string): MissionVoicePlaybackResult {
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
  completedLocalDate: string,
): Promise<CompleteMissionWithAudioResult> {
  if (!UUID_PATTERN.test(missionId) || typeof proofPath !== "string" || proofPath.length > 300
    || typeof completedLocalDate !== "string" || !parseDateKey(completedLocalDate)) {
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
    p_completed_local_date: completedLocalDate,
  });

  if (error) return failedCompletion("We couldn't verify the audio proof. Please try again.");

  const completion = data[0];
  if (!completion || completion.status !== "completed" || !completion.completed_at || !completion.completed_local_date) {
    return failedCompletion("We couldn't complete this mission. Please try again.");
  }

  revalidatePath(`/completed/${completion.completed_local_date}`);

  return {
    ok: true,
    status: "completed",
    completedAt: completion.completed_at,
    completedLocalDate: completion.completed_local_date,
  };
}

export async function createMissionVoiceUploadTarget(missionId: string): Promise<MissionVoiceUploadTargetResult> {
  if (!UUID_PATTERN.test(missionId)) return failedVoiceUpload("That mission is unavailable.");

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedVoiceUpload("Please log in to share an experience.");
    return failedVoiceUpload("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return failedVoiceUpload("Please log in to share an experience.");

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("pack_id")
    .eq("id", missionId)
    .eq("is_published", true)
    .maybeSingle();

  if (missionError) return failedVoiceUpload("We couldn't verify this Mission. Please try again.");
  if (!mission) return failedVoiceUpload("That mission is unavailable.");

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id")
    .eq("id", mission.pack_id)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) return failedVoiceUpload("We couldn't verify this Pack. Please try again.");
  if (!pack) return failedVoiceUpload("That mission is unavailable.");

  const { data: completion, error: completionError } = await supabase
    .from("mission_completions")
    .select("mission_id")
    .eq("user_id", user.id)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (completionError) return failedVoiceUpload("We couldn't verify your Mission completion. Please try again.");
  if (!completion) return failedVoiceUpload("Complete this Mission before sharing an experience.");

  const { data: voiceStatus, error: voiceStatusError } = await supabase.rpc("get_my_mission_voice_statuses", {
    p_mission_ids: [missionId],
  });

  if (voiceStatusError) return failedVoiceUpload("We couldn't verify your previous share. Please try again.");
  if (voiceStatus.length > 0) return failedVoiceUpload("You have already shared an experience for this Mission.");

  return {
    ok: true,
    pathBase: `${user.id}/${missionId}/${crypto.randomUUID()}`,
  };
}

export async function submitMissionVoiceAction(
  missionId: string,
  storagePath: string,
): Promise<SubmitMissionVoiceResult> {
  if (!UUID_PATTERN.test(missionId) || typeof storagePath !== "string" || storagePath.length > 300) {
    return failedVoiceSubmit("That Mission experience is invalid.");
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedVoiceSubmit("Please log in to share an experience.");
    return failedVoiceSubmit("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return failedVoiceSubmit("Please log in to share an experience.");

  const { data, error } = await supabase.rpc("submit_mission_voice", {
    p_mission_id: missionId,
    p_storage_path: storagePath,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("Mission voice submission failed.", error);
    return failedVoiceSubmit("We couldn't submit the experience. Please try again.");
  }

  const result = data[0];
  if (!result || (result.status !== "submitted" && result.status !== "already_shared")) {
    return failedVoiceSubmit("We couldn't submit the experience. Please try again.");
  }

  return { ok: true, status: result.status };
}

export async function getMissionVoicePlaybackAction(missionId: string): Promise<MissionVoicePlaybackResult> {
  if (!UUID_PATTERN.test(missionId)) return failedVoicePlayback("That mission is unavailable.");

  try {
    return {
      ok: true,
      voices: await getPublishedMissionVoicesForMission(missionId),
    };
  } catch {
    return failedVoicePlayback("We couldn't load shared experiences. Please try again.");
  }
}
