"use client";

import { useState, useTransition } from "react";

import type { PackDetail } from "@/data/contracts/pack-summary";
import { takeMissionAction } from "@/features/missions/actions";
import {
  applyTakeResult,
  getMissionLoginDestination,
  type MissionActionStatus,
} from "@/features/missions/model/mission-action-state";
import { MissionActionLayer } from "@/features/missions/components/MissionActionLayer";
import { MissionGallery } from "./MissionGallery";

type MissionPackDetailProps = {
  pack: PackDetail;
  authenticated: boolean;
  initialMissionStatuses: Record<string, MissionActionStatus>;
};

export function MissionPackDetail({ pack, authenticated, initialMissionStatuses }: MissionPackDetailProps) {
  const [activeMissionId, setActiveMissionId] = useState(pack.missions[0]?.id ?? null);
  const [missionStatuses, setMissionStatuses] = useState(initialMissionStatuses);
  const [isTaking, startTaking] = useTransition();
  const [takeErrorMissionId, setTakeErrorMissionId] = useState<string | null>(null);
  const [takeError, setTakeError] = useState<string | null>(null);
  const [completionRequestedMissionId, setCompletionRequestedMissionId] = useState<string | null>(null);
  const activeMission = pack.missions.find((mission) => mission.id === activeMissionId) ?? pack.missions[0];
  const currentStatus = activeMission ? missionStatuses[activeMission.id] ?? "available" : "available";

  const handleActiveMissionChange = (missionId: string) => {
    setActiveMissionId(missionId);
    setTakeErrorMissionId(null);
    setTakeError(null);
    setCompletionRequestedMissionId(null);
  };

  const handleTake = () => {
    if (!activeMission) return;
    if (!authenticated) {
      window.location.assign(getMissionLoginDestination(pack.slug));
      return;
    }
    if (isTaking) return;

    const missionId = activeMission.id;
    setTakeErrorMissionId(null);
    setTakeError(null);
    startTaking(async () => {
      const result = await takeMissionAction(missionId);
      if (!result.ok) {
        setTakeErrorMissionId(missionId);
        setTakeError(result.error);
        return;
      }

      setMissionStatuses((current) => ({
        ...current,
        [missionId]: applyTakeResult(current[missionId] ?? "available", result.status),
      }));
    });
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
          authenticated={authenticated}
          completionRequested={completionRequestedMissionId === activeMission.id}
          currentStatus={currentStatus}
          isTakePending={isTaking}
          onCompletionRequested={() => setCompletionRequestedMissionId(activeMission.id)}
          onTake={handleTake}
          takeError={takeErrorMissionId === activeMission.id ? takeError : null}
        />
      ) : null}
    </>
  );
}
