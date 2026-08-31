"use client";

import { useState } from "react";

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
};

export function MissionPackDetail({
  pack,
  authenticated,
  initialPackJoined,
  initialMissionCompletionStatuses,
}: MissionPackDetailProps) {
  const [activeMissionId, setActiveMissionId] = useState(pack.missions[0]?.id ?? null);
  const [packJoined, setPackJoined] = useState(initialPackJoined);
  const [missionCompletionStatuses, setMissionCompletionStatuses] = useState(initialMissionCompletionStatuses);
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
          activeMission={activeMission}
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
          onCompletionRequested={() => setCompletionRequestedMissionId(activeMission.id)}
          onCompleted={handleCompleted}
        />
      ) : null}
    </>
  );
}
