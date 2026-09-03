import type { MissionCompletionByMission } from "@/data/contracts/mission-completion";

export type MissionCompletionStatus = "incomplete" | "completed";

export const MISSION_COMPLETION_THRESHOLD = 0.94;
export const MISSION_SLIDER_THUMB_SIZE = 56;
export const MISSION_SLIDER_INSET = 6;

export function getMissionSliderTravel(trackWidth: number): number {
  return Math.max(0, trackWidth - MISSION_SLIDER_INSET * 2 - MISSION_SLIDER_THUMB_SIZE);
}

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
