"use client";

import { useState } from "react";

import type { MissionExperience } from "@/data/contracts/mission-experience";
import type { MissionSummary } from "@/data/contracts/pack-summary";
import type { MissionExperienceScope } from "@/features/missions/model/mission-experience-cache";
import { MissionGallery } from "./MissionGallery";

type CompletedMissionGalleryProps = {
  id: string;
  title: string;
  date: string;
  missions: readonly MissionSummary[];
  currentUserId: string;
  loadMissionExperiences: (missionId: string) => Promise<
    | { ok: true; experiences: readonly MissionExperience[] }
    | { ok: false; error: string }
  >;
};

export function CompletedMissionGallery({
  id,
  title,
  date,
  missions,
  currentUserId,
  loadMissionExperiences,
}: CompletedMissionGalleryProps) {
  const firstMission = missions[0];
  const [activeMissionId, setActiveMissionId] = useState(firstMission?.id);

  if (!firstMission) return null;

  return (
    <MissionGallery
      completedDate={date}
      experienceMissionCompleted
      experienceScope={{ kind: "own", userId: currentUserId } satisfies MissionExperienceScope}
      experienceMissionId={activeMissionId}
      experienceRevealEnabled
      hero={firstMission}
      id={id}
      loadMissionExperiences={loadMissionExperiences}
      missions={missions}
      onActiveMissionChange={setActiveMissionId}
      title={title}
    />
  );
}
