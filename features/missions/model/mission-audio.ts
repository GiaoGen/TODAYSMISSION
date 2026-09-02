export const MISSION_AUDIO_FORMATS = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "mp4" },
] as const;

export const MISSION_AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export const MISSION_AUDIO_MAX_DURATION_MS = 120_000;
export const MISSION_AUDIO_MIN_DURATION_MS = 1_000;

export type MissionAudioFormat = (typeof MISSION_AUDIO_FORMATS)[number];

export function getSupportedMissionAudioFormat(
  isTypeSupported: (mimeType: string) => boolean,
): MissionAudioFormat | null {
  return MISSION_AUDIO_FORMATS.find(({ mimeType }) => isTypeSupported(mimeType)) ?? null;
}

export function getMissionAudioFormat(mimeType: string): MissionAudioFormat | null {
  return MISSION_AUDIO_FORMATS.find((format) => format.mimeType === mimeType) ?? null;
}
