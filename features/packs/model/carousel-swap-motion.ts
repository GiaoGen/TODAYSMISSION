import type { CarouselPlacement } from "./arc-carousel-geometry";

export function getCarouselSwapKeyframes(
  placement: CarouselPlacement,
  phase: "exiting" | "entering",
  reducedMotion: boolean,
): Keyframe[] {
  const visible = { opacity: 1, transform: "translate3d(0, 0, 0)" };
  const hidden = {
    opacity: 0,
    transform: reducedMotion ? visible.transform : `translate3d(0, ${placement === "top" ? -112 : 112}vh, 0)`,
  };
  return phase === "exiting" ? [visible, hidden] : [hidden, visible];
}

export function animateCarouselPair(
  elements: Record<CarouselPlacement, HTMLElement>,
  phase: "exiting" | "entering",
  reducedMotion: boolean,
  placements: readonly CarouselPlacement[] = ["top", "bottom"],
) {
  const startTime = elements.top.ownerDocument.timeline.currentTime;
  const animations = placements.map((placement) => {
    const animation = elements[placement].animate(
      getCarouselSwapKeyframes(placement, phase, reducedMotion),
      {
        duration: reducedMotion ? 80 : 520,
        easing: phase === "exiting" ? "cubic-bezier(0.32, 0, 0.22, 1)" : "cubic-bezier(0.22, 0.72, 0.18, 1)",
        fill: "both",
      },
    );
    if (startTime !== null) animation.startTime = startTime;
    return animation;
  });
  return {
    finished: Promise.allSettled(animations.map((animation) => animation.finished)),
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}
