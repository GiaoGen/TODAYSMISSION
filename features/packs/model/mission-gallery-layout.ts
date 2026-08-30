// 160px card + 18px gap is the narrowest supported desktop/tablet stride.
// Cover both viewport edges even at the half-cycle wrapping threshold.
export function getGalleryCopyCount(missionCount: number, viewportWidth: number, stride = 178) {
  if (missionCount <= 1) return 1;
  return Math.max(3, 2 * Math.ceil((Math.max(0, viewportWidth) / Math.max(1, stride) + missionCount - 1) / (2 * missionCount)) + 1);
}

export function getMissionStreamMetrics({ width, height, coarsePointer }: {
  width: number; height: number; coarsePointer: boolean;
}) {
  const phone = width < 600;
  const tablet = !phone && ((width < 900 && height > width) || coarsePointer);
  const gapRatio = phone ? 20 / 272 : 34 / 310;
  // Five fully visible cards on desktop; large center card on phone/tablet.
  const preferred = phone ? Math.min(272, width * .70)
    : tablet ? Math.min(height > width ? 440 : 420, width * (height > width ? .54 : .34))
    : Math.min(310, (width - 48) / (4.78 + 4 * gapRatio));
  // Side cards are scaled, not full-height: reserve the deepest visible bottom
  // edge plus breathing room without making short landscape cards microscopic.
  const farBottom = .72 * 1.42 / 2 + 76 / 310;
  const verticalLimit = Math.max(80, height - Math.min(48, height * .08)) / (2 * farBottom);
  const cardWidth = Math.min(preferred, verticalLimit);
  const gap = cardWidth * gapRatio;
  return { cardWidth, cardHeight: cardWidth * 1.42, gap, stride: cardWidth + gap, unit: cardWidth / 310, mobileUnit: cardWidth / 272 };
}
