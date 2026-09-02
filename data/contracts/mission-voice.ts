export type MissionVoiceStatus = {
  missionId: string;
  submitted: boolean;
};

export type MissionVoiceStatusByMission = Record<string, MissionVoiceStatus>;

export type MissionVoicePlayback = {
  id: string;
  signedPlaybackUrl: string;
};
