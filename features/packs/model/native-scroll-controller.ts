import { wrapNativeIndex } from "./safari-scroll.ts";

export type NativeScrollLayout = { count: number; copies: number; stride: number };
export type NativeScrollSelection = { index: number; slot: number; position: number };

type NativeScrollOptions = NativeScrollLayout & {
  position?: number;
  disabled?: boolean;
  reducedMotion?: boolean;
  onProgress?: (selection: NativeScrollSelection) => void;
  onSettled: (selection: NativeScrollSelection) => void;
};

const QUIET_MS = 240;
const STABLE_MS = 100;
const POSITION_EPSILON = 1;

// Native touch/trackpad scrolling owns the offset. No move listener, velocity
// integration or DOM measurement is used while scrolling. Optional visual work
// is coalesced into one frame; it never drives the native scroll offset.
export function createNativeScrollController(viewport: HTMLElement, options: NativeScrollOptions) {
  let layout: NativeScrollLayout = options;
  let locked = options.disabled ?? false;
  let disposed = false;
  let moving = false;
  let touching = false;
  let pointerStart: { x: number; y: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let revision = 0;
  let lastScrollTime = 0;
  let suppressClickUntil = 0;
  let calibrated = false;
  let silentOffset: number | null = null;
  let idleWork: (() => void) | null = null;
  let visualFrame: number | null = null;
  const supportsScrollEnd = Reflect.has(viewport, "onscrollend");
  const baseSlot = () => Math.floor(layout.copies / 2) * layout.count;
  const maxOffset = () => Math.max(0, layout.count * layout.copies - 1) * layout.stride;
  const bounded = (left: number) => Math.max(0, Math.min(maxOffset(), left));
  const position = () => layout.stride > 0 ? bounded(viewport.scrollLeft) / layout.stride - baseSlot() : 0;
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const markMoving = (value: boolean) => {
    moving = value;
    viewport.dataset.nativeScrolling = String(value);
  };
  const cancelVisualFrame = () => {
    if (visualFrame !== null) cancelAnimationFrame(visualFrame);
    visualFrame = null;
  };
  const selection = () => {
    const value = position();
    return { position: value, index: wrapNativeIndex(Math.round(value), layout.count), slot: Math.round(value) + baseSlot() };
  };
  const publish = () => {
    cancelVisualFrame();
    const value = selection();
    options.onProgress?.(value);
    options.onSettled(value);
  };
  const jump = (left: number) => {
    silentOffset = left;
    viewport.scrollTo({ left, behavior: "instant" });
  };
  const flushIdleWork = () => {
    const work = idleWork;
    idleWork = null;
    work?.();
  };
  const finish = () => {
    if (disposed || locked || touching) return;
    clearTimer();
    const left = viewport.scrollLeft;
    if (silentOffset !== null && Math.abs(left - silentOffset) <= POSITION_EPSILON) {
      silentOffset = null;
      markMoving(false);
      flushIdleWork();
      return;
    }
    silentOffset = null;
    // Rubber-banding is not a stable position, even if a timer has gone quiet.
    if (Math.abs(left - bounded(left)) > POSITION_EPSILON) return;
    const nearest = Math.round(left / layout.stride) * layout.stride;
    if (!calibrated && Math.abs(nearest - left) > POSITION_EPSILON && layout.count > 1) {
      calibrated = true;
      markMoving(true);
      viewport.scrollTo({ left: nearest, behavior: options.reducedMotion ? "instant" : "smooth" });
      scheduleQuietCheck();
      return;
    }
    // Move to an equivalent copy only at rest, preserving any sub-pixel offset.
    // Neither this jump nor its scrollend may start another correction cycle.
    if (layout.copies > 1) {
      const canonical = (baseSlot() + wrapNativeIndex(position(), layout.count)) * layout.stride;
      if (Math.abs(canonical - left) > POSITION_EPSILON) jump(canonical);
    }
    markMoving(false);
    suppressClickUntil = performance.now() + 180;
    publish();
    flushIdleWork();
  };
  function scheduleQuietCheck() {
    clearTimer();
    // Modern Safari supplies a real completion signal. Do not race it with a
    // debounce timer that could mistake a compositor pause for the end of inertia.
    if (supportsScrollEnd) return;
    const token = revision;
    timer = setTimeout(() => {
      if (disposed || locked || touching || token !== revision) return;
      const first = viewport.scrollLeft;
      timer = setTimeout(() => {
        if (disposed || locked || touching || token !== revision) return;
        if (Math.abs(first - viewport.scrollLeft) <= POSITION_EPSILON && performance.now() - lastScrollTime >= QUIET_MS) finish();
        // A changing position without scroll events is not evidence of rest.
      }, STABLE_MS);
    }, QUIET_MS);
  }
  const onScroll = () => {
    if (disposed || locked) return;
    // No offset read/write here. Only the visible artwork consumes progress,
    // once per rendering frame, independently of scrollend and snap correction.
    revision++;
    lastScrollTime = performance.now();
    if (!moving) {
      calibrated = false;
      markMoving(true);
    }
    scheduleQuietCheck();
    if (options.onProgress && visualFrame === null) {
      visualFrame = requestAnimationFrame(() => {
        visualFrame = null;
        if (!disposed && !locked) options.onProgress?.(selection());
      });
    }
  };
  const onScrollEnd = () => {
    if (moving) finish();
  };
  const onPointerDown = (event: PointerEvent) => {
    if (disposed || locked) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    if (!moving) suppressClickUntil = 0;
    calibrated = false;
    silentOffset = null;
    revision++;
    clearTimer();
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
      suppressClickUntil = performance.now() + 240;
    }
    pointerStart = null;
    if (moving) scheduleQuietCheck();
  };
  const onPointerCancel = () => { pointerStart = null; suppressClickUntil = performance.now() + 240; };
  const onTouchStart = () => {
    if (disposed || locked) return;
    touching = true;
    clearTimer();
  };
  const onTouchEnd = (event: TouchEvent) => {
    touching = event.touches.length > 0;
    if (!touching && moving) scheduleQuietCheck();
    else if (!touching) flushIdleWork();
  };
  const listeners: [string, EventListener][] = [
    ["scroll", onScroll], ["pointerdown", onPointerDown as EventListener],
    ["pointerup", onPointerUp as EventListener], ["pointercancel", onPointerCancel],
    ["touchstart", onTouchStart], ["touchend", onTouchEnd as EventListener], ["touchcancel", onTouchEnd as EventListener],
  ];
  if (supportsScrollEnd) listeners.push(["scrollend", onScrollEnd]);
  listeners.forEach(([name, handler]) => viewport.addEventListener(name, handler, { passive: true }));

  const controller = {
    restore(next: NativeScrollLayout, requestedPosition: number) {
      clearTimer();
      revision++;
      layout = { ...next, stride: Math.max(1, next.stride) };
      calibrated = true;
      const normalized = layout.copies > 1 ? wrapNativeIndex(requestedPosition, layout.count)
        : Math.max(0, Math.min(Math.max(0, layout.count - 1), requestedPosition));
      jump((baseSlot() + normalized) * layout.stride);
      markMoving(false);
      publish();
    },
    position,
    isMoving: () => moving || touching,
    canActivate: () => !locked && !moving && !touching && performance.now() >= suppressClickUntil,
    whenIdle(work: () => void) {
      if (moving || touching) idleWork = work;
      else work();
    },
    selectSlot(slot: number) {
      if (locked || touching) return;
      clearTimer();
      silentOffset = null;
      calibrated = true;
      const left = bounded(slot * layout.stride);
      if (Math.abs(viewport.scrollLeft - left) <= POSITION_EPSILON) { finish(); return; }
      markMoving(true);
      viewport.scrollTo({ left, behavior: options.reducedMotion ? "instant" : "smooth" });
      scheduleQuietCheck();
    },
    freeze() {
      cancelVisualFrame();
      if (options.onProgress) options.onProgress(selection());
      const current = position();
      locked = true;
      touching = false;
      pointerStart = null;
      clearTimer();
      viewport.dataset.nativeLocked = "true";
      // Explicit menu/navigation action, never a move/scroll handler. Stop at
      // the exact visible offset so the shared-cover/collapse snapshot matches.
      jump(bounded(viewport.scrollLeft));
      markMoving(false);
      return current;
    },
    resume() {
      locked = false;
      viewport.dataset.nativeLocked = "false";
      flushIdleWork();
    },
    setInteractionLocked(nextLocked: boolean) {
      if (disposed || locked === nextLocked) return;
      if (!nextLocked) {
        locked = false;
        viewport.dataset.nativeLocked = "false";
        return;
      }

      cancelVisualFrame();
      clearTimer();
      touching = false;
      pointerStart = null;
      locked = true;
      viewport.dataset.nativeLocked = "true";
      const snappedLeft = layout.stride > 0
        ? Math.round(bounded(viewport.scrollLeft) / layout.stride) * layout.stride
        : bounded(viewport.scrollLeft);
      jump(snappedLeft);
      markMoving(false);
    },
    destroy() {
      disposed = true;
      clearTimer();
      cancelVisualFrame();
      idleWork = null;
      listeners.forEach(([name, handler]) => viewport.removeEventListener(name, handler));
    },
  };
  viewport.dataset.nativeLocked = String(locked);
  controller.restore(options, options.position ?? 0);
  return controller;
}

export type NativeScrollController = ReturnType<typeof createNativeScrollController>;
