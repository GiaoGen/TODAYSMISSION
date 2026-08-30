import assert from "node:assert/strict";
import test from "node:test";
import { calendarCell, calendarCellPath, calendarDayAnchor, calendarPose, getCalendarGeometry, getCalendarGridPaths } from "../features/calendar/model/calendar-geometry.ts";
import { calendarCompletionColor, calendarMonthHeading, calendarSnapshot, getCalendarRange, getMonthDays, getMonthSnapTarget, localDateKey, monthKey, monthNumber, parseDateKey, resistMonthPosition, restoreCalendarPosition, visibleMonths } from "../features/calendar/model/calendar-month.ts";
import { captureHomeCarousels, createHomeCarouselState, getCarouselAssignments, getSpareCollection, selectHomeCarousel } from "../features/packs/model/home-carousel-state.ts";
import { animateCarouselPair } from "../features/packs/model/carousel-swap-motion.ts";
import { advanceCarouselSpring } from "../features/packs/model/carousel-spring.ts";
import { getPackCarouselReturnState, setPackCarouselReturnState } from "../features/packs/model/pack-carousel-return-state.ts";

const range = getCalendarRange("2026-05-12", "2026-08-30");
const joined = { packId: "pack-4", activeIndex: 2, count: 5, position: 2.1 };
const all = { packId: "pack-7", activeIndex: 7, count: 12, position: 31.2 };
const calendar = { month: "2026-07", position: monthNumber("2026-07") + .15 };

test("bottom switches preserve the calendar month and hidden Pack snapshot", () => {
  let state = { ...createHomeCarouselState(null), settings: { top: "calendar", bottom: "all" } };
  state.snapshots.joined = joined;
  state = captureHomeCarousels(state, { top: calendar, bottom: all });
  state = selectHomeCarousel(state, "bottom");
  assert.equal(state.topCollection, "calendar");
  assert.equal(state.bottomCollection, "joined");
  state = selectHomeCarousel(state, "bottom");
  assert.equal(state.topCollection, "calendar");
  assert.equal(state.bottomCollection, "all");
  assert.deepEqual(state.snapshots, { joined, all, calendar });
});

test("legacy actions cannot dislodge the fixed calendar or introduce a third layout", () => {
  const visited = new Set();
  function visit(state, depth) {
    const assignments = getCarouselAssignments(state.topCollection, state.bottomCollection);
    const spare = getSpareCollection(assignments);
    assert.equal(new Set([assignments.top, assignments.bottom, spare]).size, 3);
    assert.notEqual(state.settings.top, state.settings.bottom);
    assert.equal(state.topCollection, "calendar");
    visited.add(`${state.settings.top}/${state.settings.bottom}`);
    if (depth === 0) return;
    for (const action of ["top", "bottom", "preview"]) visit(selectHomeCarousel(state, action), depth - 1);
  }
  visit({ ...createHomeCarouselState(null), settings: { top: "calendar", bottom: "all" } }, 6);
  assert.equal(visited.size, 2);
});

for (const placement of ["top", "bottom"]) {
  test(`Pack return restores ${placement} calendar and the unmounted third collection`, () => {
    const state = { topCollection: placement === "top" ? "calendar" : "all", bottomCollection: placement === "top" ? "all" : "calendar", snapshots: { joined, all, calendar } };
    const carousels = placement === "top" ? { top: calendar, bottom: all } : { top: all, bottom: calendar };
    const saved = { source: placement === "top" ? "bottom" : "top", packId: all.packId, ...captureHomeCarousels(state, carousels), carousels };
    setPackCarouselReturnState(saved);
    assert.deepEqual(createHomeCarouselState(getPackCarouselReturnState()), { ...state, topCollection: "calendar", bottomCollection: "all" });
    assert.notEqual(getPackCarouselReturnState().snapshots.calendar, saved.snapshots.calendar);
    assert.deepEqual(createHomeCarouselState(null), { topCollection: "calendar", bottomCollection: "all", snapshots: { joined: null, all: null, calendar: null } });
  });
}

