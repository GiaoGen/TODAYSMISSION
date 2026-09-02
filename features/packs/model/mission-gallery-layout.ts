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
  // Preserve the established desktop density and large phone/tablet cards.
  const preferred = phone ? Math.min(272, width * .70)
    : tablet ? Math.min(height > width ? 440 : 420, width * (height > width ? .54 : .34))
    : Math.min(310, (width - 48) / (4.78 + 4 * gapRatio));
  // Keep the established short-landscape footprint while every card now uses
  // the same full-size pose.
  const establishedVerticalFootprint = 2 * (.72 * 1.42 / 2 + 76 / 310);
  const verticalLimit = Math.max(80, height - Math.min(48, height * .08)) / establishedVerticalFootprint;
  const cardWidth = Math.min(preferred, verticalLimit);
  const gap = cardWidth * gapRatio;
  return { cardWidth, cardHeight: cardWidth * 1.42, gap, stride: cardWidth + gap, unit: cardWidth / 310, mobileUnit: cardWidth / 272 };
}
