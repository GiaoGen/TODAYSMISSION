import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";

export function getCompletedMissionCount(
  statuses: Readonly<Record<string, MissionCompletionStatus>>,
): number {
  return Object.values(statuses).filter((status) => status === "completed").length;
}
