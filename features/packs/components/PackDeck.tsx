import { ViewTransition } from "react";

import type { PackSummary } from "@/data/contracts/pack-summary";
import type { CarouselPlacement } from "@/features/packs/model/arc-carousel-geometry";

import { PackDesign, type PackDesignProps } from "./PackDesignRegistry";
import styles from "./PackDeck.module.css";

export function PackDeckCover(props: PackDesignProps) {
  return <PackDesign {...props} />;
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
          <PackDesign pack={pack} active={active} />
        </ViewTransition> : <PackDesign pack={pack} active={active} />}
      </span>
    </span>
  );
}
