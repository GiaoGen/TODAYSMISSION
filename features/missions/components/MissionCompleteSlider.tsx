"use client";

import { useRef, useState } from "react";

import { getCompletionOutcome } from "@/features/missions/model/mission-action-state";
import styles from "./MissionActionLayer.module.css";

type MissionCompleteSliderProps = {
  onCompletionRequested: () => void;
};

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function MissionCompleteSlider({ onCompletionRequested }: MissionCompleteSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const progressFromPointer = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const bounds = track.getBoundingClientRect();
    return clampProgress((clientX - bounds.left) / bounds.width);
  };

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    stopPropagation(event);
    if (event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setProgress(progressFromPointer(event.clientX));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    stopPropagation(event);
    if (event.pointerId !== pointerIdRef.current) return;
    setProgress(progressFromPointer(event.clientX));
  };

  const resetOrRequest = (finalProgress: number) => {
    pointerIdRef.current = null;
    setIsDragging(false);
    if (getCompletionOutcome(finalProgress) === "request") {
      setProgress(0);
      onCompletionRequested();
    } else {
      setProgress(0);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    stopPropagation(event);
    if (event.pointerId !== pointerIdRef.current) return;
    const finalProgress = progressFromPointer(event.clientX);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetOrRequest(finalProgress);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    stopPropagation(event);
    if (event.pointerId !== pointerIdRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerIdRef.current = null;
    setIsDragging(false);
    setProgress(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    stopPropagation(event);
    let nextProgress: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") nextProgress = progress + 0.1;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextProgress = progress - 0.1;
    if (event.key === "Home") nextProgress = 0;
    if (event.key === "End") nextProgress = 1;

    if (nextProgress === null) return;
    event.preventDefault();
    const next = clampProgress(nextProgress);
    if (getCompletionOutcome(next) === "request") {
      setProgress(0);
      onCompletionRequested();
    } else {
      setProgress(next);
    }
  };

  return (
    <div
      aria-label="Slide to complete"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={`${Math.round(progress * 100)} percent complete`}
      className={styles.slider}
      data-dragging={isDragging}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={trackRef}
      role="slider"
      tabIndex={0}
    >
      <span className={styles.sliderFill} style={{ width: `${progress * 100}%` }} />
      <span className={styles.sliderThumb} style={{ left: `${progress * 100}%` }} />
      <span className={styles.sliderLabel}>Slide to complete</span>
      <span className={styles.sliderHint}>Use arrow keys or End</span>
    </div>
  );
}
