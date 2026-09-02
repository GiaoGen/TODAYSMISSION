"use client";

import { useState, type ReactNode } from "react";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { MissionCompleteSlider } from "./MissionCompleteSlider";
import { MissionProofRecorder } from "./MissionProofRecorder";
import { MissionVoiceListener } from "./MissionVoiceListener";
import { MissionVoiceRecorder } from "./MissionVoiceRecorder";
import styles from "./MissionActionLayer.module.css";

type MissionActionLayerProps = {
  activeMission: MissionSummary;
  authenticated: boolean;
  packJoined: boolean;
  packMembershipAction: ReactNode;
  completionRequested: boolean;
  currentStatus: MissionCompletionStatus;
  completedMissionCount: number;
  missionCount: number;
  voiceSubmitted: boolean;
  onCompletionRequested: () => void;
  onCompleted: () => void;
  onVoiceSubmitted: () => void;
};

export function MissionActionLayer({
  activeMission,
  authenticated,
  packJoined,
  packMembershipAction,
  completionRequested,
  currentStatus,
  completedMissionCount,
  missionCount,
  voiceSubmitted,
  onCompletionRequested,
  onCompleted,
  onVoiceSubmitted,
}: MissionActionLayerProps) {
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [nervousOpen, setNervousOpen] = useState(false);

  return (
    <aside
      aria-label={`Actions for ${activeMission.title}`}
      className={styles.layer}
      data-mission-id={activeMission.id}
      data-status={currentStatus}
    >
      <div className={styles.panel}>
        {packMembershipAction}
        {packJoined ? (
          <p aria-live="polite" className={styles.progress}>{completedMissionCount} / {missionCount} completed</p>
        ) : null}

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
          <>
            <p aria-live="polite" className={styles.completed}>
              <span aria-hidden="true">✓</span> Completed
            </p>
            {voiceSubmitted ? (
              <p aria-live="polite" className={styles.notice}>Submitted for review</p>
            ) : voiceRecorderOpen ? (
              <MissionVoiceRecorder
                key={activeMission.id}
                missionId={activeMission.id}
                onSubmitted={() => {
                  setVoiceRecorderOpen(false);
                  onVoiceSubmitted();
                }}
              />
            ) : (
              <button className={styles.secondary} onClick={() => setVoiceRecorderOpen(true)} type="button">
                Share what it was like
              </button>
            )}
          </>
        )}

        {currentStatus === "incomplete" && (
          <>
            <button
              className={styles.nervous}
              disabled={!authenticated || !packJoined}
              onClick={() => setNervousOpen((open) => !open)}
              type="button"
            >
              I am nervous
            </button>
            {nervousOpen ? (
              <MissionVoiceListener key={activeMission.id} missionId={activeMission.id} onClose={() => setNervousOpen(false)} />
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
