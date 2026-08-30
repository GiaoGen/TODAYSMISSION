export type CarouselPlacement = "top" | "bottom";

export type CarouselMetrics = {
  cardHeight: number;
  cardWidth: number;
  centerX: number;
  centerY: number;
  radius: number;
  stepAngle: number;
  verticalDirection: 1 | -1;
};

type CarouselMetricsInput = {
  coarsePointer?: boolean;
  height: number;
  placement?: CarouselPlacement;
  width: number;
};

const CARD_SPACING_SCALE = 0.85;
const CARD_TILT_SCALE = 0.35;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getCarouselMetrics({
  coarsePointer = false,
  height,
  placement = "bottom",
  width,
}: CarouselMetricsInput): CarouselMetrics {
  const shortSide = Math.min(width, height);
  const usesTouchLayout = coarsePointer || width < 720;
  const usesTabletScale = usesTouchLayout && shortSide >= 600;
  const cardWidth = usesTabletScale
    ? clamp(shortSide * 0.3, 220, 300)
    : usesTouchLayout
      ? clamp(shortSide * 0.46, 148, 220)
      : clamp(width * 0.16, 172, 236);
  const cardHeight = (cardWidth * 4) / 3;
  const gap = usesTouchLayout
    ? clamp(cardWidth * (usesTabletScale ? 0.18 : 0.16), 32, 54)
    : 50;
  const preferredActiveCenterY =
    height * (usesTouchLayout ? 0.44 : 0.42) + cardHeight;
  const activeCenterY = usesTouchLayout
    ? Math.min(
        preferredActiveCenterY,
        height - cardHeight * 0.52 - 12,
      )
    : preferredActiveCenterY;
  const radius = height * (usesTabletScale ? 0.8 : usesTouchLayout ? 0.75 : 0.86);
  // Scale after clamping so every viewport gets the same tighter spacing.
  const stepAngle =
    clamp(
      (cardWidth + gap * 2.5) / radius,
      usesTabletScale ? 0.36 : 0.42,
      usesTabletScale ? 0.54 : 0.6,
    ) * CARD_SPACING_SCALE;

  return {
    cardHeight,
    cardWidth,
    centerX: width / 2,
    centerY: placement === "top"
      ? height - activeCenterY - radius
      : activeCenterY + radius,
    radius,
    stepAngle,
    verticalDirection: placement === "top" ? -1 : 1,
  };
}

export function getCarouselCardPose(
  relativeSlot: number,
  metrics: CarouselMetrics,
) {
  const angle = relativeSlot * metrics.stepAngle;

  return {
    x: metrics.centerX + Math.sin(angle) * metrics.radius,
    y: metrics.centerY - metrics.verticalDirection * Math.cos(angle) * metrics.radius,
    // Ease the artwork tilt independently of the arc to open the inner corners.
    rotation: metrics.verticalDirection * angle * CARD_TILT_SCALE,
  };
}

export function getCarouselPointerAngle(
  x: number,
  y: number,
  metrics: CarouselMetrics,
) {
  // Reflect the input, not the artwork: a left drag moves either arc left.
  return Math.atan2(
    -(y - metrics.centerY) * metrics.verticalDirection,
    x - metrics.centerX,
  );
}

export function getRelativeSlot(
  itemIndex: number,
  position: number,
  count: number,
) {
  if (count < 6) {
    return itemIndex - position;
  }

  const offset = itemIndex - position;
  return ((((offset + count / 2) % count) + count) % count) - count / 2;
}

export function getActiveIndex(position: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  if (count < 6) {
    return clamp(Math.round(position), 0, count - 1);
  }

  return ((Math.round(position) % count) + count) % count;
}

export function getSnapTarget(position: number, count: number) {
  if (count <= 1) return 0;
  const target = Math.round(position);

  if (count < 6) {
    return clamp(target, 0, count - 1);
  }

  return target;
}

export type DeckMetrics = {
  cardWidth: number;
  cardHeight: number;
  centerY: number;
  unit: number;
  titleSize: number;
  gap: number;
  rotationStep: number;
  verticalDirection: 1 | -1;
};

// Preserve the prototype's dimensions and scale the whole design, including
// typography and gaps, only as much as needed to fit its half of the screen.
export function getDeckMetrics(input: CarouselMetricsInput): DeckMetrics {
  const { width, height, placement = "bottom" } = input;
  const legacy = getCarouselMetrics({ ...input, placement: "bottom" });
  const centerY = height < 600
    ? height * 0.75
    : clamp(getCarouselCardPose(0, legacy).y, height * 0.65, height * 0.78);
  const designWidth = width <= 640
    ? Math.min(width * 0.7, 290)
    : width <= 900 ? Math.min(width * 0.54, 300) : Math.min(width * 0.32, 320);
  const designHeight = designWidth * 1.42;
  const room = Math.max(1, Math.min(centerY - height / 2 - 24, height - centerY - 12));
  const unit = Math.min(1, room * 2 / (designHeight + 48));

  return {
    cardWidth: designWidth * unit,
    cardHeight: designHeight * unit,
    centerY: placement === "top" ? height - centerY : centerY,
    unit,
    titleSize: clamp(width * 0.032, 28, 46) * unit,
    gap: (width < 640 ? 220 : 290) * unit,
    rotationStep: width < 640 ? 8 : 10,
    verticalDirection: placement === "top" ? -1 : 1,
  };
}

export function getDeckIndex(index: number, count: number) {
  return count > 0 ? ((Math.round(index) % count) + count) % count : 0;
}

export function getDeckOffset(index: number, active: number, count: number) {
  if (count <= 1) return 0;
  let offset = index - getDeckIndex(active, count);
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}

export function getDeckPose(offset: number, metrics: DeckMetrics) {
  const distance = Math.abs(offset);
  return {
    x: offset * metrics.gap,
    y: distance * 22 * metrics.unit * metrics.verticalDirection,
    rotation: offset * metrics.rotationStep * metrics.verticalDirection,
    scale: offset === 0 ? 1 : Math.max(0.72, 0.88 - distance * 0.06),
    opacity: distance > 2 ? 0 : Math.max(0.18, 1 - distance * 0.34),
    zIndex: 10 - distance,
    visible: distance <= 2,
  };
}

export function getDeckSwipeDirection(deltaX: number, deltaY: number): -1 | 0 | 1 {
  return Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY)
    ? deltaX < 0 ? 1 : -1
    : 0;
}

// Slot-based motion stays equally restrained across phone/tablet/desktop sizes.
export const DECK_DRAG_SENSITIVITY = 0.65;
export const DECK_MAX_VELOCITY = 3;
export const DECK_INERTIA_SECONDS = 0.18;

export function resistDeckPosition(position: number, count: number) {
  if (count >= 6) return position;
  const edge = clamp(position, 0, Math.max(0, count - 1));
  const excess = position - edge;
  return edge + excess * 0.3 / (1 + Math.abs(excess));
}

export function getContinuousDeckPose(offset: number, metrics: DeckMetrics) {
  const distance = Math.abs(offset);
  return {
    ...getDeckPose(offset, metrics),
    scale: distance <= 1 ? 1 - distance * 0.18 : Math.max(0.72, 0.88 - distance * 0.06),
    opacity: distance <= 2 ? 1 - distance * 0.34 : Math.max(0, 0.32 * (3 - distance)),
    zIndex: 100 - Math.round(distance * 10),
    visible: distance < 3,
  };
}
