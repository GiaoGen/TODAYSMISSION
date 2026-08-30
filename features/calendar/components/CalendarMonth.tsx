import { memo, ViewTransition } from "react";
import type { CalendarRange } from "../model/calendar-month";
import { getMonthDays, monthLabel } from "../model/calendar-month";
import { calendarCell, calendarCellPath, getCalendarGridPaths, type CalendarGeometry } from "../model/calendar-geometry";
import { getDayTransitionName } from "../model/calendar-day-transition";
import styles from "./CalendarCarousel.module.css";

type CalendarMonthProps = {
  month: number;
  range: CalendarRange;
  geometry: CalendarGeometry;
  completedOn: ReadonlySet<string>;
  active?: boolean;
  onOpenDate?: (date: string) => void;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export const CalendarMonth = memo(function CalendarMonth({ month, range, geometry, completedOn, active = true, onOpenDate }: CalendarMonthProps) {
  const days = getMonthDays(month, range, completedOn);
  const compact = geometry.rowHeight < 24;
  return (
    <>
      <svg className={styles.grid} width={geometry.width} height={geometry.height}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="group" aria-label={`${monthLabel(month)}，日历 / Calendar`}>
        <desc>模拟记录，周一至周日；橙色圆点表示当日完成过 Mission。日期从上到下、从左到右阅读。</desc>
        {getCalendarGridPaths(geometry).map((path) => (
          <path key={path} className={styles.rule} d={path} />
        ))}
        {WEEKDAYS.map((weekday, column) => {
          const point = calendarCell(0, column, geometry);
          return <text key={weekday} className={styles.weekday} x={point.x} y={point.y} fontSize={compact ? 11 : 12}>{weekday}</text>;
        })}
        {days.map((day) => {
          const point = calendarCell(day.row + 1, day.column, geometry);
          const interactive = active && day.completed && Boolean(onOpenDate);
          return (
            <g key={day.date} className={day.available ? (interactive ? styles.completedDay : undefined) : styles.unavailable}
              role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${day.date}，查看当日已完成 Mission / View completed Missions` : undefined}
              data-completed-date={interactive ? day.date : undefined}
              onClick={interactive ? () => onOpenDate?.(day.date) : undefined}
              onKeyDown={interactive ? (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                if (!event.repeat) onOpenDate?.(day.date);
              } : undefined}>
              <title>{`${day.date}${day.completed ? "，已完成 Mission / Completed" : !day.available ? "，不在活动记录范围内" : "，无完成记录"}`}</title>
              {interactive && <path className={styles.dayHitArea} d={calendarCellPath(day.row + 1, day.column, geometry)} />}
              <text x={point.x} y={point.y - (compact ? 2 : 3)} fontSize={geometry.fontSize}>{day.day}</text>
              {day.completed && <circle className={styles.dot} cx={point.x} cy={point.y + (compact ? 5.5 : 8)} r={compact ? 1.6 : 2.5} />}
            </g>
          );
        })}
      </svg>
      {active && days.filter((day) => day.completed).map((day) => {
        const point = calendarCell(day.row + 1, day.column, geometry);
        return <ViewTransition key={day.date} default="none" name={getDayTransitionName(day.date, geometry.placement)} share="calendar-day-morph">
          <span aria-hidden="true" className={styles.dayAnchor} style={{
            left: point.x, top: point.y + (geometry.placement === "bottom" ? geometry.labelHeight : 0),
            width: geometry.rowHeight * .75, height: geometry.rowHeight,
          }} />
        </ViewTransition>;
      })}
      <div className={styles.monthLabel} style={{ height: geometry.labelHeight }}>{monthLabel(month)}</div>
    </>
  );
});