test("top replacement animates only top and cancels its animation cleanly", async () => {
  const calls = [];
  let cancelled = false;
  const element = (placement) => ({ ownerDocument: { timeline: { currentTime: 55 } }, animate(frames) {
    calls.push({ placement, frames });
    return { startTime: null, finished: Promise.resolve(), cancel() { cancelled = true; } };
  } });
  const runner = animateCarouselPair({ top: element("top"), bottom: element("bottom") }, "exiting", false, ["top"]);
  await runner.finished;
  assert.deepEqual(calls.map(call => call.placement), ["top"]);
  assert.match(calls[0].frames[1].transform, /-112vh/);
  runner.cancel();
  assert.equal(cancelled, true);
});

test("month range is inclusive, finite, and rejects malformed or future signup dates", () => {
  assert.equal(range.last - range.first + 1, 4);
  assert.equal(monthKey(range.first), "2026-05");
  assert.equal(monthKey(range.last), "2026-08");
  for (const invalid of ["2026-02-30", "2026-9-1", "bad", "2026-13-01", "2027-01-01"]) {
    assert.equal(getCalendarRange(invalid, "2026-08-30"), null);
  }
  assert.equal(parseDateKey("2025-02-29"), null);
  assert.ok(parseDateKey("2024-02-29"));
  const sameMonth = getCalendarRange("2026-08-30", "2026-08-30");
  assert.deepEqual(visibleMonths(sameMonth.first, sameMonth), [sameMonth.first]);
  assert.equal(localDateKey(new Date(2026, 7, 30, 23, 59)), "2026-08-30");
});

test("Gregorian month placement handles six-week months, leap years and year boundaries", () => {
  const longRange = getCalendarRange("2023-01-01", "2027-12-31");
  const august = getMonthDays(monthNumber("2026-08"), longRange, new Set());
  assert.equal(august.length, 31);
  assert.deepEqual([august[0].row, august[0].column], [0, 5]);
  assert.deepEqual([august[30].row, august[30].column], [5, 0]);
  assert.equal(getMonthDays(monthNumber("2024-02"), longRange, new Set()).length, 29);
  assert.equal(getMonthDays(monthNumber("2025-02"), longRange, new Set()).length, 28);
  assert.equal(monthKey(monthNumber("2026-12") + 1), "2027-01");
  assert.deepEqual(getMonthDays(range.first - 1, range, new Set()), []);
});

test("only completed days in the account's elapsed lifetime get dots; no-record months stay populated", () => {
  const records = new Set(["2026-05-01", "2026-05-12", "2026-08-28", "2026-08-31"]);
  const may = getMonthDays(range.first, range, records);
  assert.equal(may[0].available, false);
  assert.equal(may[0].completed, false);
  assert.equal(may[11].completed, true);
  const august = getMonthDays(range.last, range, records);
  assert.equal(august[27].completed, true);
  assert.equal(august[30].available, false);
  assert.equal(august[30].completed, false);
  const june = getMonthDays(range.first + 1, range, records);
  assert.equal(june.length, 30);
  assert.equal(june.filter(day => day.completed).length, 0);
});

test("calendar snapshot restoration cannot escape the finite month range", () => {
  assert.equal(restoreCalendarPosition(null, range), range.last);
  assert.equal(restoreCalendarPosition(joined, range), range.last);
  assert.equal(restoreCalendarPosition(calendar, range), calendar.position);
  assert.equal(restoreCalendarPosition({ month: "2026-04", position: -Infinity }, range), range.first);
  assert.equal(restoreCalendarPosition({ month: "2027-01", position: NaN }, range), range.last);
  assert.equal(restoreCalendarPosition({ month: "garbage", position: 0 }, range), range.last);
  assert.equal(calendarSnapshot(range.last + .2, range).position, range.last);
});

