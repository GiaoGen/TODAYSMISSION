import type { CSSProperties } from "react";
import { ViewTransition } from "react";

import type { PackSummary } from "@/data/contracts/pack-summary";
import type { CarouselPlacement } from "@/features/packs/model/arc-carousel-geometry";

import styles from "./PackDeck.module.css";

type CoverStyle = CSSProperties & {
  "--pack-bg": string;
  "--pack-fg": string;
};

export function PackDeckCover({ pack, active = true }: { pack: PackSummary; active?: boolean }) {
  const deck = pack.deck;
  const style: CoverStyle = {
    "--pack-bg": deck?.background ?? "#111111",
    "--pack-fg": deck?.foreground ?? "#F3E8C8",
  };

  return (
    <span className={styles.cover} data-active={active} style={style}>
      <span className={styles.coverInner}>
        <span className={styles.packTop}>
          <span className={styles.packIndex}>PACK {deck?.number ?? "01"}</span>
          <span aria-hidden="true" className={styles.symbol}>{deck?.symbol ?? "●"}</span>
        </span>
        <span className={styles.titleWrap}>
          <span className={styles.packTitle}>{pack.title}</span>
          <span className={styles.packDesc}>{deck?.description}</span>
        </span>
        <span className={styles.packBottom}>
          <span className={styles.count}>{deck ? `${deck.missionCount} CARDS` : "MISSION CARDS"}</span>
          <span className={styles.micro}>mission deck<br />field edition</span>
        </span>
      </span>
    </span>
  );
}

export function PackDeck({ pack, active, placement, transitionName, native = false }: {
  pack: PackSummary;
  active: boolean;
  placement: CarouselPlacement;
  transitionName?: string;
  native?: boolean;
}) {
  return (
    <span className={styles.shell} data-active={active} data-placement={placement} data-native={native}>
      <span aria-hidden="true" className={`${styles.missionPeek} ${styles.peekLeft}`} />
      <span aria-hidden="true" className={`${styles.missionPeek} ${styles.peekRight}`} />
      <span aria-hidden="true" className={`${styles.missionPeek} ${styles.peekCenter}`} />
      <span className={styles.coverOffset}>
        {transitionName ? <ViewTransition default="none" name={transitionName} share="pack-card-morph">
          <PackDeckCover pack={pack} active={active} />
        </ViewTransition> : <PackDeckCover pack={pack} active={active} />}
      </span>
    </span>
  );
}
