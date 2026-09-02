"use client";

import { useState } from "react";

import type { MissionVoiceStatusByMission } from "@/data/contracts/mission-voice";
import type { PackDetail } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { MissionActionLayer } from "@/features/missions/components/MissionActionLayer";
import { MissionGallery } from "./MissionGallery";
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
  const [missionCompletionStatuses, setMissionCompletionStatuses] = useState(initialMissionCompletionStatuses);
  const [missionVoiceStatuses, setMissionVoiceStatuses] = useState(initialMissionVoiceStatuses);
  const [completionRequestedMissionId, setCompletionRequestedMissionId] = useState<string | null>(null);
  const activeMission = pack.missions.find((mission) => mission.id === activeMissionId) ?? pack.missions[0];
  const currentStatus = activeMission
    ? missionCompletionStatuses[activeMission.id] ?? "incomplete"
    : "incomplete";

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

  return (
    <>
      <MissionGallery
        id={pack.id}
        title={pack.title}
        hero={pack}
        missions={pack.missions}
        onActiveMissionChange={handleActiveMissionChange}
      />
      {activeMission ? (
        <MissionActionLayer
          key={activeMission.id}
          activeMission={activeMission}
          authenticated={authenticated}
          packJoined={packJoined}
          packMembershipAction={(
            <PackMembershipAction
              authenticated={authenticated}
              joined={packJoined}
              onJoined={() => setPackJoined(true)}
              pack={pack}
            />
          )}
          completionRequested={completionRequestedMissionId === activeMission.id}
          currentStatus={currentStatus}
          voiceSubmitted={missionVoiceStatuses[activeMission.id]?.submitted ?? false}
          onCompletionRequested={() => setCompletionRequestedMissionId(activeMission.id)}
          onCompleted={handleCompleted}
          onVoiceSubmitted={handleVoiceSubmitted}
        />
      ) : null}
    </>
  );
}
