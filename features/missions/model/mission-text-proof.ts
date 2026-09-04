export const MISSION_TEXT_PROOF_MAX_LENGTH = 1000;

export function normalizeMissionTextProof(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= MISSION_TEXT_PROOF_MAX_LENGTH ? trimmed : null;
}

export function isValidMissionTextProof(value: unknown): value is string {
  return normalizeMissionTextProof(value) !== null;
}
