import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";

export type MissionBrowsingMode = "controlled" | "free";

export type MissionBrowsingPermission =
  | { mode: "free" }
  | { mode: "bounded"; minIndex: number; maxIndex: number };

export type PackMissionView = {
  displayMissionIds: string[];
  completedMissionIds: string[];
  incompleteMissionIds: string[];
  selectedMissionId: string | null;
  boundaryIndex: number;
};

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

export function getPackMissionView(
  missionIds: readonly string[],
  statuses: MissionStatusMap,
  selectedMissionId?: string | null,
): PackMissionView {
  const completedIds = missionIds.filter((missionId) => statuses?.[missionId] === "completed");
  const incompleteIds = missionIds.filter((missionId) => statuses?.[missionId] !== "completed");
  const selected = selectedMissionId && missionIds.includes(selectedMissionId)
    ? selectedMissionId
    : incompleteIds[0] ?? null;

  // During the completion hand-off, keep the just-completed card at the
  // boundary until the existing auto-advance settles. This keeps the proof
  // face visible while still making the next render deterministic.
  if (selected && statuses?.[selected] === "completed" && incompleteIds.length > 0) {
    const completedBeforeSelected = missionIds.filter((missionId) => (
      missionId !== selected && statuses?.[missionId] === "completed"
    ));
    const remainingIncomplete = missionIds.filter((missionId) => (
      missionId !== selected && statuses?.[missionId] !== "completed"
    ));
    return {
      displayMissionIds: [...completedBeforeSelected, selected, ...remainingIncomplete],
      completedMissionIds: completedBeforeSelected,
      incompleteMissionIds: incompleteIds,
      selectedMissionId: selected,
      boundaryIndex: completedBeforeSelected.length,
    };
  }

  if (incompleteIds.length === 0) {
    return {
      displayMissionIds: [...missionIds],
      completedMissionIds: [...completedIds],
      incompleteMissionIds: [],
      selectedMissionId: selected,
      boundaryIndex: Math.max(0, missionIds.length - 1),
    };
  }

  const remainingIncomplete = incompleteIds.filter((missionId) => missionId !== selected);
  return {
    displayMissionIds: [...completedIds, ...(selected ? [selected] : []), ...remainingIncomplete],
    completedMissionIds: completedIds,
    incompleteMissionIds: incompleteIds,
    selectedMissionId: selected,
    boundaryIndex: completedIds.length,
  };
}

export function getMissionBrowsingPermission({
  completedDate = false,
  completedMissionCount,
  isJoined,
  missionCount,
  boundaryIndex,
}: {
  completedDate?: boolean;
  completedMissionCount: number;
  isJoined: boolean;
  missionCount: number;
  boundaryIndex: number;
}): MissionBrowsingPermission {
  if (completedDate || (isJoined && missionCount > 0 && completedMissionCount === missionCount)) {
    return { mode: "free" };
  }

  return { mode: "bounded", minIndex: 0, maxIndex: Math.max(0, Math.min(boundaryIndex, missionCount - 1)) };
}
