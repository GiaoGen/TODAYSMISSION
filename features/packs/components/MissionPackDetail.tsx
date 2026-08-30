"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useSyncExternalStore, ViewTransition } from "react";
import { useRouter } from "next/navigation";

import { PackCard } from "@/components/card/PackCard";
import type { MissionSummary, PackDetail } from "@/data/contracts/pack-summary";
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

import styles from "./MissionPackDetail.module.css";

const COPY_COUNT = 3;
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

type MissionPackDetailProps = {
  pack: PackDetail;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function MissionArtwork({
  copyIndex,
  mission,
  refIndex,
  setRef,
  slot,
}: {
  copyIndex: number;
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
      aria-hidden={copyIndex === 1 ? undefined : true}
      className={styles.missionCard}
      ref={(element) => setRef(refIndex, element)}
      style={style}
    >
      <PackCard
        eager={copyIndex === 1 && (slot === 0 || slot === 1)}
        pack={mission}
        sizes="(max-width: 599px) 70vw, (orientation: portrait) and (pointer: coarse) 54vw, (pointer: coarse) 34vw, 240px"
      />
    </li>
  );
}

export function MissionPackDetail({ pack }: MissionPackDetailProps) {
  const router = useRouter();
  const entry = useSyncExternalStore(
    subscribePackCarouselReturnState,
    getPackCarouselReturnState,
    getServerPackCarouselReturnState,
  );
  const source = getPackEntrySource(pack.id, entry);
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const missionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const missionCount = pack.missions.length;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const cards = missionRefs.current;

    if (!root || !track || missionCount < 2) {
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
      if (cycleWidth <= 0) {
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

    const nearestSnap = (value: number) =>
      origin + Math.round((value - origin) / stride) * stride;

    const settleAt = (requestedTarget: number, initialVelocity = 0) => {
      stopAnimation();

      if (prefersReducedMotion) {
        position = requestedTarget;
        normalizePosition();
        renderTrack();
        return;
      }

      root.dataset.moving = "true";
      let target = requestedTarget;
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
      if (prefersReducedMotion) {
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
      const middleFirst = cards[missionCount];
      const middleSecond = cards[missionCount + 1];
      const rightFirst = cards[missionCount * 2];

      if (!middleFirst || !middleSecond || !rightFirst) {
        return;
      }

      const previousStride = stride;
      const previousOrigin = origin;
      const slotOffset = previousStride
        ? (position - previousOrigin) / previousStride
        : 0;

      stride = middleSecond.offsetLeft - middleFirst.offsetLeft;
      cycleWidth = rightFirst.offsetLeft - middleFirst.offsetLeft;
      const firstMissionCenter = middleFirst.offsetLeft + middleFirst.offsetWidth / 2;
      origin = root.clientWidth / 2 - firstMissionCenter;
      position = origin + slotOffset * stride;
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
      position += deltaX;
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
      if (!wasCaptured) return;
      const releaseVelocity = event.type === "pointercancel" || performance.now() - lastPointerTime > 80
        ? 0
        : pointerVelocity;
      releaseWithMomentum(releaseVelocity);
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (!pointerCaptured) finishPointer(event);
    };

    const onWheel = (event: WheelEvent) => {
      if (!interactive) {
        return;
      }

      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      const velocity = clamp(-delta * 12, -MAX_SPEED, MAX_SPEED);

      position -= delta;
      normalizePosition();
      renderTrack();

      if (prefersReducedMotion) {
        settleAt(nearestSnap(position));
        return;
      }

      releaseWithMomentum(velocity);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !interactive ||
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

      if (savedState?.packId !== pack.id) {
        setPackCarouselReturnState(createDirectPackReturnState(pack.id));
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
    }, settleDuration);

    return () => {
      disposed = true;
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
  }, [missionCount, pack.id, router, source]);

  return (
    <ViewTransition
      default="none"
      exit={{
        [PACK_CLOSE_TRANSITION_TYPE]: "pack-detail-exit",
        default: "none",
      }}
    >
      <section
        aria-label={pack.title}
        className={styles.root}
        data-dragging="false"
        data-moving="false"
        data-phase="collapsed"
        ref={rootRef}
        tabIndex={0}
      >
        <ViewTransition
          default="none"
          name={getPackTransitionName(pack.id, source)}
          share="pack-card-morph"
        >
          <div className={styles.hero}>
            <PackCard eager pack={pack} />
          </div>
        </ViewTransition>

        <ol aria-label="Missions" className={styles.track} ref={trackRef}>
          {Array.from({ length: COPY_COUNT }, (_, copyIndex) =>
            pack.missions.map((mission, slot) => {
              const refIndex = copyIndex * missionCount + slot;

              return (
                <MissionArtwork
                  copyIndex={copyIndex}
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
