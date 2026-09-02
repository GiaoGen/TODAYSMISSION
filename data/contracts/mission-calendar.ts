import type { MissionSummary } from "./pack-summary";

export type MissionCalendarData = {
  registeredOn: string;
  completedOn: readonly string[];
};

export type CompletedMissionDay = {
  date: string;
  missions: readonly MissionSummary[];
};
