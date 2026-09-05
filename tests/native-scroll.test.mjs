import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isSafariUserAgent, getNativeCopyCount } from "../features/packs/model/safari-scroll.ts";
import { getContinuousDeckPose, getDeckMetrics } from "../features/packs/model/arc-carousel-geometry.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const read = file => readFileSync(path.join(root, file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function load(file, globals = {}, overrides = {}, cache = new Map()) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const code = ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { ...globals, exports, require(name) {
    if (name in overrides) return overrides[name];
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
    const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(absolute), name);
    return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync), globals, overrides, cache);
  } }, { filename: absolute });
  return exports;
}

const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const desktopSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15";

test("native mode is Safari-only, including iPad desktop UA, not other iOS browser brands", () => {
  for (const ua of [safari, desktopSafari, safari.replace("iPhone", "iPad")]) assert.equal(isSafariUserAgent(ua), true);
  for (const token of ["CriOS/152.0", "FxiOS/143.0", "EdgiOS/140.0", "OPiOS/3.0", "Chrome/152.0", "Chromium/152.0", "Android"]) {
    assert.equal(isSafariUserAgent(`${safari} ${token}`), false, token);
  }
  for (const ua of ["", "Safari/605.1.15", safari.replace("Version/18.0 ", "")]) assert.equal(isSafariUserAgent(ua), false);
});

