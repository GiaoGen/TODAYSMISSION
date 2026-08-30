import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CAROUSEL_SETTINGS_KEY, DEFAULT_CAROUSEL_SETTINGS, createCarouselSettingsStore, parseCarouselSettings } from "../features/packs/model/carousel-settings.ts";
import * as selection from "../features/packs/model/home-carousel-state.ts";
import { animateCarouselPair } from "../features/packs/model/carousel-swap-motion.ts";

const makeState = (settings = { top: "calendar", bottom: "all" }) => ({ ...selection.createHomeCarouselState(null, settings), settings });
const sourceText = readFileSync(new URL("../features/packs/components/HomePackCarousels.tsx", import.meta.url), "utf8");

function memoryStorage() {
  const items = new Map();
  const writes = [];
  return { writes, getItem: key => items.get(key) ?? null, setItem(key, value) { writes.push([key, value]); items.set(key, value); } };
}

test("both bottom Pack selections survive refresh, with only durable settings persisted", () => {
  for (const top of ["calendar"]) {
    for (const bottom of ["joined", "all"]) {
      const storage = memoryStorage();
      const store = createCarouselSettingsStore(() => storage);
      assert.equal(store.save({ top, bottom, temporary: "ignored", position: 12, loggedOut: true }), true);
      assert.deepEqual(JSON.parse(storage.getItem(CAROUSEL_SETTINGS_KEY)), { version: 2, top, bottom });
      assert.deepEqual(createCarouselSettingsStore(() => storage).read(), { top, bottom });
      const restored = selection.createHomeCarouselState(null, createCarouselSettingsStore(() => storage).read());
      assert.equal(restored.topCollection, top);
      assert.equal(restored.bottomCollection, bottom);
      assert.deepEqual(restored.snapshots, { joined: null, all: null, calendar: null });
    }
  }
});

test("all six legacy pairs migrate to calendar on top, preferring the previous bottom Pack", () => {
  for (const top of ["calendar", "joined", "all"]) {
    for (const bottom of ["calendar", "joined", "all"].filter(content => content !== top)) {
      const storage = memoryStorage();
      storage.setItem("todaysmission:carousel-settings:v1", JSON.stringify({ version: 1, top, bottom }));
      const expected = { top: "calendar", bottom: bottom === "calendar" ? top : bottom };
      const store = createCarouselSettingsStore(() => storage);
      assert.deepEqual(store.read(), expected);
      assert.equal(store.save(expected), true);
      assert.deepEqual(createCarouselSettingsStore(() => storage).read(), expected);
    }
  }
  assert.equal(parseCarouselSettings('{"version":"2","top":"calendar","bottom":"all"}'), null);
});

test("malformed, outdated and duplicate settings fail closed to defaults", () => {
  for (const value of [null, "", "invalid", "null", "[]", "42", "{}", '{"version":2,"top":"joined","bottom":"all"}', '{"version":1,"top":"calendar","bottom":"calendar"}', '{"version":1,"top":"unknown","bottom":"all"}']) {
    assert.equal(parseCarouselSettings(value), null);
    assert.deepEqual(createCarouselSettingsStore(() => ({ getItem: () => value })).read(), DEFAULT_CAROUSEL_SETTINGS);
  }
});

test("denied storage getters and quota failures cannot crash or corrupt session settings", () => {
  const denied = createCarouselSettingsStore(() => { throw new Error("SecurityError"); });
  assert.deepEqual(denied.read(), DEFAULT_CAROUSEL_SETTINGS);
  assert.equal(denied.save({ top: "calendar", bottom: "joined" }), false);
  assert.deepEqual(denied.read(), { top: "calendar", bottom: "joined" });
  const quota = createCarouselSettingsStore(() => ({ getItem: () => null, setItem() { throw new Error("QuotaExceededError"); } }));
  assert.equal(quota.save({ top: "calendar", bottom: "all" }), false);
  assert.deepEqual(quota.read(), { top: "calendar", bottom: "all" });
  assert.equal(quota.save({ top: "all", bottom: "all" }), false);
  assert.deepEqual(quota.read(), { top: "calendar", bottom: "all" });
});

test("caller mutation never changes cached or persisted settings", () => {
  const storage = memoryStorage();
  const store = createCarouselSettingsStore(() => storage);
  const settings = { top: "calendar", bottom: "joined" };
  store.save(settings);
  settings.top = "all";
  store.read().bottom = "all";
  assert.deepEqual(store.read(), { top: "calendar", bottom: "joined" });
  assert.deepEqual(createCarouselSettingsStore(() => storage).read(), store.read());
});

