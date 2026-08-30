import type { CalendarSnapshot, CarouselSnapshot } from "../../packs/model/home-carousel-state";

export type CalendarRange = { first: number; last: number; registeredOn: string; today: string };
export type CalendarDay = { date: string; day: number; row: number; column: number; available: boolean; completed: boolean };

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function monthNumber(date: string): number {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
}

export function monthKey(month: number): string {
  return `${Math.floor(month / 12)}-${String(month % 12 + 1).padStart(2, "0")}`;
}

export function monthLabel(month: number): string {
  return `${Math.floor(month / 12)} 年 ${month % 12 + 1} 月`;
}

const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

export function calendarMonthHeading(month: number) {
  return { name: MONTH_NAMES[month % 12], subtitle: `${Math.floor(month / 12)} — ${String(month % 12 + 1).padStart(2, "0")}` };
}

// Decorative prototype colors only, not completion types or counts.
export function calendarCompletionColor(day: number): string {
  return ["#e5392d", "#1457c9", "#efc832"][(day - 1) % 3];
}

export function getCalendarRange(registeredOn: string, today: string): CalendarRange | null {
  if (!parseDateKey(registeredOn) || !parseDateKey(today) || registeredOn > today) return null;
  return { first: monthNumber(registeredOn), last: monthNumber(today), registeredOn, today };
}

export function clampMonth(value: number, range: CalendarRange): number {
  return Math.max(range.first, Math.min(range.last, value));
}

export function restoreCalendarPosition(snapshot: CarouselSnapshot | null, range: CalendarRange): number {
  if (!snapshot || !("month" in snapshot) || !parseDateKey(`${snapshot.month}-01`)) return range.last;
  const month = monthNumber(snapshot.month);
  // Restore a captured in-flight pose only when it still belongs to this month range.
  return clampMonth(Number.isFinite(snapshot.position) && Math.abs(snapshot.position - month) < 1
    ? snapshot.position : month, range);
}

export function calendarSnapshot(position: number, range: CalendarRange): CalendarSnapshot {
  const bounded = clampMonth(position, range);
  return { month: monthKey(Math.round(bounded)), position: bounded };
}

export function visibleMonths(center: number, range: CalendarRange): number[] {
  return [center - 1, center, center + 1].filter((month) => month >= range.first && month <= range.last);
}

export function getMonthDays(month: number, range: CalendarRange, completedOn: ReadonlySet<string>): CalendarDay[] {
  if (month < range.first || month > range.last) return [];
  const year = Math.floor(month / 12);
  const monthIndex = month % 12;
  const offset = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length }, (_, index) => {
    const day = index + 1;
    const date = `${monthKey(month)}-${String(day).padStart(2, "0")}`;
    const available = date >= range.registeredOn && date <= range.today;
    return {
      date, day, row: Math.floor((offset + index) / 7), column: (offset + index) % 7,
      available, completed: available && completedOn.has(date),
    };
  });
}

export function resistMonthPosition(value: number, minimum: number, maximum: number): number {
  const bounded = Math.max(minimum, Math.min(maximum, value));
  const excess = value - bounded;
  return bounded + excess / (1 + Math.abs(excess) * 5) * .3;
}

export function getMonthSnapTarget(position: number, velocity: number, center: number, range: CalendarRange): number {
  const projected = Math.round(position + Math.max(-4, Math.min(4, velocity)) * .18);
  return clampMonth(Math.max(center - 1, Math.min(center + 1, projected)), range);
}
