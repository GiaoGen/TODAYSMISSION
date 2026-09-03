"use client";

import { useRef, useState } from "react";

import type { MissionVoiceStatusByMission } from "@/data/contracts/mission-voice";
import type { PackDetail } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { getCompletedMissionCount } from "@/features/packs/model/pack-progress";
import { MissionActionLayer } from "@/features/missions/components/MissionActionLayer";
import { MissionGallery } from "./MissionGallery";
import type { MissionCompletionMotionHandle } from "./MissionGallery";
import { PackMembershipAction } from "./PackMembershipAction";

type MissionPackDetailProps = {
  pack: PackDetail;
  authenticated: boolean;
  initialPackJoined: boolean;
  initialMissionCompletionStatuses: Record<string, MissionCompletionStatus>;
  initialMissionVoiceStatuses: MissionVoiceStatusByMission;
};

export function MissionPackDetail({
  pack,
  authenticated,
  initialPackJoined,
  initialMissionCompletionStatuses,
  initialMissionVoiceStatuses,
}: MissionPackDetailProps) {
  const [activeMissionId, setActiveMissionId] = useState(pack.missions[0]?.id ?? null);
  const [packJoined, setPackJoined] = useState(initialPackJoined);
  const [gallerySettled, setGallerySettled] = useState(false);
  const [missionCompletionStatuses, setMissionCompletionStatuses] = useState(initialMissionCompletionStatuses);
  const [missionVoiceStatuses, setMissionVoiceStatuses] = useState(initialMissionVoiceStatuses);
  const [completionRequestedMissionId, setCompletionRequestedMissionId] = useState<string | null>(null);
  const [selectingNext, setSelectingNext] = useState(false);
  const selectNextMissionRef = useRef<(() => Promise<boolean>) | null>(null);
  const completionMotionRef = useRef<MissionCompletionMotionHandle | null>(null);
  const selectingNextRef = useRef(false);
  const activeMission = pack.missions.find((mission) => mission.id === activeMissionId) ?? pack.missions[0];
  const currentStatus = activeMission
    ? missionCompletionStatuses[activeMission.id] ?? "incomplete"
    : "incomplete";
  const completedMissionCount = getCompletedMissionCount(missionCompletionStatuses);

  const handleActiveMissionChange = (missionId: string) => {
    setActiveMissionId(missionId);
    setCompletionRequestedMissionId(null);
  };

  const handleCompleted = () => {
    if (!activeMission) return;
    setMissionCompletionStatuses((current) => ({ ...current, [activeMission.id]: "completed" }));
    setCompletionRequestedMissionId(null);
  };

  const handleVoiceSubmitted = () => {
    if (!activeMission) return;
    setMissionVoiceStatuses((current) => ({
      ...current,
      [activeMission.id]: { missionId: activeMission.id, submitted: true },
    }));
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

  const missionAction = activeMission && gallerySettled ? (
    <MissionActionLayer
      key={activeMission.id}
      activeMission={activeMission}
      completionRequested={completionRequestedMissionId === activeMission.id}
      currentStatus={currentStatus}
      canSelectNext={pack.missions.length > 1}
      selectingNext={selectingNext}
      voiceSubmitted={missionVoiceStatuses[activeMission.id]?.submitted ?? false}
      onCompletionRequested={() => setCompletionRequestedMissionId(activeMission.id)}
      onCompletionProgressChange={(progress) => completionMotionRef.current?.setProgress(activeMission.id, progress)}
      onCompleted={handleCompleted}
      onSelectNext={() => void handleSelectNext()}
      onVoiceSubmitted={handleVoiceSubmitted}
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
        expandMissions={packJoined}
        waitingAction={!packJoined ? (
          <PackMembershipAction
            authenticated={authenticated}
            joined={packJoined}
            onJoined={() => setPackJoined(true)}
            pack={pack}
          />
        ) : null}
        onExpansionSettled={() => setGallerySettled(true)}
        onActiveMissionChange={handleActiveMissionChange}
        onSelectNextReady={(selectNext) => {
          selectNextMissionRef.current = selectNext;
        }}
      />
    </>
  );
}
