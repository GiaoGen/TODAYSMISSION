export type PackDeckAppearance = {
  number: string;
  description: string;
  symbol: string;
  background: string;
  foreground: string;
  missionCount: number;
};

export type PackSummary = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  deck?: PackDeckAppearance;
};

export type MissionCardAppearance = {
  title: string;
  note: string;
  tag: string;
  code: string;
  symbol: string;
  background: string;
  foreground: string;
};

export type MissionSummary = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  card?: MissionCardAppearance;
};

export type PackDetail = PackSummary & {
  missions: readonly MissionSummary[];
};
