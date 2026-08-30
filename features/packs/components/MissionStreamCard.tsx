import { memo, type CSSProperties } from "react";
import type { MissionSummary } from "@/data/contracts/pack-summary";
import styles from "./MissionStreamCard.module.css";

type CardStyle = CSSProperties & { "--card-bg": string; "--card-fg": string };

// Artwork only: the gallery owns input, depth and route transitions.
export const MissionStreamCard = memo(function MissionStreamCard({ mission, number }: {
  mission: MissionSummary;
  number: number;
}) {
  const card = mission.card;
  const label = String(number).padStart(2, "0");
  const style: CardStyle = { "--card-bg": card?.background ?? "#111111", "--card-fg": card?.foreground ?? "#f3e8c8" };
  return (
    <article className={styles.mission} style={style} data-mission-id={mission.id}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.number}>MISSION {label}</div>
          <div className={styles.shape} aria-hidden="true">{card?.symbol ?? "●"}</div>
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>{card?.title ?? mission.title}</h2>
          {card?.note ? <p className={styles.note}>{card.note}</p> : null}
        </div>
        <div className={styles.bottom}>
          <div className={styles.tag}>{card?.tag ?? "MISSION"}</div>
          <div className={styles.code}>FIELD<br />{card?.code ?? label}</div>
        </div>
      </div>
    </article>
  );
});
