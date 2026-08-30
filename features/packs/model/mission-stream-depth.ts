export type StreamPose = { y: number; scale: number; opacity: number };
const POSES: readonly StreamPose[] = [
  { y: 0, scale: 1, opacity: 1 }, { y: 28, scale: .88, opacity: .68 },
  { y: 56, scale: .78, opacity: .32 }, { y: 76, scale: .72, opacity: .12 },
];
export const STREAM_DEPTH_DURATION = 450;

export function getStreamPose(distance: number): StreamPose {
  return POSES[Math.min(3, Math.abs(Math.round(distance)))];
}

// The prototype's cubic-bezier(.2,.75,.2,1), sampled without layout reads.
function ease(progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 16; step++) {
    const t = (low + high) / 2;
    const x = 3 * (1 - t) * t * .2 + t ** 3;
    if (x < progress) low = t; else high = t;
  }
  const t = (low + high) / 2;
  return 3 * (1 - t) ** 2 * t * .75 + 3 * (1 - t) * t * t + t ** 3;
}

type Motion = { from: StreamPose; to: StreamPose; started: number };
function sample(motion: Motion, time: number): StreamPose {
  const progress = ease((time - motion.started) / STREAM_DEPTH_DURATION);
  return {
    y: motion.from.y + (motion.to.y - motion.from.y) * progress,
    scale: motion.from.scale + (motion.to.scale - motion.from.scale) * progress,
    opacity: motion.from.opacity + (motion.to.opacity - motion.from.opacity) * progress,
  };
}

// Keep the prototype's 450ms depth animation, but transfer in-flight poses to
// the equivalent copies at a loop seam. Plain CSS transitions would restart on
// the new copies and visibly flash. This state is bounded by the mounted cards.
export class MissionStreamDepth {
  private motions: Motion[] = [];
  private center = NaN;

  update(count: number, center: number, time: number, rebase = 0, immediate = false) {
    if (!immediate && rebase === 0 && this.motions.length === count && center === this.center) return;
    this.center = center;
    const previous = this.motions;
    this.motions = Array.from({ length: count }, (_, index) => {
      const to = getStreamPose(index - center);
      const motion = previous[index + rebase];
      if (!motion || immediate) return { from: to, to, started: time - STREAM_DEPTH_DURATION };
      return motion.to === to ? motion : { from: sample(motion, time), to, started: time };
    });
  }

  sample(time: number) { return this.motions.map(motion => sample(motion, time)); }
  isMoving(time: number) { return this.motions.some(motion => time - motion.started < STREAM_DEPTH_DURATION); }
}
