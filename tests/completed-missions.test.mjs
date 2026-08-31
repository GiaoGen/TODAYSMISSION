import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getGalleryCopyCount, getMissionStreamMetrics } from "../features/packs/model/mission-gallery-layout.ts";
import { MissionStreamDepth } from "../features/packs/model/mission-stream-depth.ts";
import * as dayTransitions from "../features/calendar/model/calendar-day-transition.ts";
import * as returnStates from "../features/packs/model/pack-carousel-return-state.ts";
import { createHomeCarouselState } from "../features/packs/model/home-carousel-state.ts";
import * as geometry from "../features/calendar/model/calendar-geometry.ts";
import * as months from "../features/calendar/model/calendar-month.ts";

const rootPath = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
const read = file => readFileSync(path.join(rootPath, file), "utf8");
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
} }).outputText;

// Load actual repository/fixture/SSR code without adding a test runtime or browser.
function loadModule(file, overrides = {}, cache = new Map(), globals = {}) {
  const absolute = path.resolve(rootPath, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  vm.runInNewContext(compile(readFileSync(absolute, "utf8")), { ...globals, exports, require(name) {
    if (name in overrides) return overrides[name];
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
    const base = name.startsWith("@/") ? path.join(rootPath, name.slice(2)) : path.resolve(path.dirname(absolute), name);
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(resolved, `Module must resolve: ${base}`);
    return loadModule(resolved, overrides, cache, globals);
  } }, { filename: absolute });
  return exports;
}

const repository = loadModule("data/repositories/get-completed-missions.ts");
const user = loadModule("data/repositories/get-mock-user.ts");
const { MISSION_COMPLETION_FIXTURES: completions } = loadModule("data/fixtures/mission-completion-fixtures.ts");
const { PACK_DETAIL_FIXTURES: packs } = loadModule("data/fixtures/pack-fixtures.ts");

test("every marked date maps to exactly its completed Missions across Packs, not cover cards", () => {
  assert.deepEqual(plain(user.getMockMissionCalendar().completedOn), plain(repository.getCompletionDates()));
  const counts = new Set();
  for (const date of repository.getCompletionDates()) {
    const day = repository.getCompletedMissionsByDate(date);
    const records = completions.filter(record => record.completedOn === date);
    assert.equal(day.date, date);
    assert.deepEqual(plain(day.missions.map(mission => mission.id)), plain(records.map(record => record.missionId)));
    assert.equal(new Set(day.missions.map(mission => mission.id)).size, day.missions.length);
    assert.ok(day.missions.every(mission => !packs.some(pack => pack.id === mission.id)));
    if (day.missions.length > 1) assert.ok(new Set(records.map(record => record.packId)).size > 1);
    counts.add(day.missions.length);
  }
  assert.deepEqual([...counts].sort((a, b) => a - b), [1, 2, 3, 5, 8]);
  assert.equal(repository.getCompletedMissionsByDate("2026-08-28").missions.length, 1);
  assert.equal(repository.getCompletedMissionsByDate("2026-08-26").missions.length, 8);
});

test("invalid dates, pre-registration days and days without completions cannot open a gallery", () => {
  for (const date of ["", "2026-02-30", "2026-8-28", "2026-05-11", "2026-08-27", "../2026-08-28", "2099-01-01"]) {
    assert.equal(repository.getCompletedMissionsByDate(date), null);
  }
});

test("actual date route accepts async params, prerenders every recorded day and rejects empty dates", async () => {
  const page = loadModule("app/completed/[date]/page.tsx", {
    "next/navigation": { notFound() { throw new Error("not-found"); } },
    "@/features/packs/components/MissionGallery": { MissionGallery: () => null },
  });
  assert.deepEqual(plain(page.generateStaticParams().map(item => item.date)), plain(repository.getCompletionDates()));
  const element = await page.default({ params: Promise.resolve({ date: "2026-08-26" }) });
  assert.equal(element.props.completedDate, "2026-08-26");
  assert.equal(element.props.missions.length, 8);
  assert.equal(element.props.hero.id, element.props.missions[0].id);
  await assert.rejects(() => page.default({ params: Promise.resolve({ date: "2026-08-27" }) }), /not-found/);
});

test("actual day gallery renders exactly the day's card count, never loop copies or extra covers", () => {
  const { MissionGallery } = loadModule("features/packs/components/MissionGallery.tsx", {
    react: { ...require("react"), ViewTransition: ({ children }) => children },
    "next/navigation": { useRouter: () => ({}) },
    "@/components/card/PackCard": { PackCard: ({ pack }) => createElement("span", { "data-mission-id": pack.id }) },
  });
  for (const date of repository.getCompletionDates()) {
    const day = repository.getCompletedMissionsByDate(date);
    const html = renderToStaticMarkup(createElement(MissionGallery, {
      id: dayTransitions.getDayGalleryId(date), title: date, hero: day.missions[0], missions: day.missions, completedDate: date,
    }));
    const track = html.match(/<ol\b[\s\S]*?<\/ol>/)?.[0];
    assert.ok(track);
    const primaryCards = [...track.matchAll(/<li\b([^>]*)>/g)].filter(match => !match[1].includes('aria-hidden="true"'));
    assert.equal(primaryCards.length, day.missions.length);
    assert.equal((track.match(/<li\b/g) ?? []).length, day.missions.length);
    assert.equal((track.match(/class="streamDepth"/g) ?? []).length, day.missions.length);
    assert.equal((track.match(/class="mission"/g) ?? []).length, day.missions.length);
    assert.deepEqual([...track.matchAll(/data-mission-id="([^"]+)"/g)].map(match => match[1]), plain(day.missions.map(mission => mission.id)));
    assert.doesNotMatch(html, /<img|class="cover"/);
    assert.doesNotMatch(html, /class="hero"/, "the real first card carries the transition, without a duplicate overlay");
    assert.equal((html.match(/<article\b/g) ?? []).length, day.missions.length);
  }
});

for (const nativeScrolling of [false, true]) {
  test(`${nativeScrolling ? "Safari" : "Chrome"}: date stream uses Pack dimensions at phone/tablet/desktop sizes but never duplicates Missions`, () => {
    for (const viewport of [
      { width: 375, height: 812, coarsePointer: true },
      { width: 820, height: 1180, coarsePointer: true },
      { width: 1180, height: 820, coarsePointer: true },
      { width: 1920, height: 1080, coarsePointer: false },
    ]) {
      const { MissionGallery } = loadModule("features/packs/components/MissionGallery.tsx", {
        react: { ...require("react"), ViewTransition: ({ children }) => children },
        "next/navigation": { useRouter: () => ({}) },
        "@/features/packs/model/use-deck-viewport": { useDeckViewport: () => viewport },
        "@/features/packs/model/use-safari-scroll": { useSafariScroll: () => nativeScrolling },
      });
      const day = repository.getCompletedMissionsByDate("2026-08-26");
      const html = renderToStaticMarkup(createElement(MissionGallery, {
        id: dayTransitions.getDayGalleryId(day.date), title: day.date, hero: day.missions[0], missions: day.missions, completedDate: day.date,
      }));
      const metrics = getMissionStreamMetrics(viewport);
      assert.ok(html.includes(`--mission-card-width:${metrics.cardWidth}px`));
      assert.ok(html.includes(`--detail-gap:${metrics.gap}px`));
      assert.ok(html.includes(`--stream-unit:${metrics.unit}px`));
      assert.ok(html.includes("--stream-collapse-scale:1"));
      assert.equal((html.match(/<li\b/g) ?? []).length, day.missions.length);
      assert.doesNotMatch(html, /<img/);
    }
  });
}

test("day opening keeps its date anchor while only closing selects the shrink-to-point animation", () => {
  const transitions = [];
  const overrides = {
    react: { ...require("react"), ViewTransition: ({ name, share, children }) => { if (name) transitions.push({ name, share }); return children; } },
    "next/navigation": { useRouter: () => ({}) },
  };
  const date = "2026-08-28";
  const day = repository.getCompletedMissionsByDate(date);
  const { CalendarMonth } = loadModule("features/calendar/components/CalendarMonth.tsx", overrides);
  renderToStaticMarkup(createElement(CalendarMonth, {
    month: months.monthNumber("2026-08"), range: months.getCalendarRange("2026-05-12", "2026-08-31"),
    geometry: geometry.getCalendarGeometry(375, 812, true, "top"), completedOn: new Set([date]), onOpenDate() {},
  }));
  const { MissionGallery } = loadModule("features/packs/components/MissionGallery.tsx", overrides);
  renderToStaticMarkup(createElement(MissionGallery, {
    id: dayTransitions.getDayGalleryId(date), title: date, hero: day.missions[0], missions: day.missions, completedDate: date,
  }));
  assert.equal(transitions.length, 2);
  assert.equal(transitions[0].name, transitions[1].name);
  for (const transition of transitions) {
    assert.deepEqual(plain(transition.share), { default: "calendar-day-morph", "pack-close": "calendar-day-dismiss" });
  }
  transitions.length = 0;
  renderToStaticMarkup(createElement(MissionGallery, { id: packs[0].id, title: packs[0].title, hero: packs[0], missions: packs[0].missions }));
  assert.equal(transitions[0].share, "pack-card-morph", "normal Pack morph is unchanged");
});

test("refresh/deep-link return opens the correct calendar month without mutating permanent settings", () => {
  const contents = ["joined", "all", "calendar"];
  for (const top of contents) for (const bottom of contents.filter(item => item !== top)) {
    const settings = { top, bottom };
    const saved = { ...settings };
    const state = dayTransitions.createDirectDayReturnState("2026-07-11", settings);
    const view = createHomeCarouselState(state, settings);
    assert.deepEqual(settings, saved);
    assert.equal(state.completedDate, "2026-07-11");
    assert.equal(view.snapshots.calendar.month, "2026-07");
    assert.notEqual(view.topCollection, view.bottomCollection);
    assert.equal(state.source === "top" ? view.topCollection : view.bottomCollection, "calendar");
    assert.equal(dayTransitions.getDayTransitionName(state.completedDate, state.source),
      dayTransitions.getDayTransitionName(state.completedDate, returnStates.getPackEntrySource(state.packId, state)));
  }
});

test("loop copies cover small lists on phone, tablet and ultrawide screens, while single stays single", () => {
  for (const width of [320, 375, 820, 1180, 1440, 1920, 3840, 5120]) {
    assert.equal(getGalleryCopyCount(1, width), 1);
    for (const count of [2, 3, 5, 8]) {
      const copies = getGalleryCopyCount(count, width);
      assert.equal(copies % 2, 1);
      const stride = 178;
      const primary = Math.floor(copies / 2);
      for (const fraction of [-.5, 0, .5]) {
        const position = width / 2 - primary * count * stride - 80 + fraction * count * stride;
        assert.ok(position <= 0, `${width}/${count}: left edge covered`);
        assert.ok(position + (copies * count - 1) * stride + 160 >= width,
          `${width}/${count}: right edge covered`);
      }
    }
  }
});

test("calendar date markup keeps its open grid, adds curved hit targets and keyboard semantics only for recorded days", () => {
  const { CalendarMonth } = loadModule("features/calendar/components/CalendarMonth.tsx", {
    react: { ...require("react"), ViewTransition: ({ children }) => children },
  });
  for (const placement of ["top", "bottom"]) {
    const props = {
      month: months.monthNumber("2026-08"), range: months.getCalendarRange("2026-05-12", "2026-08-30"),
      geometry: geometry.getCalendarGeometry(820, 1180, true, placement),
      completedOn: new Set(["2026-08-28", "2026-08-26"]), onOpenDate() {},
    };
    const html = renderToStaticMarkup(createElement(CalendarMonth, props));
    assert.equal((html.match(/class="rule"/g) ?? []).length, 14);
    assert.equal((html.match(/role="button"/g) ?? []).length, 2);
    assert.equal((html.match(/class="dayHitArea"/g) ?? []).length, 2);
    assert.equal((html.match(/class="dayAnchor"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /role="img"|NaN|undefined/);
    const hidden = renderToStaticMarkup(createElement(CalendarMonth, { ...props, active: false }));
    assert.doesNotMatch(hidden, /role="button"|class="dayAnchor"|tabindex="0"/);
    for (let row = 1; row <= 6; row++) for (let column = 0; column < 7; column++) {
      const hitPath = geometry.calendarCellPath(row, column, props.geometry);
      assert.equal((hitPath.match(/\bQ\b/g) ?? []).length, 2);
      assert.match(hitPath, /^M .+ Z$/);
      assert.doesNotMatch(hitPath, /NaN|undefined/);
    }
  }
});

test("calendar artwork uses the active month, actual today and exactly one colored dot per completed date", () => {
  const { CalendarMonth } = loadModule("features/calendar/components/CalendarMonth.tsx", {
    react: { ...require("react"), ViewTransition: ({ children }) => children },
  });
  const props = {
    month: months.monthNumber("2026-08"), range: months.getCalendarRange("2026-05-12", "2026-08-29"),
    geometry: geometry.getCalendarGeometry(375, 812, true, "top"),
    completedOn: new Set(["2026-08-27", "2026-08-28", "2026-08-29", "2026-08-31"]), onOpenDate() {},
  };
  const html = renderToStaticMarkup(createElement(CalendarMonth, props));
  assert.match(html, /class="monthName"[^>]*>AUGUST<\/span>/);
  assert.match(html, /class="monthSub"[^>]*>2026 — 08<\/span>/);
  assert.equal((html.match(/class="todayMark"/g) ?? []).length, 1);
  const today = html.match(/<g[^>]*aria-current="date"[^>]*>[\s\S]*?<\/g>/)?.[0];
  assert.match(today, /<title>2026-08-29/);
  assert.match(today, /class="todayMark"/);
  const colors = [...html.matchAll(/<circle[^>]*class="dot"[^>]*fill="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(colors.sort(), ["#e5392d", "#1457c9", "#efc832"].sort());
  const january = renderToStaticMarkup(createElement(CalendarMonth, {
    ...props, month: months.monthNumber("2027-01"), range: months.getCalendarRange("2026-05-12", "2027-01-02"),
  }));
  assert.match(january, /class="monthName"[^>]*>JANUARY<\/span>/);
  assert.match(january, /class="monthSub"[^>]*>2027 — 01<\/span>/);
  assert.doesNotMatch(january, /class="dot"|class="dayAnchor"/);
});

test("rendered shared anchors align with date text on both placements, including short landscape screens", () => {
  const { CalendarMonth } = loadModule("features/calendar/components/CalendarMonth.tsx", {
    react: { ...require("react"), ViewTransition: ({ children }) => children },
  });
  for (const [width, height, coarse] of [[568, 320, true], [375, 812, true], [820, 1180, true], [1920, 1080, false]]) {
    for (const placement of ["top", "bottom"]) {
      const metrics = geometry.getCalendarGeometry(width, height, coarse, placement);
      const html = renderToStaticMarkup(createElement(CalendarMonth, {
        month: months.monthNumber("2026-08"), range: months.getCalendarRange("2026-05-12", "2026-08-28"),
        geometry: metrics, completedOn: new Set(["2026-08-28"]), onOpenDate() {},
      }));
      const group = html.match(/<g[^>]*data-completed-date="2026-08-28"[^>]*>[\s\S]*?<\/g>/)?.[0];
      const [, x, y] = group.match(/<text class="date" x="([^"]+)" y="([^"]+)"/);
      const style = html.match(/class="dayAnchor" style="([^"]+)"/)[1];
      const value = name => parseFloat(style.match(new RegExp(`(?:^|;)${name}:([^;]+)`))[1]);
      assert.equal(value("left"), +x);
      assert.equal(value("top"), +y + (placement === "bottom" ? metrics.labelHeight : 0));
      assert.ok(value("width") > 0 && value("height") > 0);
      if (metrics.rowHeight < 15) {
        const [, cx] = group.match(/<circle[^>]*cx="([^"]+)"/);
        const [, right] = group.match(/<line[^>]*x2="([^"]+)"/);
        assert.ok(+cx - metrics.dotRadius > +right, "today's underline and completion dot remain distinct");
      }
    }
  }
});

function findNode(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => findNode(child, predicate));
}

test("actual home date handler snapshots both wheels, rejects duplicate navigation and never saves settings", () => {
  const source = ts.createSourceFile("HomePackCarousels.tsx", read("features/packs/components/HomePackCarousels.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handler = findNode(source, node => ts.isVariableDeclaration(node) && node.name.getText(source) === "openCompletedDay").initializer;
  for (const placement of ["top", "bottom"]) {
    let captured;
    const navigations = [];
    const calendarSnapshot = { month: "2026-07", position: months.monthNumber("2026-07") + .08 };
    const packSnapshot = { packId: "mock-pack-03", count: 12, activeIndex: 2, position: 26.2 };
    const wheels = placement === "top" ? { top: calendarSnapshot, bottom: packSnapshot } : { top: packSnapshot, bottom: calendarSnapshot };
    const state = {
      navigationLockRef: { current: false }, swapLockRef: { current: false }, menuOpenRef: { current: false },
      calendar: { completedOn: ["2026-07-11"] }, setReady() {},
      topRef: { current: { freezeAndSnapshot: () => wheels.top } },
      bottomRef: { current: { freezeAndSnapshot: () => wheels.bottom } },
      view: { topCollection: placement === "top" ? "calendar" : "all", bottomCollection: placement === "bottom" ? "calendar" : "all" },
      captureHomeCarousels: (_, rows) => ({ snapshots: { calendar: rows[placement], all: rows[placement === "top" ? "bottom" : "top"], joined: null } }),
      setPackCarouselReturnState: value => { captured = value; },
      ...dayTransitions, PACK_OPEN_TRANSITION_TYPE: "pack-open",
      router: { push: (...args) => navigations.push(args) },
    };
    const run = vm.runInNewContext(compile(`(${handler.getText(source)})`), state);
    run("2026-07-12", placement);
    assert.equal(navigations.length, 0);
    run("2026-07-11", placement);
    run("2026-07-11", placement);
    assert.equal(navigations.length, 1);
    assert.equal(navigations[0][0], "/completed/2026-07-11");
    assert.deepEqual(plain(navigations[0][1].transitionTypes), ["pack-open"]);
    assert.deepEqual(plain(captured.carousels), wheels);
    const restored = createHomeCarouselState(captured, { top: "joined", bottom: "all" });
    assert.equal(restored.snapshots.calendar.position, calendarSnapshot.position);
    assert.equal(restored.snapshots.all.position, 26.2);
    assert.equal(restored.topCollection, "calendar", "legacy bottom calendar also migrates to top");
  }
});

// Execute the real gallery effect with deterministic DOM/RAF/timer stand-ins.
// This verifies sequencing and cleanup, not browser rendering or visual quality.
function galleryHarness(count, { reduced = false, saved = null, looping = false } = {}) {
  const source = ts.createSourceFile("MissionGallery.tsx", read("features/packs/components/MissionGallery.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "MissionGallery");
  const effect = findNode(component, node => ts.isCallExpression(node) && node.expression.getText(source) === "useLayoutEffect" && node.arguments[0]?.getText(source).includes("const root = rootRef.current"));
  const listeners = new Map();
  const frames = new Map();
  const timers = new Map();
  const navigations = [];
  let token = 0;
  let now = 0;
  let capture = null;
  let returned = saved;
  let finishCollapse;
  const animationFinished = new Promise(resolve => { finishCollapse = resolve; });
  let finishExpansion;
  const expansionFinished = new Promise(resolve => { finishExpansion = resolve; });
  class Element {
    constructor(card = false) { this.card = card; }
    closest() { return this.card ? this : null; }
  }
  const root = Object.assign(new Element(), {
    clientWidth: 1920, dataset: {}, focus() {},
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
    getAnimations: () => root.dataset.phase === "closing" ? [{ finished: animationFinished }]
      : root.dataset.phase === "expanding" && count > 1 ? [{ finished: expansionFinished }] : [],
    hasPointerCapture: id => capture === id,
    setPointerCapture: id => { capture = id; }, releasePointerCapture: () => { capture = null; },
  });
  const copies = looping ? getGalleryCopyCount(count, root.clientWidth) : 1;
  const cards = Array.from({ length: copies * count }, (_, index) => ({
    offsetLeft: index * 272, offsetWidth: 240, style: { setProperty(name, value) { this[name] = value; } },
  }));
  const track = { style: {} };
  const env = {
    nativeScrolling: false,
    isSafariUserAgent: () => false,
    rootRef: { current: root }, trackRef: { current: track }, missionRefs: { current: cards },
    primaryCopyRef: { current: Math.floor(copies / 2) }, measureRef: { current: null },
    MissionStreamDepth, missionCount: count, looping, id: looping ? "mock-pack-01" : dayTransitions.getDayGalleryId("2026-08-28"),
    completedDate: looping ? undefined : "2026-08-28",
    performance: { now: () => now }, Element, styles: { missionCard: "missionCard" },
    requestAnimationFrame: fn => { frames.set(++token, fn); return token; }, cancelAnimationFrame: id => frames.delete(id),
    window: { matchMedia: () => ({ matches: reduced }), setTimeout: fn => { timers.set(++token, fn); return token; }, clearTimeout: id => timers.delete(id) },
    ResizeObserver: class { observe() {} disconnect() {} },
    router: { prefetch() {}, replace: (...args) => navigations.push(args) },
    getPackCarouselReturnState: () => returned, setPackCarouselReturnState: value => { returned = value; },
    createDirectDayReturnState: dayTransitions.createDirectDayReturnState,
    createDirectPackReturnState: returnStates.createDirectPackReturnState,
    carouselSettingsStore: { read: () => ({ top: "joined", bottom: "all" }) }, PACK_CLOSE_TRANSITION_TYPE: "pack-close",
  };
  const constants = source.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => /^[A-Z_]+$/.test(declaration.name.getText(source))));
  const clamp = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "clamp");
  const cleanup = vm.runInNewContext(compile(`${constants.map(node => node.getText(source)).join("\n")}\n${clamp.getText(source)}\n(${effect.arguments[0].getText(source)})()`), env);
  const frame = () => {
    now += 16;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(fn => fn(now));
  };
  return {
    root, track, cards, env, frames, timers, listeners, navigations, cleanup, frame, finishCollapse, finishExpansion,
    returned: () => returned,
    async expand() {
      frame(); finishExpansion();
      [...timers.values()].forEach(fn => fn()); timers.clear();
      await new Promise(resolve => setImmediate(resolve));
    },
    event(name, extra = {}) { now += 16; listeners.get(name)?.({ type: name, button: 0, pointerId: 1, clientX: 100, target: root, preventDefault() {}, ...extra }); },
    cardTarget: () => new Element(true),
  };
}

for (const count of [1, 2, 3, 8]) for (const reduced of [false, true]) {
  test(`${count} Missions${reduced ? " reduced-motion" : ""}: center, expand, wait for collapse, then restore calendar`, async () => {
    const gallery = galleryHarness(count, { reduced });
    assert.equal(gallery.cards.length, count);
    assert.equal(gallery.track.style.transform, "translate3d(840px, -50%, 0)");
    assert.equal(gallery.root.dataset.phase, "collapsed");
    await gallery.expand();
    assert.equal(gallery.root.dataset.phase, "settled");
    gallery.event("click", { target: gallery.cardTarget() });
    assert.equal(gallery.root.dataset.phase, "settled", "card click must not dismiss");
    gallery.event("click");
    assert.equal(gallery.root.dataset.phase, "closing");
    gallery.frame();
    assert.equal(gallery.navigations.length, 0, "do not navigate before collapse finishes");
    gallery.finishCollapse();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(gallery.navigations.length, 1);
    assert.equal(gallery.navigations[0][0], "/");
    assert.deepEqual(plain(gallery.navigations[0][1].transitionTypes), ["pack-close"]);
    assert.equal(gallery.returned().topCollection, "calendar");
    assert.equal(gallery.returned().snapshots.calendar.month, "2026-08");
    gallery.cleanup();
    assert.equal(gallery.listeners.size, 0);
    assert.equal(gallery.frames.size, 0);
    assert.equal(gallery.timers.size, 0);
  });
}

test("day unlock waits for every actual entry animation, not a fixed timer", async () => {
  const gallery = galleryHarness(8);
  let completeMotion, cancelFade;
  const animations = [
    { finished: new Promise(resolve => { completeMotion = resolve; }) },
    { finished: new Promise((_, reject) => { cancelFade = reject; }) },
  ];
  gallery.root.getAnimations = () => gallery.root.dataset.phase === "expanding" ? animations : [];
  gallery.frame();
  assert.equal(gallery.timers.size, 0, "day mode must not schedule the Pack's 1600ms lock");
  gallery.event("click");
  assert.equal(gallery.root.dataset.phase, "expanding");
  completeMotion();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(gallery.root.dataset.phase, "expanding", "one finished property must not unlock the remaining animations");
  cancelFade(new Error("CSS transition cancelled"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(gallery.root.dataset.phase, "settled", "cancellation must not leave the gallery locked");
  gallery.event("click");
  assert.equal(gallery.root.dataset.phase, "closing");
  gallery.cleanup();
});

test("a single date card with no local motion unlocks and returns without artificial waits", async () => {
  const gallery = galleryHarness(1);
  gallery.root.getAnimations = () => [];
  await gallery.expand();
  assert.equal(gallery.root.dataset.phase, "settled");
  assert.equal(gallery.timers.size, 0);
  gallery.event("click");
  gallery.frame();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(gallery.navigations.length, 1);
  gallery.cleanup();
});

test("day entry animation completion cannot unlock or focus an unmounted gallery", async () => {
  const gallery = galleryHarness(3);
  let focusCalls = 0;
  gallery.root.focus = () => { focusCalls++; };
  gallery.frame();
  gallery.cleanup();
  gallery.finishExpansion();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(gallery.root.dataset.phase, "expanding");
  assert.equal(focusCalls, 0);
  assert.equal(gallery.frames.size, 0);
  assert.equal(gallery.timers.size, 0);
});

test("the real first date card stays opaque through every phase in both drivers", () => {
  const css = read("features/packs/components/MissionGallery.module.css");
  assert.match(css, /\.root\[data-kind="day"\] \.missionCard:first-child\s*\{[^}]*z-index: 1;[^}]*opacity: 1;/);
  assert.match(css, /\.root\[data-kind="day"\]\[data-native-scroll="true"\] \.missionCard:first-child \.missionMotion\s*\{[^}]*opacity: 1;/);
  assert.doesNotMatch(css, /\[data-kind="day"\][^{]*\.hero/);
  assert.match(css, /\.root\[data-kind="day"\]\s*\{[^}]*--stream-expand-delay: 520ms;[^}]*--stream-collapse-duration: 360ms;/);
  assert.match(css, /\.root\[data-kind="day"\] \.track\s*\{[^}]*transform: translate3d\(calc\(\(100vw - var\(--mission-card-width\)\) \/ 2\), -50%, 0\);/);
  // The same native focus selectors cover expansion and settled, so phase
  // completion cannot introduce a second scale/opacity correction.
  const sharedFocus = ':is([data-phase="settled"], :where([data-kind="day"])[data-phase="expanding"])';
  assert.equal(css.split(sharedFocus).length - 1, 4);
});

test("single card cannot be dragged off center or create NaN snaps; a drag release never closes", async () => {
  const gallery = galleryHarness(1);
  await gallery.expand();
  const initial = gallery.track.style.transform;
  gallery.event("pointerdown");
  gallery.event("pointermove", { clientX: 20 });
  gallery.event("pointerup", { clientX: 20 });
  gallery.event("click");
  gallery.event("wheel", { deltaX: 5000, deltaY: 0 });
  gallery.event("keydown", { key: "ArrowRight" });
  assert.equal(gallery.track.style.transform, initial);
  assert.equal(gallery.root.dataset.phase, "settled");
  assert.equal(gallery.frames.size, 0);
  gallery.event("keydown", { key: "Escape" });
  assert.equal(gallery.root.dataset.phase, "closing");
  gallery.cleanup();
});

test("loop can wrap repeatedly without drift and cleanup during collapse prevents late navigation", async () => {
  const gallery = galleryHarness(2, { reduced: true, looping: true });
  await gallery.expand();
  const initial = gallery.track.style.transform;
  for (let index = 0; index < 40; index++) gallery.event("wheel", { deltaX: 544, deltaY: 0 });
  const before = gallery.track.style.transform;
  assert.equal(before, initial, "ordinary Pack keeps infinite wrapping");
  gallery.env.measureRef.current();
  assert.equal(gallery.track.style.transform, before);
  gallery.event("click");
  gallery.frame();
  gallery.cleanup();
  gallery.finishCollapse();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(gallery.navigations.length, 0);
});

for (const source of ["top", "bottom"]) for (const count of [1, 2, 3, 8]) {
  test(`Pack stream ${source}/${count}: depth, live-position collapse and original wheel return stay connected`, async () => {
    const saved = {
      source, packId: "mock-pack-01", topCollection: "joined", bottomCollection: "all",
      carousels: { top: { packId: "mock-pack-01", activeIndex: 0, count: 5, position: 0 }, bottom: { packId: "mock-pack-03", activeIndex: 2, count: 12, position: 2 } },
    };
    const gallery = galleryHarness(count, { looping: true, saved });
    const center = count * gallery.env.primaryCopyRef.current;
    assert.equal(Number(gallery.cards[center].style["--stream-scale"]), 1);
    if (count > 1) assert.equal(Number(gallery.cards[center + 1].style["--stream-y"]), 28);
    await gallery.expand();
    gallery.event("pointerdown", { clientX: 300, pointerType: "touch" });
    gallery.event("pointermove", { clientX: 60, pointerType: "touch" });
    gallery.event("pointerup", { clientX: 60, pointerType: "touch" });
    gallery.event("click");
    assert.equal(gallery.root.dataset.phase, "settled", "release click must not close the pack");
    for (let frame = 0; frame < 14; frame++) gallery.frame();
    const before = Number(gallery.track.style.transform.match(/translate3d\(([-.\d]+)px/)[1]);
    gallery.event("click");
    assert.equal(gallery.root.dataset.phase, "closing");
    for (const card of gallery.cards) {
      assert.ok(Math.abs(before + card.offsetLeft + 120 + parseFloat(card.style["--mission-collapsed-x"]) - 960) < .000001);
    }
    const depthStyles = gallery.cards.map(card => card.style["--stream-scale"]);
    gallery.frame();
    assert.deepEqual(gallery.cards.map(card => card.style["--stream-scale"]), depthStyles, "depth RAF cannot fight the closing CSS");
    assert.equal(gallery.navigations.length, 0);
    gallery.finishCollapse();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(gallery.navigations.length, 1);
    assert.equal(gallery.returned(), saved);
    gallery.cleanup();
    assert.equal(gallery.frames.size, 0);
  });
}

const trackPosition = gallery => Number(gallery.track.style.transform.match(/translate3d\(([-.\d]+)px/)[1]);
function settleGallery(gallery) {
  for (let frame = 0; frame < 600 && gallery.frames.size; frame++) gallery.frame();
  assert.equal(gallery.frames.size, 0, "spring must stop requesting frames");
}

for (const count of [2, 3, 8]) {
  test(`${count} date Missions: wheel and keyboard stop at both endpoints without wrapping`, async () => {
    const gallery = galleryHarness(count, { reduced: true });
    await gallery.expand();
    const first = trackPosition(gallery);
    const last = first - (count - 1) * 272;
    for (let i = 0; i < 5; i++) gallery.event("wheel", { deltaX: 100000, deltaY: 0 });
    assert.equal(trackPosition(gallery), last);
    assert.equal(Number(gallery.cards[count - 1].style["--stream-scale"]), 1);
    assert.equal(Number(gallery.cards[count - 1].style["--stream-y"]), 0);
    gallery.event("keydown", { key: "ArrowRight" });
    assert.equal(trackPosition(gallery), last);
    for (let i = 0; i < 5; i++) gallery.event("wheel", { deltaX: -100000, deltaY: 0 });
    assert.equal(trackPosition(gallery), first);
    assert.equal(Number(gallery.cards[0].style["--stream-scale"]), 1);
    assert.equal(Number(gallery.cards[0].style["--stream-y"]), 0);
    gallery.event("keydown", { key: "ArrowLeft" });
    assert.equal(trackPosition(gallery), first);
    gallery.cleanup();
  });

  test(`${count} date Missions: drag bounds resist then spring back; collapse starts at the actual browsing position`, async () => {
    const gallery = galleryHarness(count);
    await gallery.expand();
    const first = trackPosition(gallery);
    const last = first - (count - 1) * 272;
    gallery.event("pointerdown");
    gallery.event("pointermove", { clientX: 10000 });
    assert.ok(trackPosition(gallery) > first && trackPosition(gallery) < first + 60);
    gallery.event("pointerup", { clientX: 10000 });
    settleGallery(gallery);
    assert.equal(trackPosition(gallery), first);
    gallery.event("pointerdown");
    gallery.event("pointermove", { clientX: -10000 });
    assert.ok(trackPosition(gallery) < last && trackPosition(gallery) > last - 60);
    gallery.event("pointerup", { clientX: -10000 });
    settleGallery(gallery);
    assert.equal(trackPosition(gallery), last);
    gallery.event("keydown", { key: "ArrowLeft" });
    settleGallery(gallery);
    const beforeClose = trackPosition(gallery);
    gallery.event("click");
    assert.equal(trackPosition(gallery), beforeClose, "no jump back to first Mission before collapse");
    for (const card of gallery.cards) {
      assert.equal(beforeClose + card.offsetLeft + 120 + parseFloat(card.style["--mission-collapsed-x"]), 960);
    }
    gallery.cleanup();
  });
}

test("calendar return has matching date anchors in the FIRST render, before any layout effect/ResizeObserver", () => {
  for (const [width, height, coarse] of [[375, 812, true], [820, 1180, true], [1920, 1080, false]]) {
    for (const placement of ["top", "bottom"]) {
      const names = [];
      const overrides = {
        react: { ...require("react"), ViewTransition: ({ name, children }) => { if (name) names.push(name); return children; } },
        "next/navigation": { useRouter: () => ({}) },
      };
      const { CalendarCarousel } = loadModule("features/calendar/components/CalendarCarousel.tsx", overrides, new Map(), {
        window: { innerWidth: width, innerHeight: height, matchMedia: () => ({ matches: coarse }) },
      });
      const html = renderToStaticMarkup(createElement(CalendarCarousel, {
        data: user.getMockMissionCalendar(), placement, interactionDisabled: true, swappingIn: false, onOpenDate() {},
        snapshot: { month: "2026-08", position: months.monthNumber("2026-08") + .08 },
      }));
      assert.ok(names.includes(dayTransitions.getDayTransitionName("2026-08-28", placement)));
      assert.match(html, /class="dayAnchor"/);
    }
  }
});

test("calendar's initial DOM measurement doesn't schedule a second render when geometry is already correct", () => {
  const source = ts.createSourceFile("CalendarCarousel.tsx", read("features/calendar/components/CalendarCarousel.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const measure = findNode(source, node => ts.isVariableDeclaration(node) && node.name.getText(source) === "measure").initializer;
  let updates = 0;
  const root = { clientWidth: 375, clientHeight: 812 };
  const context = {
    root, coarse: { matches: true }, placement: "bottom",
    geometryRef: { current: geometry.getCalendarGeometry(375, 812, true, "bottom") },
    getCalendarGeometry: geometry.getCalendarGeometry, dragRef: { current: null }, frameRef: { current: null },
    finishImmediately() {}, setGeometry() { updates++; },
  };
  const run = vm.runInNewContext(compile(`(${measure.getText(source)})`), context);
  run();
  assert.equal(updates, 0);
  root.clientWidth = 820; root.clientHeight = 1180;
  run();
  assert.equal(updates, 1, "a genuine resize still adapts the calendar");
  run();
  assert.equal(updates, 1);
});

test("the returning Mission follows its date path and shrinks to an invisible point before cleanup", () => {
  const css = read("app/globals.css");
  assert.match(css, /::view-transition-old\(\.calendar-day-dismiss\)\s*\{[^}]*animation:\s*none;[^}]*opacity:\s*1;/);
  assert.doesNotMatch(css, /calendar-card-disappear/);
  assert.match(css, /::view-transition-group\(\.calendar-day-dismiss\)\s*\{[^}]*animation-duration:\s*520ms/);
  assert.match(css, /::view-transition-image-pair\(\.calendar-day-dismiss\)\s*\{[^}]*transform-origin: 50% 50%;[^}]*animation: calendar-card-shrink-away 520ms linear both/);
  const shrink = css.match(/@keyframes calendar-card-shrink-away\s*\{\s*from\s*\{[^}]*\}\s*80%\s*\{[^}]*\}\s*to\s*\{[^}]*\}\s*\}/)?.[0];
  assert.ok(shrink);
  assert.match(shrink, /from\s*\{\s*transform: scale\(1\); opacity: 1;/);
  assert.match(shrink, /80%\s*\{\s*transform: scale\(\.04\); opacity: 1;/);
  assert.match(shrink, /to\s*\{\s*transform: scale\(0\); opacity: 0;/);
  assert.doesNotMatch(shrink, /translate|display|visibility|vh/);
  assert.doesNotMatch(css, /calendar-card-fly-out/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*::view-transition-image-pair\(\.calendar-day-dismiss\)\s*\{[^}]*animation-duration: 0s !important/);
});

test("live calendar and other wheel snapshots survive gallery close unchanged", async () => {
  const saved = {
    source: "bottom", packId: dayTransitions.getDayGalleryId("2026-08-28"), completedDate: "2026-08-28",
    topCollection: "all", bottomCollection: "calendar",
    carousels: { top: { count: 5, activeIndex: 2, packId: "mock-pack-03", position: 2.2 }, bottom: { month: "2026-08", position: months.monthNumber("2026-08") } },
  };
  const gallery = galleryHarness(2, { saved });
  await gallery.expand(); gallery.event("click"); gallery.frame(); gallery.finishCollapse();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(gallery.returned(), saved, "normal close must not replace the captured live view with defaults");
  gallery.cleanup();
});
