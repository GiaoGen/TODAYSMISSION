"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type {
  ExploreMissionArtwork,
  ExplorePackPreviewData,
} from "@/features/packs/model/explore-pack-content";
import { advanceCarouselSpring } from "@/features/packs/model/carousel-spring";
import {
  getPackTransitionName,
  PACK_CLOSE_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";
import { setExplorePackReturnSlug } from "@/features/packs/model/explore-pack-transition-state";

import styles from "./ExplorePackPreview.module.css";

type ExplorePackPreviewProps = {
  pack: ExplorePackPreviewData;
};

type PreviewStyle = CSSProperties & {
  "--preview-background": string;
  "--preview-foreground": string;
};

type ProxyStyle = CSSProperties & {
  "--proxy-delay": string;
  "--proxy-x": string;
};

type DragState = {
  pointerId: number;
  lastX: number;
  lastTime: number;
  travel: number;
  velocity: number;
  captured: boolean;
};

type PreviewPhase =
  | "collapsed"
  | "distributing"
  | "handoff"
  | "settled"
  | "closing-ready"
  | "closing";

const COPY_COUNT = 3;
const PRIMARY_COPY = 1;
const PROXY_OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const;
const POINTER_THRESHOLD = 5;
const MAX_VELOCITY = 2600;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrapIndex(value: number, count: number) {
  return ((value % count) + count) % count;
}

function GalleryCard({ copyIndex, mission, setRef }: {
  copyIndex: number;
  mission: ExploreMissionArtwork;
  setRef: (element: HTMLLIElement | null) => void;
}) {
  return (
    <li className={styles.galleryCard} data-preview-card ref={setRef}>
      <span className={styles.cardSurface}>
        <Image
          alt={copyIndex === PRIMARY_COPY ? `${mission.title} Mission artwork` : ""}
          aria-hidden={copyIndex !== PRIMARY_COPY}
          className={styles.image}
          draggable={false}
          fill
          loading={copyIndex === PRIMARY_COPY ? "eager" : "lazy"}
          sizes="(max-width: 640px) 74vw, 300px"
          src={mission.artwork}
        />
      </span>
    </li>
  );
}

function DistributionCard({ mission, offset, setRef }: {
  mission: ExploreMissionArtwork;
  offset: number;
  setRef: (element: HTMLLIElement | null) => void;
}) {
  const style: ProxyStyle = {
    "--proxy-delay": `${Math.abs(offset) * 48}ms`,
    "--proxy-x": "0px",
  };

  return (
    <li
      aria-hidden="true"
      className={styles.proxyCard}
      data-center={offset === 0}
      ref={setRef}
      style={style}
    >
      <span className={styles.cardSurface}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.image}
          draggable={false}
          fill
          loading="eager"
          sizes="(max-width: 640px) 74vw, 300px"
          src={mission.artwork}
        />
      </span>
    </li>
  );
}

