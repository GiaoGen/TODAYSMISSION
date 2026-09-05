"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { MissionExperience } from "@/data/contracts/mission-experience";
import {
  getDeterministicWaveform,
  getMissionExperienceRevealTravel,
  selectMissionExperience,
} from "@/features/missions/model/mission-experience";
import { getMissionExperiencePool, type MissionExperienceScope } from "@/features/missions/model/mission-experience-cache";

import styles from "./MissionExperienceReveal.module.css";

const GESTURE_THRESHOLD_PX = 8;
const OPEN_PROGRESS_THRESHOLD = 0.3;
const OPEN_VELOCITY_PX_PER_SECOND = 460;
const SNAP_DURATION_MS = 260;
const REDUCED_SNAP_DURATION_MS = 90;

type MissionExperienceRevealProps = {
  activeMissionId: string;
  enabled: boolean;
  loadExperiences: (missionId: string) => Promise<
    | { ok: true; experiences: readonly MissionExperience[] }
    | { ok: false; error: string }
  >;
  experienceScope: MissionExperienceScope;
  rootRef: RefObject<HTMLElement | null>;
};

function isRevealBlockedTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    "[data-gallery-action], textarea, input, button, audio, [data-experience-control]",
  ));
}

export function MissionExperienceReveal({
  activeMissionId,
  enabled,
  loadExperiences,
  experienceScope,
  rootRef,
}: MissionExperienceRevealProps) {
  const underlayRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformProgressRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLLIElement | null>(null);
  const selectedRef = useRef<MissionExperience | null>(null);
  const poolRef = useRef<readonly MissionExperience[]>([]);
  const sessionActiveRef = useRef(false);
  const targetTravelRef = useRef(0);
  const currentTravelRef = useRef(0);
  const snapTimerRef = useRef<number | null>(null);
  const previousExperienceIdsRef = useRef(new Map<string, string>());
  const [selected, setSelected] = useState<MissionExperience | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [playing, setPlaying] = useState(false);
  const loading = loadState === "idle" || loadState === "loading";
  const loadFailed = loadState === "failed";
  const waveform = useMemo(
    () => selected?.kind === "audio" ? getDeterministicWaveform(selected.id) : [],
    [selected],
  );

  const resetAudio = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    if (waveformProgressRef.current) waveformProgressRef.current.style.width = "0%";
    setPlaying(false);
  }, []);

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = null;
  }, []);

  const applyTravel = useCallback((travel: number) => {
    const boundedTravel = Math.max(0, travel);
    currentTravelRef.current = boundedTravel;
    const target = Math.max(1, targetTravelRef.current);
    const progress = Math.min(1, boundedTravel / target);
    activeCardRef.current?.style.setProperty("--experience-card-y", `${-boundedTravel}px`);
    underlayRef.current?.style.setProperty("--experience-progress", String(progress));
  }, []);

  const setRevealState = useCallback((state: "closed" | "dragging" | "open" | "closing") => {
    const root = rootRef.current;
    if (root) root.dataset.experienceReveal = state;
  }, [rootRef]);

  const finishClosed = useCallback(() => {
    const card = activeCardRef.current;
    if (card) {
      card.dataset.experienceReveal = "closed";
      card.style.removeProperty("--experience-card-y");
    }
    activeCardRef.current = null;
    currentTravelRef.current = 0;
    targetTravelRef.current = 0;
    selectedRef.current = null;
    sessionActiveRef.current = false;
    setRevealState("closed");
    setSelected(null);
    setSessionActive(false);
    setRevealOpen(false);
  }, [setRevealState]);

  const resetReveal = useCallback((immediate: boolean) => {
    clearSnapTimer();
    resetAudio();
    const card = activeCardRef.current;
    if (card) {
      card.dataset.experienceSnapping = "true";
      card.dataset.experienceReveal = "closing";
    }
    applyTravel(0);
    setRevealState("closing");
    setRevealOpen(false);

    if (immediate || !card) {
      if (card) delete card.dataset.experienceSnapping;
      finishClosed();
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    snapTimerRef.current = window.setTimeout(() => {
      delete card.dataset.experienceSnapping;
      finishClosed();
      snapTimerRef.current = null;
    }, reduced ? REDUCED_SNAP_DURATION_MS : SNAP_DURATION_MS);
  }, [applyTravel, clearSnapTimer, finishClosed, resetAudio, setRevealState]);

  const chooseExperience = useCallback(() => {
    if (sessionActiveRef.current) return selectedRef.current;
    const previousId = previousExperienceIdsRef.current.get(activeMissionId) ?? null;
    const experience = selectMissionExperience(poolRef.current, previousId);
    if (experience) previousExperienceIdsRef.current.set(activeMissionId, experience.id);
    selectedRef.current = experience;
    sessionActiveRef.current = true;
    setSelected(experience);
    setSessionActive(true);
    return experience;
  }, [activeMissionId]);

  const snapReveal = useCallback((open: boolean) => {
    const card = activeCardRef.current;
    if (!card) return;
    clearSnapTimer();
    card.dataset.experienceSnapping = "true";
    card.dataset.experienceReveal = open ? "opening" : "closing";
    if (!open) resetAudio();
    applyTravel(open ? targetTravelRef.current : 0);
    setRevealState(open ? "open" : "closing");
    setRevealOpen(open);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    snapTimerRef.current = window.setTimeout(() => {
      delete card.dataset.experienceSnapping;
      card.dataset.experienceReveal = open ? "open" : "closed";
      if (!open) finishClosed();
      snapTimerRef.current = null;
    }, reduced ? REDUCED_SNAP_DURATION_MS : SNAP_DURATION_MS);
  }, [applyTravel, clearSnapTimer, finishClosed, resetAudio, setRevealState]);

  useEffect(() => {
    poolRef.current = [];
    let cancelled = false;
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      setLoadState("loading");
      void getMissionExperiencePool(activeMissionId, experienceScope, loadExperiences).then((experiences) => {
        if (cancelled) return;
        poolRef.current = experiences;
        setLoadState("ready");
        if (sessionActiveRef.current && !selectedRef.current) {
          const previousId = previousExperienceIdsRef.current.get(activeMissionId) ?? null;
          const experience = selectMissionExperience(experiences, previousId);
          if (experience) previousExperienceIdsRef.current.set(activeMissionId, experience.id);
          selectedRef.current = experience;
          setSelected(experience);
        }
      }).catch(() => {
        if (cancelled) return;
        setLoadState("failed");
      });
    };

    if (enabled) {
      const requestIdle = window.requestIdleCallback;
      if (typeof requestIdle === "function") idleId = requestIdle(load, { timeout: 700 });
      else timerId = globalThis.setTimeout(load, 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timerId !== null) globalThis.clearTimeout(timerId);
    };
  }, [activeMissionId, enabled, experienceScope, loadExperiences]);

  useLayoutEffect(() => {
    if (!sessionActive) return;
    const card = activeCardRef.current;
    const underlay = underlayRef.current;
    if (!card || !underlay) return;

    const measure = () => {
      const kind = selected?.kind ?? "empty";
      const travel = getMissionExperienceRevealTravel(card.offsetHeight, kind, textRef.current?.scrollHeight ?? 0);
      targetTravelRef.current = travel;
      underlay.style.setProperty("--experience-target", `${travel}px`);
      if (revealOpen) applyTravel(travel);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [applyTravel, revealOpen, selected, sessionActive]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let baseTravel = 0;
    let verticalVelocity = 0;
    let intent: "pending" | "horizontal" | "vertical" | null = null;

    const releaseCapture = () => {
      if (pointerId !== null && root.hasPointerCapture(pointerId)) root.releasePointerCapture(pointerId);
    };
    const clearGesture = () => {
      releaseCapture();
      pointerId = null;
      intent = null;
      delete root.dataset.experienceGesture;
    };
    const findCard = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const card = target.closest<HTMLLIElement>("[data-completion-mission-id]");
      return card?.dataset.completionMissionId === activeMissionId ? card : null;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || pointerId !== null || isRevealBlockedTarget(event.target)) return;
      const card = findCard(event.target);
      if (!card || root.dataset.phase !== "settled") return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastY = event.clientY;
      lastTime = performance.now();
      baseTravel = currentTravelRef.current;
      verticalVelocity = 0;
      intent = "pending";
      activeCardRef.current = card;
      root.dataset.experienceGesture = "pending";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId || !intent) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (intent === "pending") {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < GESTURE_THRESHOLD_PX) return;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          intent = "horizontal";
          root.dataset.experienceGesture = "horizontal";
          if (sessionActiveRef.current) resetReveal(true);
          return;
        }
        intent = "vertical";
        root.dataset.experienceGesture = "vertical";
        setRevealState("dragging");
        const experience = chooseExperience();
        const cardHeight = activeCardRef.current?.offsetHeight ?? 0;
        targetTravelRef.current = getMissionExperienceRevealTravel(cardHeight, experience?.kind ?? "empty");
        underlayRef.current?.style.setProperty("--experience-target", `${targetTravelRef.current}px`);
        root.setPointerCapture(event.pointerId);
      }
      if (intent !== "vertical") return;

      event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max((now - lastTime) / 1000, 0.008);
      verticalVelocity = Math.max(-2400, Math.min(2400, (lastY - event.clientY) / elapsed));
      lastY = event.clientY;
      lastTime = now;
      const requested = baseTravel - deltaY;
      const maximum = targetTravelRef.current;
      const resisted = requested > maximum ? maximum + (requested - maximum) * 0.12 : requested;
      applyTravel(Math.max(0, resisted));
      if (activeCardRef.current) activeCardRef.current.dataset.experienceReveal = "dragging";
    };
    const finishPointer = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const finishedIntent = intent;
      if (finishedIntent === "vertical") {
        root.dataset.experienceSuppressClickUntil = String(performance.now() + 240);
        const progress = currentTravelRef.current / Math.max(1, targetTravelRef.current);
        const open = event.type !== "pointercancel"
          && (progress >= OPEN_PROGRESS_THRESHOLD || verticalVelocity >= OPEN_VELOCITY_PX_PER_SECOND)
          && verticalVelocity > -OPEN_VELOCITY_PX_PER_SECOND;
        snapReveal(open);
      }
      clearGesture();
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerId === pointerId && intent === "pending") clearGesture();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isRevealBlockedTarget(event.target)) return;
      if (event.key === "ArrowUp") {
        const cards = Array.from(root.querySelectorAll<HTMLLIElement>("[data-completion-mission-id]"));
        const card = cards
          .filter((candidate) => candidate.dataset.completionMissionId === activeMissionId)
          .sort((left, right) => Math.abs(left.getBoundingClientRect().left + left.offsetWidth / 2 - root.clientWidth / 2)
            - Math.abs(right.getBoundingClientRect().left + right.offsetWidth / 2 - root.clientWidth / 2))[0];
        if (!card) return;
        event.preventDefault();
        activeCardRef.current = card;
        const experience = chooseExperience();
        targetTravelRef.current = getMissionExperienceRevealTravel(card.offsetHeight, experience?.kind ?? "empty");
        snapReveal(true);
      } else if (event.key === "ArrowDown" && sessionActiveRef.current) {
        event.preventDefault();
        resetReveal(false);
      }
    };
    const onCloseRequest = (event: Event) => {
      if (root.dataset.experienceReveal === "closed") return;
      event.preventDefault();
      resetReveal(false);
    };

    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    root.addEventListener("pointerup", finishPointer, true);
    root.addEventListener("pointercancel", finishPointer, true);
    root.addEventListener("pointerleave", onPointerLeave, true);
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("mission-experience-reveal-close", onCloseRequest);
    return () => {
      clearGesture();
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("pointermove", onPointerMove, true);
      root.removeEventListener("pointerup", finishPointer, true);
      root.removeEventListener("pointercancel", finishPointer, true);
      root.removeEventListener("pointerleave", onPointerLeave, true);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("mission-experience-reveal-close", onCloseRequest);
    };
  }, [activeMissionId, applyTravel, chooseExperience, enabled, resetReveal, rootRef, setRevealState, snapReveal]);

  useLayoutEffect(() => () => {
    clearSnapTimer();
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    const card = activeCardRef.current;
    if (card) {
      delete card.dataset.experienceReveal;
      delete card.dataset.experienceSnapping;
      card.style.removeProperty("--experience-card-y");
    }
    const root = rootRef.current;
    if (root) {
      delete root.dataset.experienceGesture;
      root.dataset.experienceReveal = "closed";
    }
  }, [clearSnapTimer, resetAudio, rootRef]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <aside
      aria-hidden={!sessionActive}
      className={styles.underlay}
      data-experience-kind={selected?.kind ?? "empty"}
      data-reveal-active={sessionActive}
      data-gallery-action
      data-reveal-open={revealOpen}
      ref={underlayRef}
    >
      <div className={styles.content}>
        {selected?.kind === "text" ? (
          <p className={styles.note} ref={textRef}>{selected.text}</p>
        ) : null}
        {selected?.kind === "audio" ? (
          <div className={styles.audioExperience}>
            <button
              aria-label={playing ? "Pause shared experience" : "Play shared experience"}
              aria-pressed={playing}
              className={styles.waveform}
              data-experience-control
              onClick={(event) => {
                event.stopPropagation();
                void togglePlayback();
              }}
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              tabIndex={revealOpen ? 0 : -1}
              type="button"
            >
              <div className={styles.waveformBars}>
                {waveform.map((height, index) => <i key={index} style={{ height: `${height * 100}%` }} />)}
              </div>
              <div className={styles.waveformPlayed} ref={waveformProgressRef}>
                <div className={styles.waveformBars}>
                  {waveform.map((height, index) => <i key={index} style={{ height: `${height * 100}%` }} />)}
                </div>
              </div>
            </button>
            <audio
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              onTimeUpdate={(event) => {
                const audio = event.currentTarget;
                const progress = Number.isFinite(audio.duration) && audio.duration > 0
                  ? audio.currentTime / audio.duration : 0;
                if (waveformProgressRef.current) waveformProgressRef.current.style.width = `${progress * 100}%`;
              }}
              preload="metadata"
              ref={audioRef}
              src={selected.signedPlaybackUrl}
            />
          </div>
        ) : null}
        {!selected ? (
          <p className={styles.empty} role={loadFailed ? "alert" : undefined}>
            {loading ? "Finding an experience…" : loadFailed
              ? "Shared experiences are unavailable right now."
              : "No one has shared anything yet."}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
