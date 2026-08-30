// The pack wheel and calendar share the same under-damped settling character.
export const CAROUSEL_SNAP_SECONDS = .8;
export const CAROUSEL_SPRING_DAMPING_RATIO = .64;

export function advanceCarouselSpring(position: number, velocity: number, target: number, seconds: number) {
  const rate = 4.8 / CAROUSEL_SNAP_SECONDS;
  const damping = 2 * rate * CAROUSEL_SPRING_DAMPING_RATIO;
  const nextVelocity = (velocity + (target - position) * rate * rate * seconds) * Math.exp(-damping * seconds);
  return { position: position + nextVelocity * seconds, velocity: nextVelocity };
}