function environment({ modern = true } = {}) {
  let now = 0;
  let token = 0;
  const timers = new Map();
  const frames = new Map();
  class Element {
    constructor() { this.dataset = {}; this.style = { setProperty(name, value) { this[name] = value; } }; this.listeners = new Map(); }
    addEventListener(name, callback, options) { this.listeners.set(name, { callback, options }); }
    removeEventListener(name) { this.listeners.delete(name); }
    emit(name, fields = {}) { this.listeners.get(name)?.callback({ type: name, target: this, clientX: 100, clientY: 0, touches: [], ...fields }); }
    dispatchEvent(event) { this.listeners.get(event.type)?.callback(event); return !event.defaultPrevented; }
    closest() { return null; }
  }
  const globals = {
    Element, performance: { now: () => now },
    Event: class { constructor(type) { this.type = type; this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } },
    setTimeout(callback, delay = 0) { const id = ++token; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = ++token; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class { observe() {} disconnect() {} },
  };
  globals.window = { ...globals, navigator: { userAgent: safari }, matchMedia: () => ({ matches: false }) };
  class Scroller extends Element {
    constructor() {
      super(); this.left = 0; this.reads = 0; this.writes = []; this.clientWidth = 375;
      if (modern) this.onscrollend = null;
    }
    get scrollLeft() { this.reads++; return this.left; }
    set scrollLeft(_) { throw new Error("Do not stream scrollLeft writes"); }
    scrollTo(options) {
      this.writes.push(plain(options));
      if (options.behavior === "instant") this.left = options.left;
      else this.smoothTarget = options.left;
    }
    nativeScroll(left) { this.left = left; this.emit("scroll"); }
    completeSmooth() { this.nativeScroll(this.smoothTarget); this.smoothTarget = undefined; this.emit("scrollend"); }
  }
  const advance = milliseconds => {
    const end = now + milliseconds;
    let guard = 0;
    while (true) {
      const next = [...timers].filter(([, value]) => value.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      assert.ok(++guard < 1000, "timers must not loop indefinitely");
      timers.delete(next[0]); now = next[1].due; next[1].callback();
    }
    now = end;
  };
  return {
    globals, Scroller, Element, timers, frames, advance,
    frame() { now += 16; for (const [id, callback] of [...frames]) { frames.delete(id); callback(now); } },
  };
}

function controllerHarness(options = {}, envOptions = {}) {
  const env = environment(envOptions);
  const viewport = new env.Scroller();
  const settled = [];
  const { createNativeScrollController } = load("features/packs/model/native-scroll-controller.ts", env.globals);
  const controller = createNativeScrollController(viewport, { count: 6, copies: 3, stride: 100, onSettled: value => settled.push(plain(value)), ...options });
  viewport.writes.length = 0; viewport.reads = 0; settled.length = 0;
  return { ...env, viewport, controller, settled };
}

test("optional visual progress coalesces frames and precedes scrollend without driving scrolling", () => {
  const progress = [];
  const h = controllerHarness({ onProgress: value => progress.push(plain(value)) });
  progress.length = 0;
  for (const offset of [610, 650, 675]) h.viewport.nativeScroll(offset);
  assert.equal(h.frames.size, 1);
  assert.equal(h.viewport.reads, 0);
  assert.equal(progress.length, 0);
  h.frame();
  assert.equal(h.viewport.reads, 1, "read just one native offset per visual frame");
  assert.deepEqual(progress, [{ index: 1, position: .75, slot: 7 }]);
  assert.equal(h.viewport.writes.length, 0);
  assert.equal(h.settled.length, 0, "visual selection must not wait for settling");
  assert.equal(h.frames.size, 0, "no self-scheduling animation loop");
  h.viewport.nativeScroll(690);
  h.controller.freeze();
  assert.equal(h.frames.size, 0, "freeze paints the current pose and cancels stale work");
  assert.ok(Math.abs(progress.at(-1).position - .9) < 1e-9);
  h.controller.resume();
  h.viewport.nativeScroll(700);
  h.controller.destroy();
  assert.equal(h.frames.size, 0);
});

for (const modern of [true, false]) {
  test(`${modern ? "scrollend" : "legacy"}: moving only records activity, with zero offset/layout reads, writes, active changes or RAF`, () => {
    const h = controllerHarness({}, { modern });
    h.viewport.emit("touchstart");
    h.viewport.emit("pointerdown");
    for (let index = 0; index < 100; index++) {
      h.viewport.nativeScroll(600 + index * 4);
      h.advance(8);
    }
    assert.equal(h.viewport.reads, 0);
    assert.equal(h.viewport.writes.length, 0);
    assert.equal(h.settled.length, 0);
    assert.equal(h.frames.size, 0);
    if (modern) assert.equal(h.timers.size, 0, "do not race native scrollend with a timer");
    assert.equal(h.viewport.listeners.has("pointermove"), false);
    assert.equal(h.viewport.listeners.has("touchmove"), false);
    assert.equal(h.viewport.listeners.has("wheel"), false);
    assert.ok([...h.viewport.listeners.values()].every(listener => listener.options.passive));
    h.controller.destroy();
    assert.equal(h.timers.size, 0);
    assert.equal(h.viewport.listeners.size, 0);
  });
}

test("scrollend makes at most one native correction; its own completion does not snap again", () => {
  const h = controllerHarness();
  h.viewport.nativeScroll(725);
  h.viewport.emit("scrollend");
  assert.deepEqual(h.viewport.writes, [{ left: 700, behavior: "smooth" }]);
  assert.equal(h.settled.length, 0);
  h.viewport.completeSmooth();
  assert.equal(h.viewport.writes.length, 1);
  assert.deepEqual(h.settled, [{ index: 1, slot: 7, position: 1 }]);
  h.viewport.emit("scrollend"); h.advance(1000);
  assert.equal(h.viewport.writes.length, 1);
  assert.equal(h.frames.size, 0);
  h.controller.destroy();
});

test("native inertia crossing a loop seam is not rebased until it finishes", () => {
  const h = controllerHarness();
  for (const left of [1180, 1230, 1270, 1300]) h.viewport.nativeScroll(left);
  assert.equal(h.viewport.writes.length, 0);
  h.viewport.emit("scrollend");
  assert.deepEqual(h.viewport.writes, [{ left: 700, behavior: "instant" }]);
  assert.equal(h.settled[0].index, 1);
  // Programmatic rebase notifications do not recurse into calibration.
  h.viewport.nativeScroll(700); h.viewport.emit("scrollend");
  assert.equal(h.viewport.writes.length, 1);
  assert.equal(h.settled.length, 1);
  h.controller.destroy();
});

test("a fresh touch interrupts pending correction; holding a finger cannot be mistaken for scroll end", () => {
  const h = controllerHarness();
  h.viewport.nativeScroll(725);
  h.viewport.emit("touchstart"); h.viewport.emit("pointerdown");
  h.advance(2000); h.viewport.emit("scrollend");
  assert.equal(h.viewport.writes.length, 0);
  h.viewport.nativeScroll(800);
  h.viewport.emit("touchend");
  h.viewport.emit("scrollend");
  assert.equal(h.viewport.writes.length, 0);
  assert.equal(h.settled[0].index, 2);
  h.controller.destroy();
});

test("modern Safari never uses a quiet timer to end ongoing native momentum", () => {
  const h = controllerHarness();
  h.viewport.nativeScroll(735);
  h.advance(5000);
  assert.equal(h.viewport.writes.length, 0);
  assert.equal(h.settled.length, 0);
  assert.equal(h.controller.isMoving(), true);
  h.viewport.emit("scrollend");
  assert.equal(h.viewport.writes.length, 1);
  h.controller.destroy();
});

test("legacy fallback requires a quiet interval AND stable samples, not just touchend", () => {
  const h = controllerHarness({}, { modern: false });
  h.viewport.emit("touchstart");
  h.viewport.nativeScroll(720);
  h.viewport.emit("touchend");
  h.advance(200);
  h.viewport.nativeScroll(750);
  h.advance(250);
  h.viewport.nativeScroll(780);
  h.advance(239);
  assert.equal(h.viewport.writes.length, 0);
  h.advance(101);
  assert.deepEqual(h.viewport.writes, [{ left: 800, behavior: "smooth" }]);
  h.viewport.nativeScroll(800);
  h.advance(340);
  assert.equal(h.settled[0].index, 2);
  h.controller.destroy();
});

test("legacy fallback leaves changing offsets and native edge rubber-banding alone", () => {
  const h = controllerHarness({ copies: 1 }, { modern: false });
  h.viewport.nativeScroll(-30);
  h.advance(1000);
  assert.equal(h.viewport.writes.length, 0);
  h.viewport.nativeScroll(140);
  h.advance(240);
  h.viewport.left = 150; // A compositor change without a delivered scroll event.
  h.advance(100);
  assert.equal(h.viewport.writes.length, 0);
  h.controller.destroy();
});

test("initial restore is silent and a menu freeze preserves the exact visible fractional offset", () => {
  const h = controllerHarness({ position: 2.25 });
  assert.equal(h.viewport.left, 825);
  h.viewport.emit("scroll"); h.viewport.emit("scrollend");
  assert.equal(h.viewport.writes.length, 0);
  h.viewport.nativeScroll(845);
  assert.ok(Math.abs(h.controller.freeze() - 2.45) < 1e-9);
  assert.equal(h.viewport.dataset.nativeLocked, "true");
  assert.equal(h.viewport.writes.at(-1).left, 845);
  h.advance(1000);
  assert.equal(h.viewport.writes.length, 1);
  h.controller.resume();
  assert.equal(h.viewport.dataset.nativeLocked, "false");
  assert.equal(h.viewport.left, 845);
  h.controller.destroy();
});

test("layout work is deferred during scrolling and during a stationary touch", () => {
  const h = controllerHarness();
  let measured = 0;
  h.viewport.nativeScroll(700);
  h.controller.whenIdle(() => measured++);
  assert.equal(measured, 0);
  h.viewport.emit("scrollend");
  assert.equal(measured, 1);
  h.viewport.emit("touchstart");
  h.controller.whenIdle(() => measured++);
  h.viewport.emit("touchend");
  assert.equal(measured, 2);
  h.controller.destroy();
});

test("release clicks are suppressed but a new stationary tap and keyboard navigation still work", () => {
  const h = controllerHarness();
  h.viewport.emit("pointerdown", { clientX: 200 });
  h.viewport.nativeScroll(700);
  h.viewport.emit("pointerup", { clientX: 100 });
  h.viewport.emit("scrollend");
  assert.equal(h.controller.canActivate(), false);
  h.viewport.emit("pointerdown"); h.viewport.emit("pointerup");
  assert.equal(h.controller.canActivate(), true);
  h.controller.selectSlot(8);
  assert.deepEqual(h.viewport.writes.at(-1), { left: 800, behavior: "smooth" });
  h.viewport.completeSmooth();
  assert.equal(h.settled.at(-1).index, 2);
  h.controller.destroy();
});

test("finite lists clamp, reduced motion uses one instant action, and empty/single lists stay valid", () => {
  for (const count of [0, 1, 2, 5]) {
    const h = controllerHarness({ count, copies: 1, reducedMotion: true });
    h.controller.selectSlot(100);
    assert.equal(h.viewport.left, Math.max(0, count - 1) * 100);
    assert.ok(h.viewport.writes.every(write => write.behavior === "instant"));
    h.controller.destroy();
  }
});

test("buffer counts cover multiple viewports without unbounded DOM growth", () => {
  for (const count of [1, 2, 3, 6, 12, 24]) for (const width of [375, 820, 1440, 1920]) {
    const copies = getNativeCopyCount(count, width, 160, true);
    assert.equal(copies % 2, 1);
    assert.ok(copies * count <= 96);
    if (count > 1) assert.ok(Math.floor(copies / 2) * count * 160 >= width * 2);
    assert.equal(getNativeCopyCount(count, width, 160, false), 1);
  }
});

function galleryHarness({ count = 3, looping = true, modern = true, autoExpand = true } = {}) {
  const env = environment({ modern });
  const viewport = new env.Scroller();
  const rootElement = new env.Element();
  rootElement.dataset.kind = looping ? "pack" : "day";
  rootElement.focus = () => {};
  let complete;
  const finished = new Promise(resolve => { complete = resolve; });
  let finishExpansion;
  const expansionFinished = new Promise(resolve => { finishExpansion = resolve; });
  rootElement.getAnimations = () => rootElement.dataset.phase === "closing" ? [{ finished }]
    : rootElement.dataset.phase === "expanding" && count > 1 ? [{ finished: expansionFinished }] : [];
  const copies = looping && count > 1 ? 5 : 1;
  const cardWidth = 200;
  const stride = 220;
  let reads = 0;
  const cards = Array.from({ length: count * copies }, (_, index) => {
    const card = new env.Element();
    Object.defineProperties(card, {
      offsetWidth: { get() { reads++; return cardWidth; } },
      offsetLeft: { get() { reads++; return (viewport.clientWidth - cardWidth) / 2 + index * stride; } },
    });
    return card;
  });
  let returned = 0;
  const activeMissionChanges = [];
  let setInteractionLocked = null;
  const { mountNativeMissionGallery } = load("features/packs/model/native-mission-gallery.ts", env.globals);
  const gallery = mountNativeMissionGallery({
    root: rootElement,
    viewport,
    cards,
    count,
    copies: () => copies,
    cardClass: "missionCard",
    navigateHome() { returned++; },
    autoExpand,
    onInteractionLockReady: setter => { setInteractionLocked = setter; },
    onActiveMissionChange(index) { activeMissionChanges.push(index); },
  });
  return { ...env, rootElement, viewport, cards, gallery, complete, copies, stride, finishExpansion,
    activeMissionChanges,
    setInteractionLocked: locked => setInteractionLocked?.(locked),
    get reads() { return reads; }, get returned() { return returned; },
    async expand() {
      gallery.expand();
      env.frame(); finishExpansion();
      if (looping) env.advance(1600);
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test("Safari Try another uses native snapping once and selects the next Mission", async () => {
  const h = galleryHarness({ count: 3, looping: true });
  await h.expand();
  const selection = h.gallery.selectNext();
  assert.equal(await h.gallery.selectNext(), false, "native motion rejects repeat selection");
  h.viewport.completeSmooth();
  assert.equal(await selection, true);
  assert.equal(h.activeMissionChanges.at(-1), 1);
  h.gallery.destroy();

  const single = galleryHarness({ count: 1, looping: true });
  await single.expand();
  assert.equal(await single.gallery.selectNext(), false);
  single.gallery.destroy();
});

test("Safari commitment lock cancels native motion without scroll reversion and keeps Escape available", async () => {
  const h = galleryHarness({ count: 4 });
  await h.expand();
  const initial = h.viewport.left;
  h.viewport.nativeScroll(initial + 45);
  assert.equal(h.viewport.dataset.nativeScrolling, "true");

  h.setInteractionLocked(true);
  const lockedLeft = h.viewport.left;
  const writesAfterLock = h.viewport.writes.length;
  const activeAfterLock = h.activeMissionChanges.at(-1);
  assert.equal(h.rootElement.dataset.interactionLocked, "true");
  assert.equal(h.viewport.dataset.nativeLocked, "true");
  assert.equal(h.viewport.dataset.nativeScrolling, "false");
  assert.equal(h.viewport.writes.at(-1).left, Math.round((initial + 45) / h.stride) * h.stride);

  h.viewport.nativeScroll(lockedLeft + h.stride);
  h.viewport.emit("scrollend");
  assert.equal(h.viewport.writes.length, writesAfterLock, "locked native scrolling does not write an old offset back");
  assert.equal(h.activeMissionChanges.at(-1), activeAfterLock, "locked scroll events cannot change the active Mission");

  h.rootElement.emit("keydown", { key: "ArrowRight", preventDefault() { throw new Error("locked arrows must not be consumed"); } });
  assert.equal(h.viewport.writes.length, writesAfterLock);
  h.rootElement.emit("keydown", { key: "Escape", preventDefault() {} });
  assert.equal(h.rootElement.dataset.phase, "closing", "Escape still closes a locked Gallery");
  h.gallery.destroy();
});

test("Safari commitment lock still lets a blank gallery click return home", async () => {
  const h = galleryHarness({ count: 4 });
  await h.expand();
  h.setInteractionLocked(true);
  h.rootElement.emit("click");
  assert.equal(h.rootElement.dataset.phase, "closing");
  h.gallery.destroy();
});

test("Safari open Reveal blank clicks are consumed before Home navigation", async () => {
  const h = galleryHarness({ count: 4 });
  await h.expand();
  h.rootElement.dataset.experienceReveal = "open";
  h.rootElement.addEventListener("mission-experience-reveal-close", event => {
    event.preventDefault();
    h.rootElement.dataset.experienceReveal = "closing";
  });
  h.rootElement.emit("click");
  assert.equal(h.rootElement.dataset.experienceReveal, "closing");
  assert.equal(h.rootElement.dataset.phase, "settled");
  assert.equal(h.returned, 0);
  h.rootElement.dataset.experienceReveal = "closed";
  h.rootElement.emit("click");
  assert.equal(h.rootElement.dataset.phase, "closing");
  h.gallery.destroy();
});

for (const looping of [false, true]) for (const count of [1, 2, 8]) {
  test(`${looping ? "Pack" : "day"}/${count}: native gallery expands, scrolls without layout reads, and collapses from the live position`, async () => {
    const h = galleryHarness({ count, looping });
    assert.equal(h.rootElement.dataset.phase, "collapsed");
    await h.expand();
    assert.equal(h.rootElement.dataset.phase, "settled");
    assert.equal(h.viewport.dataset.nativeLocked, "false");
    assert.ok(h.cards.every(card => card.dataset.nativeDistance === undefined));
    const initialReads = h.reads;
    if (count > 1) {
      h.viewport.emit("pointerdown", { clientX: 200 });
      h.viewport.nativeScroll(h.viewport.left + 170);
      h.viewport.emit("pointerup", { clientX: 30 });
      h.rootElement.emit("click");
      assert.equal(h.rootElement.dataset.phase, "settled", "release click cannot dismiss");
      assert.equal(h.reads, initialReads);
    }
    const current = h.viewport.left;
    h.rootElement.emit("keydown", { key: "Escape", preventDefault() {} });
    assert.equal(h.viewport.left, current, "close never returns to the first card before collapse");
    assert.equal(h.rootElement.dataset.phase, "closing");
    for (let index = 0; index < h.cards.length; index++) {
      const card = h.cards[index];
      if (card.dataset.nativeVisible === "true") {
        const center = index * h.stride + h.viewport.clientWidth / 2 - current;
        assert.ok(Math.abs(center + Number.parseFloat(card.style["--mission-collapsed-x"]) - h.viewport.clientWidth / 2) < 1e-9);
      }
    }
    assert.equal(h.frames.size, 1, "only the one-shot collapse boundary frame remains");
    h.frame();
    assert.equal(h.returned, 0);
    h.complete();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.returned, 1);
    h.gallery.destroy();
    assert.equal(h.viewport.listeners.size, 0);
    assert.equal(h.rootElement.listeners.size, 0);
    assert.equal(h.timers.size, 0);
  });
}

test("native gallery disposal cancels pending collapse navigation", async () => {
  const h = galleryHarness(); await h.expand();
  h.rootElement.emit("keydown", { key: "Escape", preventDefault() {} }); h.frame();
  h.gallery.destroy(); h.complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.returned, 0);
});

test("Safari Pack waits at its cover until membership succeeds, and action clicks do not dismiss it", () => {
  const h = galleryHarness({ autoExpand: false });
  assert.equal(h.rootElement.dataset.phase, "collapsed");
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
  const action = new h.Element();
  action.closest = selector => selector === "[data-gallery-action]" ? action : null;
  h.rootElement.emit("click", { target: action });
  assert.equal(h.rootElement.dataset.phase, "collapsed");
  h.gallery.expand();
  h.frame();
  assert.equal(h.rootElement.dataset.phase, "expanding");
  h.advance(1600);
  assert.equal(h.rootElement.dataset.phase, "settled");
  h.gallery.destroy();
});

test("Safari Pack cover waiting stage exits without starting distribution", async () => {
  const h = galleryHarness({ autoExpand: false });
  h.rootElement.emit("keydown", { key: "Escape", preventDefault() {} });
  assert.equal(h.rootElement.dataset.phase, "closing");
  assert.equal(h.timers.size, 0);
  h.frame();
  h.complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.returned, 1);
  h.gallery.destroy();
});

test("native day unlocks on actual animation completion and never schedules the Pack timer", async () => {
  const h = galleryHarness({ looping: false, count: 8 });
  h.frame();
  assert.equal(h.rootElement.dataset.phase, "expanding");
  assert.equal(h.viewport.dataset.nativeLocked, "true");
  assert.equal(h.timers.size, 0);
  h.advance(5000);
  assert.equal(h.rootElement.dataset.phase, "expanding", "elapsed time cannot finish a still-running animation");
  h.finishExpansion();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.rootElement.dataset.phase, "settled");
  assert.equal(h.viewport.dataset.nativeLocked, "false");
  h.gallery.destroy();
});

test("native single day with no local animations can close immediately after entry", async () => {
  const h = galleryHarness({ looping: false, count: 1 });
  h.rootElement.getAnimations = () => [];
  await h.expand();
  assert.equal(h.rootElement.dataset.phase, "settled");
  assert.equal(h.timers.size, 0);
  h.rootElement.emit("click");
  h.frame();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.returned, 1);
  h.gallery.destroy();
});

