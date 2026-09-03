export type SessionSnapshot = {
  userId: string | null;
  joinedPackIds: readonly string[];
  completedMissionIds: readonly string[];
  completedDates: readonly string[];
  completionCountsByPack: Readonly<Record<string, number>>;
};

export type InitialSessionSnapshot = {
  joinedPackIds?: readonly string[];
  completedDates?: readonly string[];
};

export type MissionCompletionSnapshotUpdate = {
  userId: string;
  missionId: string;
  packId: string;
  completedLocalDate: string;
};

const EMPTY_SNAPSHOT: SessionSnapshot = Object.freeze({
  userId: null,
  joinedPackIds: Object.freeze([]),
  completedMissionIds: Object.freeze([]),
  completedDates: Object.freeze([]),
  completionCountsByPack: Object.freeze({}),
});

let snapshot: SessionSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function notify(next: SessionSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function replaceSnapshot(userId: string | null, initial: InitialSessionSnapshot = {}) {
  notify({
    userId,
    joinedPackIds: Object.freeze(unique(initial.joinedPackIds)),
    completedMissionIds: Object.freeze([]),
    completedDates: Object.freeze(unique(initial.completedDates)),
    completionCountsByPack: Object.freeze({}),
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
    if (snapshot.userId !== null || snapshot.joinedPackIds.length > 0 || snapshot.completedMissionIds.length > 0
      || snapshot.completedDates.length > 0 || Object.keys(snapshot.completionCountsByPack).length > 0) {
      replaceSnapshot(null);
    }
    return;
  }

  if (snapshot.userId !== userId) {
    replaceSnapshot(userId, initial);
    return;
  }

  const joinedPackIds = unique([...snapshot.joinedPackIds, ...unique(initial.joinedPackIds)]);
  const completedDates = unique([...snapshot.completedDates, ...unique(initial.completedDates)]);
  if (joinedPackIds.length === snapshot.joinedPackIds.length && completedDates.length === snapshot.completedDates.length) return;
  notify({
    ...snapshot,
    joinedPackIds: Object.freeze(joinedPackIds),
    completedDates: Object.freeze(completedDates),
  });
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
