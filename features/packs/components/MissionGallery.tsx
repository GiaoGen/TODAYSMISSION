"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useLayoutEffect, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";

import { getDeckMetrics } from "@/features/packs/model/arc-carousel-geometry";
import { useDeckViewport } from "@/features/packs/model/use-deck-viewport";
import { useSafariScroll } from "@/features/packs/model/use-safari-scroll";
import { getNativeCopyCount, isSafariUserAgent } from "@/features/packs/model/safari-scroll";
import { mountNativeMissionGallery } from "@/features/packs/model/native-mission-gallery";
import type { MissionSummary, PackSummary } from "@/data/contracts/pack-summary";
import type { MissionCompletionStatus } from "@/features/missions/model/mission-action-state";
import { CALENDAR_DAY_TRANSITION_CLASSES, createDirectDayReturnState, getDayTransitionName } from "@/features/calendar/model/calendar-day-transition";
import { carouselSettingsStore } from "@/features/packs/model/carousel-settings";
import { getGalleryCopyCount, getMissionStreamMetrics } from "@/features/packs/model/mission-gallery-layout";
import {
  createDirectPackReturnState,
  getPackCarouselReturnState,
  setPackCarouselReturnState,
} from "@/features/packs/model/pack-carousel-return-state";
import {
  getPackTransitionName,
  PACK_CLOSE_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";

import { PackDeckCover } from "./PackDeck";
import { MissionCompletionCard, MissionStreamCard } from "./MissionStreamCard";
import styles from "./MissionGallery.module.css";

const EXPANSION_SETTLE_MS = 1600;
const MOMENTUM_DAMPING = 0.94;
const MAX_SPEED = 2400;
const SNAP_SECONDS = 0.7;
const SNAP_RATE = 4.8 / SNAP_SECONDS;
const SNAP_SPRING = SNAP_RATE * SNAP_RATE;
const SNAP_DAMPING = 2 * SNAP_RATE * 0.76;

type MissionCardStyle = CSSProperties & {
  "--mission-delay": string;
};

type PackHeroStyle = CSSProperties & {
  "--deck-unit": string;
  "--deck-title-size": string;
};

type StreamStyle = CSSProperties & {
  "--pack-hero-width": string;
  "--mission-card-width": string;
  "--detail-gap": string;
  "--stream-unit": string;
  "--stream-mobile-unit": string;
  "--stream-collapse-scale": number;
};

type MissionGalleryProps = {
  id: string;
  title: string;
  hero: MissionSummary | PackSummary;
  missions: readonly MissionSummary[];
  completedDate?: string;
  initialMissionId?: string;
  expandMissions?: boolean;
  interactionLocked?: boolean;
  completedMissionCount?: number;
  completionMotionRef?: RefObject<MissionCompletionMotionHandle | null>;
  missionCompletionStatuses?: Readonly<Record<string, MissionCompletionStatus>>;
  missionAction?: ReactNode;
  waitingAction?: ReactNode;
  onExpansionSettled?: () => void;
  onActiveMissionChange?: (missionId: string) => void;
  onSelectNextReady?: (selectNext: (() => Promise<boolean>) | null) => void;
  onInteractionLockReady?: (setLocked: ((locked: boolean) => void) | null) => void;
};

export type MissionCompletionMotionHandle = {
  setProgress: (missionId: string, progress: number) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isPackSummary(hero: MissionSummary | PackSummary): hero is PackSummary {
  return "designKey" in hero;
}

function MissionArtwork({
  completed,
  primaryCopy,
  mission,
  refIndex,
  setRef,
  slot,
  dayTransitionName,
}: {
  completed: boolean;
  primaryCopy: boolean;
  mission: MissionSummary;
  refIndex: number;
  setRef: (index: number, element: HTMLLIElement | null) => void;
  slot: number;
  dayTransitionName?: string;
}) {
  const style: MissionCardStyle = {
    "--mission-delay": `${slot * 36}ms`,
  };
  const artwork = (
    <div className={styles.cardFaces}>
      <MissionStreamCard mission={mission} number={slot + 1} />
      <div aria-hidden={!completed} className={styles.completionFace}>
        <MissionCompletionCard mission={mission} number={slot + 1} />
      </div>
    </div>
  );

  return (
    <li
      aria-hidden={primaryCopy ? undefined : true}
      className={styles.missionCard}
      data-completion-state={completed ? "completed" : "incomplete"}
      data-completion-mission-id={mission.id}
      ref={(element) => setRef(refIndex, element)}
      style={style}
    >
      <div className={styles.missionMotion}>
        {dayTransitionName ? (
          <ViewTransition default="none" name={dayTransitionName} share={CALENDAR_DAY_TRANSITION_CLASSES}>
            {artwork}
          </ViewTransition>
        ) : artwork}
      </div>
    </li>
  );
}

export function MissionGallery({
  id,
  title,
  hero,
  missions,
  completedDate,
  initialMissionId,
  expandMissions = true,
  interactionLocked = false,
  completedMissionCount,
  completionMotionRef,
  missionCompletionStatuses,
  missionAction,
  waitingAction,
  onExpansionSettled,
  onActiveMissionChange,
  onSelectNextReady,
  onInteractionLockReady,
}: MissionGalleryProps) {
  const router = useRouter();
  const nativeScrolling = useSafariScroll();
  const source = completedDate ? "top" : "bottom";
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const missionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const missionCount = missions.length;
  const looping = completedDate === undefined;
  const initialMissionIndex = initialMissionId
    ? Math.max(0, missions.findIndex((mission) => mission.id === initialMissionId))
    : 0;
  const liveViewport = useDeckViewport();
  const [stableViewport, setStableViewport] = useState(liveViewport);
  const viewport = nativeScrolling ? stableViewport : liveViewport;
  const nativeIdleRef = useRef<((work: () => void) => void) | null>(null);
  const viewportWidth = viewport.width;
  const deckMetrics = getDeckMetrics(viewport);
  const streamMetrics = getMissionStreamMetrics(viewport);
  const streamStyle: StreamStyle = {
    "--pack-hero-width": `${deckMetrics.cardWidth}px`,
    "--mission-card-width": `${streamMetrics.cardWidth}px`,
    "--detail-gap": `${streamMetrics.gap}px`,
    "--stream-unit": `${streamMetrics.unit}px`,
    "--stream-mobile-unit": `${streamMetrics.mobileUnit}px`,
    "--stream-collapse-scale": completedDate ? 1 : deckMetrics.cardWidth / streamMetrics.cardWidth,
  };
  const heroStyle: PackHeroStyle = {
    width: deckMetrics.cardWidth,
    aspectRatio: "1 / 1.42",
    "--deck-unit": `${deckMetrics.unit}px`,
    "--deck-title-size": `${deckMetrics.titleSize}px`,
  };
  const copies = nativeScrolling ? getNativeCopyCount(missionCount, viewportWidth, streamMetrics.stride, looping)
    : looping ? getGalleryCopyCount(missionCount, viewportWidth, streamMetrics.stride) : 1;
  const primaryCopy = Math.floor(copies / 2);
  const primaryCopyRef = useRef(primaryCopy);
  const initialMissionIndexRef = useRef(initialMissionIndex);
  const measureRef = useRef<(() => void) | null>(null);
  const missionIdsRef = useRef(missions.map((mission) => mission.id));
  const onActiveMissionChangeRef = useRef(onActiveMissionChange);
  const onExpansionSettledRef = useRef(onExpansionSettled);
  const onSelectNextReadyRef = useRef(onSelectNextReady);
  const activeMissionIdRef = useRef<string | null>(null);
  const expansionRequestedRef = useRef(expandMissions);
  const requestExpansionRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    missionIdsRef.current = missions.map((mission) => mission.id);
    onActiveMissionChangeRef.current = onActiveMissionChange;
    onExpansionSettledRef.current = onExpansionSettled;
    onSelectNextReadyRef.current = onSelectNextReady;
  }, [missions, onActiveMissionChange, onExpansionSettled, onSelectNextReady]);

  useLayoutEffect(() => {
    expansionRequestedRef.current = expandMissions;
    if (expandMissions) requestExpansionRef.current?.();
  }, [expandMissions]);

  useLayoutEffect(() => {
    primaryCopyRef.current = primaryCopy;
    measureRef.current?.();
  }, [primaryCopy, streamMetrics.cardWidth, streamMetrics.gap]);

  useLayoutEffect(() => {
    if (!completionMotionRef) return;

    const handle: MissionCompletionMotionHandle = {
      setProgress: (missionId, value) => {
        const progress = clamp(value, 0, 1);
        for (const card of missionRefs.current) {
          if (!card || card.dataset.completionMissionId !== missionId) continue;
          card.dataset.completionActive = progress > 0 ? "true" : "false";
          card.style.setProperty("--completion-card-y", `${(progress - 1) * 100}%`);
        }
      },
    };
    completionMotionRef.current = handle;

    return () => {
      if (completionMotionRef.current === handle) completionMotionRef.current = null;
    };
  }, [completionMotionRef]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const cards = missionRefs.current;

    if (!root || !track || missionCount < 1) {
      return;
    }
    // Hydration starts from the server snapshot. Wait for the Safari mode
    // before attaching any driver; never briefly install Chrome's handlers.
    if (!nativeScrolling && isSafariUserAgent(window.navigator?.userAgent ?? "")) return;

    const notifyActiveMission = (index: number) => {
      const missionId = missionIdsRef.current[index];
      if (!missionId || activeMissionIdRef.current === missionId) return;
      activeMissionIdRef.current = missionId;
      onActiveMissionChangeRef.current?.(missionId);
    };

    const navigateHome = () => {
      const savedState = getPackCarouselReturnState();
      if (savedState?.packId !== id) {
        setPackCarouselReturnState(completedDate
          ? createDirectDayReturnState(completedDate, carouselSettingsStore.read())
          : createDirectPackReturnState(id));
      }
      router.replace("/", { scroll: false, transitionTypes: [PACK_CLOSE_TRANSITION_TYPE] });
    };
    if (nativeScrolling && scrollRef.current) {
      // No transform-driver listeners or RAF loops are mounted in this mode.
      router.prefetch("/");
      const native = mountNativeMissionGallery({
        root, viewport: scrollRef.current, cards, count: missionCount,
        copies: () => 2 * primaryCopyRef.current + 1,
        initialPosition: initialMissionIndexRef.current,
        cardClass: styles.missionCard, navigateHome, autoExpand: false,
        onExpansionSettled: () => onExpansionSettledRef.current?.(),
        onActiveMissionChange: notifyActiveMission,
      });
      measureRef.current = native.measure;
      nativeIdleRef.current = native.whenIdle;
      onInteractionLockReady?.(native.setInteractionLocked);
      requestExpansionRef.current = native.expand;
      onSelectNextReadyRef.current?.(native.selectNext);
      if (expansionRequestedRef.current) native.expand();
      return () => {
        measureRef.current = null;
        nativeIdleRef.current = null;
        requestExpansionRef.current = null;
        onInteractionLockReady?.(null);
        onSelectNextReadyRef.current?.(null);
        native.destroy();
      };
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let animationFrame = 0;
    let expandFrame = 0;
    let settleTimer = 0;
    let closeFrame = 0;
    let disposed = false;
    let expansionStarted = false;
    let cycleWidth = 0;
    let stride = 0;
    let origin = 0;
    let position = 0;
    let dragPosition = 0;
    let pointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let pointerVelocity = 0;
    let pointerTravel = 0;
    let pointerCaptured = false;
    let nextSelectionResolve: ((selected: boolean) => void) | null = null;
    let suppressBlankClickUntil = 0;
    let interactive = false;
    let interactionLocked = root.dataset.interactionLocked === "true";

    root.dataset.phase = "collapsed";
    root.dataset.dragging = "false";
    root.dataset.moving = "false";
    router.prefetch("/");

    const renderTrack = () => {
      track.style.transform = `translate3d(${position}px, -50%, 0)`;
      const center = stride ? missionCount * primaryCopyRef.current + Math.round((origin - position) / stride) : 0;
      const activeIndex = missionCount > 0 ? ((center % missionCount) + missionCount) % missionCount : -1;
      notifyActiveMission(activeIndex);
    };

    const normalizePosition = () => {
      if (!looping || cycleWidth <= 0) {
        return 0;
      }

      let wrappedBy = 0;
      const halfCycle = cycleWidth / 2;

      while (position - origin > halfCycle) {
        position -= cycleWidth;
        wrappedBy -= cycleWidth;
      }

      while (position - origin < -halfCycle) {
        position += cycleWidth;
        wrappedBy += cycleWidth;
      }

      return wrappedBy;
    };

    const finishNextSelection = (selected: boolean) => {
      nextSelectionResolve?.(selected);
      nextSelectionResolve = null;
    };

    const stopAnimation = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      root.dataset.moving = "false";
      finishNextSelection(false);
    };

    const boundPosition = (value: number) => looping ? value
      : clamp(value, origin - (missionCount - 1) * stride, origin);
    const resistPosition = (value: number) => {
      const bounded = boundPosition(value);
      const excess = value - bounded;
      const limit = Math.min(80, stride * .22);
      return limit > 0 ? bounded + excess / (1 + Math.abs(excess) / limit) : bounded;
    };
    const nearestSnap = (value: number) => stride > 0
      ? boundPosition(origin + Math.round((value - origin) / stride) * stride) : origin;

    const setInteractionLocked = (locked: boolean) => {
      if (disposed) return;
      interactionLocked = locked;
      root.dataset.interactionLocked = String(locked);
      if (!locked) return;

      stopAnimation();
      const activePointer = pointerId;
      pointerId = null;
      pointerCaptured = false;
      pointerVelocity = 0;
      pointerTravel = 0;
      if (activePointer !== null && root.hasPointerCapture(activePointer)) {
        root.releasePointerCapture(activePointer);
      }
      position = nearestSnap(position);
      normalizePosition();
      dragPosition = position;
      root.dataset.dragging = "false";
      root.dataset.moving = "false";
      renderTrack();
      updateCollapsedOffsets();
    };

    const settleAt = (
      requestedTarget: number,
      initialVelocity = 0,
      onSettled?: (selected: boolean) => void,
    ) => {
      stopAnimation();
      nextSelectionResolve = onSettled ?? null;
      const boundedTarget = boundPosition(requestedTarget);

      if (prefersReducedMotion) {
        position = boundedTarget;
        normalizePosition();
        renderTrack();
        finishNextSelection(true);
        return;
      }

      root.dataset.moving = "true";
      let target = boundedTarget;
      let velocity = clamp(initialVelocity, -MAX_SPEED, MAX_SPEED);
      let previousTime = performance.now();

      const tick = (time: number) => {
        const deltaSeconds = Math.min((time - previousTime) / 1000, 0.034);
        previousTime = time;
        const offset = target - position;

        velocity += offset * SNAP_SPRING * deltaSeconds;
        velocity *= Math.exp(-SNAP_DAMPING * deltaSeconds);
        position += velocity * deltaSeconds;

        const wrappedBy = normalizePosition();
        target += wrappedBy;
        renderTrack();

        if (Math.abs(target - position) < 0.25 && Math.abs(velocity) < 2) {
          position = target;
          normalizePosition();
          renderTrack();
          animationFrame = 0;
          root.dataset.moving = "false";
          finishNextSelection(true);
          return;
        }

        animationFrame = requestAnimationFrame(tick);
      };

      animationFrame = requestAnimationFrame(tick);
    };

    const releaseWithMomentum = (releasedVelocity: number) => {
      if (prefersReducedMotion || position !== boundPosition(position)) {
        settleAt(nearestSnap(position));
        return;
      }

      stopAnimation();
      root.dataset.moving = "true";
      let velocity = clamp(releasedVelocity, -MAX_SPEED, MAX_SPEED);
      let previousTime = performance.now();

      const coast = (time: number) => {
        const deltaSeconds = Math.min((time - previousTime) / 1000, 0.034);
        previousTime = time;
        position += velocity * deltaSeconds;
        if (position !== boundPosition(position)) {
          position = resistPosition(position);
          renderTrack();
          settleAt(nearestSnap(position));
          return;
        }
        normalizePosition();
        renderTrack();
        velocity *= Math.pow(MOMENTUM_DAMPING, deltaSeconds * 60);

        if (Math.abs(velocity) < 70) {
          const decayPerSecond = -Math.log(MOMENTUM_DAMPING) * 60;
          const projected = position + velocity / decayPerSecond;
          settleAt(nearestSnap(projected), velocity);
          return;
        }

        animationFrame = requestAnimationFrame(coast);
      };

      animationFrame = requestAnimationFrame(coast);
    };

    const updateCollapsedOffsets = () => {
      const heroCenterInTrack = root.clientWidth / 2 - position;
      const offsets = cards.map((card) => card
        ? { card, x: heroCenterInTrack - card.offsetLeft - card.offsetWidth / 2 }
        : null);

      for (const offset of offsets) {
        if (offset) {
          offset.card.style.setProperty("--mission-collapsed-x", `${offset.x}px`);
        }
      }
    };

    const measure = () => {
      if (root.dataset.phase === "closing") return;
      if (interactive) {
        stopAnimation();
        const activePointer = pointerId;
        pointerId = null;
        pointerCaptured = false;
        if (activePointer !== null && root.hasPointerCapture(activePointer)) {
          root.releasePointerCapture(activePointer);
          suppressBlankClickUntil = performance.now() + 160;
        }
        root.dataset.dragging = "false";
      }
      if (missionCount === 1) {
        const card = cards[0];
        if (!card) return;
        stride = 0;
        cycleWidth = 0;
        origin = root.clientWidth / 2 - card.offsetLeft - card.offsetWidth / 2;
        position = origin;
        renderTrack();
        updateCollapsedOffsets();
        return;
      }
      const middleStart = missionCount * primaryCopyRef.current;
      const middleFirst = cards[middleStart];
      const middleSecond = cards[middleStart + 1];
      const rightFirst = cards[middleStart + missionCount];

      if (!middleFirst || !middleSecond || (looping && !rightFirst)) {
        return;
      }

      const previousStride = stride;
      const previousOrigin = origin;
      const slotOffset = previousStride
        ? (position - previousOrigin) / previousStride
        : -initialMissionIndexRef.current;

      stride = middleSecond.offsetLeft - middleFirst.offsetLeft;
      cycleWidth = looping && rightFirst ? rightFirst.offsetLeft - middleFirst.offsetLeft : 0;
      const firstMissionCenter = middleFirst.offsetLeft + middleFirst.offsetWidth / 2;
      origin = root.clientWidth / 2 - firstMissionCenter;
      position = boundPosition(origin + slotOffset * stride);
      normalizePosition();
      renderTrack();
      updateCollapsedOffsets();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-gallery-action]")) return;
      if (
        interactionLocked || root.dataset.interactionLocked === "true" ||
        !interactive ||
        event.button !== 0 ||
        pointerId !== null
      ) {
        return;
      }

      stopAnimation();
      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerTime = performance.now();
      pointerVelocity = 0;
      pointerTravel = 0;
      pointerCaptured = false;
      dragPosition = position;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      if (interactionLocked) return;

      const now = performance.now();
      const elapsedSeconds = Math.max((now - lastPointerTime) / 1000, 0.008);
      const deltaX = event.clientX - lastPointerX;
      pointerTravel += Math.abs(deltaX);
      lastPointerX = event.clientX;
      lastPointerTime = now;
      if (!pointerCaptured && pointerTravel <= 5) return;
      if (!pointerCaptured) {
        pointerCaptured = true;
        root.dataset.dragging = "true";
        root.setPointerCapture(event.pointerId);
      }
      if (missionCount === 1) return;
      dragPosition += deltaX;
      position = looping ? position + deltaX : resistPosition(dragPosition);
      pointerVelocity = clamp(deltaX / elapsedSeconds, -MAX_SPEED, MAX_SPEED);
      normalizePosition();
      renderTrack();
    };

    const finishPointer = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) {
        return;
      }

      const wasCaptured = pointerCaptured;
      pointerId = null;
      pointerCaptured = false;
      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }

      root.dataset.dragging = "false";
      if (wasCaptured || event.type === "pointercancel") {
        suppressBlankClickUntil = performance.now() + 160;
      }
      if (!wasCaptured || missionCount === 1) return;
      const releaseVelocity = event.type === "pointercancel" || performance.now() - lastPointerTime > 80
        ? 0
        : pointerVelocity;
      releaseWithMomentum(releaseVelocity);
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (!pointerCaptured) finishPointer(event);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-gallery-action]")) return;
      if (
        interactionLocked || root.dataset.interactionLocked === "true" ||
        !interactive ||
        missionCount === 1
      ) {
        return;
      }

      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      const velocity = clamp(-delta * 12, -MAX_SPEED, MAX_SPEED);

      position = resistPosition(position - delta);
      normalizePosition();
      renderTrack();

      if (prefersReducedMotion) {
        settleAt(nearestSnap(position));
        return;
      }

      releaseWithMomentum(velocity);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-gallery-action]")) return;
      if ((interactive || !expansionStarted) && event.key === "Escape") {
        event.preventDefault();
        closeGallery();
        return;
      }
      if (
        interactionLocked || root.dataset.interactionLocked === "true" ||
        !interactive ||
        missionCount === 1 ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      ) {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? -1 : 1;
      settleAt(nearestSnap(position) + direction * stride);
    };

    const onBlankClick = (event: MouseEvent) => {
      if ((!interactive && expansionStarted) || performance.now() < suppressBlankClickUntil) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest(`.${styles.missionCard}`) || target.closest("[data-gallery-action]"))
      ) {
        return;
      }

      closeGallery();
    };

    const closeGallery = () => {
      if (root.dataset.phase === "closing" || (expansionStarted && !interactive)) return;
      interactive = false;
      stopAnimation();
      updateCollapsedOffsets();
      root.dataset.dragging = "false";
      root.dataset.phase = "closing";

      // Wait for the actual collapse, not a second, independently timed delay.
      // getAnimations flushes the changed styles, including the shared card.
      closeFrame = requestAnimationFrame(() => {
        const animations = root.getAnimations({ subtree: true });
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (!disposed) navigateHome();
        });
      });
    };

    const selectNext = (): Promise<boolean> => new Promise((resolve) => {
      if (interactionLocked || root.dataset.interactionLocked === "true" || !interactive || missionCount <= 1 || pointerId !== null || root.dataset.moving === "true") {
        resolve(false);
        return;
      }
      settleAt(nearestSnap(position) - stride, 0, resolve);
    });

    measureRef.current = measure;
    onInteractionLockReady?.(setInteractionLocked);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", finishPointer);
    root.addEventListener("pointercancel", finishPointer);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("click", onBlankClick);

    const finishExpansion = () => {
      if (disposed) return;
      root.dataset.phase = "settled";
      interactive = true;
      root.focus({ preventScroll: true });
      onExpansionSettledRef.current?.();
    };
    const startExpansion = () => {
      if (disposed || expansionStarted || root.dataset.phase === "closing") return;
      expansionStarted = true;
      expandFrame = requestAnimationFrame(() => {
        // Flush the measured starting pose before starting the day's transitions.
        if (completedDate) root.getAnimations({ subtree: true });
        root.dataset.phase = "expanding";
        if (completedDate) {
          void Promise.allSettled(root.getAnimations({ subtree: true }).map(animation => animation.finished))
            .then(finishExpansion);
        }
      });
      if (!completedDate) {
        settleTimer = window.setTimeout(finishExpansion, prefersReducedMotion ? 320 : EXPANSION_SETTLE_MS);
      }
    };
    requestExpansionRef.current = startExpansion;
    onSelectNextReadyRef.current?.(selectNext);
    if (expansionRequestedRef.current) startExpansion();

    return () => {
      disposed = true;
      measureRef.current = null;
      onInteractionLockReady?.(null);
      requestExpansionRef.current = null;
      onSelectNextReadyRef.current?.(null);
      observer.disconnect();
      stopAnimation();
      cancelAnimationFrame(expandFrame);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(closeFrame);
      if (pointerId !== null && root.hasPointerCapture(pointerId)) {
        root.releasePointerCapture(pointerId);
      }
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", finishPointer);
      root.removeEventListener("pointercancel", finishPointer);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("click", onBlankClick);
    };
  }, [missionCount, id, completedDate, looping, router, nativeScrolling, onInteractionLockReady]);

  useLayoutEffect(() => {
    if (!nativeScrolling || (liveViewport.width === stableViewport.width && liveViewport.height === stableViewport.height && liveViewport.coarsePointer === stableViewport.coarsePointer)) return;
    nativeIdleRef.current?.(() => { setStableViewport(liveViewport); });
  }, [nativeScrolling, liveViewport, stableViewport]);

  return (
    <ViewTransition
      default="none"
      exit={{
        [PACK_CLOSE_TRANSITION_TYPE]: "pack-detail-exit",
        default: "none",
      }}
    >
      <section
        aria-label={title}
        className={styles.root}
        data-dragging="false"
        data-moving="false"
        data-phase="collapsed"
        data-kind={completedDate ? "day" : "pack"}
        data-interaction-locked={interactionLocked}
        data-native-scroll={nativeScrolling}
        data-single={missionCount === 1}
        style={streamStyle}
        ref={rootRef}
        tabIndex={0}
      >
        {!completedDate && isPackSummary(hero) && (
          <ViewTransition default="none" name={getPackTransitionName(id, source)} share="pack-card-morph">
            <div aria-hidden="true" className={styles.hero} style={heroStyle}>
              <PackDeckCover pack={hero} />
            </div>
          </ViewTransition>
        )}

        {!completedDate && waitingAction ? (
          <div className={styles.waitingAction} data-gallery-action>
            {waitingAction}
          </div>
        ) : null}

        {!completedDate && completedMissionCount !== undefined ? (
          <p
            aria-label={`${completedMissionCount} of ${missionCount} missions completed`}
            className={styles.packProgress}
          >
            {completedMissionCount}/{missionCount}
          </p>
        ) : null}

        <div className={styles.scrollViewport} ref={scrollRef}>
          <ol aria-label="Missions" className={styles.track} ref={trackRef}>
          {Array.from({ length: copies }, (_, copyIndex) =>
            missions.map((mission, slot) => {
              const refIndex = copyIndex * missionCount + slot;

              return (
                <MissionArtwork
                  completed={completedDate !== undefined || missionCompletionStatuses?.[mission.id] === "completed"}
                  primaryCopy={copyIndex === primaryCopy}
                  key={`${copyIndex}-${mission.id}`}
                  mission={mission}
                  refIndex={refIndex}
                  setRef={(index, element) => {
                    missionRefs.current[index] = element;
                  }}
                  slot={slot}
                  dayTransitionName={completedDate && slot === 0 ? getDayTransitionName(completedDate, source) : undefined}
                />
              );
            }),
          )}
          </ol>
        </div>
        {missionAction ? <div data-gallery-action>{missionAction}</div> : null}
      </section>
    </ViewTransition>
  );
}