test("legacy preview cannot replace the fixed calendar", () => {
  const state = makeState({ top: "calendar", bottom: "joined" });
  const preview = selection.selectHomeCarousel(state, "preview");
  assert.deepEqual(preview.settings, state.settings);
  assert.equal(preview.topCollection, "calendar");
  assert.equal(preview.bottomCollection, "joined");
  assert.deepEqual(selection.getChangedCarouselPlacements(state, preview), []);
  const refreshed = selection.createHomeCarouselState(null, preview.settings);
  assert.equal(refreshed.topCollection, "calendar");
});

test("switching after a legacy preview action still changes bottom only", () => {
  const state = makeState();
  const preview = selection.selectHomeCarousel(state, "preview");
  const next = selection.selectHomeCarousel(preview, "bottom");
  assert.deepEqual(next.settings, { top: "calendar", bottom: "joined" });
  assert.equal(next.topCollection, "calendar");
  assert.equal(next.bottomCollection, "joined");
  assert.deepEqual(selection.getChangedCarouselPlacements(preview, next), ["bottom"]);
});

test("bottom alternates between the two Pack collections and top is immutable", () => {
  const state = makeState({ top: "calendar", bottom: "joined" });
  const next = selection.selectHomeCarousel(state, "bottom");
  assert.deepEqual(next.settings, { top: "calendar", bottom: "all" });
  assert.deepEqual(selection.getChangedCarouselPlacements(state, next), ["bottom"]);
  assert.deepEqual(selection.selectHomeCarousel(next, "bottom").settings, state.settings);
  const top = selection.selectHomeCarousel(state, "top");
  assert.deepEqual(top.settings, state.settings);
  assert.deepEqual(selection.getChangedCarouselPlacements(state, top), []);
});

test("legacy top selection remains inert", () => {
  const preview = selection.selectHomeCarousel(makeState(), "preview");
  const saved = selection.selectHomeCarousel(preview, "top");
  assert.deepEqual(saved.settings, { top: "calendar", bottom: "all" });
  assert.deepEqual(selection.getChangedCarouselPlacements(preview, saved), []);
  assert.deepEqual(selection.getChangedCarouselPlacements(preview, selection.selectHomeCarousel(preview, "preview")), []);
});

test("Pack return and refresh both preserve the fixed layout", () => {
  const preview = selection.selectHomeCarousel(makeState(), "preview");
  const saved = { topCollection: preview.topCollection, bottomCollection: preview.bottomCollection,
    source: "bottom", packId: "pack-1", carousels: { top: { month: "2026-07", position: 24318 }, bottom: null } };
  const returned = selection.createHomeCarouselState(saved, preview.settings);
  assert.equal(returned.topCollection, "calendar");
  assert.deepEqual(returned.snapshots.calendar, saved.carousels.top);
  assert.equal(selection.createHomeCarouselState(null, preview.settings).topCollection, "calendar");
});

function findNode(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => findNode(child, predicate));
}

