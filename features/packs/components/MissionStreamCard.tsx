import { memo, type CSSProperties } from "react";
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

// Artwork only: the gallery owns input, depth and route transitions.
export const MissionStreamCard = memo(function MissionStreamCard({ mission, number }: {
  mission: MissionSummary;
  number: number;
}) {
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

export const MissionCompletionCard = memo(function MissionCompletionCard({ mission, number }: {
  mission: MissionSummary;
  number: number;
}) {
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
