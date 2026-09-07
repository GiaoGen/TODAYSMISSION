import type { CurrentUser } from "@/data/contracts/current-user";

export type SessionSnapshot = {
  userId: string | null;
  currentUser: CurrentUser | null;
  joinedPackIds: readonly string[];
  completedMissionIds: readonly string[];
  completedDates: readonly string[];
  completionCountsByPack: Readonly<Record<string, number>>;
  activeMissionByPack: Readonly<Record<string, string | null>>;
  registeredOn: string | null;
};

export type InitialSessionSnapshot = {
  currentUser?: CurrentUser | null;
  joinedPackIds?: readonly string[];
  completedMissionIds?: readonly string[];
  completedDates?: readonly string[];
  completionCountsByPack?: Readonly<Record<string, number>>;
  activeMissionByPack?: Readonly<Record<string, string | null>>;
  registeredOn?: string | null;
};

export type MissionCompletionSnapshotUpdate = {
  userId: string;
  missionId: string;
  packId: string;
  completedLocalDate: string;
};

const EMPTY_SNAPSHOT: SessionSnapshot = Object.freeze({
  userId: null,
  currentUser: null,
  joinedPackIds: Object.freeze([]),
  completedMissionIds: Object.freeze([]),
  completedDates: Object.freeze([]),
  completionCountsByPack: Object.freeze({}),
  activeMissionByPack: Object.freeze({}),
  registeredOn: null,
});

let snapshot: SessionSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function numericCounts(values: Readonly<Record<string, number>> | undefined): Record<string, number> {
  return Object.fromEntries(Object.entries(values ?? {}).filter(([, count]) => Number.isFinite(count) && count >= 0));
}

function activeMissions(values: Readonly<Record<string, string | null>> | undefined): Record<string, string | null> {
  return Object.fromEntries(Object.entries(values ?? {}).filter(([packId, missionId]) => Boolean(packId) && (missionId === null || typeof missionId === "string")));
}

