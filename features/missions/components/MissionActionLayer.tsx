"use client";

import { useEffect, useState, type CSSProperties } from "react";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { getMissionThemeAppearance } from "@/features/packs/components/MissionStreamCard";
import { MissionCompleteSlider } from "./MissionCompleteSlider";
import { MissionProofRecorder } from "./MissionProofRecorder";
import { MissionVoiceRecorder } from "./MissionVoiceRecorder";
import styles from "./MissionActionLayer.module.css";

type MissionActionLayerProps = {
  activeMission: MissionSummary;
  completionRequested: boolean;
  currentStatus: MissionCompletionStatus;
  canSelectNext: boolean;
  selectingNext: boolean;
  voiceSubmitted: boolean;
  onCompletionRequested: () => void;
  onCompletionProgressChange: (progress: number) => void;
  onCompleted: () => void;
  onSelectNext: () => void;
  onVoiceSubmitted: () => void;
};

type ActionLayerStyle = CSSProperties & {
  "--tm-accent": string;
  "--tm-on-accent": string;
};

function CompletionProofTransition({ missionId, onCompleted }: {
  missionId: string;
  onCompleted: () => void;
}) {
  const [showRecorder, setShowRecorder] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setShowRecorder(true), reducedMotion ? 0 : 220);
    return () => window.clearTimeout(timer);
  }, []);

  if (showRecorder) return <MissionProofRecorder missionId={missionId} onCompleted={onCompleted} />;
  return (
    <div aria-live="polite" className={styles.completionFeedback}>
      <span aria-hidden="true">✓</span>
      <span>Congratulations!</span>
    </div>
  );
}

export function MissionActionLayer({
  activeMission,
  completionRequested,
  currentStatus,
  canSelectNext,
  selectingNext,
  voiceSubmitted,
  onCompletionRequested,
  onCompletionProgressChange,
  onCompleted,
  onSelectNext,
  onVoiceSubmitted,
}: MissionActionLayerProps) {
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const theme = getMissionThemeAppearance(activeMission.themeKey);
  const style: ActionLayerStyle = {
    "--tm-accent": theme.background,
    "--tm-on-accent": theme.foreground,
  };

  return (
    <aside
      aria-label={`Actions for ${activeMission.title}`}
      className={styles.layer}
      data-mission-id={activeMission.id}
      data-status={currentStatus}
      style={style}
    >
      <div className={styles.panel}>
        {currentStatus === "incomplete" && !completionRequested && (
          <MissionCompleteSlider
            onCompletionRequested={onCompletionRequested}
            onProgressChange={onCompletionProgressChange}
          />
        )}

        {currentStatus === "incomplete" && completionRequested && (
          <CompletionProofTransition key={activeMission.id} missionId={activeMission.id} onCompleted={onCompleted} />
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

        <button
          aria-label="Switch mission"
          className={styles.tryAnother}
          disabled={!canSelectNext || selectingNext || completionRequested}
          onClick={onSelectNext}
          type="button"
        >
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="m18 14 4 4-4 4" />
            <path d="m18 2 4 4-4 4" />
            <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
            <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
            <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
          </svg>
          <span>try another</span>
        </button>
      </div>
    </aside>
  );
}
