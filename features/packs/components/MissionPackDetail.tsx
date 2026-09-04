"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { PackDetail } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { getCompletedMissionCount } from "@/features/packs/model/pack-progress";
import {
  getInitialMissionIndex,
  getIncompleteMissionIndexes,
  getMissionBrowsingMode,
  getNextIncompleteMissionIndex,
} from "@/features/packs/model/mission-selection";
import { MissionActionLayer } from "@/features/missions/components/MissionActionLayer";
import { MissionCompletionConfetti } from "@/features/missions/components/MissionCompletionConfetti";
import { MissionGallery } from "./MissionGallery";
import type { MissionCompletionMotionHandle } from "./MissionGallery";
import { PackMembershipAction } from "./PackMembershipAction";
import {
  addJoinedPack,
  addMissionCompletion,
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSessionSnapshot,
} from "@/features/navigation/model/session-snapshot";

type MissionPackDetailProps = {
  pack: PackDetail;
  authenticated: boolean;
  currentUserId: string | null;
  initialPackJoined: boolean;
  initialMissionCompletionStatuses: Record<string, MissionCompletionStatus>;
};

export function MissionPackDetail({
  pack,
  authenticated,
  currentUserId,
  initialPackJoined,
  initialMissionCompletionStatuses,
}: MissionPackDetailProps) {
  const sessionSnapshot = useSyncExternalStore(
    subscribeSessionSnapshot,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const sameUser = currentUserId !== null && sessionSnapshot.userId === currentUserId;
  const sessionCompletedMissionIds = sameUser ? new Set(sessionSnapshot.completedMissionIds) : new Set<string>();
  const initialStatuses: Record<string, MissionCompletionStatus> = Object.fromEntries(pack.missions.map((mission) => [
    mission.id,
    (initialMissionCompletionStatuses[mission.id] === "completed" || sessionCompletedMissionIds.has(mission.id)
      ? "completed"
      : "incomplete") as MissionCompletionStatus,
  ]));
  const [packJoined, setPackJoined] = useState(initialPackJoined || (sameUser && sessionSnapshot.joinedPackIds.includes(pack.id)));
  const [gallerySettled, setGallerySettled] = useState(false);
  const [missionCompletionStatuses, setMissionCompletionStatuses] = useState(initialStatuses);
  const initialMissionIndex = getInitialMissionIndex(pack.missions.map((mission) => mission.id), initialStatuses);
  const initialMissionId = pack.missions[initialMissionIndex]?.id ?? null;
  const [activeMissionId, setActiveMissionId] = useState(initialMissionId);
  const [completionRequestedMissionIds, setCompletionRequestedMissionIds] = useState<ReadonlySet<string>>(() => new Set());
  const [completionEventId, setCompletionEventId] = useState<string | null>(null);
  const [selectingNext, setSelectingNext] = useState(false);
  const [galleryInteractionLocked, setGalleryInteractionLocked] = useState(false);
  const pendingAutoAdvanceMissionIdRef = useRef<string | null>(null);
  const selectNextMissionRef = useRef<(() => Promise<boolean>) | null>(null);
  const completionMotionRef = useRef<MissionCompletionMotionHandle | null>(null);
  const selectingNextRef = useRef(false);
  const completionEventSequenceRef = useRef(0);
  const activeMission = pack.missions.find((mission) => mission.id === activeMissionId) ?? pack.missions[0];
  const currentStatus = activeMission
    ? missionCompletionStatuses[activeMission.id] ?? "incomplete"
    : "incomplete";
  const completedMissionCount = getCompletedMissionCount(missionCompletionStatuses);
  const incompleteMissionCount = getIncompleteMissionIndexes(
    pack.missions.map((mission) => mission.id),
    missionCompletionStatuses,
  ).length;
  const packFullyCompleted = completedMissionCount === pack.missions.length;
  const manualBrowsingEnabled = getMissionBrowsingMode({
    isJoined: packJoined,
    completedMissionCount,
    missionCount: pack.missions.length,
  }) === "free" && packFullyCompleted;

  const handleActiveMissionChange = (missionId: string) => {
    setActiveMissionId(missionId);
  };

  const handleCompleted = (missionId: string, completedLocalDate: string) => {
    pendingAutoAdvanceMissionIdRef.current = missionId;
    setGalleryInteractionLocked(false);
    setMissionCompletionStatuses((current) => current[missionId] === "completed"
      ? current
      : { ...current, [missionId]: "completed" });
    if (currentUserId) {
      addMissionCompletion({ userId: currentUserId, missionId, packId: pack.id, completedLocalDate });
    }
    setCompletionRequestedMissionIds((current) => {
      if (!current.has(missionId)) return current;
      const next = new Set(current);
      next.delete(missionId);
      return next;
    });
  };

  const handleSelectNext = useCallback(async () => {
    const selectNext = selectNextMissionRef.current;
    if (!selectNext || selectingNextRef.current) return;

    selectingNextRef.current = true;
    setSelectingNext(true);
    try {
      await selectNext();
    } finally {
      selectingNextRef.current = false;
      setSelectingNext(false);
    }
  }, []);

  useEffect(() => {
    const completedMissionId = pendingAutoAdvanceMissionIdRef.current;
    if (!completedMissionId || !gallerySettled) return;
    if (activeMissionId !== completedMissionId) {
      pendingAutoAdvanceMissionIdRef.current = null;
      return;
    }

    pendingAutoAdvanceMissionIdRef.current = null;
    const currentIndex = pack.missions.findIndex((mission) => mission.id === completedMissionId);
    const nextIndex = getNextIncompleteMissionIndex(currentIndex, pack.missions.map((mission) => mission.id), missionCompletionStatuses);
    if (nextIndex === null) return;
    void handleSelectNext();
  }, [activeMissionId, gallerySettled, handleSelectNext, missionCompletionStatuses, pack.missions]);

  const missionAction = activeMission && gallerySettled && currentStatus !== "completed" ? (
    <MissionActionLayer
      key={activeMission.id}
      activeMission={activeMission}
      completionRequested={completionRequestedMissionIds.has(activeMission.id)}
      canSelectNext={incompleteMissionCount > 1}
      selectingNext={selectingNext}
      onCompletionRequested={() => {
        setCompletionRequestedMissionIds((current) => {
          if (current.has(activeMission.id)) return current;
          return new Set(current).add(activeMission.id);
        });
        completionEventSequenceRef.current += 1;
        setCompletionEventId(`${activeMission.id}:${completionEventSequenceRef.current}`);
      }}
      onCompletionProgressChange={(progress) => completionMotionRef.current?.setProgress(activeMission.id, progress)}
      onCompleted={(completedLocalDate) => handleCompleted(activeMission.id, completedLocalDate)}
      onProofInteractionLockChange={setGalleryInteractionLocked}
      onSelectNext={() => void handleSelectNext()}
    />
  ) : null;

  return (
    <>
      <MissionGallery
        id={pack.id}
        title={pack.title}
        hero={pack}
        completedMissionCount={packJoined ? completedMissionCount : undefined}
        completionMotionRef={completionMotionRef}
        missions={pack.missions}
        missionCompletionStatuses={missionCompletionStatuses}
        initialMissionId={initialMissionId ?? undefined}
        manualBrowsingEnabled={manualBrowsingEnabled}
        missionAction={missionAction}
        interactionLocked={galleryInteractionLocked}
        expandMissions={packJoined}
        waitingAction={!packJoined ? (
          <PackMembershipAction
            authenticated={authenticated}
            joined={packJoined}
            onJoined={() => {
              setPackJoined(true);
              if (currentUserId) addJoinedPack(pack.id, currentUserId);
            }}
            pack={pack}
          />
        ) : null}
        onExpansionSettled={() => setGallerySettled(true)}
        onActiveMissionChange={handleActiveMissionChange}
        onSelectNextReady={(selectNext) => {
          selectNextMissionRef.current = selectNext;
        }}
      />
      <MissionCompletionConfetti
        eventId={completionEventId}
        onFinished={(eventId) => setCompletionEventId((current) => current === eventId ? null : current)}
      />
    </>
  );
}
