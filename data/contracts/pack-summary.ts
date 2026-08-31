export type PackDesignKey = "field-edition";

export type PackThemeKey =
  | "go-alone"
  | "talk-first"
  | "get-rejected"
  | "be-seen";

export type PackSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  number: string;
  missionCount: number;
  designKey: PackDesignKey;
  themeKey: PackThemeKey;
};

export type MissionThemeKey = "coral" | "blue" | "yellow" | "ink" | "paper";

export type MissionArtworkKey =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "ring";

export type MissionSummary = {
  id: string;
  slug: string;
  title: string;
  note: string;
  tag: string;
  code: string;
  themeKey: MissionThemeKey;
  artworkKey: MissionArtworkKey;
};

export type PackDetail = PackSummary & {
  missions: readonly MissionSummary[];
};
