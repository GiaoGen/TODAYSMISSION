export type MissionExperience =
  | {
      id: string;
      kind: "text";
      text: string;
    }
  | {
      id: string;
      kind: "audio";
      signedPlaybackUrl: string;
    };
