"use client";

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, ViewTransition, type PointerEvent, type Ref } from "react";
import { useRouter } from "next/navigation";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import type { CarouselPlacement } from "@/features/packs/model/arc-carousel-geometry";
import type { CarouselHandle } from "@/features/packs/model/carousel-handle";
import type { CarouselSnapshot } from "@/features/packs/model/home-carousel-state";
import { advanceCarouselSpring } from "@/features/packs/model/carousel-spring";
import { PACK_CLOSE_TRANSITION_TYPE, PACK_OPEN_TRANSITION_TYPE } from "@/features/packs/model/pack-transition";
import { calendarSnapshot, clampMonth, getCalendarRange, getMonthSnapTarget, localDateKey, monthKey, monthLabel, resistMonthPosition, restoreCalendarPosition, visibleMonths } from "../model/calendar-month";
import { getDayGalleryHref } from "../model/calendar-day-transition";
import { calendarPose, getCalendarGeometry, type CalendarGeometry } from "../model/calendar-geometry";
import { CalendarMonth } from "./CalendarMonth";
import styles from "./CalendarCarousel.module.css";

type CalendarCarouselProps = {
  data: MissionCalendarData;
  placement: CarouselPlacement;
  snapshot: CarouselSnapshot | null;
  interactionDisabled: boolean;
  swappingIn: boolean;
  onOpenDate: (date: string, placement: CarouselPlacement) => void;
  returnDate?: string;
  ref?: Ref<CarouselHandle>;
};
type MonthDrag = { pointerId: number; startX: number; startPosition: number; lastX: number; lastTime: number; velocity: number; captured: boolean };

