export type CarouselMetrics = {
  cardHeight: number;
  cardWidth: number;
  centerX: number;
  centerY: number;
  radius: number;
  stepAngle: number;
};

type CarouselMetricsInput = {
  height: number;
  width: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getCarouselMetrics({
  height,
  width,
}: CarouselMetricsInput): CarouselMetrics {
  const isMobile = width < 720;
  const cardWidth = isMobile
    ? clamp(width * 0.46, 148, 196)
    : clamp(width * 0.16, 172, 236);
  const cardHeight = (cardWidth * 4) / 3;
  const gap = isMobile ? 32 : 50;
  const activeCenterY =
    height * (isMobile ? 0.44 : 0.42) + cardHeight;
  const radius = height * (isMobile ? 0.75 : 0.86);
  const stepAngle = clamp(
    (cardWidth + gap * 2.5) / radius,
    0.42,
    0.6,
  );

  return {
    cardHeight,
    cardWidth,
    centerX: width / 2,
    centerY: activeCenterY + radius,
    radius,
    stepAngle,
  };
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
