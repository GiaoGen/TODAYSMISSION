"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { useRouter } from "next/navigation";

import { PackCard } from "@/components/card/PackCard";
import type { PackSummary } from "@/data/contracts/pack-summary";
import {
  getActiveIndex,
  getCarouselMetrics,
  getRelativeSlot,
  getSnapTarget,
  type CarouselMetrics,
} from "@/features/packs/model/arc-carousel-geometry";
import {
  getPackCarouselReturnState,
  setPackCarouselReturnState,
} from "@/features/packs/model/pack-carousel-return-state";
import {
  getPackTransitionName,
  PACK_CLOSE_TRANSITION_TYPE,
  PACK_OPEN_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";

import styles from "./ArcCarousel.module.css";

const DEFAULT_COUNT = 12;
const MIN_COUNT = 1;
const MAX_COUNT = 24;
const DRAG_SPEED = 1;
const DAMPING = 0.94;
const MAX_ANGULAR_SPEED = 12;
const SNAP_TIME_SECONDS = 0.8;
const SNAP_FROM_ANGULAR_SPEED = 1;
const SNAP_SPRING_DAMPING_RATIO = 0.64;
const PICK_TIME_MS = 550;
const SCROLL_SPEED = 0.0022;
const DRAG_CAPTURE_THRESHOLD = 5;

type ArcCarouselProps = {
  packs: readonly PackSummary[];
};

type StageBounds = {
  left: number;
  top: number;
};

type DragState = {
  captured: boolean;
  lastAngle: number;
  lastTime: number;
  lastX: number;
  lastY: number;
  pointerId: number;
  travel: number;
  velocity: number;
};

type InitialCarouselState = {
  activeIndex: number;
  count: number;
  position: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function getPointerAngle(
  clientX: number,
  clientY: number,
  metrics: CarouselMetrics,
  bounds: StageBounds,
) {
  const deltaX = clientX - bounds.left - metrics.centerX;
  const deltaY = clientY - bounds.top - metrics.centerY;
  return Math.atan2(-deltaY, deltaX);
}

function wrapAngle(angle: number) {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
}

function getInitialCarouselState(
  packs: readonly PackSummary[],
  maximumCount: number,
): InitialCarouselState {
  const saved = getPackCarouselReturnState();
  const savedPackIndex = saved
    ? packs.findIndex((pack) => pack.id === saved.packId)
    : -1;

  if (!saved || savedPackIndex < 0) {
    return {
      activeIndex: 0,
      count: Math.min(DEFAULT_COUNT, maximumCount),
      position: 0,
    };
  }

  const count = clamp(
    Math.max(saved.count ?? DEFAULT_COUNT, savedPackIndex + 1),
    MIN_COUNT,
    maximumCount,
  );
  const canRestoreExactPosition =
    saved.count === count && saved.position !== undefined;

  return {
    activeIndex: savedPackIndex,
    count,
    position: canRestoreExactPosition ? (saved.position ?? savedPackIndex) : savedPackIndex,
  };
}

export function ArcCarousel({ packs }: ArcCarouselProps) {
  const router = useRouter();
  const maximumCount = Math.min(MAX_COUNT, packs.length);
  const [initialState] = useState(() =>
    getInitialCarouselState(packs, maximumCount),
  );
  const [count, setCount] = useState(initialState.count);
  const [activeIndex, setActiveIndex] = useState(initialState.activeIndex);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const metricsRef = useRef<CarouselMetrics | null>(null);
  const stageBoundsRef = useRef<StageBounds>({ left: 0, top: 0 });
  const positionRef = useRef(initialState.position);
  const motionVelocityRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const layoutFrameRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const navigationLockRef = useRef(false);
  const previousCountRef = useRef(count);

  const visiblePacks = packs.slice(0, count);

  const setMoving = useCallback((moving: boolean) => {
    if (stageRef.current) {
      stageRef.current.dataset.moving = String(moving);
    }
  }, []);

  const layoutCards = useCallback(() => {
    layoutFrameRef.current = null;
    const metrics = metricsRef.current;
    const stage = stageRef.current;

    if (!metrics || !stage) {
      return;
    }

    stage.style.setProperty("--card-width", `${metrics.cardWidth}px`);
    stage.style.setProperty("--card-height", `${metrics.cardHeight}px`);

    for (let index = 0; index < count; index += 1) {
      const card = cardRefs.current[index];

      if (!card) {
        continue;
      }

      const relativeSlot = getRelativeSlot(index, positionRef.current, count);
      const angle = relativeSlot * metrics.stepAngle;
      const x = metrics.centerX + Math.sin(angle) * metrics.radius;
      const y = metrics.centerY - Math.cos(angle) * metrics.radius;
      const distance = Math.abs(relativeSlot);
      const scale = Math.max(0.88, 1 - Math.min(distance, 3) * 0.035);
      const opacity = Math.max(0.18, 1 - distance * 0.14);
      const seamSafeAngle =
        count >= 6
          ? Math.max(metrics.stepAngle, (count / 2 - 0.65) * metrics.stepAngle)
          : Number.POSITIVE_INFINITY;
      const isOnVisibleArc =
        Math.abs(angle) <= Math.min(Math.PI * 0.55, seamSafeAngle);

      card.style.transform = `translate3d(${x - metrics.cardWidth / 2}px, ${y - metrics.cardHeight / 2}px, 0) rotate(${angle}rad) scale(${scale})`;
      card.style.opacity = isOnVisibleArc ? String(opacity) : "0";
      card.style.pointerEvents = isOnVisibleArc ? "auto" : "none";
      card.style.visibility = isOnVisibleArc ? "visible" : "hidden";
      card.style.zIndex = String(1000 - Math.round(distance * 10));
    }
  }, [count]);

  const scheduleLayout = useCallback(() => {
    if (layoutFrameRef.current !== null) {
      return;
    }

    layoutFrameRef.current = requestAnimationFrame(layoutCards);
  }, [layoutCards]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    motionVelocityRef.current = 0;
  }, []);

  const animateTo = useCallback(
    (target: number) => {
      stopAnimation();
      const from = positionRef.current;

      if (reducedMotionRef.current) {
        positionRef.current = target;
        layoutCards();
        setActiveIndex(getActiveIndex(target, count));
        setMoving(false);
        return;
      }

      const distance = Math.abs(target - from);
      const duration = PICK_TIME_MS * Math.sqrt(Math.max(1, distance));
      const startedAt = performance.now();
      setMoving(true);

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        positionRef.current =
          from + (target - from) * easeInOutCubic(progress);
        layoutCards();

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        animationFrameRef.current = null;
        positionRef.current = target;
        setActiveIndex(getActiveIndex(target, count));
        setMoving(false);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [count, layoutCards, setMoving, stopAnimation],
  );

  const startMomentum = useCallback(
    (initialVelocity: number) => {
      const metrics = metricsRef.current;

      if (!metrics) {
        return;
      }

      stopAnimation();

      if (reducedMotionRef.current) {
        const target = getSnapTarget(positionRef.current, count);
        positionRef.current = target;
        layoutCards();
        setActiveIndex(getActiveIndex(target, count));
        setMoving(false);
        return;
      }

      const maximumSpeed = MAX_ANGULAR_SPEED / metrics.stepAngle;
      const decay = Math.max(0.01, -Math.log(DAMPING) * 60);
      const snapEngagementSpeed = Math.max(
        SNAP_FROM_ANGULAR_SPEED / metrics.stepAngle,
        decay * 0.5,
      );
      const snapRate = 4.8 / Math.max(0.05, SNAP_TIME_SECONDS);
      const springStrength = snapRate * snapRate;
      const springDamping =
        2 * snapRate * SNAP_SPRING_DAMPING_RATIO;
      let previousTime = performance.now();
      let settling = false;
      let snapTarget = 0;
      let snapSpeedCap = 0;

      motionVelocityRef.current = clamp(
        initialVelocity,
        -maximumSpeed,
        maximumSpeed,
      );
      setMoving(true);

      const tick = (now: number) => {
        const elapsedSeconds = Math.min(
          0.05,
          Math.max(0, now - previousTime) / 1000,
        );
        previousTime = now;
        let velocity = motionVelocityRef.current;
        let nextPosition = positionRef.current + velocity * elapsedSeconds;

        if (count < 6) {
          const boundedPosition = clamp(nextPosition, 0, count - 1);
          if (boundedPosition !== nextPosition) {
            velocity = 0;
          }
          nextPosition = boundedPosition;
        }

        positionRef.current = nextPosition;
        if (!settling) {
          velocity *= Math.pow(DAMPING, elapsedSeconds * 60);
        }

        if (!settling && Math.abs(velocity) < snapEngagementSpeed) {
          const coastPosition = positionRef.current + velocity / decay;
          snapTarget = getSnapTarget(coastPosition, count);
          snapSpeedCap = Math.max(Math.abs(velocity), snapRate * 0.5);
          settling = true;
        }

        if (settling) {
          const offset = snapTarget - positionRef.current;
          velocity += offset * springStrength * elapsedSeconds;
          velocity *= Math.exp(-springDamping * elapsedSeconds);
          velocity = clamp(
            velocity,
            -snapSpeedCap,
            snapSpeedCap,
          );

          if (Math.abs(velocity) < 0.0015 && Math.abs(offset) < 0.0008) {
            positionRef.current = snapTarget;
            motionVelocityRef.current = 0;
            animationFrameRef.current = null;
            layoutCards();
            setActiveIndex(getActiveIndex(snapTarget, count));
            setMoving(false);
            return;
          }
        }

        motionVelocityRef.current = velocity;
        layoutCards();
        animationFrameRef.current = requestAnimationFrame(tick);
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [count, layoutCards, setMoving, stopAnimation],
  );

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    navigationLockRef.current = false;

    const updateMetrics = () => {
      const { height, left, top, width } = stage.getBoundingClientRect();
      stageBoundsRef.current = { left, top };
      metricsRef.current = getCarouselMetrics({ height, width });
      layoutCards();
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(stage);

    return () => observer.disconnect();
  }, [count, layoutCards]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      const metrics = metricsRef.current;

      if (!metrics || count <= 1) {
        return;
      }

      event.preventDefault();
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      const angularVelocity = (delta * SCROLL_SPEED) / (1 / 60);
      const slotVelocity = angularVelocity / metrics.stepAngle;
      startMomentum(motionVelocityRef.current + slotVelocity);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    return () => stage.removeEventListener("wheel", handleWheel);
  }, [count, startMomentum]);

  useEffect(() => {
    if (previousCountRef.current === count) {
      scheduleLayout();
      return;
    }

    previousCountRef.current = count;
    const nextPosition =
      count < 6
        ? Math.floor(count / 2)
        : Math.min(
            getActiveIndex(positionRef.current, Math.max(count, 1)),
            count - 1,
          );
    positionRef.current = nextPosition;
    setActiveIndex(nextPosition);
    stopAnimation();
    setMoving(false);
    scheduleLayout();
  }, [count, scheduleLayout, setMoving, stopAnimation]);

  useEffect(() => {
    const activePack = packs[activeIndex];

    if (activePack && activeIndex < count) {
      router.prefetch(`/pack/${encodeURIComponent(activePack.slug)}`);
    }
  }, [activeIndex, count, packs, router]);

  useEffect(
    () => () => {
      stopAnimation();
      if (layoutFrameRef.current !== null) {
        cancelAnimationFrame(layoutFrameRef.current);
      }
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    },
    [stopAnimation],
  );

  const finishDrag = useCallback(
    (withInertia: boolean) => {
      const drag = dragRef.current;

      if (!drag) {
        return;
      }

      dragRef.current = null;

      if (!drag.captured) {
        setMoving(false);
        return;
      }

      startMomentum(withInertia ? drag.velocity : 0);
    },
    [setMoving, startMomentum],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const metrics = metricsRef.current;

    if (count <= 1 || event.button !== 0 || !metrics) {
      return;
    }

    stopAnimation();
    dragRef.current = {
      captured: false,
      lastAngle: getPointerAngle(
        event.clientX,
        event.clientY,
        metrics,
        stageBoundsRef.current,
      ),
      lastTime: performance.now(),
      lastX: event.clientX,
      lastY: event.clientY,
      pointerId: event.pointerId,
      travel: 0,
      velocity: 0,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const metrics = metricsRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !metrics) {
      return;
    }

    const nextAngle = getPointerAngle(
      event.clientX,
      event.clientY,
      metrics,
      stageBoundsRef.current,
    );
    const angularTurn = wrapAngle(nextAngle - drag.lastAngle) * DRAG_SPEED;
    const slotTurn = angularTurn / metrics.stepAngle;
    const now = performance.now();
    const elapsedSeconds = Math.max(0.008, (now - drag.lastTime) / 1000);
    const travelDelta = Math.hypot(
      event.clientX - drag.lastX,
      event.clientY - drag.lastY,
    );

    drag.travel += travelDelta;

    if (!drag.captured && drag.travel <= DRAG_CAPTURE_THRESHOLD) {
      drag.lastAngle = nextAngle;
      drag.lastTime = now;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }

    if (!drag.captured) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setMoving(true);
    }

    let nextPosition = positionRef.current + slotTurn;

    if (count < 6) {
      nextPosition = clamp(nextPosition, 0, count - 1);
    }

    drag.lastAngle = nextAngle;
    drag.lastTime = now;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.velocity = (nextPosition - positionRef.current) / elapsedSeconds;
    positionRef.current = nextPosition;
    scheduleLayout();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (drag?.pointerId !== event.pointerId) {
      return;
    }

    if (drag.captured) {
      suppressNextClickRef.current = true;
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressNextClickRef.current = false;
        suppressClickTimerRef.current = null;
      }, 0);
    }

    if (
      drag.captured &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag(true);
  };

  const handleCardClick = (index: number) => {
    if (dragRef.current || count <= 1 || suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const offset = getRelativeSlot(index, positionRef.current, count);

    if (Math.abs(offset) < 0.02) {
      const pack = visiblePacks[index];

      if (!pack || navigationLockRef.current) {
        return;
      }

      navigationLockRef.current = true;
      stopAnimation();
      setMoving(false);
      setPackCarouselReturnState({
        activeIndex: index,
        count,
        packId: pack.id,
        position: positionRef.current,
      });
      router.push(`/pack/${encodeURIComponent(pack.slug)}`, {
        scroll: false,
        transitionTypes: [PACK_OPEN_TRANSITION_TYPE],
      });
      return;
    }

    animateTo(getSnapTarget(positionRef.current + offset, count));
  };

  const stepCarousel = (direction: -1 | 1) => {
    animateTo(getSnapTarget(positionRef.current + direction, count));
  };

  return (
    <ViewTransition
      default="none"
      enter={{
        [PACK_CLOSE_TRANSITION_TYPE]: "pack-home-enter",
        default: "pack-home-enter",
      }}
      exit={{ "pack-open": "pack-home-exit", default: "none" }}
    >
      <section className={styles.root} aria-label="图片轮盘 / Image carousel">
      <div
        className={styles.stage}
        data-moving="false"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            stepCarousel(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            stepCarousel(1);
          }
        }}
        onPointerCancel={() => finishDrag(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={stageRef}
        role="group"
        tabIndex={0}
      >
        {visiblePacks.map((pack, index) => {
          const directDistance = Math.abs(index - activeIndex);
          const activeDistance =
            count >= 6
              ? Math.min(directDistance, count - directDistance)
              : directDistance;

          return (
            <button
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`${pack.title}, ${index + 1} / ${count}`}
              className={styles.card}
              key={pack.id}
              onClick={() => handleCardClick(index)}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              type="button"
            >
              <ViewTransition
                default="none"
                name={getPackTransitionName(pack.id)}
                share="pack-card-morph"
              >
                <PackCard eager={activeDistance <= 2} pack={pack} />
              </ViewTransition>
            </button>
          );
        })}
      </div>

      <div className={styles.countControl} aria-label="当前图片数量 / Current image count">
        <button
          aria-label="减少图片 / Decrease images"
          className={styles.countButton}
          disabled={count <= MIN_COUNT}
          onClick={() => setCount((current) => Math.max(MIN_COUNT, current - 1))}
          type="button"
        >
          <span aria-hidden="true">−</span>
        </button>
        <output className={styles.countValue} aria-live="polite">
          {count}
        </output>
        <button
          aria-label="增加图片 / Increase images"
          className={styles.countButton}
          disabled={count >= maximumCount}
          onClick={() =>
            setCount((current) => Math.min(maximumCount, current + 1))
          }
          type="button"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {activeIndex + 1} / {count}
      </p>
      </section>
    </ViewTransition>
  );
}
