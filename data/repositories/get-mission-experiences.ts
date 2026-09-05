import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import type { MissionExperience } from "@/data/contracts/mission-experience";
import { createClient } from "@/lib/supabase/server";

const EXPERIENCE_POOL_LIMIT = 10;
const MISSION_VOICE_URL_LIFETIME_SECONDS = 600;

type PendingExperience =
  | { id: string; kind: "text"; text: string; createdAt: string }
  | { id: string; kind: "audio"; storagePath: string; createdAt: string };

export async function getPublishedMissionExperiences(
  missionId: string,
): Promise<readonly MissionExperience[]> {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return [];
    throw new Error("Failed to read the current Auth user.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return [];

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("pack_id")
    .eq("id", missionId)
    .eq("is_published", true)
    .maybeSingle();

  if (missionError) throw new Error("Failed to verify this Mission.");
  if (!mission) return [];

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id")
    .eq("id", mission.pack_id)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) throw new Error("Failed to verify this Pack.");
  if (!pack) return [];

  const { data: membership, error: membershipError } = await supabase
    .from("pack_memberships")
    .select("pack_id")
    .eq("user_id", user.id)
    .eq("pack_id", pack.id)
    .maybeSingle();

  if (membershipError) throw new Error("Failed to verify Pack membership.");
  if (!membership) return [];

  const [voiceResult, textResult] = await Promise.all([
    supabase
      .from("mission_voices")
      .select("id,storage_path,created_at")
      .eq("mission_id", missionId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(EXPERIENCE_POOL_LIMIT),
    supabase
      .from("mission_text_experiences")
      .select("id,body,created_at")
      .eq("mission_id", missionId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(EXPERIENCE_POOL_LIMIT),
  ]);

  if (voiceResult.error && textResult.error) throw new Error("Failed to read Mission experiences.");

  const voices = voiceResult.error ? [] : (voiceResult.data ?? []);
  const textExperiences = textResult.error ? [] : (textResult.data ?? []);

  const pending: PendingExperience[] = [
    ...voices.map((voice) => ({
      id: voice.id,
      kind: "audio" as const,
      storagePath: voice.storage_path,
      createdAt: voice.created_at,
    })),
    ...textExperiences.map((experience) => ({
      id: experience.id,
      kind: "text" as const,
      text: experience.body,
      createdAt: experience.created_at,
    })),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, EXPERIENCE_POOL_LIMIT);

  return Promise.all(pending.map(async (experience): Promise<MissionExperience> => {
    if (experience.kind === "text") {
      return { id: experience.id, kind: "text", text: experience.text };
    }

    const { data, error } = await supabase.storage
      .from("mission-voices")
      .createSignedUrl(experience.storagePath, MISSION_VOICE_URL_LIFETIME_SECONDS);

    if (error || !data?.signedUrl) throw new Error("Failed to prepare Mission experience playback.");
    return { id: experience.id, kind: "audio", signedPlaybackUrl: data.signedUrl };
  }));
}

export async function getMyMissionExperience(
  missionId: string,
): Promise<readonly MissionExperience[]> {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return [];
    throw new Error("Failed to read the current Auth user.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return [];

  const { data: completion, error: completionError } = await supabase
    .from("mission_completions")
    .select("mission_id")
    .eq("user_id", user.id)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (completionError) throw new Error("Failed to verify Mission completion.");
  if (!completion) return [];

  const [voiceResult, textResult] = await Promise.all([
    supabase
      .from("mission_voices")
      .select("id,storage_path,created_at")
      .eq("user_id", user.id)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("mission_text_experiences")
      .select("id,body,created_at")
      .eq("user_id", user.id)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (voiceResult.error || textResult.error) throw new Error("Failed to read your Mission experience.");

  const voice = voiceResult.data?.[0];
  const textExperience = textResult.data?.[0];
  if (!voice && !textExperience) return [];

  if (voice && (!textExperience || voice.created_at >= textExperience.created_at)) {
    const { data, error } = await supabase.storage
      .from("mission-voices")
      .createSignedUrl(voice.storage_path, MISSION_VOICE_URL_LIFETIME_SECONDS);

    if (error || !data?.signedUrl) throw new Error("Failed to prepare your Mission experience playback.");
    return [{ id: voice.id, kind: "audio", signedPlaybackUrl: data.signedUrl }];
  }

  return [{ id: textExperience.id, kind: "text", text: textExperience.body }];
}