test("only neighboring months mount even for a long history; flings never wrap", () => {
  const longRange = getCalendarRange("2000-01-01", "2026-08-30");
  assert.equal(visibleMonths(longRange.first + 50, longRange).length, 3);
  assert.equal(visibleMonths(longRange.first, longRange).length, 2);
  assert.equal(getMonthSnapTarget(range.first, -100, range.first, range), range.first);
  assert.equal(getMonthSnapTarget(range.last, 100, range.last, range), range.last);
  assert.equal(getMonthSnapTarget(range.first + 1.1, 100, range.first, range), range.first + 1);
  assert.ok(resistMonthPosition(range.first - 100, range.first, range.last) > range.first - .061);
  assert.ok(resistMonthPosition(range.last + 100, range.first, range.last) < range.last + .061);
});

test("shared spring settles with a small overshoot and finite duration", () => {
  let position = 0;
  let velocity = 1;
  let peak = position;
  for (let frame = 0; frame < 180; frame++) {
    ({ position, velocity } = advanceCarouselSpring(position, velocity, 1, 1 / 60));
    peak = Math.max(peak, position);
  }
  assert.ok(peak > 1 && peak < 1.1);
  assert.ok(Math.abs(position - 1) < .001);
  assert.ok(Math.abs(velocity) < .002);
});

const devices = [
  [320, 568, true], [568, 320, true], [375, 812, true], [390, 844, true], [812, 375, true],
  [540, 720, true], [820, 1180, true], [1180, 820, true], [1024, 1366, true],
  [1440, 900, false], [1920, 1080, false],
];

for (const [width, height, touch] of devices) {
  for (const placement of ["top", "bottom"]) {
    test(`${width}x${height} ${placement}: all 42 cells fit, stay readable, and follow left drags`, () => {
      const geometry = getCalendarGeometry(width, height, touch, placement);
      assert.ok(geometry.width < width);
      assert.ok(geometry.panelHeight <= height / 2 - 28, `${geometry.panelHeight} exceeds half-screen safe area`);
      assert.ok(geometry.fontSize >= (height < 500 ? 10 : 15));
      const paths = getCalendarGridPaths(geometry);
      assert.equal(paths.length, 14);
      assert.ok(paths.every(path => !/NaN|Infinity|Z/i.test(path)));
      assert.ok(paths.every(path => /^M [\d., -]+ Q [\d., -]+$/.test(path)));
      for (let row = 0; row <= 6; row++) {
        for (let column = 0; column < 7; column++) {
          const point = calendarCell(row, column, geometry);
          assert.ok(point.x >= 8 && point.x <= geometry.width - 8);
          assert.ok(point.y >= 4 && point.y <= geometry.height - 4);
          if (row > 0) assert.ok(point.y > calendarCell(row - 1, column, geometry).y);
          if (column > 0) assert.ok(point.x > calendarCell(row, column - 1, geometry).x);
          if (row === 0) continue;
          const anchor = calendarDayAnchor(row, column, geometry);
          assert.equal(anchor.x, point.x);
          assert.equal(anchor.y, point.y + geometry.textOffset + (placement === "bottom" ? geometry.labelHeight : 0));
          assert.ok(anchor.width > 0 && anchor.height > 0);
          assert.ok(point.y + geometry.dotOffset + geometry.dotRadius <= geometry.height);
          if (row < 6) {
            const nextTextTop = calendarCell(row + 1, column, geometry).y + geometry.textOffset - geometry.fontSize / 2;
            assert.ok(point.y + geometry.dotOffset + geometry.dotRadius < nextTextTop, "completion dot does not collide with the next week's text");
          }
          const coordinates = [...calendarCellPath(row, column, geometry).matchAll(/(-?[\d.]+),(-?[\d.]+)/g)];
          assert.ok(coordinates.every(([, x, y]) => +x > 0 && +x < geometry.width && +y > 0 && +y < geometry.height));
        }
      }
      const pose = calendarPose(-.1, geometry);
      assert.ok(pose.x < 0);
      assert.ok(placement === "top" ? pose.y < 0 : pose.y > 0);
      assert.ok(calendarPose(1, geometry).x > geometry.width);
      const top = getCalendarGeometry(width, height, touch, "top");
      const bottom = getCalendarGeometry(width, height, touch, "bottom");
      for (let row = 0; row <= 6; row++) {
        const topBow = calendarCell(row, 3, top).y - calendarCell(row, 0, top).y;
        const bottomBow = calendarCell(row, 3, bottom).y - calendarCell(row, 0, bottom).y;
        assert.ok(topBow > 0 && bottomBow < 0);
        assert.ok(Math.abs(topBow + bottomBow) < .0001);
      }
    });
  }
}

