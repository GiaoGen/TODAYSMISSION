import type {
  MissionProgressByMission,
  MissionProgressStatus,
} from "@/data/contracts/mission-progress";

export type MissionActionStatus = "available" | "taken" | "completed";

export const MISSION_COMPLETION_THRESHOLD = 0.85;

export function getInitialMissionStatuses(
  missionIds: readonly string[],
  progressByMission: MissionProgressByMission,
): Record<string, MissionActionStatus> {
  return Object.fromEntries(missionIds.map((missionId) => [
    missionId,
    progressByMission[missionId]?.status ?? "available",
  ]));
}

export function applyTakeResult(
  currentStatus: MissionActionStatus,
  persistedStatus: MissionProgressStatus,
): MissionActionStatus {
  return currentStatus === "completed" ? "completed" : persistedStatus;
}

export function getCompletionOutcome(progress: number): "request" | "reset" {
  return progress >= MISSION_COMPLETION_THRESHOLD ? "request" : "reset";
}

export function getMissionLoginDestination(packSlug: string): string {
  return `/login?next=${encodeURIComponent(`/pack/${packSlug}`)}`;
}
