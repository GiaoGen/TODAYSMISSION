"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useSyncExternalStore, ViewTransition } from "react";
import { useRouter } from "next/navigation";

import { PackCard } from "@/components/card/PackCard";
import type { MissionSummary } from "@/data/contracts/pack-summary";
import { createDirectDayReturnState, getDayTransitionName } from "@/features/calendar/model/calendar-day-transition";
import { carouselSettingsStore } from "@/features/packs/model/carousel-settings";
import { getGalleryCopyCount } from "@/features/packs/model/mission-gallery-layout";
import {
  createDirectPackReturnState,
  getPackCarouselReturnState,
  getPackEntrySource,
  getServerPackCarouselReturnState,
  setPackCarouselReturnState,
  subscribePackCarouselReturnState,
} from "@/features/packs/model/pack-carousel-return-state";
import {
  getPackTransitionName,
  PACK_CLOSE_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";

import styles from "./MissionGallery.module.css";

const EXPANSION_SETTLE_MS = 1600;
const MOMENTUM_DAMPING = 0.94;
const MAX_SPEED = 2400;
const SNAP_SECONDS = 0.7;
const SNAP_RATE = 4.8 / SNAP_SECONDS;
const SNAP_SPRING = SNAP_RATE * SNAP_RATE;
const SNAP_DAMPING = 2 * SNAP_RATE * 0.76;

const subscribeViewport = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const getViewportWidth = () => window.innerWidth;
const getServerViewportWidth = () => 0;

type MissionCardStyle = CSSProperties & {
  "--mission-delay": string;
};

type MissionGalleryProps = {
  id: string;
  title: string;
  hero: MissionSummary;
  missions: readonly MissionSummary[];
  completedDate?: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function MissionArtwork({
  primaryCopy,
  mission,
  refIndex,
  setRef,
  slot,
}: {
  primaryCopy: boolean;
  mission: MissionSummary;
  refIndex: number;
  setRef: (index: number, element: HTMLLIElement | null) => void;
  slot: number;
}) {
  const style: MissionCardStyle = {
    "--mission-delay": `${slot * 36}ms`,
  };

  return (
    <li
      aria-hidden={primaryCopy ? undefined : true}
      className={styles.missionCard}
      ref={(element) => setRef(refIndex, element)}
      style={style}
    >
      <PackCard
        eager={primaryCopy && (slot === 0 || slot === 1)}
        pack={mission}
        sizes="(max-width: 599px) 70vw, (orientation: portrait) and (pointer: coarse) 54vw, (pointer: coarse) 34vw, 240px"
      />
    </li>
  );
}

export function MissionGallery({ id, title, hero, missions, completedDate }: MissionGalleryProps) {
  const router = useRouter();
  const entry = useSyncExternalStore(
    subscribePackCarouselReturnState,
    getPackCarouselReturnState,
    getServerPackCarouselReturnState,
  );
  const source = getPackEntrySource(id, entry);
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const missionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const missionCount = missions.length;
  const looping = completedDate === undefined;
  const viewportWidth = useSyncExternalStore(subscribeViewport, getViewportWidth, getServerViewportWidth);
  const copies = looping ? getGalleryCopyCount(missionCount, viewportWidth) : 1;
  const primaryCopy = Math.floor(copies / 2);
  const primaryCopyRef = useRef(primaryCopy);
  const measureRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    primaryCopyRef.current = primaryCopy;
    measureRef.current?.();
  }, [primaryCopy]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const cards = missionRefs.current;

    if (!root || !track || missionCount < 1) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let animationFrame = 0;
    let expandFrame = 0;
    let settleTimer = 0;
    let closeFrame = 0;
    let disposed = false;
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
    let suppressBlankClickUntil = 0;
    let interactive = false;

    root.dataset.phase = "collapsed";
    root.dataset.dragging = "false";
    root.dataset.moving = "false";
    router.prefetch("/");

    const renderTrack = () => {
      track.style.transform = `translate3d(${position}px, -50%, 0)`;
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

    const stopAnimation = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      root.dataset.moving = "false";
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

    const settleAt = (requestedTarget: number, initialVelocity = 0) => {
      stopAnimation();
      const boundedTarget = boundPosition(requestedTarget);

      if (prefersReducedMotion) {
        position = boundedTarget;
        normalizePosition();
        renderTrack();
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
        : 0;

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
      if (!interactive || event.button !== 0 || pointerId !== null) {
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
      if (!interactive || missionCount === 1) {
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
      if (interactive && event.key === "Escape") {
        event.preventDefault();
        closeGallery();
        return;
      }
      if (
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

    const navigateHome = () => {
      const savedState = getPackCarouselReturnState();

      if (savedState?.packId !== id) {
        setPackCarouselReturnState(completedDate
          ? createDirectDayReturnState(completedDate, carouselSettingsStore.read())
          : createDirectPackReturnState(id));
      }

      router.replace("/", {
        scroll: false,
        transitionTypes: [PACK_CLOSE_TRANSITION_TYPE],
      });
    };

    const onBlankClick = (event: MouseEvent) => {
      if (!interactive || performance.now() < suppressBlankClickUntil) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(`.${styles.missionCard}`)
      ) {
        return;
      }

      closeGallery();
    };

    const closeGallery = () => {
      interactive = false;
      stopAnimation();
      updateCollapsedOffsets();
      root.dataset.dragging = "false";
      root.dataset.phase = "closing";

      // Wait for the actual collapse, not a second, independently timed delay.
      // getAnimations flushes the changed styles and includes the hero's reveal.
      closeFrame = requestAnimationFrame(() => {
        const animations = root.getAnimations({ subtree: true });
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (!disposed) navigateHome();
        });
      });
    };

    measureRef.current = measure;
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

    expandFrame = requestAnimationFrame(() => {
      root.dataset.phase = "expanding";
    });
    const settleDuration = prefersReducedMotion ? 320 : EXPANSION_SETTLE_MS;
    settleTimer = window.setTimeout(() => {
      root.dataset.phase = "settled";
      interactive = true;
      root.focus({ preventScroll: true });
    }, settleDuration);

    return () => {
      disposed = true;
      measureRef.current = null;
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
  }, [missionCount, id, completedDate, looping, router]);

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
        data-single={missionCount === 1}
        ref={rootRef}
        tabIndex={0}
      >
        <ViewTransition
          default="none"
          name={completedDate ? getDayTransitionName(completedDate, source) : getPackTransitionName(id, source)}
          share={completedDate ? "calendar-day-morph" : "pack-card-morph"}
        >
          <div aria-hidden="true" className={styles.hero}>
            <PackCard eager pack={hero} />
          </div>
        </ViewTransition>

        <ol aria-label="Missions" className={styles.track} ref={trackRef}>
          {Array.from({ length: copies }, (_, copyIndex) =>
            missions.map((mission, slot) => {
              const refIndex = copyIndex * missionCount + slot;

              return (
                <MissionArtwork
                  primaryCopy={copyIndex === primaryCopy}
                  key={`${copyIndex}-${mission.id}`}
                  mission={mission}
                  refIndex={refIndex}
                  setRef={(index, element) => {
                    missionRefs.current[index] = element;
                  }}
                  slot={slot}
                />
              );
            }),
          )}
        </ol>
      </section>
    </ViewTransition>
  );
}
