export const MISSION_PROOF_FORMATS = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "mp4" },
] as const;

export const MISSION_PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const MISSION_PROOF_MAX_DURATION_MS = 120_000;
export const MISSION_PROOF_MIN_DURATION_MS = 1_000;

export type MissionProofFormat = (typeof MISSION_PROOF_FORMATS)[number];

export function getSupportedMissionProofFormat(
  isTypeSupported: (mimeType: string) => boolean,
): MissionProofFormat | null {
  return MISSION_PROOF_FORMATS.find(({ mimeType }) => isTypeSupported(mimeType)) ?? null;
}

export function getMissionProofFormat(mimeType: string): MissionProofFormat | null {
  return MISSION_PROOF_FORMATS.find((format) => format.mimeType === mimeType) ?? null;
}
