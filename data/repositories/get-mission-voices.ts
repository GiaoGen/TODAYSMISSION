import "server-only";

import { isAuthSessionMissingError } from "@supabase/supabase-js";

import type { MissionVoicePlayback } from "@/data/contracts/mission-voice";
import { mapMissionVoiceStatusRows } from "@/data/mappers/mission-voice-mapper";
import { createClient } from "@/lib/supabase/server";

const MISSION_VOICE_URL_LIFETIME_SECONDS = 600;

export async function getMissionVoiceStatusesForMissions(
  missionIds: readonly string[],
) {
  const uniqueMissionIds = [...new Set(missionIds)];
  if (uniqueMissionIds.length === 0) return {};

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return {};
    throw new Error("Failed to read the current Auth user.");
  }

  if (!userData.user || userData.user.is_anonymous) return {};

  const { data, error } = await supabase.rpc("get_my_mission_voice_statuses", {
    p_mission_ids: uniqueMissionIds,
  });

  if (error) throw new Error("Failed to read Mission voice status.");

  return mapMissionVoiceStatusRows(data);
}

export async function getPublishedMissionVoicesForMission(
  missionId: string,
): Promise<readonly MissionVoicePlayback[]> {
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

  const { data: voices, error: voicesError } = await supabase
    .from("mission_voices")
    .select("id,storage_path")
    .eq("mission_id", missionId)
    .eq("is_published", true)
    .order("created_at", { ascending: true })
    .limit(5);

  if (voicesError) throw new Error("Failed to read Mission experiences.");

  const signedVoices = await Promise.all(voices.map(async (voice) => {
    const { data, error } = await supabase.storage
      .from("mission-voices")
      .createSignedUrl(voice.storage_path, MISSION_VOICE_URL_LIFETIME_SECONDS);

    if (error || !data?.signedUrl) throw new Error("Failed to prepare Mission experience playback.");

    return {
      id: voice.id,
      signedPlaybackUrl: data.signedUrl,
    } satisfies MissionVoicePlayback;
  }));

  return signedVoices;
}
