"use client";

import { useRef, useState } from "react";
import { useSyncExternalStore } from "react";

import type { PackDetail } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { getCompletedMissionCount } from "@/features/packs/model/pack-progress";
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
  const [activeMissionId, setActiveMissionId] = useState(pack.missions[0]?.id ?? null);
  const [packJoined, setPackJoined] = useState(initialPackJoined || (sameUser && sessionSnapshot.joinedPackIds.includes(pack.id)));
  const [gallerySettled, setGallerySettled] = useState(false);
  const [missionCompletionStatuses, setMissionCompletionStatuses] = useState(initialStatuses);
  const [completionRequestedMissionIds, setCompletionRequestedMissionIds] = useState<ReadonlySet<string>>(() => new Set());
  const [completionEventId, setCompletionEventId] = useState<string | null>(null);
  const [selectingNext, setSelectingNext] = useState(false);
  const [galleryInteractionLocked, setGalleryInteractionLocked] = useState(false);
  const selectNextMissionRef = useRef<(() => Promise<boolean>) | null>(null);
  const completionMotionRef = useRef<MissionCompletionMotionHandle | null>(null);
  const selectingNextRef = useRef(false);
  const completionEventSequenceRef = useRef(0);
  const activeMission = pack.missions.find((mission) => mission.id === activeMissionId) ?? pack.missions[0];
  const currentStatus = activeMission
    ? missionCompletionStatuses[activeMission.id] ?? "incomplete"
    : "incomplete";
  const completedMissionCount = getCompletedMissionCount(missionCompletionStatuses);

  const handleActiveMissionChange = (missionId: string) => {
    setActiveMissionId(missionId);
  };

  const handleCompleted = (missionId: string, completedLocalDate: string) => {
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

  const handleSelectNext = async () => {
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
  };

  const missionAction = activeMission && gallerySettled && currentStatus !== "completed" ? (
    <MissionActionLayer
      key={activeMission.id}
      activeMission={activeMission}
      completionRequested={completionRequestedMissionIds.has(activeMission.id)}
      canSelectNext={pack.missions.length > 1}
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
