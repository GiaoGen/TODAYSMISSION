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
  const target = Math.round(position);

  if (count < 6) {
    return clamp(target, 0, count - 1);
  }

  return target;
}
