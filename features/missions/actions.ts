"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import type { MissionVoicePlayback } from "@/data/contracts/mission-voice";
import type { MissionExperience } from "@/data/contracts/mission-experience";
import { getPublishedMissionExperiences } from "@/data/repositories/get-mission-experiences";
import { getPublishedMissionVoicesForMission } from "@/data/repositories/get-mission-voices";
import { parseDateKey } from "@/features/calendar/model/calendar-month";
import { normalizeMissionTextProof } from "@/features/missions/model/mission-text-proof";
import { createClient } from "@/lib/supabase/server";

export type MissionExperienceAudioUploadTargetResult =
  | { ok: true; pathBase: string }
  | { ok: false; error: string };

export type CompleteMissionWithAudioResult =
  | { ok: true; status: "completed"; completedAt: string; completedLocalDate: string }
  | { ok: false; error: string };

export type MissionVoicePlaybackResult =
  | { ok: true; voices: readonly MissionVoicePlayback[] }
  | { ok: false; error: string };

export type MissionExperienceResult =
  | { ok: true; experiences: readonly MissionExperience[] }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failedAudioUpload(message: string): MissionExperienceAudioUploadTargetResult {
  return { ok: false, error: message };
}

function failedCompletion(message: string): CompleteMissionWithAudioResult {
  return { ok: false, error: message };
}

function failedVoicePlayback(message: string): MissionVoicePlaybackResult {
  return { ok: false, error: message };
}

export async function createMissionExperienceAudioUploadTarget(
  missionId: string,
): Promise<MissionExperienceAudioUploadTargetResult> {
  if (!UUID_PATTERN.test(missionId)) return failedAudioUpload("That mission is unavailable.");

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedAudioUpload("Please log in to complete a mission.");
    return failedAudioUpload("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return failedAudioUpload("Please log in to complete a mission.");

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("pack_id")
    .eq("id", missionId)
    .eq("is_published", true)
    .maybeSingle();

  if (missionError) return failedAudioUpload("We couldn't verify this mission. Please try again.");
  if (!mission) return failedAudioUpload("That mission is unavailable.");

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id")
    .eq("id", mission.pack_id)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) return failedAudioUpload("We couldn't verify this Pack. Please try again.");
  if (!pack) return failedAudioUpload("That mission is unavailable.");

  const { data: membership, error: membershipError } = await supabase
    .from("pack_memberships")
    .select("pack_id,active_mission_id")
    .eq("user_id", user.id)
    .eq("pack_id", pack.id)
    .maybeSingle();

  if (membershipError) return failedAudioUpload("We couldn't verify this Pack. Please try again.");
  if (!membership || membership.active_mission_id !== missionId) {
    return failedAudioUpload("Take this Mission before completing it.");
  }

  const { data: completion, error: completionError } = await supabase
    .from("mission_completions")
    .select("mission_id")
    .eq("user_id", user.id)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (completionError) return failedAudioUpload("We couldn't verify this Mission. Please try again.");
  if (completion) return failedAudioUpload("That Mission is already completed.");

  const { data: existingVoices, error: voiceError } = await supabase.rpc("get_my_mission_voice_statuses", {
    p_mission_ids: [missionId],
  });

  if (voiceError) return failedAudioUpload("We couldn't verify this Mission experience. Please try again.");
  if (existingVoices.length > 0) return failedAudioUpload("This Mission already has an audio experience.");

  return {
    ok: true,
    pathBase: `${user.id}/${missionId}/${crypto.randomUUID()}`,
  };
}

export async function completeMissionWithAudioAction(
  missionId: string,
  audioPath: string,
  completedLocalDate: string,
): Promise<CompleteMissionWithAudioResult> {
  if (!UUID_PATTERN.test(missionId) || typeof audioPath !== "string" || audioPath.length > 300
    || typeof completedLocalDate !== "string" || !parseDateKey(completedLocalDate)) {
    return failedCompletion("That mission experience is invalid.");
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedCompletion("Please log in to complete a mission.");
    return failedCompletion("We couldn't verify your login. Please try again.");
  }

  if (!userData.user || userData.user.is_anonymous) return failedCompletion("Please log in to complete a mission.");

  const { data, error } = await supabase.rpc("complete_mission_with_audio", {
    p_mission_id: missionId,
    p_storage_path: audioPath,
    p_completed_local_date: completedLocalDate,
  });

  if (error) return failedCompletion("We couldn't submit the audio experience. Please try again.");

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

export async function completeMissionWithTextAction(
  missionId: string,
  text: string,
  completedLocalDate: string,
): Promise<CompleteMissionWithAudioResult> {
  const proofText = normalizeMissionTextProof(text);
  if (!UUID_PATTERN.test(missionId) || !proofText
    || typeof completedLocalDate !== "string" || !parseDateKey(completedLocalDate)) {
    return failedCompletion("That mission experience is invalid.");
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedCompletion("Please log in to complete a mission.");
    return failedCompletion("We couldn't verify your login. Please try again.");
  }

  if (!userData.user || userData.user.is_anonymous) return failedCompletion("Please log in to complete a mission.");

  const { data, error } = await supabase.rpc("complete_mission_with_text", {
    p_mission_id: missionId,
    p_body: proofText,
    p_completed_local_date: completedLocalDate,
  });

  if (error) return failedCompletion("We couldn't submit the text experience. Please try again.");

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

export async function getMissionExperiencesAction(missionId: string): Promise<MissionExperienceResult> {
  if (!UUID_PATTERN.test(missionId)) return { ok: false, error: "That mission is unavailable." };

  try {
    return {
      ok: true,
      experiences: await getPublishedMissionExperiences(missionId),
    };
  } catch {
    return { ok: false, error: "We couldn't load shared experiences. Please try again." };
  }
}
