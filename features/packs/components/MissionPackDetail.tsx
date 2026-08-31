"use client";

import { useState } from "react";

import type { PackDetail } from "@/data/contracts/pack-summary";
import {
  completeMission,
  createMissionActionState,
  getMissionLoginDestination,
  takeMission,
  type MissionActionStatus,
} from "@/features/missions/model/mission-action-state";
import { MissionActionLayer } from "@/features/missions/components/MissionActionLayer";
import { MissionGallery } from "./MissionGallery";

export function MissionPackDetail({ pack, authenticated }: { pack: PackDetail; authenticated: boolean }) {
  const [activeMissionId, setActiveMissionId] = useState(pack.missions[0]?.id ?? null);
  const [missionStatuses, setMissionStatuses] = useState<Record<string, MissionActionStatus>>(
    () => createMissionActionState(pack.missions.map((mission) => mission.id)),
  );
  const activeMission = pack.missions.find((mission) => mission.id === activeMissionId) ?? pack.missions[0];
  const currentStatus = activeMission ? missionStatuses[activeMission.id] ?? "available" : "available";

  const handleTake = () => {
    if (!activeMission) return;
    if (!authenticated) {
      window.location.assign(getMissionLoginDestination(pack.slug));
      return;
    }
    setMissionStatuses((current) => ({
      ...current,
      [activeMission.id]: takeMission(current[activeMission.id] ?? "available"),
    }));
  };

  const handleComplete = () => {
    if (!activeMission) return;
    setMissionStatuses((current) => ({
      ...current,
      [activeMission.id]: completeMission(current[activeMission.id] ?? "available"),
    }));
  };

  return (
    <>
      <MissionGallery
        id={pack.id}
        title={pack.title}
        hero={pack}
        missions={pack.missions}
        onActiveMissionChange={setActiveMissionId}
      />
      {activeMission ? (
        <MissionActionLayer
          activeMission={activeMission}
          authenticated={authenticated}
          currentStatus={currentStatus}
          onComplete={handleComplete}
          onTake={handleTake}
        />
      ) : null}
    </>
  );
}
