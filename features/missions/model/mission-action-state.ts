import type { MissionCompletionByMission } from "@/data/contracts/mission-completion";

export type MissionCompletionStatus = "incomplete" | "completed";

export const MISSION_COMPLETION_THRESHOLD = 0.85;

export function getInitialMissionCompletionStatuses(
  missionIds: readonly string[],
  completionByMission: MissionCompletionByMission,
): Record<string, MissionCompletionStatus> {
  return Object.fromEntries(missionIds.map((missionId) => [
    missionId,
    completionByMission[missionId] ? "completed" : "incomplete",
  ]));
}

export function getCompletionOutcome(progress: number): "request" | "reset" {
  return progress >= MISSION_COMPLETION_THRESHOLD ? "request" : "reset";
}
