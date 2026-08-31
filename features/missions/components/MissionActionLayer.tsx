"use client";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import type { MissionActionStatus } from "@/features/missions/model/mission-action-state";
import { MissionCompleteSlider } from "./MissionCompleteSlider";
import styles from "./MissionActionLayer.module.css";

type MissionActionLayerProps = {
  activeMission: MissionSummary;
  authenticated: boolean;
  currentStatus: MissionActionStatus;
  onComplete: () => void;
  onTake: () => void;
};

export function MissionActionLayer({
  activeMission,
  authenticated,
  currentStatus,
  onComplete,
  onTake,
}: MissionActionLayerProps) {
  return (
    <aside
      aria-label={`Actions for ${activeMission.title}`}
      className={styles.layer}
      data-authenticated={authenticated}
      data-mission-id={activeMission.id}
      data-status={currentStatus}
    >
      <div className={styles.panel}>
        {currentStatus === "available" && (
          <button className={styles.primary} onClick={onTake} type="button">
            Take this mission
          </button>
        )}

        {currentStatus === "taken" && <MissionCompleteSlider onComplete={onComplete} />}

        {currentStatus === "completed" && (
          <p aria-live="polite" className={styles.completed}>
            <span aria-hidden="true">✓</span> Completed
          </p>
        )}

        <button className={styles.nervous} disabled type="button">
          I am nervous
        </button>
      </div>
    </aside>
  );
}
