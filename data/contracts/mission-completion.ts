export type MissionCompletion = {
  missionId: string;
  completedAt: string;
};

export type MissionCompletionByMission = Record<string, MissionCompletion>;
