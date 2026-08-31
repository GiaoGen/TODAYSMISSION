import { createNativeScrollController, type NativeScrollController } from "./native-scroll-controller.ts";

type NativeMissionGalleryOptions = {
  root: HTMLElement;
  viewport: HTMLElement;
  cards: readonly (HTMLLIElement | null)[];
  count: number;
  copies: () => number;
  cardClass: string;
  navigateHome: () => void;
};

// The existing shared hero and route boundary are retained. Only the horizontal
// interaction layer differs; expansion/collapse remain short CSS transitions.
export function mountNativeMissionGallery({ root, viewport, cards, count, copies, cardClass, navigateHome }: NativeMissionGalleryOptions) {
  let controller: NativeScrollController | undefined;
  let disposed = false;
  let interactive = false;
  let width = 0;
  let cardWidth = 0;
  let stride = 1;
  let measuredCopies = 0;
  let focusedSlot = -1;
  let lastPosition = 0;
  let closeFrame = 0;
  let readyTimer = 0;
  const isDay = root.dataset.kind === "day";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const paintFocus = (slot: number) => {
    for (let index = Math.max(0, focusedSlot - 2); index <= focusedSlot + 2; index++) {
      if (cards[index]) delete cards[index]!.dataset.nativeDistance;
    }
    focusedSlot = slot;
    for (let index = Math.max(0, slot - 2); index <= slot + 2; index++) {
      if (cards[index]) cards[index]!.dataset.nativeDistance = String(Math.abs(index - slot));
    }
  };
  const updateCollapsedOffsets = () => {
    const left = viewport.scrollLeft;
    const edge = (width - cardWidth) / 2;
    cards.forEach((card, index) => {
      if (!card) return;
      const center = edge + index * stride + cardWidth / 2 - left;
      // The first day card is also the shared return card, even after scrolling
      // it offscreen. Keep its live collapse offset and never cull it on close.
      const visible = (isDay && index === 0) || (center > -cardWidth && center < width + cardWidth);
      card.dataset.nativeVisible = String(visible);
      if (!visible) return;
      card.style.setProperty("--mission-collapsed-x", `${width / 2 - center}px`);
      card.style.setProperty("--mission-delay", `${Math.min(4, Math.abs(index - Math.round(left / stride))) * 36}ms`);
    });
  };
  const measureNow = () => {
    if (disposed || root.dataset.phase === "closing" || !cards[0]) return;
    const nextWidth = viewport.clientWidth;
    const nextCardWidth = cards[0].offsetWidth;
    const nextStride = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : nextCardWidth;
    const nextCopies = copies();
    if (width === nextWidth && cardWidth === nextCardWidth && stride === nextStride && measuredCopies === nextCopies) return;
    width = nextWidth;
    cardWidth = nextCardWidth;
    stride = Math.max(1, nextStride);
    measuredCopies = nextCopies;
    viewport.style.setProperty("--native-edge", `${Math.max(0, (width - cardWidth) / 2)}px`);
    const layout = { count, copies: nextCopies, stride };
    if (controller) controller.restore(layout, lastPosition);
    else controller = createNativeScrollController(viewport, {
      ...layout, disabled: true, reducedMotion: reduced,
      onSettled: ({ slot, position }) => { lastPosition = position; paintFocus(slot); },
    });
    if (!interactive) updateCollapsedOffsets();
  };
  const measure = () => {
    if (controller) controller.whenIdle(measureNow);
    else measureNow();
  };
  const close = () => {
    if (!interactive || disposed) return;
    interactive = false;
    controller?.freeze();
    updateCollapsedOffsets();
    root.dataset.phase = "closing";
    closeFrame = requestAnimationFrame(() => {
      void Promise.allSettled(root.getAnimations({ subtree: true }).map(animation => animation.finished)).then(() => {
        if (!disposed) navigateHome();
      });
    });
  };
  const onClick = (event: MouseEvent) => {
    if (!interactive || !controller?.canActivate()) return;
    if (event.target instanceof Element && event.target.closest(`.${cardClass}`)) return;
    close();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!interactive) return;
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (count > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const base = Math.floor(measuredCopies / 2) * count;
      controller?.selectSlot(base + Math.round(controller.position()) + (event.key === "ArrowRight" ? 1 : -1));
    }
  };

  root.dataset.phase = "collapsed";
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(viewport);
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  const finishExpansion = () => {
    if (disposed) return;
    root.dataset.phase = "settled";
    interactive = true;
    controller?.resume();
    root.focus({ preventScroll: true });
  };
  const expandFrame = requestAnimationFrame(() => {
    if (isDay) root.getAnimations({ subtree: true });
    root.dataset.phase = "expanding";
    if (isDay) {
      void Promise.allSettled(root.getAnimations({ subtree: true }).map(animation => animation.finished))
        .then(finishExpansion);
    }
  });
  if (!isDay) readyTimer = window.setTimeout(finishExpansion, reduced ? 320 : 1600);

  return {
    measure,
    whenIdle(work: () => void) {
      const apply = () => { work(); measureNow(); };
      if (controller) controller.whenIdle(apply);
      else apply();
    },
    destroy() {
      disposed = true;
      observer.disconnect();
      controller?.destroy();
      cancelAnimationFrame(expandFrame);
      cancelAnimationFrame(closeFrame);
      window.clearTimeout(readyTimer);
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
    },
  };
}
