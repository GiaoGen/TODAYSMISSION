import { memo, ViewTransition } from "react";
import type { CalendarRange } from "../model/calendar-month";
import { calendarCompletionColor, calendarMonthHeading, getMonthDays, monthLabel } from "../model/calendar-month";
import { calendarCell, calendarCellPath, calendarDayAnchor, getCalendarGridPaths, type CalendarGeometry } from "../model/calendar-geometry";
import { CALENDAR_DAY_TRANSITION_CLASSES, getDayTransitionName } from "../model/calendar-day-transition";
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
  const heading = calendarMonthHeading(month);
  const todayHalfWidth = Math.max(4, 8 * geometry.scaleX);
  return (
    <>
      <svg className={styles.grid} width={geometry.width} height={geometry.height}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="group" aria-label={`${monthLabel(month)}，日历 / Calendar`}>
        <desc>模拟记录，周一至周日；彩色圆点表示当日完成过 Mission，颜色仅作装饰；短横线标记今天。日期从上到下、从左到右阅读。</desc>
        {getCalendarGridPaths(geometry).map((path) => (
          <path key={path} className={styles.rule} d={path} />
        ))}
        {WEEKDAYS.map((weekday, column) => {
          const point = calendarCell(0, column, geometry);
          return <text key={weekday} className={styles.weekday} x={point.x} y={point.y} fontSize={geometry.weekdayFontSize}>{weekday}</text>;
        })}
        {days.map((day) => {
          const point = calendarCell(day.row + 1, day.column, geometry);
          const interactive = active && day.completed && Boolean(onOpenDate);
          const today = day.date === range.today;
          // On very short landscape screens, keep today's dot beside its
          // underline so both marks fit below the number without colliding.
          const dotX = today && geometry.rowHeight < 15
            ? todayHalfWidth + geometry.dotRadius + 2 : 2 * geometry.scaleX;
          return (
            <g key={day.date} className={day.available ? (interactive ? styles.completedDay : undefined) : styles.unavailable}
              role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
              aria-current={today ? "date" : undefined}
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
              <text className={styles.date} x={point.x} y={point.y + geometry.textOffset} fontSize={geometry.fontSize}>{day.day}</text>
              {day.completed && <circle className={styles.dot} cx={point.x + dotX}
                cy={point.y + geometry.dotOffset} r={geometry.dotRadius} fill={calendarCompletionColor(day.day)} />}
              {today && <line className={styles.todayMark}
                x1={point.x - todayHalfWidth} x2={point.x + todayHalfWidth}
                y1={point.y + geometry.todayOffset} y2={point.y + geometry.todayOffset} />}
            </g>
          );
        })}
      </svg>
      {active && days.filter((day) => day.completed).map((day) => {
        const anchor = calendarDayAnchor(day.row + 1, day.column, geometry);
        return <ViewTransition key={day.date} default="none" name={getDayTransitionName(day.date, geometry.placement)} share={CALENDAR_DAY_TRANSITION_CLASSES}>
          <span aria-hidden="true" className={styles.dayAnchor} style={{
            left: anchor.x, top: anchor.y, width: anchor.width, height: anchor.height,
          }} />
        </ViewTransition>;
      })}
      <div className={styles.monthLabel} style={{ height: geometry.labelHeight }}>
        <span className={styles.monthName} style={{ fontSize: geometry.monthFontSize }}>{heading.name}</span>
        <span className={styles.monthSub} style={{ fontSize: geometry.monthSubFontSize }}>{heading.subtitle}</span>
      </div>
    </>
  );
});