test("desktop top reproduces all fourteen prototype Bezier paths at its native scale", () => {
  const geometry = getCalendarGeometry(1440, 1400, false, "top");
  assert.equal(geometry.scaleX, 1);
  assert.equal(geometry.scaleY, 1);
  const paths = getCalendarGridPaths(geometry);
  for (let row = 0; row < 6; row++) {
    const y = 52 + row * 69; // source y minus 84-unit whitespace plus 8px padding
    assert.equal(paths[row], `M 50.00,${y.toFixed(2)} Q 590.00,${(y + 108).toFixed(2)} 1130.00,${y.toFixed(2)}`);
  }
  for (let column = 0; column < 8; column++) {
    const x = 70 + 1040 * column / 7;
    const shift = (x - 590) / 996 * 55;
    assert.equal(paths[column + 6], `M ${x.toFixed(2)},8.00 Q ${(x - shift * .25).toFixed(2)},214.00 ${(x + shift).toFixed(2)},459.00`);
  }
  assert.deepEqual(calendarCell(1, 3, geometry), { x: 590, y: 136 });
});

test("headings use the active month and completion colors stay within the prototype palette", () => {
  assert.deepEqual(calendarMonthHeading(monthNumber("2026-08")), { name: "AUGUST", subtitle: "2026 — 08" });
  assert.deepEqual(calendarMonthHeading(monthNumber("2027-01")), { name: "JANUARY", subtitle: "2027 — 01" });
  assert.deepEqual(calendarMonthHeading(monthNumber("2026-12")), { name: "DECEMBER", subtitle: "2026 — 12" });
  const palette = new Set(["#e5392d", "#1457c9", "#efc832"]);
  for (let day = 1; day <= 31; day++) assert.ok(palette.has(calendarCompletionColor(day)));
});

test("curved hit strips contain their dates and do not overlap adjacent cells", () => {
  const quadratic = (a, control, b, t) => (1 - t) ** 2 * a + 2 * (1 - t) * t * control + t * t * b;
  for (const [width, height, touch] of devices) for (const placement of ["top", "bottom"]) {
    const geometry = getCalendarGeometry(width, height, touch, placement);
    const points = (row, col) => [...calendarCellPath(row, col, geometry).matchAll(/(-?[\d.]+),(-?[\d.]+)/g)]
      .map(([, x, y]) => ({ x: +x, y: +y }));
    for (let row = 1; row <= 6; row++) for (let col = 0; col < 7; col++) {
      const path = points(row, col);
      const cell = calendarCell(row, col, geometry);
      assert.ok(cell.x > path[0].x && cell.x < path[2].x);
      const t = (cell.x - path[0].x) / (path[2].x - path[0].x);
      assert.ok(cell.y + geometry.textOffset > quadratic(path[0].y, path[1].y, path[2].y, t));
      assert.ok(cell.y + geometry.dotOffset < quadratic(path[3].y, path[4].y, path[5].y, 1 - t));
      if (col < 6) assert.ok(path[2].x < points(row, col + 1)[0].x);
      if (row === 6) continue;
      const next = points(row + 1, col);
      for (const sample of [0, .25, .5, .75, 1]) {
        assert.ok(quadratic(path[5].y, path[4].y, path[3].y, sample)
          < quadratic(next[0].y, next[1].y, next[2].y, sample));
      }
    }
  }
});
