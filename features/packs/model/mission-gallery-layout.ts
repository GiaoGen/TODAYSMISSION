// 160px card + 18px gap is the narrowest supported desktop/tablet stride.
// Cover both viewport edges even at the half-cycle wrapping threshold.
export function getGalleryCopyCount(missionCount: number, viewportWidth: number) {
  if (missionCount <= 1) return 1;
  return Math.max(3, 2 * Math.ceil((Math.max(0, viewportWidth) / 178 + missionCount - 1) / (2 * missionCount)) + 1);
}
