"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from "react";
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";

import type { PackSummary } from "@/data/contracts/pack-summary";
import {
  getActiveIndex, getDeckMetrics, getRelativeSlot, getSnapTarget, getContinuousDeckPose, resistDeckPosition,
  DECK_DRAG_SENSITIVITY, DECK_MAX_VELOCITY, DECK_INERTIA_SECONDS,
  type CarouselPlacement,
} from "@/features/packs/model/arc-carousel-geometry";
import { advanceCarouselSpring } from "@/features/packs/model/carousel-spring";
import { useDeckViewport } from "@/features/packs/model/use-deck-viewport";
import { useSafariScroll } from "@/features/packs/model/use-safari-scroll";
import { NativePackCarousel } from "./NativePackCarousel";
import {
  getPackCarouselReturnState, getInitialCarouselState, type InitialCarouselState,
} from "@/features/packs/model/pack-carousel-return-state";
import { COLLECTION_LABELS, type PackCollection } from "@/features/packs/model/home-carousel-state";
import type { CarouselHandle } from "@/features/packs/model/carousel-handle";
import {
  getPackTransitionName, PACK_CLOSE_TRANSITION_TYPE, PACK_OPEN_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";
import { PackDeck } from "./PackDeck";

import styles from "./ArcCarousel.module.css";

const MIN_COUNT = 1;
const MAX_COUNT = 24;
const DRAG_CAPTURE_THRESHOLD = 5;

export type ArcCarouselProps = {
  packs: readonly PackSummary[];
  placement?: CarouselPlacement;
  collection?: PackCollection;
  initialCarouselState?: InitialCarouselState;
  interactionDisabled?: boolean;
  swappingIn?: boolean;
  onOpenPack: (pack: PackSummary, placement: CarouselPlacement) => void;
  ref?: Ref<ArcCarouselHandle>;
};

export type ArcCarouselHandle = CarouselHandle;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startPosition: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  captured: boolean;
};

type DeckStageStyle = CSSProperties & {
  "--card-width": string;
  "--card-height": string;
  "--deck-center-y": string;
  "--deck-unit": string;
  "--deck-title-size": string;
};

export function ArcCarousel(props: ArcCarouselProps) {
  const nativeScrolling = useSafariScroll();
  return nativeScrolling ? <NativePackCarousel {...props} /> : <TransformArcCarousel {...props} />;
}

