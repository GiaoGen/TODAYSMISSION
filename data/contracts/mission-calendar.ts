import type { MissionSummary } from "./pack-summary";

export type MissionCalendarData = {
  registeredOn: string;
  completedOn: readonly string[];
};

export type MissionCompletion = {
  completedOn: string;
  packId: string;
  missionId: string;
};

export type CompletedMissionDay = {
  date: string;
  missions: readonly MissionSummary[];
};
