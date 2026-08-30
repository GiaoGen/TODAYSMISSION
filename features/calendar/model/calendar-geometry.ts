import type { CarouselPlacement } from "../../packs/model/arc-carousel-geometry";

export type CalendarGeometry = {
  width: number;
  height: number;
  panelHeight: number;
  labelHeight: number;
  rowHeight: number;
  fontSize: number;
  weekdayFontSize: number;
  monthFontSize: number;
  monthSubFontSize: number;
  scaleX: number;
  scaleY: number;
  headerExtra: number;
  textOffset: number;
  dotOffset: number;
  dotRadius: number;
  todayOffset: number;
  halfAngle: number;
  placement: CarouselPlacement;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

// Source artboard: 1180 x 680. Crop only its empty top margin (84 units).
// Phones keep all seven columns but give rows and type their own readable scale.
export function getCalendarGeometry(width: number, height: number, coarse: boolean, placement: CarouselPlacement): CalendarGeometry {
  const compact = height < 500;
  const phone = width < 700;
  const available = Math.max(80, height / 2 - 28);
  const nativeScale = Math.min(1, (width - 24) / 1180, available / 596);
  const panelWidth = compact ? Math.min(width - 24, 520)
    : phone ? width - 24 : 1180 * nativeScale;
  const scaleX = panelWidth / 1180;
  const labelHeight = compact ? 24 : Math.max(40, 60 * nativeScale);
  const headerExtra = compact ? 6 : 0;
  const desiredScaleY = !compact && phone ? Math.max(scaleX, 34 / 75) : scaleX;
  const scaleY = Math.min(desiredScaleY, (available - labelHeight - 10 - headerExtra) / 536);
  const rowHeight = 75 * scaleY;
  const fontSize = compact ? clamp(rowHeight * .62, 10, 12) : clamp(23 * scaleY, phone ? 15 : coarse ? 17 : 16, 23);
  const textOffset = compact ? -rowHeight * .12 : 0;
  const svgHeight = 536 * scaleY + 10 + headerExtra;

  return {
    width: panelWidth, height: svgHeight, panelHeight: svgHeight + labelHeight,
    labelHeight, rowHeight, fontSize, scaleX, scaleY, headerExtra, textOffset,
    weekdayFontSize: compact ? 10 : clamp(18 * scaleY, phone ? 12 : coarse ? 14 : 13, 18),
    monthFontSize: compact ? 13 : clamp(28 * nativeScale, 18, 28),
    monthSubFontSize: compact ? 9 : clamp(13 * nativeScale, 10, 13),
    dotOffset: compact ? textOffset + fontSize * (rowHeight < 15 ? .65 : .78) : 28 * scaleY,
    dotRadius: compact ? 1.1 : clamp(4.2 * scaleY, 2, 4.2),
    todayOffset: compact ? textOffset + fontSize * .55 : Math.max(fontSize * .6, 18 * scaleY),
    // Keep the established whole-sheet swipe/spring motion, independent of the artwork.
    halfAngle: height < 360 ? .04 : compact ? .13 : Math.min(.4, .20 + Math.max(0, panelWidth - 320) * .0004),
    placement,
  };
}

function point(x: number, y: number, geometry: CalendarGeometry, header = false) {
  return {
    x: x * geometry.scaleX,
    y: 8 + (y - 84) * geometry.scaleY + (header ? 0 : geometry.headerExtra),
  };
}

function coordinate(x: number, y: number, geometry: CalendarGeometry) {
  const mapped = point(x, y, geometry);
  return `${mapped.x.toFixed(2)},${mapped.y.toFixed(2)}`;
}

function curveOffset(x: number, amount: number) {
  const normalized = (x - 590) / 498;
  return amount * (1 - normalized * normalized);
}

function curvedY(base: number, offset: number, geometry: CalendarGeometry) {
  // Reverse the bow, not the chronological row order.
  return base + (geometry.placement === "top" ? offset : 54 - offset);
}

export function getCalendarGridPaths(geometry: CalendarGeometry): string[] {
  const horizontal = Array.from({ length: 6 }, (_, row) => {
    const y = 128 + row * 69;
    return `M ${coordinate(50, curvedY(y, 0, geometry), geometry)} Q ${coordinate(590, curvedY(y, 108, geometry), geometry)} ${coordinate(1130, curvedY(y, 0, geometry), geometry)}`;
  });
  const vertical = Array.from({ length: 8 }, (_, column) => {
    const x = 70 + 1040 * column / 7;
    const shift = (x - 590) / 996 * 55;
    const top = geometry.placement === "top";
    return `M ${coordinate(top ? x : x + shift, 84, geometry)} Q ${coordinate(x - shift * .25, top ? 290 : 329, geometry)} ${coordinate(top ? x + shift : x, 535, geometry)}`;
  });
  return [...horizontal, ...vertical];
}

export function calendarCell(row: number, column: number, geometry: CalendarGeometry) {
  const x = 92 + 996 * column / 6;
  const baseY = row === 0 ? 105 : 160 + (row - 1) * 75;
  return point(x, curvedY(baseY, curveOffset(x, row === 0 ? 42 : 52), geometry), geometry, row === 0);
}

// Curved, non-overlapping hit strips follow the DATE baselines. The prototype's
// decorative separators have a different pitch (69 vs 75), so they must not be
// used as the source of truth for clicks or the gallery's return destination.
export function calendarCellPath(row: number, column: number, geometry: CalendarGeometry) {
  const centerX = 92 + 996 * column / 6;
  const left = Math.max(12, centerX - 82);
  const right = Math.min(1168, centerX + 82);
  const middle = (left + right) / 2;
  const baseY = 160 + (row - 1) * 75;
  const hitCoordinate = (x: number, y: number) => {
    const mapped = point(x, y, geometry);
    // The final week's invisible target must not cover the month heading.
    return `${mapped.x.toFixed(2)},${clamp(mapped.y, 1, geometry.height - 1).toFixed(2)}`;
  };
  const arc = (base: number, from: number, to: number) => {
    const yFrom = curvedY(base, curveOffset(from, 52), geometry);
    const yTo = curvedY(base, curveOffset(to, 52), geometry);
    const yMid = curvedY(base, curveOffset(middle, 52), geometry);
    // Exact quadratic segment of the parabolic baseline.
    const control = 2 * yMid - (yFrom + yTo) / 2;
    return `Q ${hitCoordinate(middle, control)} ${hitCoordinate(to, yTo)}`;
  };
  const top = baseY - 30;
  const bottom = baseY + 43;
  const start = hitCoordinate(left, curvedY(top, curveOffset(left, 52), geometry));
  const lowerRight = hitCoordinate(right, curvedY(bottom, curveOffset(right, 52), geometry));
  return `M ${start} ${arc(top, left, right)} L ${lowerRight} ${arc(bottom, right, left)} Z`;
}

export function calendarDayAnchor(row: number, column: number, geometry: CalendarGeometry) {
  const cell = calendarCell(row, column, geometry);
  const height = Math.max(geometry.fontSize + 4, geometry.rowHeight * .8);
  return {
    x: cell.x,
    y: cell.y + geometry.textOffset + (geometry.placement === "bottom" ? geometry.labelHeight : 0),
    width: Math.min(height * .75, geometry.width / 7 - 4),
    height,
  };
}

export function calendarPose(slot: number, geometry: CalendarGeometry) {
  const direction = geometry.placement === "top" ? -1 : 1;
  const step = geometry.halfAngle * 2 + .035;
  const radius = (geometry.width + 16) / Math.sin(step);
  const angle = slot * step;
  return { x: Math.sin(angle) * radius, y: direction * (1 - Math.cos(angle)) * radius };
}
