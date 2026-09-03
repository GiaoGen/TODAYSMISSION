"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import {
  getCompletionOutcome,
  getMissionSliderTravel,
  MISSION_SLIDER_THUMB_SIZE,
} from "@/features/missions/model/mission-action-state";
import styles from "./MissionActionLayer.module.css";

type MissionCompleteSliderProps = {
  onCompletionRequested: () => void;
  onProgressChange: (progress: number) => void;
};

type SliderStyle = CSSProperties & {
  "--tm-fill-width": string;
  "--tm-idle-opacity": number;
  "--tm-knob-x": string;
  "--tm-label-x": string;
  "--tm-success-opacity": number;
  "--tm-unfilled": string;
};

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function MissionCompleteSlider({ onCompletionRequested, onProgressChange }: MissionCompleteSliderProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef({ clientX: 0, progress: 0 });
  const progressRef = useRef(0);
  const animationFrameRef = useRef(0);
  const completionRequestedRef = useRef(false);
  const onProgressChangeRef = useRef(onProgressChange);
  const [trackWidth, setTrackWidth] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const travel = getMissionSliderTravel(trackWidth);

  useLayoutEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  });

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => setTrackWidth(rail.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameRef.current);
      if (!completionRequestedRef.current) onProgressChangeRef.current(0);
    };
  }, []);

  const paint = (value: number) => {
    const next = clampProgress(value);
    progressRef.current = next;
    onProgressChangeRef.current(next);
    setProgress(next);
  };

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const animateTo = (target: number, complete = false) => {
    cancelAnimationFrame(animationFrameRef.current);
    const from = progressRef.current;
    const started = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : complete ? 180 : 370;

    const tick = (now: number) => {
      const elapsed = duration ? Math.min(1, (now - started) / duration) : 1;
      paint(from + (target - from) * (1 - Math.pow(1 - elapsed, 4)));
      if (elapsed < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      animationFrameRef.current = 0;
      if (!complete || completionRequestedRef.current) return;
      completionRequestedRef.current = true;
      setIsDone(true);
      setAnnouncement("Congratulations!");
      onCompletionRequested();
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const release = (cancelled: boolean) => {
    const pointerId = pointerIdRef.current;
    if (pointerId === null) return;

    pointerIdRef.current = null;
    setIsDragging(false);
    const input = inputRef.current;
    if (input?.hasPointerCapture(pointerId)) input.releasePointerCapture(pointerId);
    const finish = !cancelled && getCompletionOutcome(progressRef.current) === "request";
    animateTo(finish ? 1 : 0, finish);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    stopPropagation(event);
    event.preventDefault();
    if (isDone || pointerIdRef.current !== null || event.button !== 0) return;

    const rail = railRef.current;
    if (!rail) return;
    const bounds = rail.getBoundingClientRect();
    const center = bounds.left + 6 + MISSION_SLIDER_THUMB_SIZE / 2 + travel * progressRef.current;
    if (Math.abs(event.clientX - center) > MISSION_SLIDER_THUMB_SIZE / 2 + 3) return;

    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;
    pointerIdRef.current = event.pointerId;
    dragStartRef.current = { clientX: event.clientX, progress: progressRef.current };
    setIsDragging(true);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLInputElement>) => {
    stopPropagation(event);
    if (event.pointerId !== pointerIdRef.current) return;
    paint(dragStartRef.current.progress + (event.clientX - dragStartRef.current.clientX) / Math.max(1, travel));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLInputElement>) => {
    stopPropagation(event);
    if (event.pointerId === pointerIdRef.current) release(false);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLInputElement>) => {
    stopPropagation(event);
    if (event.pointerId === pointerIdRef.current) release(true);
  };

  const handleLostPointerCapture = () => {
    if (pointerIdRef.current !== null) release(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    stopPropagation(event);
    if (isDone) {
      event.preventDefault();
      return;
    }

    const steps: Partial<Record<string, number>> = {
      ArrowRight: 0.1,
      ArrowUp: 0.1,
      ArrowLeft: -0.1,
      ArrowDown: -0.1,
    };
    if (!(event.key in steps) && !["Home", "End", "Escape"].includes(event.key)) return;

    event.preventDefault();
    cancelAnimationFrame(animationFrameRef.current);
    const next = event.key === "End"
      ? 1
      : event.key === "Home" || event.key === "Escape"
        ? 0
        : clampProgress(progressRef.current + (steps[event.key] ?? 0));
    paint(next);
    if (getCompletionOutcome(next) === "request") animateTo(1, true);
  };

  const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
    stopPropagation(event);
    if (isDone) {
      paint(1);
      return;
    }
    if (pointerIdRef.current === null) paint(Number(event.currentTarget.value) / 100);
  };

  const x = travel * progress;
  const sliderStyle: SliderStyle = {
    "--tm-knob-x": `${x}px`,
    "--tm-fill-width": `${MISSION_SLIDER_THUMB_SIZE + x}px`,
    "--tm-unfilled": `${Math.max(0, travel - x)}px`,
    "--tm-idle-opacity": clampProgress(1 - progress * 3),
    "--tm-label-x": `${progress * 9}px`,
    "--tm-success-opacity": clampProgress((progress - 0.12) / 0.55),
  };
  const percent = Math.round(progress * 100);

  return (
    <div
      aria-label="Mission completion slider"
      className={styles.slider}
      data-done={isDone}
      data-dragging={isDragging}
      onClick={(event) => {
        event.preventDefault();
        stopPropagation(event);
      }}
      ref={railRef}
      style={sliderStyle}
    >
      <span aria-hidden="true" className={styles.sliderIdle}>swipe to complete</span>
      <span className={styles.sliderFill} />
      <span aria-hidden="true" className={styles.sliderReveal}>
        <span className={styles.sliderSuccess}>Congratulations!</span>
      </span>
      <span aria-hidden="true" className={styles.sliderHandle}>
        <svg className={styles.sliderArrow} fill="none" viewBox="0 0 24 24">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        <svg className={styles.sliderCheck} fill="none" viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <input
        aria-disabled={isDone || undefined}
        aria-label="Swipe to complete"
        aria-valuetext={isDone ? "Completed" : progress === 0 ? "Slide right to complete" : `${percent} percent`}
        className={styles.sliderInput}
        max="100"
        min="0"
        onChange={handleInput}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={inputRef}
        step="1"
        type="range"
        value={percent}
      />
      <span aria-live="polite" className={styles.screenReader}>{announcement}</span>
    </div>
  );
}