test("native day returns its original first card even when it was scrolled completely offscreen", async () => {
  const h = galleryHarness({ looping: false, count: 8 });
  await h.expand();
  const left = 7 * h.stride;
  h.viewport.nativeScroll(left);
  h.viewport.emit("scrollend");
  const writes = h.viewport.writes.length;
  h.rootElement.emit("keydown", { key: "Escape", preventDefault() {} });
  assert.equal(h.viewport.left, left);
  assert.deepEqual(h.viewport.writes.slice(writes), [{ left, behavior: "instant" }],
    "freezing may stop native inertia at the current offset, never scroll back to the first card");
  assert.equal(h.cards[0].dataset.nativeVisible, "true", "the shared date carrier cannot be culled");
  assert.equal(Number.parseFloat(h.cards[0].style["--mission-collapsed-x"]), left);
  h.frame(); h.complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.returned, 1);
  h.gallery.destroy();
});

test("native day entry completion is ignored after disposal", async () => {
  const h = galleryHarness({ looping: false });
  let focuses = 0;
  h.rootElement.focus = () => { focuses++; };
  h.frame(); h.gallery.destroy(); h.finishExpansion();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.rootElement.dataset.phase, "expanding");
  assert.equal(focuses, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});

test("Safari wrapper selects exactly one driver, with hydration-safe server snapshots", () => {
  for (const native of [false, true]) {
    const { ArcCarousel } = load("features/packs/components/ArcCarousel.tsx", {}, {
      "@/features/packs/model/use-safari-scroll": { useSafariScroll: () => native },
    });
    const result = ArcCarousel({ packs: [], onOpenPack() {} });
    assert.equal(result.type.name, native ? "NativePackCarousel" : "TransformArcCarousel");
  }
  const { useSafariScroll } = load("features/packs/model/use-safari-scroll.ts", {}, {
    react: { useSyncExternalStore(_, _client, server) { return server(); } },
  });
  assert.equal(useSafariScroll(), false, "server snapshot does not access navigator/window");
});

