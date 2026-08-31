export type MissionProgressStatus = "taken" | "completed";

export type MissionProgress = {
  missionId: string;
  status: MissionProgressStatus;
  takenAt: string;
  completedAt: string | null;
};

export type MissionProgressByMission = Record<string, MissionProgress>;
