import { wrapNativeIndex } from "./safari-scroll.ts";

export type NativeScrollLayout = { count: number; copies: number; stride: number };
export type NativeScrollSelection = { index: number; slot: number; position: number };

type NativeScrollOptions = NativeScrollLayout & {
  position?: number;
  disabled?: boolean;
  manualBrowsingEnabled?: boolean;
  manualBrowsingBoundary?: { minIndex: number; maxIndex: number };
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
  let manualBrowsingEnabled = options.manualBrowsingEnabled ?? true;
  let manualBrowsingBoundary = options.manualBrowsingBoundary;
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
  let programmaticSelection = false;
  let lastAllowedLeft = 0;
  let touchStart: { x: number; y: number } | null = null;
  const supportsScrollEnd = Reflect.has(viewport, "onscrollend");
  const baseSlot = () => Math.floor(layout.copies / 2) * layout.count;
  const maxOffset = () => Math.max(0, layout.count * layout.copies - 1) * layout.stride;
  const bounded = (left: number) => Math.max(0, Math.min(maxOffset(), left));
  const manualBounded = (left: number) => {
    const boundary = manualBrowsingBoundary;
    if (manualBrowsingEnabled || !boundary || layout.stride <= 0) return bounded(left);
    const logicalPosition = bounded(left) / layout.stride - baseSlot();
    const constrainedPosition = Math.max(boundary.minIndex, Math.min(boundary.maxIndex, logicalPosition));
    return bounded((baseSlot() + constrainedPosition) * layout.stride);
  };
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
    const boundedLeft = bounded(left);
    lastAllowedLeft = boundedLeft;
    silentOffset = boundedLeft;
    viewport.scrollTo({ left: boundedLeft, behavior: "instant" });
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
      lastAllowedLeft = bounded(left);
      programmaticSelection = false;
      markMoving(false);
      flushIdleWork();
      return;
    }
    silentOffset = null;
    if (!manualBrowsingEnabled && manualBrowsingBoundary) {
      const allowed = manualBounded(left);
      if (Math.abs(left - allowed) > POSITION_EPSILON) {
        jump(allowed);
        markMoving(false);
        return;
      }
    }
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
    lastAllowedLeft = bounded(viewport.scrollLeft);
    programmaticSelection = false;
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
    if (!manualBrowsingEnabled && silentOffset !== null && Math.abs(viewport.scrollLeft - silentOffset) <= POSITION_EPSILON) {
      silentOffset = null;
      return;
    }
    if (!manualBrowsingEnabled && manualBrowsingBoundary && !programmaticSelection) {
      const allowed = manualBounded(viewport.scrollLeft);
      if (Math.abs(viewport.scrollLeft - allowed) > POSITION_EPSILON) {
        blockUserScroll();
        return;
      }
    } else if (!manualBrowsingEnabled && !programmaticSelection) {
      blockUserScroll();
      return;
    }
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
    pointerStart = { x: event.clientX, y: event.clientY };
    if (!manualBrowsingEnabled) lastAllowedLeft = manualBounded(viewport.scrollLeft);
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
  const onTouchStart = (event: TouchEvent) => {
    touching = true;
    clearTimer();
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
    if (!manualBrowsingEnabled) lastAllowedLeft = manualBounded(viewport.scrollLeft);
  };
  const onTouchMove = (event: TouchEvent) => {
    if (manualBrowsingEnabled || (manualBrowsingBoundary && manualBrowsingBoundary.maxIndex > manualBrowsingBoundary.minIndex) || locked || !touchStart || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) <= 4) return;
    event.preventDefault();
    blockUserScroll();
  };
  const onTouchEnd = (event: TouchEvent) => {
    touching = event.touches.length > 0;
    if (!touching) touchStart = null;
    if (!touching && !manualBrowsingEnabled && !programmaticSelection) blockUserScroll();
    if (!touching && moving) scheduleQuietCheck();
    else if (!touching) flushIdleWork();
  };
  const onWheel = (event: WheelEvent) => {
    if (manualBrowsingEnabled || (manualBrowsingBoundary && manualBrowsingBoundary.maxIndex > manualBrowsingBoundary.minIndex) || locked) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    if (!horizontal) return;
    event.preventDefault();
    blockUserScroll();
  };
  const listeners: [string, EventListener, AddEventListenerOptions?][] = [
    ["scroll", onScroll], ["pointerdown", onPointerDown as EventListener],
    ["pointerup", onPointerUp as EventListener], ["pointercancel", onPointerCancel],
    ["touchstart", onTouchStart as EventListener], ["touchmove", onTouchMove as EventListener, { passive: false }],
    ["touchend", onTouchEnd as EventListener], ["touchcancel", onTouchEnd as EventListener],
    ["wheel", onWheel as EventListener, { passive: false }],
  ];
  if (supportsScrollEnd) listeners.push(["scrollend", onScrollEnd]);
  listeners.forEach(([name, handler, eventOptions]) => viewport.addEventListener(name, handler, eventOptions ?? { passive: true }));

  function blockUserScroll() {
    if (disposed || locked || manualBrowsingEnabled || programmaticSelection) return;
    clearTimer();
    cancelVisualFrame();
    revision++;
    pointerStart = null;
    const target = manualBounded(lastAllowedLeft);
    if (Math.abs(viewport.scrollLeft - target) > POSITION_EPSILON) jump(target);
    markMoving(false);
  }

  const controller = {
    restore(next: NativeScrollLayout, requestedPosition: number) {
      clearTimer();
      revision++;
      layout = { ...next, stride: Math.max(1, next.stride) };
      calibrated = true;
      const normalized = layout.copies > 1 ? wrapNativeIndex(requestedPosition, layout.count)
        : Math.max(0, Math.min(Math.max(0, layout.count - 1), requestedPosition));
      jump((baseSlot() + normalized) * layout.stride);
      programmaticSelection = false;
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
      programmaticSelection = true;
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
      if (!manualBrowsingEnabled) blockUserScroll();
      flushIdleWork();
    },
    setManualBrowsing(enabled: boolean, boundary?: { minIndex: number; maxIndex: number }) {
      manualBrowsingEnabled = enabled;
      manualBrowsingBoundary = boundary;
      viewport.dataset.nativeManualBrowsingEnabled = String(enabled);
      if (!enabled) blockUserScroll();
    },
    setManualBrowsingEnabled(enabled: boolean) {
      manualBrowsingEnabled = enabled;
      viewport.dataset.nativeManualBrowsingEnabled = String(enabled);
      if (!enabled) blockUserScroll();
    },
    rebaseMissionOrder(indexDelta: number) {
      if (disposed || locked || indexDelta === 0) return;
      jump(viewport.scrollLeft - indexDelta * layout.stride);
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
  viewport.dataset.nativeManualBrowsingEnabled = String(manualBrowsingEnabled);
  controller.restore(options, options.position ?? 0);
  return controller;
}

export type NativeScrollController = ReturnType<typeof createNativeScrollController>;