test("Safari markup has stable snap slots, unique cover names, and no move handlers", () => {
  const { PACK_DETAIL_FIXTURES: packs } = load("data/fixtures/pack-fixtures.ts");
  const viewport = { width: 375, height: 812, coarsePointer: true };
  const { NativePackCarousel } = load("features/packs/components/NativePackCarousel.tsx", {}, {
    react: { ...require("react"), ViewTransition: ({ children, name }) => createElement("span", { "data-transition": name }, children) },
    "next/navigation": { useRouter: () => ({}) },
    "../model/use-deck-viewport": { useDeckViewport: () => viewport },
  });
  const html = renderToStaticMarkup(createElement(NativePackCarousel, {
    packs, initialCarouselState: { count: 6, activeIndex: 0, position: 0 }, onOpenPack() {},
  }));
  const names = [...html.matchAll(/data-transition="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.length, 6, "buffer covers do not participate in shared-element capture");
  assert.equal(names.filter(name => !name.includes("-buffer-")).length, 6);
  assert.match(html, /class="nativeViewport"/);
  assert.match(html, /class="nativeSlot"/);
  assert.equal((html.match(/aria-current="true"/g) || []).length, 1);
  for (const file of ["features/packs/components/NativePackCarousel.tsx", "features/packs/model/native-mission-gallery.ts", "features/packs/model/native-scroll-controller.ts"]) {
    assert.doesNotMatch(read(file), /addEventListener\("(?:pointermove|touchmove|wheel)"|onPointerMove=|setPointerCapture\(/);
  }
  for (const file of ["features/packs/components/ArcCarousel.module.css", "features/packs/components/MissionGallery.module.css"]) {
    const css = read(file);
    assert.match(css, /scroll-snap-type: x proximity/);
    assert.match(css, /scroll-snap-stop: normal/);
    assert.doesNotMatch(css, /scroll-snap-type:.*mandatory/);
  }
});

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

// Execute the real Safari Pack component, including effect cleanup and queued
// state commits. The DOM stand-ins model offsets/events, not browser rendering.
function packHarness({ count = 6, activeIndex = 0, position = activeIndex, viewport = { width: 375, height: 812, coarsePointer: true } } = {}) {
  const env = environment();
  const scroller = new env.Scroller();
  const rootElement = new env.Element();
  const elements = new Map();
  const cells = [];
  const effects = [];
  const opened = [];
  const handle = { current: null };
  let liveViewport = viewport;
  let cursor = 0;
  let dirty = false;
  let tree;
  let props = {};
  const effect = (callback, dependencies) => {
    const index = cursor++;
    const previous = cells[index];
    if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
      cells[index] = { ...previous, dependencies };
      effects.push(() => { previous?.cleanup?.(); cells[index].cleanup = callback(); });
    }
  };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
      return [cells[index], value => {
        const next = typeof value === "function" ? value(cells[index]) : value;
        if (!Object.is(cells[index], next)) { dirty = true; cells[index] = next; }
      }];
    },
    useRef(initial) { const index = cursor++; return cells[index] ??= { current: initial }; },
    useEffect: effect, useLayoutEffect: effect,
    useImperativeHandle(ref, create) { effect(() => { ref.current = create(); }); },
    ViewTransition: ({ children }) => children,
  };
  const { PACK_DETAIL_FIXTURES: packs } = load("data/fixtures/pack-fixtures.ts");
  const { NativePackCarousel } = load("features/packs/components/NativePackCarousel.tsx", env.globals, {
    react: hooks, "next/navigation": { useRouter: () => ({ prefetch() {} }) },
    "../model/use-deck-viewport": { useDeckViewport: () => liveViewport },
  });
  function render(nextProps = {}) {
    props = { ...props, ...nextProps };
    let guard = 0;
    do {
      assert.ok(++guard < 10, "component updates must converge");
      cursor = 0; dirty = false;
      tree = NativePackCarousel({ packs, initialCarouselState: { count, activeIndex, position }, onOpenPack(pack) { opened.push(pack.id); }, ref: handle, ...props });
      nodes(tree, node => node.type === "section")[0].props.ref.current = rootElement;
      nodes(tree, node => node.props?.className === "nativeViewport")[0].props.ref.current = scroller;
      nodes(tree, node => node.type === "li").forEach(node => {
        if (!elements.has(node.key)) elements.set(node.key, new env.Element());
        const element = elements.get(node.key);
        element.card ??= new env.Element();
        node.props.ref(element);
        node.props.children.props.ref(element.card);
      });
      effects.splice(0).forEach(run => run());
    } while (dirty);
    return tree;
  }
  render();
  scroller.writes.length = 0;
  return {
    ...env, scroller, handle, opened, render,
    get tree() { return tree; },
    cards: () => nodes(tree, node => node.type === "button" && node.props.className === "card nativeCard"),
    slots: () => nodes(tree, node => node.type === "li").map(node => elements.get(node.key)),
    resize(next) { liveViewport = next; render(); },
    click(slot) { scroller.emit("pointerdown"); scroller.emit("pointerup"); this.cards()[slot].props.onClick(); render(); },
    cleanup() { cells.forEach(cell => cell?.cleanup?.()); },
  };
}

test("actual native Pack: side click centers once, main click opens, freeze restores a fractional position", () => {
  const h = packHarness({ count: 6, activeIndex: 2, position: 2.2 });
  const snapshot = plain(h.handle.current.freezeAndSnapshot());
  assert.equal(snapshot.activeIndex, 2);
  assert.ok(Math.abs(snapshot.position - 2.2) < 1e-9);
  h.handle.current.resume();
  const mainSlot = h.cards().findIndex(card => card.props["aria-current"] === "true");
  h.click(mainSlot + 1);
  assert.equal(h.opened.length, 0);
  assert.equal(h.scroller.writes.at(-1).behavior, "smooth");
  h.scroller.completeSmooth(); h.render();
  h.click(mainSlot + 1);
  assert.equal(h.opened.length, 1);
  h.cleanup();
  assert.equal(h.scroller.listeners.size, 0);
});

for (const viewport of [
  { width: 375, height: 812, coarsePointer: true },
  { width: 820, height: 1180, coarsePointer: true },
  { width: 1180, height: 820, coarsePointer: true },
  { width: 1440, height: 900, coarsePointer: false },
]) for (const count of [1, 5, 6, 24]) {
  test(`native Pack matches Chrome continuous poses at ${viewport.width}x${viewport.height}, count ${count}`, () => {
    const h = packHarness({ count, viewport });
    const metrics = getDeckMetrics(viewport);
    const base = Math.round(h.scroller.left / metrics.gap);
    for (const position of count === 1 ? [0] : [0, .25, .65, 1]) {
      h.scroller.nativeScroll((base + position) * metrics.gap);
      h.frame(); h.render();
      const slots = h.slots();
      slots.forEach((slot, index) => {
        const offset = index - h.scroller.left / metrics.gap;
        if (Math.abs(offset) >= 3) {
          assert.equal(slot.dataset.nativeVisible === "true", false);
          return;
        }
        const pose = getContinuousDeckPose(offset, metrics);
        const values = slot.card.style.transform.match(/translate3d\(0, ([^p]+)px, 0\) rotate\(([^d]+)deg\) scale\(([^)]+)\)/);
        assert.ok(values, "native supplies x; inner artwork matches Chrome y/rotation/scale");
        for (const [actual, expected] of [[values[1], pose.y], [values[2], pose.rotation], [values[3], pose.scale], [slot.card.style.opacity, pose.opacity]]) {
          assert.ok(Math.abs(Number(actual) - expected) < 1e-8);
        }
        assert.equal(Number(slot.style.zIndex), pose.zIndex);
      });
      const current = h.cards().findIndex(card => card.props["aria-current"] === "true");
      assert.equal(current, base + Math.round(position), "hero and fan switch before scrollend");
      assert.equal(h.scroller.writes.length, 0);
    }
    h.cleanup();
  });
}