function notify(next: SessionSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function replaceSnapshot(userId: string | null, initial: InitialSessionSnapshot = {}) {
  const currentUser = initial.currentUser?.id === userId ? initial.currentUser : null;
  notify({
    userId,
    currentUser,
    joinedPackIds: Object.freeze(unique(initial.joinedPackIds)),
    completedMissionIds: Object.freeze(unique(initial.completedMissionIds)),
    completedDates: Object.freeze(unique(initial.completedDates)),
    completionCountsByPack: Object.freeze(numericCounts(initial.completionCountsByPack)),
    activeMissionByPack: Object.freeze(activeMissions(initial.activeMissionByPack)),
    registeredOn: initial.registeredOn ?? currentUser?.createdAt.slice(0, 10) ?? null,
  });
}

function ensureUser(userId: string): SessionSnapshot {
  if (snapshot.userId === userId) return snapshot;
  replaceSnapshot(userId);
  return snapshot;
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}

export function getServerSessionSnapshot(): SessionSnapshot {
  return EMPTY_SNAPSHOT;
}

export function subscribeSessionSnapshot(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Seeds the session with server-confirmed data. For the same user, confirmed
 * local mutations are merged so a stale Router Cache payload cannot undo them.
 */
export function initializeSessionSnapshot(userId: string | null, initial: InitialSessionSnapshot = {}) {
  if (userId === null) {
    if (snapshot.userId !== null || snapshot.currentUser !== null || snapshot.joinedPackIds.length > 0 || snapshot.completedMissionIds.length > 0
      || snapshot.completedDates.length > 0 || Object.keys(snapshot.completionCountsByPack).length > 0
      || Object.keys(snapshot.activeMissionByPack).length > 0 || snapshot.registeredOn !== null) {
      replaceSnapshot(null);
    }
    return;
  }

  if (snapshot.userId !== userId) {
    replaceSnapshot(userId, initial);
    return;
  }

  const joinedPackIds = unique([...snapshot.joinedPackIds, ...unique(initial.joinedPackIds)]);
  const completedMissionIds = unique([...snapshot.completedMissionIds, ...unique(initial.completedMissionIds)]);
  const completedDates = unique([...snapshot.completedDates, ...unique(initial.completedDates)]);
  const completionCountsByPack = { ...snapshot.completionCountsByPack };
  for (const [packId, count] of Object.entries(numericCounts(initial.completionCountsByPack))) {
    completionCountsByPack[packId] = Math.max(completionCountsByPack[packId] ?? 0, count);
  }
  const activeMissionByPack = { ...snapshot.activeMissionByPack, ...activeMissions(initial.activeMissionByPack) };
  const currentUser = initial.currentUser?.id === userId ? initial.currentUser : snapshot.currentUser;
  const registeredOn = initial.registeredOn ?? snapshot.registeredOn ?? currentUser?.createdAt.slice(0, 10) ?? null;
  if (joinedPackIds.length === snapshot.joinedPackIds.length && completedMissionIds.length === snapshot.completedMissionIds.length
    && completedDates.length === snapshot.completedDates.length && currentUser === snapshot.currentUser
    && registeredOn === snapshot.registeredOn && JSON.stringify(completionCountsByPack) === JSON.stringify(snapshot.completionCountsByPack)
    && JSON.stringify(activeMissionByPack) === JSON.stringify(snapshot.activeMissionByPack)) return;
  notify({
    ...snapshot,
    currentUser,
    joinedPackIds: Object.freeze(joinedPackIds),
    completedDates: Object.freeze(completedDates),
    completedMissionIds: Object.freeze(completedMissionIds),
    completionCountsByPack: Object.freeze(completionCountsByPack),
    activeMissionByPack: Object.freeze(activeMissionByPack),
    registeredOn,
  });
}

/** Merges server-confirmed state while preserving same-user local UI hints. */
export function hydrateSessionSnapshot(initial: InitialSessionSnapshot & { currentUser: CurrentUser | null }) {
  const userId = initial.currentUser?.id ?? null;
  if (userId === null || snapshot.userId !== userId) {
    replaceSnapshot(userId, initial);
    return;
  }
  initializeSessionSnapshot(userId, initial);
}

export function addJoinedPack(packId: string, userId: string) {
  if (!packId) return;
  const current = ensureUser(userId);
  if (current.joinedPackIds.includes(packId)) return;
  notify({
    ...current,
    joinedPackIds: Object.freeze([...current.joinedPackIds, packId]),
  });
}

export function setActiveMission(packId: string, missionId: string, userId: string) {
  if (!packId || !missionId) return;
  const current = ensureUser(userId);
  if (current.activeMissionByPack[packId] === missionId) return;
  notify({
    ...current,
    activeMissionByPack: Object.freeze({ ...current.activeMissionByPack, [packId]: missionId }),
  });
}

export function addMissionCompletion(update: MissionCompletionSnapshotUpdate) {
  if (!update.missionId || !update.packId || !update.completedLocalDate) return;
  const current = ensureUser(update.userId);
  if (current.completedMissionIds.includes(update.missionId)) return;

  const completionCountsByPack = {
    ...current.completionCountsByPack,
    [update.packId]: (current.completionCountsByPack[update.packId] ?? 0) + 1,
  };
  notify({
    ...current,
    completedMissionIds: Object.freeze([...current.completedMissionIds, update.missionId]),
    completedDates: Object.freeze(current.completedDates.includes(update.completedLocalDate)
      ? [...current.completedDates]
      : [...current.completedDates, update.completedLocalDate]),
    completionCountsByPack: Object.freeze(completionCountsByPack),
  });
}

export function clearSessionSnapshot() {
  if (snapshot === EMPTY_SNAPSHOT) return;
  notify(EMPTY_SNAPSHOT);
}

/** Test-only reset; it has no effect on server authorization or persistence. */
export function resetSessionSnapshotForTests() {
  snapshot = EMPTY_SNAPSHOT;
}
