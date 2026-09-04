"use client";

import type { CSSProperties } from "react";

import type { MissionSummary } from "@/data/contracts/pack-summary";
import { MISSION_SLIDER_THUMB_SIZE } from "@/features/missions/model/mission-action-state";
import { getMissionThemeAppearance } from "@/features/packs/components/MissionStreamCard";
import { MissionCompleteSlider } from "./MissionCompleteSlider";
import { MissionCompletionProofChooser } from "./MissionCompletionProofChooser";
import styles from "./MissionActionLayer.module.css";

type MissionActionLayerProps = {
  activeMission: MissionSummary;
  committed: boolean;
  completionRequested: boolean;
  canSelectNext: boolean;
  selectingNext: boolean;
  onCompletionRequested: () => void;
  onCompletionProgressChange: (progress: number) => void;
  onCommit: () => void;
  onCompleted: (completedLocalDate: string) => void;
  onProofInteractionLockChange: (locked: boolean) => void;
  onSelectNext: () => void;
};

type ActionLayerStyle = CSSProperties & {
  "--tm-accent": string;
  "--tm-on-accent": string;
  "--tm-thumb-size": string;
};

export function MissionActionLayer({
  activeMission,
  committed,
  completionRequested,
  canSelectNext,
  selectingNext,
  onCompletionRequested,
  onCompletionProgressChange,
  onCommit,
  onCompleted,
  onProofInteractionLockChange,
  onSelectNext,
}: MissionActionLayerProps) {
  const theme = getMissionThemeAppearance(activeMission.themeKey);
  const style: ActionLayerStyle = {
    "--tm-accent": theme.background,
    "--tm-on-accent": theme.foreground,
    "--tm-thumb-size": `${MISSION_SLIDER_THUMB_SIZE}px`,
  };

  return (
    <aside
      aria-label={`Actions for ${activeMission.title}`}
      className={styles.layer}
      data-mission-id={activeMission.id}
      style={style}
    >
      <div className={styles.panel}>
        {committed && completionRequested ? (
          <MissionCompletionProofChooser
            key={activeMission.id}
            missionId={activeMission.id}
            onCompleted={onCompleted}
            onInteractionLockChange={onProofInteractionLockChange}
          />
        ) : committed ? (
          <>
            <MissionCompleteSlider
              onCompletionRequested={onCompletionRequested}
              onProgressChange={onCompletionProgressChange}
            />
          </>
        ) : (
          <>
            <button
              aria-label="Take this mission"
              className={styles.takeMission}
              onClick={onCommit}
              type="button"
            >
              <span>take this mission</span>
            </button>
            <button
              aria-label="Switch mission"
              className={styles.auxiliaryAction}
              disabled={!canSelectNext || selectingNext}
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
          </>
        )}
      </div>
    </aside>
  );
}