test("native Pack loop copies share the live hero fan and retain poses across an idle rebase", () => {
  const h = packHarness();
  const metrics = getDeckMetrics({ width: 375, height: 812, coarsePointer: true });
  const base = Math.round(h.scroller.left / metrics.gap);
  h.scroller.nativeScroll((base + 6) * metrics.gap);
  h.frame(); h.render();
  const before = h.slots()[base + 6].card.style.transform;
  for (const card of [h.cards()[base], h.cards()[base + 6]]) {
    assert.equal(card.props.children.props.active, true, "fan remains open in equivalent copies");
  }
  assert.equal(h.scroller.writes.length, 0);
  h.scroller.emit("scrollend"); h.render();
  assert.equal(h.slots()[base].card.style.transform, before);
  assert.equal(h.slots()[base + 6].card.style.opacity, "0");
  assert.equal(h.scroller.writes.length, 1);
  const css = read("features/packs/components/ArcCarousel.module.css");
  assert.match(css.match(/\.nativeCard\s*\{([^}]+)\}/)[1], /transition: none/);
  assert.doesNotMatch(css, /data-native-distance/);
  assert.doesNotMatch(read("features/packs/components/PackDeck.module.css"), /transition-duration: 180ms/);
  h.cleanup();
});

test("actual native Pack: mock counts retain the selected pack and switch safely between cyclic and finite layouts", () => {
  const h = packHarness({ count: 6, activeIndex: 5 });
  const decrease = () => { nodes(h.tree, node => node.props?.["aria-label"] === "减少图片 / Decrease images")[0].props.onClick(); h.render(); };
  decrease();
  assert.equal(h.cards().length, 5);
  assert.equal(h.cards().findIndex(card => card.props["aria-current"] === "true"), 4);
  for (let index = 0; index < 4; index++) decrease();
  assert.equal(h.cards().length, 1);
  assert.equal(h.scroller.left, 0);
  assert.equal(nodes(h.tree, node => node.props?.["aria-label"] === "减少图片 / Decrease images")[0].props.disabled, true);
  h.cleanup();
});

