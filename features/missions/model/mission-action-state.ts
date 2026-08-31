export type MissionActionStatus = "available" | "taken" | "completed";

// Prototype-only until mission_progress integration; refresh intentionally resets this state.
export const MISSION_COMPLETION_THRESHOLD = 0.85;

export function takeMission(status: MissionActionStatus): MissionActionStatus {
  return status === "available" ? "taken" : status;
}

export function completeMission(status: MissionActionStatus): MissionActionStatus {
  return status === "taken" ? "completed" : status;
}

export function getCompletionOutcome(progress: number): "complete" | "reset" {
  return progress >= MISSION_COMPLETION_THRESHOLD ? "complete" : "reset";
}

export function createMissionActionState(
  missionIds: readonly string[],
): Record<string, MissionActionStatus> {
  return Object.fromEntries(missionIds.map((missionId) => [missionId, "available"]));
}

export function getMissionLoginDestination(packSlug: string): string {
  return `/login?next=${encodeURIComponent(`/pack/${packSlug}`)}`;
}
