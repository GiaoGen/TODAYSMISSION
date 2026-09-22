"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { ExplorePackSummary } from "@/features/packs/model/explore-pack-content";
import {
  clearExplorePackReturnSlug,
  getExplorePackReturnSlug,
} from "@/features/packs/model/explore-pack-transition-state";
import { advanceCarouselSpring } from "@/features/packs/model/carousel-spring";
import {
  getPackTransitionName,
  PACK_OPEN_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";

import styles from "./ExplorePackCarousel.module.css";

type ExplorePackCarouselProps = {
  clearReturnSlug?: boolean;
  packs: readonly ExplorePackSummary[];
};

type SlideStyle = CSSProperties & {
  "--cover-foreground": string;
};

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

const DRAG_THRESHOLD = 5;
const MAX_VELOCITY = 5;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  };
}

function mixColors(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const mix = (first: number, second: number) => Math.round(first + (second - first) * amount);
  return `rgb(${mix(start.red, end.red)}, ${mix(start.green, end.green)}, ${mix(start.blue, end.blue)})`;
}

export function ExplorePackCarousel({ clearReturnSlug = true, packs }: ExplorePackCarouselProps) {
  const router = useRouter();
  const [initialIndex] = useState(() => {
    const returnSlug = getExplorePackReturnSlug();
    const index = returnSlug ? packs.findIndex((pack) => pack.slug === returnSlug) : 0;
    return Math.max(0, index);
  });
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(initialIndex);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const movingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const navigationLockedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const paint = useCallback((position = positionRef.current) => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!root || !viewport || !track || packs.length === 0) return;

    const bounded = clamp(position, 0, packs.length - 1);
    positionRef.current = bounded;
    track.style.transform = `translate3d(${-bounded * viewport.clientWidth}px, 0, 0)`;
    const fromIndex = Math.floor(bounded);
    const toIndex = Math.min(packs.length - 1, fromIndex + 1);
    root.style.backgroundColor = mixColors(
      packs[fromIndex].background,
      packs[toIndex].background,
      bounded - fromIndex,
    );
  }, [packs]);

  const stopMotion = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    movingRef.current = false;
  }, []);

  const settle = useCallback((requestedTarget: number, initialVelocity = 0) => {
    stopMotion();
    const target = clamp(Math.round(requestedTarget), 0, packs.length - 1);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || Math.abs(positionRef.current - target) < .001) {
      paint(target);
      setActiveIndex(target);
      return;
    }

    movingRef.current = true;
    let velocity = clamp(initialVelocity, -MAX_VELOCITY, MAX_VELOCITY);
    let lastTime = performance.now();
    const tick = (time: number) => {
      const seconds = clamp((time - lastTime) / 1000, .001, .034);
      lastTime = time;
      const next = advanceCarouselSpring(positionRef.current, velocity, target, seconds);
      velocity = next.velocity;
      paint(next.position);
      if (Math.abs(target - next.position) < .001 && Math.abs(velocity) < .01) {
        paint(target);
        setActiveIndex(target);
        stopMotion();
      } else {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };
    frameRef.current = window.requestAnimationFrame(tick);
  }, [packs.length, paint, stopMotion]);

  useLayoutEffect(() => {
    navigationLockedRef.current = false;
    suppressClickRef.current = false;
    dragRef.current = null;
    paint();
    if (clearReturnSlug) clearExplorePackReturnSlug();
    const handleResize = () => {
      stopMotion();
      paint(Math.round(positionRef.current));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clearReturnSlug, paint, stopMotion]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || navigationLockedRef.current || dragRef.current || packs.length <= 1) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 2 || movingRef.current) return;
      event.preventDefault();
      settle(positionRef.current + (delta > 0 ? 1 : -1));
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [packs.length, settle]);

  useEffect(() => {
    for (const pack of packs) {
      router.prefetch(`/pack/${encodeURIComponent(pack.slug)}`);
    }
    return () => {
      stopMotion();
      if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
    };
  }, [packs, router, stopMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || navigationLockedRef.current || dragRef.current) return;
    stopMotion();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: positionRef.current,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      captured: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.captured && Math.abs(deltaX) > DRAG_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!drag.captured) return;

    const width = Math.max(1, event.currentTarget.clientWidth);
    const elapsed = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
    const nextPosition = drag.startPosition - deltaX / width;
    drag.velocity = clamp(-(event.clientX - drag.lastX) / width / elapsed, -MAX_VELOCITY, MAX_VELOCITY);
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    paint(nextPosition);
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.captured) return;
    suppressClickRef.current = true;
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      clickTimerRef.current = null;
    }, 250);
    const velocity = event.type === "pointercancel" || event.timeStamp - drag.lastTime > 80
      ? 0
      : drag.velocity;
    settle(positionRef.current + velocity * .16, velocity);
  };

  const openPack = (pack: ExplorePackSummary, index: number) => {
    if (
      navigationLockedRef.current ||
      suppressClickRef.current ||
      index !== Math.round(positionRef.current) ||
      movingRef.current
    ) {
      return;
    }
    navigationLockedRef.current = true;
    router.push(`/pack/${encodeURIComponent(pack.slug)}`, {
      scroll: false,
      transitionTypes: [PACK_OPEN_TRANSITION_TYPE],
    });
  };

  return (
    <section
      aria-label="Explore mission Packs"
      className={styles.root}
      ref={rootRef}
      style={{ backgroundColor: packs[0]?.background }}
    >
      <div
        aria-roledescription="carousel"
        className={styles.viewport}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            settle(positionRef.current + (event.key === "ArrowLeft" ? -1 : 1));
          }
        }}
        onPointerCancel={finishPointer}
        onPointerDown={handlePointerDown}
        onPointerLeave={(event) => {
          if (!dragRef.current?.captured) finishPointer(event);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        ref={viewportRef}
        role="region"
        tabIndex={0}
      >
        <div className={styles.track} ref={trackRef}>
          {packs.map((pack, index) => {
            const slideStyle: SlideStyle = {
              "--cover-foreground": pack.foreground,
            };
            return (
              <article
                aria-label={`${pack.title}, ${index + 1} / ${packs.length}`}
                aria-hidden={index !== activeIndex}
                className={styles.slide}
                key={pack.slug}
                style={slideStyle}
              >
                <div className={styles.hero}>
                  <button
                    aria-label={`Open ${pack.title}`}
                    className={styles.coverButton}
                    onClick={() => openPack(pack, index)}
                    tabIndex={index === activeIndex ? 0 : -1}
                    type="button"
                  >
                    <ViewTransition
                      default="none"
                      name={getPackTransitionName(pack.slug, "bottom")}
                      share="pack-card-morph"
                    >
                      <span className={styles.cover}>
                        <Image
                          alt={`${pack.title} Pack cover`}
                          className={styles.coverImage}
                          draggable={false}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 640px) 70vw, 340px"
                          src={pack.cover}
                        />
                      </span>
                    </ViewTransition>
                  </button>
                  <h1 className={styles.title}>{pack.title}</h1>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
