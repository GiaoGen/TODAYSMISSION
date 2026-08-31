"use client";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import type { MissionActionStatus } from "@/features/missions/model/mission-action-state";
import { MissionCompleteSlider } from "./MissionCompleteSlider";
import { MissionProofRecorder } from "./MissionProofRecorder";
import styles from "./MissionActionLayer.module.css";

type MissionActionLayerProps = {
  activeMission: MissionSummary;
  authenticated: boolean;
  completionRequested: boolean;
  currentStatus: MissionActionStatus;
  isTakePending: boolean;
  onCompletionRequested: () => void;
  onCompleted: () => void;
  onTake: () => void;
  takeError: string | null;
};

export function MissionActionLayer({
  activeMission,
  authenticated,
  completionRequested,
  currentStatus,
  isTakePending,
  onCompletionRequested,
  onCompleted,
  onTake,
  takeError,
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
          <button className={styles.primary} disabled={isTakePending} onClick={onTake} type="button">
            {isTakePending ? "Taking…" : "Take this mission"}
          </button>
        )}

        {currentStatus === "taken" && !completionRequested && (
          <MissionCompleteSlider onCompletionRequested={onCompletionRequested} />
        )}

        {currentStatus === "taken" && completionRequested && (
          <MissionProofRecorder key={activeMission.id} missionId={activeMission.id} onCompleted={onCompleted} />
        )}

        {currentStatus === "completed" && (
          <p aria-live="polite" className={styles.completed}>
            <span aria-hidden="true">✓</span> Completed
          </p>
        )}

        {takeError ? <p className={styles.error} role="alert">{takeError}</p> : null}

        <button className={styles.nervous} disabled type="button">
          I am nervous
        </button>
      </div>
    </aside>
  );
}
