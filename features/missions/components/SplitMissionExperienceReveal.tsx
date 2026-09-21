"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { MissionExperience } from "@/data/contracts/mission-experience";
import {
  getDeterministicWaveform,
  getMissionExperienceRevealTravel,
  selectMissionExperience,
} from "@/features/missions/model/mission-experience";
import {
  getMissionExperiencePool,
  type MissionExperienceScope,
} from "@/features/missions/model/mission-experience-cache";

import styles from "./SplitMissionExperienceReveal.module.css";

const GESTURE_THRESHOLD_PX = 8;
const OPEN_PROGRESS_THRESHOLD = 0.3;
const OPEN_VELOCITY_PX_PER_SECOND = 460;
const SNAP_DURATION_MS = 260;
const REDUCED_SNAP_DURATION_MS = 90;

type RevealKind = "audio" | "text";

type SplitMissionExperienceRevealProps = {
  activeMissionId: string;
  enabled: boolean;
  experienceScope: MissionExperienceScope;
  loadExperiences: (missionId: string) => Promise<
    | { ok: true; experiences: readonly MissionExperience[] }
    | { ok: false; error: string }
  >;
  rootRef: RefObject<HTMLElement | null>;
};

function isBlockedTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    "[data-preview-control], textarea, input, button, audio, [data-experience-control]",
  ));
}

