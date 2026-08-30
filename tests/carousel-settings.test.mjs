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

const makeState = (settings = { top: "joined", bottom: "all" }) => ({ ...selection.createHomeCarouselState(null, settings), settings });
const sourceText = readFileSync(new URL("../features/packs/components/HomePackCarousels.tsx", import.meta.url), "utf8");

function memoryStorage() {
  const items = new Map();
  const writes = [];
  return { writes, getItem: key => items.get(key) ?? null, setItem(key, value) { writes.push([key, value]); items.set(key, value); } };
}

test("all six valid assignments survive a fresh store, while storage contains only two settings", () => {
  for (const top of ["joined", "all", "calendar"]) {
    for (const bottom of ["joined", "all", "calendar"].filter(item => item !== top)) {
      const storage = memoryStorage();
      const store = createCarouselSettingsStore(() => storage);
      assert.equal(store.save({ top, bottom, temporary: "ignored", position: 12, loggedOut: true }), true);
      assert.deepEqual(JSON.parse(storage.getItem(CAROUSEL_SETTINGS_KEY)), { version: 1, top, bottom });
      assert.deepEqual(createCarouselSettingsStore(() => storage).read(), { top, bottom });
      const restored = selection.createHomeCarouselState(null, createCarouselSettingsStore(() => storage).read());
      assert.equal(restored.topCollection, top);
      assert.equal(restored.bottomCollection, bottom);
      assert.deepEqual(restored.snapshots, { joined: null, all: null, calendar: null });
    }
  }
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
  assert.equal(quota.save({ top: "all", bottom: "calendar" }), false);
  assert.deepEqual(quota.read(), { top: "all", bottom: "calendar" });
  assert.equal(quota.save({ top: "all", bottom: "all" }), false);
  assert.deepEqual(quota.read(), { top: "all", bottom: "calendar" });
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

test("preview never changes the saved pair; refresh restores it", () => {
  const state = makeState({ top: "calendar", bottom: "joined" });
  const preview = selection.selectHomeCarousel(state, "preview");
  assert.deepEqual(preview.settings, state.settings);
  assert.equal(preview.topCollection, "all");
  assert.equal(preview.bottomCollection, "joined");
  assert.deepEqual(selection.getChangedCarouselPlacements(state, preview), ["top"]);
  const refreshed = selection.createHomeCarouselState(null, preview.settings);
  assert.equal(refreshed.topCollection, "calendar");
});

test("changing bottom during preview exits preview without saving its temporary top", () => {
  const state = makeState();
  const preview = selection.selectHomeCarousel(state, "preview");
  const next = selection.selectHomeCarousel(preview, "bottom");
  assert.deepEqual(next.settings, { top: "joined", bottom: "calendar" });
  assert.equal(next.topCollection, "joined");
  assert.equal(next.bottomCollection, "calendar");
  assert.deepEqual(selection.getChangedCarouselPlacements(preview, next), ["top", "bottom"]);
});

test("each settings row modifies only its saved side and skips the other side", () => {
  const state = makeState({ top: "calendar", bottom: "joined" });
  const next = selection.selectHomeCarousel(state, "bottom");
  assert.deepEqual(next.settings, { top: "calendar", bottom: "all" });
  assert.deepEqual(selection.getChangedCarouselPlacements(state, next), ["bottom"]);
  assert.deepEqual(selection.selectHomeCarousel(next, "bottom").settings, state.settings);
  const top = selection.selectHomeCarousel(state, "top");
  assert.deepEqual(top.settings, { top: "all", bottom: "joined" });
  assert.deepEqual(selection.getChangedCarouselPlacements(state, top), ["top"]);
});

test("explicitly selecting previewed content saves it without remounting the same visible wheel", () => {
  const preview = selection.selectHomeCarousel(makeState(), "preview");
  const saved = selection.selectHomeCarousel(preview, "top");
  assert.deepEqual(saved.settings, { top: "calendar", bottom: "all" });
  assert.deepEqual(selection.getChangedCarouselPlacements(preview, saved), []);
  assert.deepEqual(selection.getChangedCarouselPlacements(preview, selection.selectHomeCarousel(preview, "preview")), []);
});

test("Pack return restores a temporary view but refresh restores only saved configuration", () => {
  const preview = selection.selectHomeCarousel(makeState(), "preview");
  const saved = { topCollection: preview.topCollection, bottomCollection: preview.bottomCollection,
    source: "bottom", packId: "pack-1", carousels: { top: { month: "2026-07", position: 24318 }, bottom: null } };
  const returned = selection.createHomeCarouselState(saved, preview.settings);
  assert.equal(returned.topCollection, "calendar");
  assert.deepEqual(returned.snapshots.calendar, saved.carousels.top);
  assert.equal(selection.createHomeCarouselState(null, preview.settings).topCollection, "joined");
});

function findNode(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => findNode(child, predicate));
}

test("actual menu controller saves only explicit settings, rejects overlapping changes, and snapshots both wheels", () => {
  const source = ts.createSourceFile("HomePackCarousels.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const arrow = findNode(source, node => ts.isVariableDeclaration(node) && node.name.getText(source) === "changeCollection").initializer;
  const storage = memoryStorage();
  let frozen = 0;
  const context = {
    ...selection,
    view: { ...makeState(), phase: "idle", changing: [] },
    navigationLockRef: { current: false }, swapLockRef: { current: false }, pendingSwapRef: { current: null },
    topRef: { current: { freezeAndSnapshot() { frozen++; return null; } } },
    bottomRef: { current: { freezeAndSnapshot() { frozen++; return null; } } },
    carouselSettingsStore: createCarouselSettingsStore(() => storage),
    setView(update) { context.view = typeof update === "function" ? update(context.view) : update; },
  };
  const handler = vm.runInNewContext(ts.transpileModule(`(${arrow.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
  handler("preview");
  assert.equal(frozen, 2);
  assert.equal(storage.writes.length, 0);
  assert.equal(context.pendingSwapRef.current.topCollection, "calendar");
  handler("bottom");
  assert.equal(frozen, 2, "pending animation locks duplicate actions");
  assert.equal(storage.writes.length, 0);
  context.view = { ...context.pendingSwapRef.current, phase: "idle", changing: [] };
  context.swapLockRef.current = false;
  handler("bottom");
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(JSON.parse(storage.writes[0][1]), { version: 1, top: "joined", bottom: "calendar" });
  assert.deepEqual(context.view.changing, ["top", "bottom"]);
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

test("menu displays saved settings and spare content with no arrows inside the dialog", () => {
  const { HomeUserMenu } = compileComponent("features/packs/components/HomeUserMenu.tsx", {
    "@/features/packs/model/home-carousel-state": selection,
  });
  const html = renderToStaticMarkup(createElement(HomeUserMenu, {
    busy: false, loginName: "mission_user", theme: "light", assignments: { top: "calendar", bottom: "joined" },
    onMenuChange() {}, onChangeTop() {}, onChangeBottom() {}, onReplaceTop() {}, onThemeChange() {}, onLogout() {},
  }));
  const dialog = html.match(/<dialog\b[\s\S]*?<\/dialog>/)[0];
  assert.equal((dialog.match(/<button\b/g) || []).length, 5);
  assert.doesNotMatch(dialog, /chevron|<svg|<i\b/);
  assert.match(dialog, /临时将上轮盘切换为所有 Pack/);
  assert.match(dialog, /上轮盘设置：日历/);
  assert.match(dialog, /下轮盘设置：用户 Pack/);
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
    for (const transition of transitions) assert.doesNotMatch(transition, /\ball\b|\btransform\b|\bopacity\b/);
  }
});