test("actual switch controller saves the bottom choice and never freezes the calendar", () => {
  const source = ts.createSourceFile("HomePackCarousels.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const arrow = findNode(source, node => ts.isVariableDeclaration(node) && node.name.getText(source) === "changeCollection").initializer;
  const storage = memoryStorage();
  let frozen = 0;
  const context = {
    ...selection,
    view: { ...makeState(), phase: "idle", changing: [] },
    navigationLockRef: { current: false }, swapLockRef: { current: false }, pendingSwapRef: { current: null },
    menuOpenRef: { current: false }, assignments: { top: "calendar", bottom: "all" },
    topRef: { current: { freezeAndSnapshot() { throw new Error("calendar must stay live"); } } },
    bottomRef: { current: { freezeAndSnapshot() { frozen++; return null; } } },
    carouselSettingsStore: createCarouselSettingsStore(() => storage),
    setView(update) { context.view = typeof update === "function" ? update(context.view) : update; },
  };
  const handler = vm.runInNewContext(ts.transpileModule(`(${arrow.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
  handler();
  assert.equal(frozen, 1);
  assert.equal(storage.writes.length, 1);
  assert.equal(context.pendingSwapRef.current.topCollection, "calendar");
  handler();
  assert.equal(frozen, 1, "pending animation locks duplicate actions");
  assert.equal(storage.writes.length, 1);
  context.view = { ...context.pendingSwapRef.current, phase: "idle", changing: [] };
  context.assignments.bottom = context.view.bottomCollection;
  context.swapLockRef.current = false;
  handler();
  assert.equal(storage.writes.length, 2);
  assert.deepEqual(JSON.parse(storage.writes[0][1]), { version: 2, top: "calendar", bottom: "joined" });
  assert.deepEqual(JSON.parse(storage.writes[1][1]), { version: 2, top: "calendar", bottom: "all" });
  assert.deepEqual(context.view.changing, ["bottom"]);
  context.swapLockRef.current = false;
  context.menuOpenRef.current = true;
  handler();
  assert.equal(storage.writes.length, 2, "open menu owns input");
});

test("bottom-only change uses the existing bottom motion and does not animate top", async () => {
  const calls = [];
  const element = placement => ({ ownerDocument: { timeline: { currentTime: 50 } }, animate(frames) {
    calls.push({ placement, frames });
    return { startTime: null, finished: Promise.resolve(), cancel() {} };
  } });
  const motion = animateCarouselPair({ top: element("top"), bottom: element("bottom") }, "entering", false, ["bottom"]);
  await motion.finished;
  assert.deepEqual(calls.map(call => call.placement), ["bottom"]);
  assert.match(calls[0].frames[0].transform, /, 112vh/);
});

test("finishing a bottom swap cannot restart the calendar spring or interrupt its live drag", () => {
  const source = ts.createSourceFile("HomePackCarousels.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const effect = findNode(source, node => ts.isCallExpression(node) && node.expression.getText(source) === "useLayoutEffect"
    && node.arguments[0].getText(source).includes('view.phase === "idle"')).arguments[0];
  let topResumes = 0;
  let bottomResumes = 0;
  const context = {
    view: { phase: "idle", changing: ["bottom"] },
    swapLockRef: { current: true }, menuOpenRef: { current: false }, navigationLockRef: { current: false },
    topRef: { current: { resume() { topResumes++; } } },
    bottomRef: { current: { resume() { bottomResumes++; } } },
  };
  const run = vm.runInNewContext(ts.transpileModule(`(${effect.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
  run();
  assert.equal(topResumes, 0);
  assert.equal(bottomResumes, 1);
  assert.equal(context.swapLockRef.current, false);
  context.view.changing = [];
  run();
  assert.equal(topResumes, 1, "initial mount may resume both wheels");
});

function compileComponent(file, replacements) {
  const require = createRequire(import.meta.url);
  const code = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name in replacements) return replacements[name];
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }) };
    return require(name);
  } });
  return exports;
}

test("nickname has a left Pack switch and right menu trigger; dialog only has theme and logout", () => {
  const { HomeUserMenu } = compileComponent("features/packs/components/HomeUserMenu.tsx", {
    "@/features/packs/model/home-carousel-state": selection,
  });
  const html = renderToStaticMarkup(createElement(HomeUserMenu, {
    busy: false, loginName: "mission_user", theme: "light", bottomCollection: "joined",
    onMenuChange() {}, onSwitchPacks() {}, onThemeChange() {}, onLogout() {},
  }));
  const dialog = html.match(/<dialog\b[\s\S]*?<\/dialog>/)[0];
  assert.equal((dialog.match(/<button\b/g) || []).length, 2);
  assert.doesNotMatch(dialog, /chevron|<svg|<i\b/);
  assert.doesNotMatch(dialog, /轮盘|Pack/);
  assert.match(html, /当前用户 Pack，切换为所有 Pack/);
  assert.match(html, /class="trigger switchTrigger"/);
  assert.match(html, /stroke-width="1.5"/);
  assert.equal((html.match(/class="chevron"/g) || []).length, 1, "username menu trigger is preserved");
});

test("server entry renders no incorrect default wheels before local settings are readable", () => {
  const { HomeCarouselEntry } = compileComponent("features/packs/components/HomeCarouselEntry.tsx", {
    "./HomePackCarousels": { HomePackCarousels() { throw new Error("must not render on server"); } },
  });
  assert.equal(renderToStaticMarkup(createElement(HomeCarouselEntry, {})), "");
});

test("theme transitions target colors only, with short reduced-motion duration", () => {
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(globals, /--theme-transition-duration:\s*280ms/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce[\s\S]*--theme-transition-duration:\s*80ms/);
  for (const file of ["app/layout.module.css", "features/packs/components/HomeUserMenu.module.css", "features/calendar/components/CalendarCarousel.module.css"]) {
    const css = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const transitions = css.match(/transition:[^;]*--theme-transition-duration[^;]*;/g);
    assert.ok(transitions?.length, `${file} uses the shared theme transition`);
    for (const transition of transitions) {
      // A separate fixed-duration hover effect is not a theme transition.
      for (const property of transition.split(",").filter(part => part.includes("--theme-transition-duration"))) {
        assert.doesNotMatch(property, /\ball\b|\btransform\b|\bopacity\b/);
      }
    }
  }
});