test("actual native Pack: viewport geometry and copy count wait for inertia, then preserve the selected index", () => {
  const h = packHarness();
  const rootProps = () => nodes(h.tree, node => node.type === "section")[0].props;
  const originalWidth = rootProps().style["--card-width"];
  const stride = Number.parseFloat(rootProps().style["--native-stride"]);
  const initialOffset = h.scroller.left;
  h.scroller.nativeScroll(initialOffset + stride * .3);
  h.resize({ width: 820, height: 1180, coarsePointer: true });
  assert.equal(rootProps().style["--card-width"], originalWidth);
  assert.equal(h.scroller.writes.length, 0);
  h.scroller.nativeScroll(initialOffset + stride);
  h.scroller.emit("scrollend"); h.render();
  assert.notEqual(rootProps().style["--card-width"], originalWidth);
  const snapshot = plain(h.handle.current.freezeAndSnapshot());
  assert.equal(snapshot.activeIndex, 1);
  assert.ok(Math.abs(snapshot.position - 1) < 1e-9);
  h.cleanup();
});

test("actual native Pack: menu/route lock blocks click and keyboard without changing the offset", () => {
  const h = packHarness();
  h.handle.current.freezeAndSnapshot();
  const offset = h.scroller.left;
  h.render({ interactionDisabled: true });
  h.click(h.cards().findIndex(card => card.props["aria-current"] === "true"));
  nodes(h.tree, node => node.props?.className === "nativeViewport")[0].props.onKeyDown({ key: "ArrowRight", preventDefault() {} });
  assert.equal(h.scroller.left, offset);
  assert.equal(h.opened.length, 0);
  h.cleanup();
});
