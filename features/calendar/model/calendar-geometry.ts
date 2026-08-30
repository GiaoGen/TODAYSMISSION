import type { CarouselPlacement } from "../../packs/model/arc-carousel-geometry";

export type CalendarGeometry = {
  width: number;
  height: number;
  panelHeight: number;
  labelHeight: number;
  rowHeight: number;
  fontSize: number;
  halfAngle: number;
  innerRadius: number;
  outerRadius: number;
  centerY: number;
  boundaries: number[];
  placement: CarouselPlacement;
};

export function getCalendarGeometry(width: number, height: number, coarse: boolean, placement: CarouselPlacement): CalendarGeometry {
  const compact = height < 500;
  const shortLandscape = height < 360;
  const tablet = coarse && Math.min(width, height) >= 600;
  const panelWidth = Math.min(width - 24, shortLandscape ? 360 : compact ? 460 : tablet ? 900 : 760);
  const halfAngle = shortLandscape ? .04 : compact ? .13 : Math.min(.4, .20 + Math.max(0, panelWidth - 320) * .0004);
  const outerRadius = (panelWidth / 2 - 8) / Math.sin(halfAngle);
  const labelHeight = shortLandscape ? 16 : compact ? 22 : 30;
  const headerHeight = shortLandscape ? 12 : compact ? 16 : tablet ? 32 : 26;
  let rowHeight = shortLandscape ? 15 : compact ? 16 : tablet ? 44 : width < 600 ? 32 : 36;
  const available = height / 2 - 28;
  const measure = (row: number) => {
    const thickness = headerHeight + row * 6;
    const inner = outerRadius - thickness;
    return thickness + inner * (1 - Math.cos(halfAngle)) + 8;
  };
  while (rowHeight > 16 && measure(rowHeight) + labelHeight > available) rowHeight -= 1;
  const innerRadius = outerRadius - headerHeight - rowHeight * 6;
  const svgHeight = measure(rowHeight);
  const centerY = innerRadius * (1 - Math.cos(halfAngle)) + 4 - innerRadius;
  const radialRows = [innerRadius, innerRadius + headerHeight];
  for (let week = 1; week <= 6; week++) radialRows.push(innerRadius + headerHeight + week * rowHeight);
  return {
    width: panelWidth, height: svgHeight, panelHeight: svgHeight + labelHeight,
    labelHeight, rowHeight, fontSize: Math.max(11, Math.min(18, rowHeight * .44)),
    halfAngle, innerRadius, outerRadius, centerY, placement,
    boundaries: placement === "top" ? radialRows : radialRows.map((radius) => outerRadius + innerRadius - radius),
  };
}

export function calendarPoint(radius: number, angle: number, geometry: CalendarGeometry) {
  const y = geometry.centerY + radius * Math.cos(angle);
  return { x: geometry.width / 2 + radius * Math.sin(angle), y: geometry.placement === "top" ? y : geometry.height - y };
}

function coordinate(radius: number, angle: number, geometry: CalendarGeometry) {
  const { x, y } = calendarPoint(radius, angle, geometry);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

export function calendarArc(radius: number, start: number, end: number, geometry: CalendarGeometry) {
  const sweep = (end > start) === (geometry.placement === "top") ? 0 : 1;
  return `M ${coordinate(radius, start, geometry)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweep} ${coordinate(radius, end, geometry)}`;
}

export function getCalendarGridPaths(geometry: CalendarGeometry): string[] {
  const { innerRadius, outerRadius, halfAngle } = geometry;
  // Only interior dividers: leave the inner/outer arcs and both radial edges open.
  const arcs = geometry.boundaries.slice(1, -1).map((radius) => calendarArc(radius, -halfAngle, halfAngle, geometry));
  const spokes = Array.from({ length: 6 }, (_, index) => {
    const angle = -halfAngle + (index + 1) * halfAngle * 2 / 7;
    return `M ${coordinate(innerRadius, angle, geometry)} L ${coordinate(outerRadius, angle, geometry)}`;
  });
  return [...arcs, ...spokes];
}

export function calendarCell(row: number, column: number, geometry: CalendarGeometry) {
  return calendarPoint(
    (geometry.boundaries[row] + geometry.boundaries[row + 1]) / 2,
    -geometry.halfAngle + (column + .5) * geometry.halfAngle * 2 / 7, geometry,
  );
}

export function calendarCellPath(row: number, column: number, geometry: CalendarGeometry) {
  const start = -geometry.halfAngle + column * geometry.halfAngle * 2 / 7;
  const end = start + geometry.halfAngle * 2 / 7;
  const first = geometry.boundaries[row];
  const second = geometry.boundaries[row + 1];
  // Follow the real curved cell, so adjacent dates never share a hit target.
  return `${calendarArc(first, start, end, geometry)} L ${coordinate(second, end, geometry)} ${calendarArc(second, end, start, geometry).replace(/^M [^ ]+ /, "")} Z`;
}

export function calendarPose(slot: number, geometry: CalendarGeometry) {
  const direction = geometry.placement === "top" ? -1 : 1;
  const step = geometry.halfAngle * 2 + .035;
  const radius = (geometry.width + 16) / Math.sin(step);
  const angle = slot * step;
  // Move the curved sheet along the arc without tilting its dates. One HTML
  // transform keeps the grid and all date labels static during a gesture.
  return { x: Math.sin(angle) * radius, y: direction * (1 - Math.cos(angle)) * radius };
}