export function CalendarCarousel({ data, placement, snapshot, interactionDisabled, swappingIn, onOpenDate, returnDate, ref }: CalendarCarouselProps) {
  const router = useRouter();
  // HomeCarouselEntry mounts this on the client. Dates must be present in the
  // navigation's FIRST render: adding them in a layout effect is too late for
  // React to pair their ViewTransition names with the departing gallery hero.
  const [range] = useState(() => getCalendarRange(data.registeredOn, localDateKey(new Date())));
  const [initialPosition] = useState(() => range ? restoreCalendarPosition(snapshot, range) : 0);
  const [center, setCenter] = useState(Math.round(initialPosition));
  const [geometry, setGeometry] = useState<CalendarGeometry | null>(() => typeof window === "undefined" ? null
    : getCalendarGeometry(window.innerWidth, window.innerHeight, window.matchMedia("(pointer: coarse)").matches, placement));
  const completedOn = useMemo(() => new Set(data.completedOn), [data.completedOn]);
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef(new Map<number, HTMLDivElement>());
  const geometryRef = useRef(geometry);
  const positionRef = useRef(initialPosition);
  const centerRef = useRef(center);
  const frameRef = useRef<number | null>(null);
  const paintFrameRef = useRef<number | null>(null);
  const dragRef = useRef<MonthDrag | null>(null);
  const lockedRef = useRef(interactionDisabled);
  const reducedRef = useRef(false);
  const suppressDateClickUntilRef = useRef(0);
  const restoredFocusRef = useRef(false);

  useEffect(() => {
    // Prefetch only the visible month's recorded dates, not the whole history.
    const prefix = monthKey(center);
    for (const date of completedOn) {
      if (date.startsWith(prefix)) router.prefetch(getDayGalleryHref(date));
    }
  }, [center, completedOn, router]);

  useEffect(() => {
    if (restoredFocusRef.current || interactionDisabled || !returnDate || !geometry) return;
    const target = stageRef.current?.querySelector<SVGElement>(`[data-completed-date="${returnDate}"]`);
    target?.focus({ preventScroll: true });
    if (target) restoredFocusRef.current = true;
  }, [interactionDisabled, returnDate, geometry]);

  const paint = useCallback(() => {
    paintFrameRef.current = null;
    const metrics = geometryRef.current;
    if (!metrics) return;
    panelsRef.current.forEach((element, month) => {
      const pose = calendarPose(month - positionRef.current, metrics);
      element.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0)`;
    });
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (paintFrameRef.current !== null) cancelAnimationFrame(paintFrameRef.current);
    frameRef.current = null;
    paintFrameRef.current = null;
    if (stageRef.current) stageRef.current.dataset.moving = "false";
  }, []);

  const releasePointer = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && stageRef.current?.hasPointerCapture(drag.pointerId)) stageRef.current.releasePointerCapture(drag.pointerId);
  }, []);

  const commit = useCallback((position: number) => {
    positionRef.current = position;
    centerRef.current = Math.round(position);
    setCenter(centerRef.current);
    paint();
  }, [paint]);

  const settle = useCallback((velocity: number, requested?: number) => {
    if (!range) return;
    stop();
    const target = requested === undefined
      ? getMonthSnapTarget(positionRef.current, velocity, centerRef.current, range)
      : clampMonth(Math.max(centerRef.current - 1, Math.min(centerRef.current + 1, requested)), range);
    if (reducedRef.current || Math.abs(positionRef.current - target) < .0001 && Math.abs(velocity) < .001) {
      commit(target);
      return;
    }
    let speed = Math.max(-4, Math.min(4, velocity));
    let previous = performance.now();
    const started = previous;
    if (stageRef.current) stageRef.current.dataset.moving = "true";
    const tick = (now: number) => {
      const dt = Math.min(.032, Math.max(0, now - previous) / 1000);
      previous = now;
      const next = advanceCarouselSpring(positionRef.current, speed, target, dt);
      speed = next.velocity;
      positionRef.current = next.position;
      if (now - started > 2600 || Math.abs(speed) < .0015 && Math.abs(next.position - target) < .0008) {
        stop();
        commit(target);
        return;
      }
      paint();
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [commit, paint, range, stop]);

  const finishImmediately = useCallback(() => {
    stop();
    releasePointer();
    if (range) commit(clampMonth(Math.round(positionRef.current), range));
  }, [commit, range, releasePointer, stop]);

  useImperativeHandle(ref, () => ({
    freezeAndSnapshot() {
      lockedRef.current = true;
      stop();
      releasePointer();
      if (!range) return null;
      const saved = calendarSnapshot(positionRef.current, range);
      positionRef.current = saved.position;
      paint();
      return saved;
    },
    resume() {
      lockedRef.current = false;
      settle(0);
    },
    getElement: () => rootRef.current,
  }), [paint, range, releasePointer, settle, stop]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const measure = () => {
      const metrics = getCalendarGeometry(root.clientWidth, root.clientHeight, coarse.matches, placement);
      const previous = geometryRef.current;
      // The first observer delivery isn't a resize. Avoid a redundant sync
      // render during the shared transition when the geometry already matches.
      if (previous && previous.width === metrics.width && previous.height === metrics.height
        && previous.rowHeight === metrics.rowHeight && previous.labelHeight === metrics.labelHeight
        && previous.fontSize === metrics.fontSize && previous.weekdayFontSize === metrics.weekdayFontSize) return;
      if (previous && (dragRef.current || frameRef.current !== null)) finishImmediately();
      geometryRef.current = metrics;
      setGeometry(metrics);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    coarse.addEventListener("change", measure);
    return () => { observer.disconnect(); coarse.removeEventListener("change", measure); };
  }, [finishImmediately, placement]);

  useLayoutEffect(() => { paint(); }, [center, geometry, paint]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      reducedRef.current = reduced.matches;
      if (reduced.matches && (frameRef.current !== null || dragRef.current)) finishImmediately();
    };
    const visibility = () => { if (document.hidden) finishImmediately(); };
    preference();
    reduced.addEventListener("change", preference);
    window.addEventListener("blur", finishImmediately);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      reduced.removeEventListener("change", preference);
      window.removeEventListener("blur", finishImmediately);
      document.removeEventListener("visibilitychange", visibility);
      stop();
      releasePointer();
    };
  }, [finishImmediately, releasePointer, stop]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let lastWheel = -Infinity;
    let accumulated = 0;
    const wheel = (event: WheelEvent) => {
      if (lockedRef.current || !range || event.ctrlKey) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      accumulated += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      if (Math.abs(accumulated) < 32 || event.timeStamp - lastWheel < 350) return;
      settle(0, centerRef.current + Math.sign(accumulated));
      accumulated = 0;
      lastWheel = event.timeStamp;
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    return () => stage.removeEventListener("wheel", wheel);
  }, [range, settle]);

  const finishDrag = (cancelled = false) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.captured || cancelled) suppressDateClickUntilRef.current = performance.now() + 350;
    const velocity = cancelled || performance.now() - drag.lastTime > 100 ? 0 : drag.velocity;
    releasePointer();
    settle(velocity);
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (lockedRef.current || !range || !event.isPrimary || event.button !== 0 || dragRef.current) return;
    stop();
    suppressDateClickUntilRef.current = 0;
    stageRef.current?.focus({ preventScroll: true });
    dragRef.current = {
      pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX,
      startPosition: positionRef.current, lastTime: performance.now(), velocity: 0, captured: false,
    };
  };

  const openDate = useCallback((date: string) => {
    if (lockedRef.current || interactionDisabled || dragRef.current || performance.now() < suppressDateClickUntilRef.current) return;
    // An interrupted month fling may already belong to the neighboring month.
    // Only open a date whose anchor will exist in the captured return snapshot.
    if (Math.round(positionRef.current) !== centerRef.current) return;
    if (!range || date < range.registeredOn || date > range.today || !completedOn.has(date) || !date.startsWith(monthKey(centerRef.current))) return;
    onOpenDate(date, placement);
  }, [completedOn, interactionDisabled, onOpenDate, placement, range]);

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const metrics = geometryRef.current;
    if (!drag || !metrics || !range || lockedRef.current || drag.pointerId !== event.pointerId) return;
    if (!drag.captured && Math.abs(event.clientX - drag.startX) < 5) return;
    if (!drag.captured) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.moving = "true";
    }
    const now = performance.now();
    const distance = metrics.width + 16;
    const velocity = -(event.clientX - drag.lastX) / distance / Math.max(.008, (now - drag.lastTime) / 1000);
    drag.velocity = drag.velocity * .35 + velocity * .65;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    positionRef.current = resistMonthPosition(
      drag.startPosition - (event.clientX - drag.startX) / distance,
      Math.max(range.first, centerRef.current - 1), Math.min(range.last, centerRef.current + 1),
    );
    if (paintFrameRef.current === null) paintFrameRef.current = requestAnimationFrame(paint);
  };

  const enterClass = placement === "top" ? "pack-home-top-enter" : "pack-home-enter";
  const exitClass = placement === "top" ? "pack-home-top-exit" : "pack-home-exit";

  return (
    <ViewTransition default="none"
      enter={{ [PACK_CLOSE_TRANSITION_TYPE]: enterClass, default: enterClass }}
      exit={{ [PACK_OPEN_TRANSITION_TYPE]: exitClass, default: "none" }}>
      <section ref={rootRef} className={styles.root} data-placement={placement} data-swapping-in={swappingIn}
        inert={interactionDisabled} aria-label={`${placement === "top" ? "上轮盘" : "下轮盘"}：日历（模拟数据）/ Calendar (mock)`}>
        <div className={styles.stage} ref={stageRef} role="group" tabIndex={range ? 0 : -1}
          aria-label="左右滑动或使用左右方向键切换月份 / Swipe or use arrow keys to change month"
          onPointerDown={pointerDown} onPointerMove={pointerMove}
          onPointerUp={(event) => { if (dragRef.current?.pointerId === event.pointerId) finishDrag(); }}
          onPointerCancel={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) finishDrag(true);
          }}
          onLostPointerCapture={(event) => {
            // Touch implicitly captures the original SVG child. Its loss bubbles
            // when we capture on the stage; that transfer must not end the drag.
            if (
              event.target === event.currentTarget &&
              dragRef.current?.pointerId === event.pointerId &&
              !event.currentTarget.hasPointerCapture(event.pointerId)
            ) finishDrag(true);
          }}
          onPointerLeave={(event) => {
            if (dragRef.current?.pointerId === event.pointerId && !dragRef.current.captured) finishDrag(true);
          }}
          onKeyDown={(event) => {
            if (lockedRef.current) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              settle(0, centerRef.current + (event.key === "ArrowLeft" ? -1 : 1));
            }
          }}>
          {range && geometry ? (
            <div className={styles.orbit} style={{ width: geometry.width, height: geometry.panelHeight }}>
              {visibleMonths(center, range).map((month) => (
                <div key={month} className={styles.month} aria-hidden={month !== center}
                  ref={(element) => { if (element) panelsRef.current.set(month, element); else panelsRef.current.delete(month); }}>
                  <CalendarMonth month={month} range={range} geometry={geometry} completedOn={completedOn}
                    active={month === center} onOpenDate={openDate} />
                </div>
              ))}
            </div>
          ) : !range ? <p className={styles.empty}>暂无日历 / Calendar unavailable</p> : null}
        </div>
        <p className={styles.srOnly} aria-live="polite">{range ? `${monthLabel(center)}，可浏览 ${monthLabel(range.first)} 至 ${monthLabel(range.last)}` : "暂无日历"}</p>
      </section>
    </ViewTransition>
  );
}