export function ExplorePackPreview({ pack }: ExplorePackPreviewProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const galleryCardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const proxyCardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const positionRef = useRef(0);
  const originRef = useRef(0);
  const strideRef = useRef(0);
  const cycleWidthRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const phaseRef = useRef<PreviewPhase>("collapsed");
  const suppressBlankClickRef = useRef(false);
  const navigationStartedRef = useRef(false);
  const [phase, setPhaseState] = useState<PreviewPhase>("collapsed");
  const [proxyCenterIndex, setProxyCenterIndex] = useState(0);
  const style: PreviewStyle = {
    "--preview-background": pack.background,
    "--preview-foreground": pack.foreground,
  };

  const setPhase = useCallback((next: PreviewPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const paint = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${positionRef.current}px, -50%, 0)`;
    }
  }, []);

  const updateProxyPositions = useCallback((residual = 0) => {
    const stride = strideRef.current;
    proxyCardRefs.current.forEach((card, index) => {
      if (!card) return;
      card.style.setProperty("--proxy-x", `${PROXY_OFFSETS[index] * stride + residual}px`);
    });
  }, []);

  const normalizePosition = useCallback(() => {
    const cycleWidth = cycleWidthRef.current;
    if (cycleWidth <= 0) return 0;
    const halfCycle = cycleWidth / 2;
    let wrappedBy = 0;
    while (positionRef.current - originRef.current > halfCycle) {
      positionRef.current -= cycleWidth;
      wrappedBy -= cycleWidth;
    }
    while (positionRef.current - originRef.current < -halfCycle) {
      positionRef.current += cycleWidth;
      wrappedBy += cycleWidth;
    }
    return wrappedBy;
  }, []);

  const stopMotion = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (rootRef.current) rootRef.current.dataset.moving = "false";
  }, []);

  const nearestMissionSnap = useCallback((value: number) => {
    const stride = strideRef.current;
    if (stride <= 0) return originRef.current;
    return originRef.current + Math.round((value - originRef.current) / stride) * stride;
  }, []);

  const settleAt = useCallback((requestedTarget: number, initialVelocity = 0) => {
    stopMotion();
    let target = requestedTarget;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      positionRef.current = target;
      normalizePosition();
      paint();
      return;
    }

    if (rootRef.current) rootRef.current.dataset.moving = "true";
    let velocity = clamp(initialVelocity, -MAX_VELOCITY, MAX_VELOCITY);
    let lastTime = performance.now();
    const tick = (time: number) => {
      const seconds = clamp((time - lastTime) / 1000, .001, .034);
      lastTime = time;
      const next = advanceCarouselSpring(positionRef.current, velocity, target, seconds);
      positionRef.current = next.position;
      velocity = next.velocity;
      const wrappedBy = normalizePosition();
      target += wrappedBy;
      paint();
      if (Math.abs(target - positionRef.current) < .25 && Math.abs(velocity) < 2) {
        positionRef.current = target;
        normalizePosition();
        paint();
        stopMotion();
      } else {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };
    frameRef.current = window.requestAnimationFrame(tick);
  }, [normalizePosition, paint, stopMotion]);

  const settleWithMomentum = useCallback((velocity: number) => {
    const predicted = positionRef.current + velocity * .15;
    settleAt(nearestMissionSnap(predicted), velocity);
  }, [nearestMissionSnap, settleAt]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const cards = galleryCardRefs.current;
    const count = pack.missions.length;
    if (!root || count < 1) return;

    const measure = () => {
      stopMotion();
      const primaryStart = PRIMARY_COPY * count;
      const first = cards[primaryStart];
      const second = cards[primaryStart + 1];
      const nextCopyFirst = cards[primaryStart + count];
      if (!first || !nextCopyFirst) return;

      const stride = second
        ? second.offsetLeft - first.offsetLeft
        : first.offsetWidth;
      strideRef.current = stride;
      cycleWidthRef.current = nextCopyFirst.offsetLeft - first.offsetLeft;
      originRef.current = root.clientWidth / 2 - first.offsetLeft - first.offsetWidth / 2;
      positionRef.current = originRef.current;
      paint();
      updateProxyPositions();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [pack.missions.length, paint, stopMotion, updateProxyPositions]);

  useEffect(() => {
    router.prefetch("/explore");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPhase("distributing"), reducedMotion ? 0 : 560);
    return () => window.clearTimeout(timer);
  }, [pack.slug, router, setPhase]);

  useEffect(() => {
    if (phase !== "distributing" && phase !== "handoff") return;
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const animations = root.getAnimations({ subtree: true });
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (cancelled) return;
        setPhase(phase === "distributing" ? "handoff" : "settled");
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [phase, setPhase]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || phase !== "settled") return;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 2 || dragRef.current) return;
      event.preventDefault();
      stopMotion();
      positionRef.current -= delta;
      normalizePosition();
      paint();
      settleWithMomentum(clamp(-delta * 10, -MAX_VELOCITY, MAX_VELOCITY));
    };
    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, [normalizePosition, paint, phase, settleWithMomentum, stopMotion]);

  useEffect(() => {
    if (phase !== "closing-ready") return;
    const frame = window.requestAnimationFrame(() => setPhase("closing"));
    return () => window.cancelAnimationFrame(frame);
  }, [phase, setPhase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let fallbackTimer = 0;
    const frame = window.requestAnimationFrame(() => {
      const animations = root.getAnimations({ subtree: true });
      const animationsFinished = Promise.allSettled(animations.map((animation) => animation.finished));
      const fallback = new Promise<void>((resolve) => {
        fallbackTimer = window.setTimeout(resolve, 1000);
      });
      void Promise.race([animationsFinished, fallback]).then(() => {
        if (cancelled || navigationStartedRef.current) return;
        navigationStartedRef.current = true;
        setExplorePackReturnSlug(pack.slug);
        router.push("/explore", {
          scroll: false,
          transitionTypes: [PACK_CLOSE_TRANSITION_TYPE],
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallbackTimer);
    };
  }, [pack.slug, phase, router]);

  useEffect(() => () => {
    stopMotion();
    const drag = dragRef.current;
    const root = rootRef.current;
    if (drag && root?.hasPointerCapture(drag.pointerId)) {
      root.releasePointerCapture(drag.pointerId);
    }
  }, [stopMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (phaseRef.current !== "settled" || !event.isPrimary || event.button !== 0 || dragRef.current) return;
    stopMotion();
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      travel: 0,
      velocity: 0,
      captured: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.lastX;
    drag.travel += Math.abs(deltaX);
    if (!drag.captured && drag.travel > POINTER_THRESHOLD) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const elapsed = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    if (!drag.captured) return;
    positionRef.current += deltaX;
    drag.velocity = clamp(deltaX / elapsed, -MAX_VELOCITY, MAX_VELOCITY);
    normalizePosition();
    paint();
  };

  const finishPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.captured) return;
    suppressBlankClickRef.current = true;
    window.setTimeout(() => { suppressBlankClickRef.current = false; }, 180);
    const velocity = event.type === "pointercancel" || event.timeStamp - drag.lastTime > 80 ? 0 : drag.velocity;
    settleWithMomentum(velocity);
  };

  const closePreview = (target: EventTarget | null) => {
    if (
      phaseRef.current !== "settled" ||
      suppressBlankClickRef.current ||
      (target instanceof Element && target.closest("[data-preview-card]"))
    ) {
      return;
    }

    stopMotion();
    navigationStartedRef.current = false;
    const stride = Math.max(1, strideRef.current);
    const steps = Math.round((originRef.current - positionRef.current) / stride);
    const snappedPosition = originRef.current - steps * stride;
    const residual = positionRef.current - snappedPosition;
    setProxyCenterIndex(wrapIndex(steps, pack.missions.length));
    updateProxyPositions(residual);
    setPhase("closing-ready");
  };

  const proxyMissions = PROXY_OFFSETS.map((offset) =>
    pack.missions[wrapIndex(proxyCenterIndex + offset, pack.missions.length)],
  );

  return (
    <section
      aria-label={`${pack.title} Mission artwork preview`}
      className={styles.root}
      data-moving="false"
      data-phase={phase}
      onClick={(event) => closePreview(event.target)}
      onKeyDown={(event) => {
        if (event.key === "Escape") closePreview(event.currentTarget);
        if (phaseRef.current !== "settled" || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? -1 : 1;
        settleAt(nearestMissionSnap(positionRef.current) + direction * strideRef.current);
      }}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      ref={rootRef}
      style={style}
      tabIndex={0}
    >
      <ol aria-label="Mission artwork" className={styles.track} ref={trackRef}>
        {Array.from({ length: COPY_COUNT }, (_, copyIndex) =>
          pack.missions.map((mission, slot) => {
            const refIndex = copyIndex * pack.missions.length + slot;
            return (
              <GalleryCard
                copyIndex={copyIndex}
                key={`${copyIndex}-${mission.id}`}
                mission={mission}
                setRef={(element) => { galleryCardRefs.current[refIndex] = element; }}
              />
            );
          }),
        )}
      </ol>
      <ol aria-hidden="true" className={styles.proxyLayer}>
        {PROXY_OFFSETS.map((offset, index) => (
          <DistributionCard
            key={offset}
            mission={proxyMissions[index]}
            offset={offset}
            setRef={(element) => { proxyCardRefs.current[index] = element; }}
          />
        ))}
      </ol>
      <div className={styles.coverHero} data-preview-card>
        <ViewTransition
          default="none"
          name={getPackTransitionName(pack.slug, "bottom")}
          share="pack-card-morph"
        >
          <span className={styles.coverSurface}>
            <Image
              alt={`${pack.title} Pack cover`}
              className={styles.image}
              draggable={false}
              fill
              priority
              sizes="(max-width: 640px) 80vw, 340px"
              src={pack.cover}
            />
          </span>
        </ViewTransition>
      </div>
      <h1 className={styles.title}>{pack.title}</h1>
    </section>
  );
}
