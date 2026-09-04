import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";

export type MissionBrowsingMode = "controlled" | "free";

type MissionStatusMap = Readonly<Record<string, MissionCompletionStatus>> | undefined;

export function getIncompleteMissionIndexes(
  missionIds: readonly string[],
  statuses: MissionStatusMap,
): number[] {
  return missionIds.reduce<number[]>((indexes, missionId, index) => {
    if (statuses?.[missionId] !== "completed") indexes.push(index);
    return indexes;
  }, []);
}

export function getInitialMissionIndex(
  missionIds: readonly string[],
  statuses: MissionStatusMap,
): number {
  return getIncompleteMissionIndexes(missionIds, statuses)[0] ?? 0;
}

export function getNextIncompleteMissionIndex(
  currentIndex: number,
  missionIds: readonly string[],
  statuses: MissionStatusMap,
): number | null {
  if (missionIds.length === 0) return null;

  const incompleteIndexes = getIncompleteMissionIndexes(missionIds, statuses);
  if (incompleteIndexes.length === 0) return null;

  const normalizedCurrentIndex = ((currentIndex % missionIds.length) + missionIds.length) % missionIds.length;
  if (incompleteIndexes.length === 1 && incompleteIndexes[0] === normalizedCurrentIndex) return null;

  for (let offset = 1; offset <= missionIds.length; offset += 1) {
    const candidate = (normalizedCurrentIndex + offset) % missionIds.length;
    if (statuses?.[missionIds[candidate]] !== "completed") return candidate;
  }

  return null;
}

export function getMissionBrowsingMode({
  completedDate = false,
  completedMissionCount,
  isJoined,
  missionCount,
}: {
  completedDate?: boolean;
  completedMissionCount: number;
  isJoined: boolean;
  missionCount: number;
}): MissionBrowsingMode {
  if (completedDate || (isJoined && completedMissionCount === missionCount)) return "free";
  return "controlled";
}