export function SplitMissionExperienceReveal({
  activeMissionId,
  enabled,
  experienceScope,
  loadExperiences,
  rootRef,
}: SplitMissionExperienceRevealProps) {
  const underlayRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformProgressRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLLIElement | null>(null);
  const poolRef = useRef<readonly MissionExperience[]>([]);
  const selectedRef = useRef<MissionExperience | null>(null);
  const revealKindRef = useRef<RevealKind | null>(null);
  const currentTravelRef = useRef(0);
  const targetTravelRef = useRef(0);
  const snapTimerRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);
  const previousExperienceIdsRef = useRef(new Map<string, string>());
  const [selected, setSelected] = useState<MissionExperience | null>(null);
  const [revealKind, setRevealKind] = useState<RevealKind | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [playing, setPlaying] = useState(false);
  const waveform = useMemo(
    () => selected?.kind === "audio" ? getDeterministicWaveform(selected.id) : [],
    [selected],
  );

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = null;
  }, []);

  const resetAudio = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    if (waveformProgressRef.current) waveformProgressRef.current.style.width = "0%";
    setPlaying(false);
  }, []);

  const setRootRevealState = useCallback((state: "closed" | "dragging" | "open" | "closing") => {
    if (rootRef.current) rootRef.current.dataset.experienceReveal = state;
  }, [rootRef]);

  const applyCardTravel = useCallback((travel: number) => {
    currentTravelRef.current = travel;
    activeCardRef.current?.style.setProperty("--experience-card-y", `${travel}px`);
  }, []);

  const applyTravel = useCallback((travel: number) => {
    applyCardTravel(travel);
    const progress = Math.min(1, Math.abs(travel) / Math.max(1, targetTravelRef.current));
    underlayRef.current?.style.setProperty("--experience-progress", String(progress));
  }, [applyCardTravel]);

  const finishClosed = useCallback(() => {
    const card = activeCardRef.current;
    if (card) {
      delete card.dataset.experienceReveal;
      delete card.dataset.experienceSnapping;
      card.style.removeProperty("--experience-card-y");
    }
    activeCardRef.current = null;
    selectedRef.current = null;
    revealKindRef.current = null;
    currentTravelRef.current = 0;
    targetTravelRef.current = 0;
    sessionActiveRef.current = false;
    underlayRef.current?.style.setProperty("--experience-progress", "0");
    setSelected(null);
    setRevealKind(null);
    setRevealOpen(false);
    setSessionActive(false);
    setRootRevealState("closed");
  }, [setRootRevealState]);

  const closeReveal = useCallback((immediate: boolean) => {
    clearSnapTimer();
    resetAudio();
    const card = activeCardRef.current;
    if (!card || immediate) {
      applyTravel(0);
      finishClosed();
      return;
    }
    card.dataset.experienceSnapping = "true";
    card.dataset.experienceReveal = "closing";
    setRootRevealState("closing");
    setRevealOpen(false);
    applyCardTravel(0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    snapTimerRef.current = window.setTimeout(() => {
      finishClosed();
      snapTimerRef.current = null;
    }, reduced ? REDUCED_SNAP_DURATION_MS : SNAP_DURATION_MS);
  }, [applyCardTravel, applyTravel, clearSnapTimer, finishClosed, resetAudio, setRootRevealState]);

  const chooseExperience = useCallback((kind: RevealKind) => {
    const cacheKey = `${activeMissionId}:${kind}`;
    const candidates = poolRef.current.filter((experience) => experience.kind === kind);
    const selectedExperience = selectMissionExperience(
      candidates,
      previousExperienceIdsRef.current.get(cacheKey) ?? null,
    );
    if (selectedExperience) previousExperienceIdsRef.current.set(cacheKey, selectedExperience.id);
    selectedRef.current = selectedExperience;
    revealKindRef.current = kind;
    setSelected(selectedExperience);
    setRevealKind(kind);
    sessionActiveRef.current = true;
    setSessionActive(true);
    return selectedExperience;
  }, [activeMissionId]);

  const openReveal = useCallback((open: boolean) => {
    const card = activeCardRef.current;
    const kind = revealKindRef.current;
    if (!card || !kind) return;
    clearSnapTimer();
    card.dataset.experienceSnapping = "true";
    card.dataset.experienceReveal = open ? "opening" : "closing";
    if (!open) resetAudio();
    const direction = kind === "audio" ? 1 : -1;
    if (open) applyTravel(direction * targetTravelRef.current);
    else applyCardTravel(0);
    setRootRevealState(open ? "open" : "closing");
    setRevealOpen(open);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    snapTimerRef.current = window.setTimeout(() => {
      if (open) {
        delete card.dataset.experienceSnapping;
        card.dataset.experienceReveal = "open";
      } else {
        finishClosed();
      }
      snapTimerRef.current = null;
    }, reduced ? REDUCED_SNAP_DURATION_MS : SNAP_DURATION_MS);
  }, [applyCardTravel, applyTravel, clearSnapTimer, finishClosed, resetAudio, setRootRevealState]);

  useEffect(() => {
    poolRef.current = [];
    if (!enabled) return;
    let cancelled = false;
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      setLoadState("loading");
      void getMissionExperiencePool(activeMissionId, experienceScope, loadExperiences)
        .then((experiences) => {
          if (cancelled) return;
          poolRef.current = experiences;
          setLoadState("ready");
          const kind = revealKindRef.current;
          if (!sessionActiveRef.current || !kind || selectedRef.current) return;
          const cacheKey = `${activeMissionId}:${kind}`;
          const experience = selectMissionExperience(
            experiences.filter((candidate) => candidate.kind === kind),
            previousExperienceIdsRef.current.get(cacheKey) ?? null,
          );
          if (experience) previousExperienceIdsRef.current.set(cacheKey, experience.id);
          selectedRef.current = experience;
          setSelected(experience);
        })
        .catch(() => {
          if (!cancelled) setLoadState("failed");
        });
    };

    const requestIdle = window.requestIdleCallback;
    if (typeof requestIdle === "function") idleId = requestIdle(load, { timeout: 700 });
    else timerId = globalThis.setTimeout(load, 0);

    return () => {
      cancelled = true;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timerId !== null) globalThis.clearTimeout(timerId);
    };
  }, [activeMissionId, enabled, experienceScope, loadExperiences]);

  useLayoutEffect(() => {
    if (!sessionActive || !revealKind) return;
    const card = activeCardRef.current;
    const underlay = underlayRef.current;
    if (!card || !underlay) return;
    const measure = () => {
      const travel = getMissionExperienceRevealTravel(
        card.offsetHeight,
        revealKind,
        textRef.current?.scrollHeight ?? 0,
      );
      targetTravelRef.current = travel;
      underlay.style.setProperty("--experience-target", `${travel}px`);
      if (revealOpen) applyTravel((revealKind === "audio" ? 1 : -1) * travel);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [applyTravel, revealKind, revealOpen, selected, sessionActive]);

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
    let passedOpenThreshold = false;
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
      const card = target.closest<HTMLLIElement>("[data-experience-mission-id]");
      return card?.dataset.experienceMissionId === activeMissionId ? card : null;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || pointerId !== null || isBlockedTarget(event.target)) return;
      const card = findCard(event.target);
      if (!card || root.dataset.phase !== "settled") return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      lastY = event.clientY;
      lastTime = performance.now();
      baseTravel = currentTravelRef.current;
      verticalVelocity = 0;
      passedOpenThreshold = root.dataset.experienceReveal === "open";
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
          return;
        }
        intent = "vertical";
        root.dataset.experienceGesture = "vertical";
        setRootRevealState("dragging");
        const kind = revealKindRef.current ?? (deltaY > 0 ? "audio" : "text");
        const experience = revealKindRef.current ? selectedRef.current : chooseExperience(kind);
        targetTravelRef.current = getMissionExperienceRevealTravel(
          activeCardRef.current?.offsetHeight ?? 0,
          experience?.kind ?? kind,
        );
        underlayRef.current?.style.setProperty("--experience-target", `${targetTravelRef.current}px`);
        root.setPointerCapture(event.pointerId);
      }
      if (intent !== "vertical") return;
      event.preventDefault();
      const kind = revealKindRef.current;
      if (!kind) return;
      const now = performance.now();
      const elapsed = Math.max((now - lastTime) / 1000, 0.008);
      verticalVelocity = Math.max(-2400, Math.min(2400, (event.clientY - lastY) / elapsed));
      lastY = event.clientY;
      lastTime = now;
      const requested = baseTravel + deltaY;
      const magnitude = kind === "audio" ? Math.max(0, requested) : Math.max(0, -requested);
      const maximum = targetTravelRef.current;
      const resisted = magnitude > maximum ? maximum + (magnitude - maximum) * 0.12 : magnitude;
      applyTravel((kind === "audio" ? 1 : -1) * resisted);
      if (resisted / Math.max(1, maximum) >= OPEN_PROGRESS_THRESHOLD) {
        passedOpenThreshold = true;
      }
      if (activeCardRef.current) activeCardRef.current.dataset.experienceReveal = "dragging";
    };
    const finishPointer = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      if (intent === "vertical") {
        root.dataset.experienceSuppressClickUntil = String(performance.now() + 240);
        const progress = Math.abs(currentTravelRef.current) / Math.max(1, targetTravelRef.current);
        const directionalVelocity = revealKindRef.current === "audio" ? verticalVelocity : -verticalVelocity;
        const open = event.type !== "pointercancel"
          && (passedOpenThreshold
            || progress >= OPEN_PROGRESS_THRESHOLD
            || directionalVelocity >= OPEN_VELOCITY_PX_PER_SECOND);
        openReveal(open);
      }
      clearGesture();
    };
    const openFromKeyboard = (kind: RevealKind) => {
      const cards = Array.from(root.querySelectorAll<HTMLLIElement>("[data-experience-mission-id]"));
      const card = cards
        .filter((candidate) => candidate.dataset.experienceMissionId === activeMissionId)
        .sort((left, right) => Math.abs(left.getBoundingClientRect().left + left.offsetWidth / 2 - root.clientWidth / 2)
          - Math.abs(right.getBoundingClientRect().left + right.offsetWidth / 2 - root.clientWidth / 2))[0];
      if (!card) return;
      if (revealKindRef.current && revealKindRef.current !== kind) closeReveal(true);
      activeCardRef.current = card;
      const experience = chooseExperience(kind);
      targetTravelRef.current = getMissionExperienceRevealTravel(card.offsetHeight, experience?.kind ?? kind);
      openReveal(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isBlockedTarget(event.target)) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openFromKeyboard("audio");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openFromKeyboard("text");
      } else if (event.key === "Escape" && revealKindRef.current) {
        event.preventDefault();
        closeReveal(false);
      }
    };
    const onCloseRequest = (event: Event) => {
      if (root.dataset.experienceReveal === "closed") return;
      event.preventDefault();
      closeReveal(false);
    };

    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    root.addEventListener("pointerup", finishPointer, true);
    root.addEventListener("pointercancel", finishPointer, true);
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("mission-experience-reveal-close", onCloseRequest);
    return () => {
      clearGesture();
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("pointermove", onPointerMove, true);
      root.removeEventListener("pointerup", finishPointer, true);
      root.removeEventListener("pointercancel", finishPointer, true);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("mission-experience-reveal-close", onCloseRequest);
    };
  }, [activeMissionId, applyTravel, chooseExperience, closeReveal, enabled, openReveal, rootRef, setRootRevealState]);

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
  }, [clearSnapTimer, rootRef]);

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

  const loading = loadState === "idle" || loadState === "loading";
  const loadFailed = loadState === "failed";
  const emptyCopy = loading ? "Finding an experience…" : loadFailed
    ? "Shared experiences are unavailable right now."
    : revealKind === "audio" ? "No audio experience has been shared yet."
      : "No text experience has been shared yet.";

  return (
    <aside
      aria-hidden={!sessionActive}
      className={styles.underlay}
      data-reveal-active={sessionActive || undefined}
      data-reveal-kind={revealKind ?? undefined}
      data-reveal-open={revealOpen || undefined}
      ref={underlayRef}
    >
      <div className={styles.content}>
        {selected?.kind === "text" ? <p className={styles.note} ref={textRef}>{selected.text}</p> : null}
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
        {!selected && revealKind ? <p className={styles.empty} role={loadFailed ? "alert" : undefined}>{emptyCopy}</p> : null}
      </div>
    </aside>
  );
}
