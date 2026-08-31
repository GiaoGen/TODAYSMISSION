"use client";

import type { ReactNode } from "react";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { MissionCompleteSlider } from "./MissionCompleteSlider";
import { MissionProofRecorder } from "./MissionProofRecorder";
import styles from "./MissionActionLayer.module.css";

type MissionActionLayerProps = {
  activeMission: MissionSummary;
  packJoined: boolean;
  packMembershipAction: ReactNode;
  completionRequested: boolean;
  currentStatus: MissionCompletionStatus;
  onCompletionRequested: () => void;
  onCompleted: () => void;
};

export function MissionActionLayer({
  activeMission,
  packJoined,
  packMembershipAction,
  completionRequested,
  currentStatus,
  onCompletionRequested,
  onCompleted,
}: MissionActionLayerProps) {
  return (
    <aside
      aria-label={`Actions for ${activeMission.title}`}
      className={styles.layer}
      data-mission-id={activeMission.id}
      data-status={currentStatus}
    >
      <div className={styles.panel}>
        {packMembershipAction}

        {currentStatus === "incomplete" && !packJoined && (
          <p aria-live="polite" className={styles.notice}>Take this Pack to start</p>
        )}

        {currentStatus === "incomplete" && packJoined && !completionRequested && (
          <MissionCompleteSlider onCompletionRequested={onCompletionRequested} />
        )}

        {currentStatus === "incomplete" && packJoined && completionRequested && (
          <MissionProofRecorder key={activeMission.id} missionId={activeMission.id} onCompleted={onCompleted} />
        )}

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