export function TransformArcCarousel({
  packs,
  placement = "bottom",
  collection = placement === "top" ? "joined" : "all",
  initialCarouselState,
  interactionDisabled = false,
  swappingIn = false,
  onOpenPack,
  ref,
}: ArcCarouselProps) {
  const router = useRouter();
  const maximumCount = Math.min(MAX_COUNT, packs.length);
  const [selection, setSelection] = useState(() => {
    const initial = initialCarouselState ?? getInitialCarouselState(packs, maximumCount, placement, getPackCarouselReturnState());
    return { count: initial.count, activeIndex: getActiveIndex(initial.position, initial.count), position: initial.position };
  });
  const selectionRef = useRef(selection);
  const positionRef = useRef(selection.position);
  const { count, activeIndex } = selection;
  const viewport = useDeckViewport();
  const { width, height, coarsePointer } = viewport;
  const metrics = useMemo(() => getDeckMetrics({ width, height, coarsePointer, placement }), [width, height, coarsePointer, placement]);
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragRef = useRef<DragState | null>(null);
  const navigationLockRef = useRef(interactionDisabled);
  const frameRef = useRef<number | null>(null);
  const movingRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const visiblePacks = packs.slice(0, count);

  const finishMotion = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    movingRef.current = false;
    if (stageRef.current) stageRef.current.dataset.moving = "false";
  }, []);

  const paint = useCallback(() => {
    const current = selectionRef.current;
    cardRefs.current.forEach((card, index) => {
      if (!card || index >= current.count) return;
      const pose = getContinuousDeckPose(getRelativeSlot(index, positionRef.current, current.count), metrics);
      card.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotation}deg) scale(${pose.scale})`;
      card.style.opacity = String(pose.opacity);
      card.style.zIndex = String(pose.zIndex);
      card.style.pointerEvents = pose.visible ? "auto" : "none";
      card.setAttribute("aria-hidden", String(!pose.visible));
      card.tabIndex = pose.visible ? 0 : -1;
    });
  }, [metrics]);

  const moveTo = useCallback((position: number) => {
    positionRef.current = position;
    const current = selectionRef.current;
    const activeIndex = getActiveIndex(position, current.count);
    // Only a centered-card change updates React. Frames write transforms directly.
    if (activeIndex !== current.activeIndex) {
      const next = { ...current, activeIndex, position };
      selectionRef.current = next;
      setSelection(next);
    }
    paint();
  }, [paint]);

  const settle = useCallback((velocity = 0, requestedTarget?: number) => {
    finishMotion();
    const count = selectionRef.current.count;
    const speed = Math.max(-DECK_MAX_VELOCITY, Math.min(DECK_MAX_VELOCITY, velocity));
    const target = getSnapTarget(requestedTarget ?? positionRef.current + speed * DECK_INERTIA_SECONDS, count);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || (Math.abs(target - positionRef.current) < 0.001 && Math.abs(speed) < 0.01)) {
      moveTo(target);
      return;
    }
    movingRef.current = true;
    if (stageRef.current) stageRef.current.dataset.moving = "true";
    let lastTime = performance.now();
    let currentVelocity = speed;
    const tick = (time: number) => {
      const seconds = Math.min(0.034, Math.max(0.001, (time - lastTime) / 1000));
      lastTime = time;
      const next = advanceCarouselSpring(positionRef.current, currentVelocity, target, seconds);
      currentVelocity = next.velocity;
      moveTo(next.position);
      if (Math.abs(target - next.position) < 0.001 && Math.abs(currentVelocity) < 0.01) {
        moveTo(target);
        finishMotion();
      } else frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [finishMotion, moveTo]);

  const cancelDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && stageRef.current?.hasPointerCapture(drag.pointerId)) {
      stageRef.current.releasePointerCapture(drag.pointerId);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    freezeAndSnapshot() {
      navigationLockRef.current = true;
      cancelDrag();
      // Freeze only our RAF, never route/pair animations or the other wheel.
      finishMotion();
      const current = selectionRef.current;
      const pack = current.count > 0 ? packs[current.activeIndex] : null;
      return pack ? { ...current, packId: pack.id, position: positionRef.current } : null;
    },
    resume() { navigationLockRef.current = false; settle(); },
    getElement: () => rootRef.current,
  }), [cancelDrag, finishMotion, packs, settle]);

  // React may commit a new active fan while the spring keeps moving. Reapply
  // its latest pose before paint, including fractional route-return snapshots.
  useLayoutEffect(() => { paint(); });

  useEffect(() => {
    const interrupted = () => {
      if (dragRef.current) suppressClickUntilRef.current = performance.now() + 400;
      cancelDrag();
      finishMotion();
      moveTo(getSnapTarget(positionRef.current, selectionRef.current.count));
    };
    window.addEventListener("blur", interrupted);
    window.addEventListener("resize", interrupted);
    const visibility = () => { if (document.hidden) interrupted(); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", interrupted);
      window.removeEventListener("resize", interrupted);
      document.removeEventListener("visibilitychange", visibility);
      cancelDrag();
      finishMotion();
    };
  }, [cancelDrag, finishMotion, moveTo]);

  const selectIndex = useCallback((index: number) => {
    if (navigationLockRef.current || interactionDisabled) return;
    const current = selectionRef.current;
    if (current.count <= 1) return;
    const offset = getRelativeSlot(index, positionRef.current, current.count);
    settle(0, positionRef.current + offset);
  }, [interactionDisabled, settle]);

  const stepCarousel = useCallback((direction: -1 | 1) => {
    selectIndex(selectionRef.current.activeIndex + direction);
  }, [selectIndex]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || navigationLockRef.current || interactionDisabled || selectionRef.current.count <= 1) return;
      event.preventDefault();
      if (movingRef.current || dragRef.current) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) >= 2) stepCarousel(delta > 0 ? 1 : -1);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [interactionDisabled, stepCarousel]);

  useEffect(() => {
    const pack = packs[activeIndex];
    if (pack && activeIndex < count) router.prefetch(`/pack/${encodeURIComponent(pack.slug)}`);
  }, [activeIndex, count, packs, router]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || navigationLockRef.current || interactionDisabled || dragRef.current) return;
    suppressClickUntilRef.current = 0;
    if (count <= 1) return;
    finishMotion();
    dragRef.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, captured: false,
      startPosition: positionRef.current, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    // Delay capture so a stationary desktop click still reaches its button.
    if (!drag.captured && Math.abs(deltaX) > DRAG_CAPTURE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!drag.captured) return;
    movingRef.current = true;
    event.currentTarget.dataset.moving = "true";
    const elapsed = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
    const velocity = -(event.clientX - drag.lastX) * DECK_DRAG_SENSITIVITY / metrics.gap / elapsed;
    drag.velocity = Math.max(-DECK_MAX_VELOCITY, Math.min(DECK_MAX_VELOCITY, velocity * 0.7 + drag.velocity * 0.3));
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    moveTo(resistDeckPosition(drag.startPosition - deltaX * DECK_DRAG_SENSITIVITY / metrics.gap, count));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.captured) suppressClickUntilRef.current = event.timeStamp + 400;
    const velocity = drag.captured && event.timeStamp - drag.lastTime <= 80 ? drag.velocity : 0;
    cancelDrag();
    settle(velocity);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    suppressClickUntilRef.current = event.timeStamp + 400;
    cancelDrag();
    settle();
  };

  const handleCardClick = (index: number, timeStamp: number) => {
    if (navigationLockRef.current || interactionDisabled || dragRef.current || timeStamp < suppressClickUntilRef.current) return;
    if (index !== selectionRef.current.activeIndex || Math.abs(positionRef.current - Math.round(positionRef.current)) > 0.001) {
      selectIndex(index);
    } else if (!movingRef.current) {
      const pack = packs[index];
      if (pack) onOpenPack(pack, placement);
    }
  };

  const changeCount = (delta: -1 | 1) => {
    if (navigationLockRef.current || interactionDisabled || maximumCount === 0) return;
    const current = selectionRef.current;
    const nextCount = Math.max(MIN_COUNT, Math.min(maximumCount, current.count + delta));
    const nextIndex = Math.min(current.activeIndex, nextCount - 1);
    const next = { count: nextCount, activeIndex: nextIndex, position: nextIndex };
    cancelDrag();
    finishMotion();
    selectionRef.current = next;
    positionRef.current = next.position;
    setSelection(next);
  };

  const stageStyle: DeckStageStyle = {
    "--card-width": `${metrics.cardWidth}px`,
    "--card-height": `${metrics.cardHeight}px`,
    "--deck-center-y": `${metrics.centerY}px`,
    "--deck-unit": `${metrics.unit}px`,
    "--deck-title-size": `${metrics.titleSize}px`,
  };
  const enterClass = placement === "top" ? "pack-home-top-enter" : "pack-home-enter";
  const exitClass = placement === "top" ? "pack-home-top-exit" : "pack-home-exit";

  return (
    <ViewTransition
      default="none"
      enter={{ [PACK_CLOSE_TRANSITION_TYPE]: enterClass, default: enterClass }}
      exit={{ [PACK_OPEN_TRANSITION_TYPE]: exitClass, default: "none" }}
    >
      <section
        aria-label={`${placement === "top" ? "上轮盘" : "下轮盘"}：${COLLECTION_LABELS[collection]}（模拟数据）/ ${collection === "joined" ? "Joined" : "All"} packs (mock)`}
        className={styles.root}
        data-placement={placement}
        data-swapping-in={swappingIn}
        inert={interactionDisabled}
        ref={rootRef}
      >
        <div
          className={styles.stage}
          onKeyDown={(event) => {
            if (count <= 1) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              stepCarousel(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={(event) => {
            // Touch initially captures the hit card. Its loss bubbles when
            // capture transfers to the stage; only a real stage loss cancels.
            if (event.target === event.currentTarget && !event.currentTarget.hasPointerCapture(event.pointerId)) {
              handlePointerCancel(event);
            }
          }}
          onPointerLeave={(event) => {
            if (!dragRef.current?.captured) handlePointerCancel(event);
          }}
          ref={stageRef}
          role="group"
          style={stageStyle}
          tabIndex={count > 0 ? 0 : -1}
        >
          {visiblePacks.map((pack, index) => {
            const pose = getContinuousDeckPose(getRelativeSlot(index, selection.position, count), metrics);
            return (
              <button
                aria-current={index === activeIndex ? "true" : undefined}
                aria-hidden={!pose.visible}
                aria-label={`${pack.title}, ${index + 1} / ${count}`}
                className={styles.card}
                key={pack.id}
                ref={(element) => { cardRefs.current[index] = element; }}
                onClick={(event) => handleCardClick(index, event.timeStamp)}
                tabIndex={pose.visible ? 0 : -1}
                style={{
                  transform: `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotation}deg) scale(${pose.scale})`,
                  opacity: pose.opacity, zIndex: pose.zIndex,
                  pointerEvents: pose.visible ? "auto" : "none",
                }}
                type="button"
              >
                <PackDeck pack={pack} active={index === activeIndex} placement={placement} transitionName={getPackTransitionName(pack.id, placement)} />
              </button>
            );
          })}
        </div>
        {placement === "bottom" && (
          <div className={styles.countControl} aria-label="当前图片数量 / Current image count">
            <button aria-label="减少图片 / Decrease images" className={styles.countButton} disabled={count <= MIN_COUNT} onClick={() => changeCount(-1)} type="button">
              <span aria-hidden="true">−</span>
            </button>
            <output className={styles.countValue} aria-live="polite">{count}</output>
            <button aria-label="增加图片 / Increase images" className={styles.countButton} disabled={count >= maximumCount} onClick={() => changeCount(1)} type="button">
              <span aria-hidden="true">+</span>
            </button>
          </div>
        )}
        <p className={styles.srOnly} aria-live="polite">{count > 0 ? activeIndex + 1 : 0} / {count}</p>
      </section>
    </ViewTransition>
  );
}
