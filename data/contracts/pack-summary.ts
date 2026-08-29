export type PackSummary = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
};

export type MissionSummary = {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
};

export type PackDetail = PackSummary & {
  missions: readonly MissionSummary[];
};
