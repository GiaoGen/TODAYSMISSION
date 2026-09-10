import { memo, type CSSProperties } from "react";
import Image from "next/image";
import type {
  MissionArtworkKey,
  MissionSummary,
  MissionThemeKey,
} from "@/data/contracts/pack-summary";
import styles from "./MissionStreamCard.module.css";

type CardStyle = CSSProperties & { "--card-bg": string; "--card-fg": string };

export type MissionThemeAppearance = {
  background: string;
  foreground: string;
};

export const MISSION_THEME_REGISTRY = {
  coral: { background: "#e5392d", foreground: "#111111" },
  blue: { background: "#1457c9", foreground: "#f3e8c8" },
  yellow: { background: "#f1c933", foreground: "#111111" },
  ink: { background: "#111111", foreground: "#f3e8c8" },
  paper: { background: "#f3e8c8", foreground: "#111111" },
} satisfies Record<MissionThemeKey, MissionThemeAppearance>;

export function getMissionThemeAppearance(themeKey: MissionThemeKey): MissionThemeAppearance {
  return MISSION_THEME_REGISTRY[themeKey];
}

const MISSION_ARTWORK_REGISTRY = {
  circle: "●",
  square: "■",
  triangle: "▲",
  diamond: "◆",
  ring: "◐",
} satisfies Record<MissionArtworkKey, string>;

export type DoingThingsAloneMissionVariant = "aperture" | "field" | "pressure" | "split" | "final";

type DoingThingsAloneMissionDesign = {
  artworkSrc: string;
  variant: DoingThingsAloneMissionVariant;
};

export const DOING_THINGS_ALONE_MISSION_DESIGNS = {
  "stay-awhile": { variant: "field", artworkSrc: "/packs/doing-things-alone/missions/stay-awhile.webp" },
  "eat-outside-alone": { variant: "split", artworkSrc: "/packs/doing-things-alone/missions/eat-outside-alone.webp" },
  "lunch-for-one": { variant: "pressure", artworkSrc: "/packs/doing-things-alone/missions/lunch-for-one.webp" },
  "browse-alone": { variant: "aperture", artworkSrc: "/packs/doing-things-alone/missions/browse-alone.webp" },
  "go-somewhere-new": { variant: "aperture", artworkSrc: "/packs/doing-things-alone/missions/go-somewhere-new.webp" },
  "sit-in-the-crowd": { variant: "pressure", artworkSrc: "/packs/doing-things-alone/missions/sit-in-the-crowd.webp" },
  "coffee-for-one": { variant: "field", artworkSrc: "/packs/doing-things-alone/missions/coffee-for-one.webp" },
  "table-for-one": { variant: "split", artworkSrc: "/packs/doing-things-alone/missions/table-for-one.webp" },
  "movie-for-one": { variant: "final", artworkSrc: "/packs/doing-things-alone/missions/movie-for-one.webp" },
  "see-it-for-yourself": { variant: "pressure", artworkSrc: "/packs/doing-things-alone/missions/see-it-for-yourself.webp" },
  "play-alone": { variant: "split", artworkSrc: "/packs/doing-things-alone/missions/play-alone.webp" },
  "go-to-something": { variant: "pressure", artworkSrc: "/packs/doing-things-alone/missions/go-to-something.webp" },
  "show-up-alone": { variant: "field", artworkSrc: "/packs/doing-things-alone/missions/show-up-alone.webp" },
  "be-the-only-one": { variant: "aperture", artworkSrc: "/packs/doing-things-alone/missions/be-the-only-one.webp" },
  "one-hour-out": { variant: "aperture", artworkSrc: "/packs/doing-things-alone/missions/one-hour-out.webp" },
  "spend-the-day-your-way": { variant: "split", artworkSrc: "/packs/doing-things-alone/missions/spend-the-day-your-way.webp" },
} as const satisfies Record<string, DoingThingsAloneMissionDesign>;

export function getDoingThingsAloneMissionDesign(slug: string): DoingThingsAloneMissionDesign | null {
  return DOING_THINGS_ALONE_MISSION_DESIGNS[slug as keyof typeof DOING_THINGS_ALONE_MISSION_DESIGNS] ?? null;
}

// Artwork only: the gallery owns input, depth and route transitions.
export const MissionStreamCard = memo(function MissionStreamCard({ mission, number }: {
  mission: MissionSummary;
  number: number;
}) {
  const approvedDesign = getDoingThingsAloneMissionDesign(mission.slug);
  if (approvedDesign) {
    return (
      <article
        className={`${styles.mission} ${styles.approvedMission}`}
        data-mission-id={mission.id}
        data-variant={approvedDesign.variant}
      >
        <div className={styles.approvedGeometry} aria-hidden="true">
          <i className={styles.planeA} />
          <i className={styles.planeB} />
          <i className={styles.planeC} />
          <i className={styles.cut} />
        </div>
        <div className={styles.approvedContent}>
          <p className={styles.packName}>DOING THINGS ALONE</p>
          <h2 className={styles.approvedTitle}>{mission.title}</h2>
          <p className={styles.instruction}>{mission.note}</p>
        </div>
      </article>
    );
  }

  const theme = getMissionThemeAppearance(mission.themeKey);
  const label = String(number).padStart(2, "0");
  const style: CardStyle = { "--card-bg": theme.background, "--card-fg": theme.foreground };
  return (
    <article className={styles.mission} style={style} data-mission-id={mission.id}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.number}>MISSION {label}</div>
          <div className={styles.shape} aria-hidden="true">{MISSION_ARTWORK_REGISTRY[mission.artworkKey]}</div>
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>{mission.title}</h2>
          <p className={styles.note}>{mission.note}</p>
        </div>
        <div className={styles.bottom}>
          <div className={styles.tag}>{mission.tag}</div>
          <div className={styles.code}>FIELD<br />{mission.code}</div>
        </div>
      </div>
    </article>
  );
});

export const MissionCompletionCard = memo(function MissionCompletionCard({ mission, number, eager = false }: {
  mission: MissionSummary;
  number: number;
  eager?: boolean;
}) {
  const approvedDesign = getDoingThingsAloneMissionDesign(mission.slug);
  if (approvedDesign) {
    return (
      <article aria-label={`${mission.title} completed`} className={`${styles.mission} ${styles.artworkMission}`}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.artworkImage}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 599px) 320px, 440px"
          src={approvedDesign.artworkSrc}
        />
      </article>
    );
  }

  const theme = getMissionThemeAppearance(mission.themeKey);
  const label = String(number).padStart(2, "0");
  const style: CardStyle = { "--card-bg": theme.background, "--card-fg": theme.foreground };

  return (
    <article aria-label={`${mission.title} completed`} className={`${styles.mission} ${styles.completionMission}`} style={style}>
      <div aria-hidden="true" className={styles.completionInner}>
        <span className={styles.completionNumber}>MISSION {label}</span>
        <span className={styles.completionArtwork}>{MISSION_ARTWORK_REGISTRY[mission.artworkKey]}</span>
        <span className={styles.completionWord}>DONE</span>
        <svg className={styles.completionCheck} fill="none" viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    </article>
  );
});
