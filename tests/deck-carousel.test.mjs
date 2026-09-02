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
import { getDeckMetrics, getContinuousDeckPose, getRelativeSlot, DECK_DRAG_SENSITIVITY } from "../features/packs/model/arc-carousel-geometry.ts";
import { getPackTransitionName } from "../features/packs/model/pack-transition.ts";
import { getGalleryCopyCount, getMissionStreamMetrics } from "../features/packs/model/mission-gallery-layout.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));
const read = file => readFileSync(path.join(root, file), "utf8");

// Execute the real components with small browser/hook stand-ins. No browser or
// new test dependency is needed; visual fidelity still needs manual acceptance.
function loadModule(file, overrides = {}, globals = {}, cache = new Map()) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const source = ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
  } }).outputText;
  vm.runInNewContext(source, { ...globals, exports, require(name) {
    if (name in overrides) return overrides[name];
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
    const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(absolute), name);
    const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(resolved, `Module must resolve: ${base}`);
    return loadModule(resolved, overrides, globals, cache);
  } }, { filename: absolute });
  return exports;
}

const { PACK_DETAIL_FIXTURES: packs, JOINED_PACK_FIXTURES: joined } = loadModule("data/fixtures/pack-fixtures.ts");
const viewport = { width: 375, height: 812, coarsePointer: true };
const transition = ({ children, name }) => createElement("span", { "data-transition": name }, children);
const renderingOverrides = {
  react: { ...require("react"), ViewTransition: transition },
  "next/navigation": { useRouter: () => ({}) },
  "@/features/packs/model/use-deck-viewport": { useDeckViewport: () => viewport },
  "@/components/card/PackCard": { PackCard: ({ pack }) => createElement("span", { "data-mission-id": pack.id }) },
};

test("prototype cover artwork is copied and real mock identifiers/counts stay consistent", () => {
  assert.deepEqual(plain(packs.slice(0, 4).map(pack => [pack.title, pack.themeKey])), [
    ["GO ALONE", "go-alone"], ["TALK FIRST", "talk-first"],
    ["GET REJECTED", "get-rejected"], ["BE SEEN", "be-seen"],
  ]);
  for (const pack of packs) {
    assert.equal(pack.designKey, "field-edition");
    assert.equal(pack.missionCount, pack.missions.length);
    assert.equal("imageSrc" in pack, false);
    assert.ok(pack.missions.every(mission => !("card" in mission) && !("imageSrc" in mission)));
  }
  for (const pack of joined) {
    const source = packs.find(item => item.id === pack.id);
    assert.deepEqual([pack.designKey, pack.themeKey], [source.designKey, source.themeKey]);
  }
});

test("each deck contains three decorative backs and one uniquely named shared cover", () => {
  const { PackDeck } = loadModule("features/packs/components/PackDeck.tsx", renderingOverrides);
  for (const placement of ["top", "bottom"]) {
    for (const active of [true, false]) {
      const name = getPackTransitionName(packs[0].id, placement);
      const html = renderToStaticMarkup(createElement(PackDeck, { pack: packs[0], placement, active, transitionName: name }));
      assert.equal((html.match(/class="missionPeek /g) ?? []).length, 3);
      assert.equal((html.match(/class="cover"/g) ?? []).length, 1);
      assert.ok(html.includes(`data-transition="${name}"`));
      assert.ok(html.includes(`data-placement="${placement}"`));
      assert.ok(html.includes(`data-active="${active}"`));
      assert.match(html, /GO ALONE/);
      assert.doesNotMatch(html, /<img|<h2|<button/);
    }
  }
});

test("pack gallery keeps its cover hero and renders every Mission as the supplied stream artwork", () => {
  const { MissionGallery } = loadModule("features/packs/components/MissionGallery.tsx", renderingOverrides);
  const pack = packs[0];
  const html = renderToStaticMarkup(createElement(MissionGallery, { id: pack.id, title: pack.title, hero: pack, missions: pack.missions }));
  assert.equal((html.match(/class="cover"/g) ?? []).length, 1);
  assert.match(html, /GO ALONE/);
  assert.ok(html.includes(`data-transition="${getPackTransitionName(pack.id, "bottom")}"`));
  const metrics = getDeckMetrics(viewport);
  assert.ok(html.includes(`width:${metrics.cardWidth}px`));
  assert.match(html, /aspect-ratio:1 \/ 1\.42/);
  const track = html.match(/<ol\b[\s\S]*?<\/ol>/)?.[0];
  assert.ok(track);
  assert.doesNotMatch(track, /class="cover"|missionPeek/);
  assert.ok(pack.missions.every(mission => track.includes(`data-mission-id="${mission.id}"`)));
  assert.doesNotMatch(track, /<img/);
  assert.match(track, /Go to a movie alone\./);
});

test("Pack membership and gallery display phases are independent", () => {
  const detail = read("features/packs/components/MissionPackDetail.tsx");
  const gallery = read("features/packs/components/MissionGallery.tsx");
  const membership = read("features/packs/components/PackMembershipAction.tsx");
  const page = read("app/pack/[slug]/page.tsx");
  assert.match(detail, /const \[packJoined, setPackJoined\]/);
  assert.match(detail, /const \[gallerySettled, setGallerySettled\]/);
  assert.match(detail, /expandMissions={packJoined}/);
  assert.match(detail, /waitingAction={!packJoined \?/);
  assert.match(detail, /activeMission && gallerySettled/);
  assert.match(gallery, /requestExpansionRef\.current = startExpansion/);
  assert.doesNotMatch(gallery.match(/useLayoutEffect\(\(\) => \{\s*const root = rootRef\.current[\s\S]*?\}, \[([^\]]*)\]\);/)?.[1] ?? "", /expandMissions/);
  assert.match(membership, /\{isTaking \? "taking…" : "take this"\}/);
  assert.match(membership, /disabled={isTaking}/);
  assert.match(membership, /if \(!result\.ok\) \{\s*setError\(result\.error\);\s*return;/);
  assert.match(membership, /window\.location\.assign\(getPackLoginDestination\(pack\.slug\)\)/);
  assert.match(page, /getCurrentPackMembership/);
  assert.match(page, /initialPackJoined={Boolean\(membership\)}/);
});

test("Mission stream markup copies all five designs from the flat Mission contract", () => {
  const { MissionStreamCard } = loadModule("features/packs/components/MissionStreamCard.tsx", renderingOverrides);
  const designs = [
    ["Go to a movie alone.", "coral", "circle"], ["Ask a stranger for a recommendation.", "blue", "square"],
    ["Ask for something they might say no to.", "yellow", "triangle"], ["Sit alone in a busy café.", "ink", "diamond"],
    ["Give someone a simple compliment.", "paper", "ring"],
  ];
  assert.deepEqual(plain(packs[0].missions.slice(0, 5).map(m => [m.title, m.themeKey, m.artworkKey])), designs);
  for (const pack of packs) for (const [index, mission] of pack.missions.entries()) {
    const html = renderToStaticMarkup(createElement(MissionStreamCard, { mission, number: index + 1 }));
    assert.ok(html.includes(mission.title));
    assert.ok(html.includes(mission.note));
    assert.ok(html.includes(mission.tag));
    assert.ok(html.includes(mission.code));
    assert.ok(html.includes(`MISSION ${String(index + 1).padStart(2, "0")}`));
    assert.doesNotMatch(html, /<button|<img/);
    assert.equal("imageSrc" in mission, false);
  }
  const html = renderToStaticMarkup(createElement(MissionStreamCard, { mission: packs[0].missions[0], number: 1 }));
  assert.match(html, /Go to a movie alone\./);
  assert.doesNotMatch(html, /undefined|NaN/);
});

for (const [width, height, coarsePointer] of [
  [320, 568, true], [375, 812, true], [390, 844, true], [568, 320, true], [844, 390, true],
  [540, 720, true], [820, 1180, true], [1180, 820, true], [1024, 1366, true],
  [1280, 720, false], [1440, 900, false], [1920, 1080, false], [3840, 2160, false],
]) {
  test(`Mission stream ${width}x${height}: readable equal-card proportions and infinite copies cover the viewport`, () => {
    const metrics = getMissionStreamMetrics({ width, height, coarsePointer });
    assert.equal(metrics.cardHeight, metrics.cardWidth * 1.42);
    assert.ok(metrics.cardWidth > 185 && metrics.cardWidth < width);
    if (coarsePointer && height > width && width >= 600) assert.ok(metrics.cardWidth >= 360);
    if (width < 600 && height > width) {
      const neighborLeft = width / 2 + metrics.stride - metrics.cardWidth / 2;
      assert.ok(neighborLeft < width - 8, "both neighboring cards peek into the phone viewport");
    }
    for (const count of [1, 2, 3, 5, 8, 24]) {
      const copies = getGalleryCopyCount(count, width, metrics.stride);
      if (count === 1) { assert.equal(copies, 1); continue; }
      const primary = Math.floor(copies / 2);
      for (const fraction of [-.5, 0, .5]) {
        const left = width / 2 - primary * count * metrics.stride - metrics.cardWidth / 2 + fraction * count * metrics.stride;
        assert.ok(left <= 0);
        assert.ok(left + (copies * count - 1) * metrics.stride + metrics.cardWidth >= width);
      }
    }
  });
}

test("Mission cards stay equal while expansion and collapse retain outer-card transforms", () => {
  const css = read("features/packs/components/MissionGallery.module.css");
  assert.match(css, /\.missionCard\s*\{[^}]*aspect-ratio: 1 \/ 1\.42/);
  assert.match(css, /\.root\[data-phase="settled"\] \.missionCard\s*\{[^}]*opacity: 1;[^}]*scale\(1\)/);
  assert.doesNotMatch(css, /native-distance|--stream-(?:y|scale|opacity)|depth-moving/);
  assert.equal(existsSync(path.join(root, "features/packs/model/mission-stream-depth.ts")), false);
  assert.doesNotMatch(read("features/packs/components/MissionGallery.tsx"), /MissionStreamDepth|depthFrame|paintDepth/);
  assert.doesNotMatch(read("features/packs/components/MissionStreamCard.module.css"), /will-change/);
});

function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}

function carouselHarness({ count = 6, activeIndex = 0, position = activeIndex, placement = "bottom", reduced = false } = {}) {
  const cells = [];
  const timers = new Map();
  const frames = new Map();
  const layoutEffects = [];
  const globalListeners = new Map();
  const cardElements = [];
  const effects = [];
  const listeners = new Map();
  const opened = [];
  const prefetched = [];
  let cursor = 0;
  let timerId = 0;
  let capture = null;
  let captures = 0;
  let finished = 0;
  let now = 100;
  const handle = { current: null };
  const stage = {
    dataset: {},
    hasPointerCapture: id => capture === id,
    setPointerCapture: id => { capture = id; captures++; },
    releasePointerCapture: () => { capture = null; },
    getAnimations: () => [{ finish() { finished++; } }],
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: type => listeners.delete(type),
  };
  const rootElement = {};
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
      return [cells[index], next => { cells[index] = typeof next === "function" ? next(cells[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      return cells[index] ??= { current: initial };
    },
    useCallback: callback => callback,
    useMemo: factory => factory(),
    useEffect: callback => { effects.push(callback); },
    useLayoutEffect: callback => { layoutEffects.push(callback); },
    useImperativeHandle: (ref, create) => { ref.current = create(); },
    ViewTransition: transition,
  };
  const { TransformArcCarousel: ArcCarousel } = loadModule("features/packs/components/ArcCarousel.tsx", {
    ...renderingOverrides,
    react: hooks,
    "next/navigation": { useRouter: () => ({ prefetch: href => prefetched.push(href) }) },
  }, {
    performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++timerId, callback); return timerId; },
    cancelAnimationFrame: id => frames.delete(id),
    document: {
      hidden: false,
      addEventListener: (type, callback) => globalListeners.set(type, callback),
      removeEventListener: type => globalListeners.delete(type),
    },
    window: {
      addEventListener: (type, callback) => globalListeners.set(type, callback),
      removeEventListener: type => globalListeners.delete(type),
      matchMedia: () => ({ matches: reduced }),
      setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
      clearTimeout: id => timers.delete(id),
    },
  });
  let tree;
  function render(extra = {}) {
    cursor = 0;
    tree = ArcCarousel({
      packs: packs.slice(0, Math.max(count, 1)), placement, ref: handle,
      initialCarouselState: { count, activeIndex, position },
      onOpenPack: (pack, source) => {
        opened.push([pack.id, source]);
        handle.current.freezeAndSnapshot();
      }, ...extra,
    });
    nodes(tree, node => node.type === "section")[0].props.ref.current = rootElement;
    nodes(tree, node => node.props?.className === "stage")[0].props.ref.current = stage;
    nodes(tree, node => node.props?.className === "card").forEach((node, index) => {
      const element = cardElements[index] ??= { style: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
      node.props.ref(element);
    });
    layoutEffects.splice(0).forEach(effect => effect());
    return tree;
  }
  render();
  const cleanups = effects.splice(0).map(effect => effect()).filter(Boolean);
  return {
    opened, prefetched, handle, stage, listeners, timers, frames, globalListeners, cardElements, render,
    cards: () => nodes(tree, node => node.props?.className === "card"),
    stageProps: () => nodes(tree, node => node.props?.className === "stage")[0].props,
    selection: () => ({ count: cells[0].count, activeIndex: cells[0].activeIndex }),
    position: () => cells[2].current,
    click: (index, timeStamp = 1000) => nodes(tree, node => node.props?.className === "card")[index].props.onClick({ timeStamp }),
    pointer: (x, y = 0, timeStamp = 100, extra = {}) => ({
      clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", isPrimary: true,
      button: 0, target: stage, currentTarget: stage, timeStamp, ...extra,
    }),
    loseCapture() { capture = null; },
    frame() {
      now += 16;
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(now); }
    },
    settle() {
      for (let index = 0; frames.size && index < 500; index++) this.frame();
      assert.equal(frames.size, 0, "spring must converge within a finite time");
      for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
    },
    cleanup() { cleanups.forEach(cleanup => cleanup()); },
    get captures() { return captures; }, get capture() { return capture; }, get finished() { return finished; },
  };
}

for (const placement of ["top", "bottom"]) {
  test(`${placement}: stationary desktop pointer click opens the centered pack without pointer capture`, () => {
    const harness = carouselHarness({ placement });
    const stage = harness.stageProps();
    stage.onPointerDown(harness.pointer(200));
    stage.onPointerUp(harness.pointer(200));
    harness.click(0);
    assert.equal(harness.captures, 0);
    assert.deepEqual(harness.opened, [[packs[0].id, placement]]);
    assert.deepEqual(plain(harness.handle.current.freezeAndSnapshot()), { count: 6, activeIndex: 0, packId: packs[0].id, position: 0 });
    harness.click(0);
    assert.equal(harness.opened.length, 1);
    harness.cleanup();
  });

  test(`${placement}: drag follows before release, then coasts to a card without opening it`, () => {
    const harness = carouselHarness({ placement });
    const stage = harness.stageProps();
    stage.onPointerDown(harness.pointer(200));
    stage.onPointerMove(harness.pointer(120));
    assert.equal(harness.capture, 1);
    assert.equal(harness.selection().activeIndex, 0);
    assert.ok(harness.position() > 0 && harness.position() < 1, "continuous movement before release");
    const translatedX = Number(harness.cardElements[0].style.transform.match(/translate3d\(([^p]+)px/)[1]);
    assert.ok(Math.abs(translatedX + 52) < 1e-9, "80px finger drag moves artwork 52px");
    stage.onPointerUp(harness.pointer(120));
    assert.equal(harness.capture, null);
    assert.ok(harness.frames.size > 0);
    harness.render();
    harness.click(1, 101);
    assert.equal(harness.opened.length, 0);
    harness.settle();
    assert.equal(harness.selection().activeIndex, 1);
    harness.click(1, 1000);
    assert.deepEqual(harness.opened, [[packs[1].id, placement]]);
    harness.cleanup();
  });
}

for (const placement of ["top", "bottom"]) {
  for (const pointerType of ["touch", "pen"]) {
    for (const direction of [-1, 1]) {
      test(`${placement} ${pointerType}: child capture transfer preserves ${direction < 0 ? "left" : "right"} swipes`, () => {
        const harness = carouselHarness({ placement, activeIndex: 2 });
        const stage = harness.stageProps();
        const child = { tagName: "SPAN" };
        const start = harness.pointer(200, 20, 100, { pointerType, target: child });
        stage.onPointerDown(start);
        stage.onPointerMove({ ...start, clientX: 200 + direction * 8, timeStamp: 116 });
        assert.equal(harness.capture, 1);
        // Touch/pen initially capture the hit child. On the next event the
        // browser transfers capture to the stage and bubbles this child loss.
        stage.onLostPointerCapture({ ...start, timeStamp: 132 });
        assert.equal(harness.capture, 1, "transferring capture must not cancel the swipe");
        stage.onPointerMove(harness.pointer(200 + direction * 90, 24, 132, { pointerType }));
        stage.onPointerUp(harness.pointer(200 + direction * 90, 24, 148, { pointerType }));
        assert.equal(harness.capture, null);
        assert.ok(harness.frames.size > 0);
        stage.onLostPointerCapture(harness.pointer(200 + direction * 90, 24, 149, { pointerType }));
        harness.render();
        harness.click(2 - direction, 150);
        assert.equal(harness.opened.length, 0, "the swipe release must not open a pack");
        harness.settle();
        assert.equal(harness.selection().activeIndex, 2 - direction);
        stage.onPointerDown(harness.pointer(200, 20, 160, { pointerType, target: child }));
        stage.onPointerUp(harness.pointer(200, 20, 176, { pointerType, target: child }));
        harness.click(2 - direction, 177);
        assert.equal(harness.opened.length, 1, "a fresh tap still opens the centered pack");
        harness.cleanup();
      });
    }
  }
}

test("side click centers first; opening waits for the spring and back fan", () => {
  const harness = carouselHarness();
  harness.click(1);
  assert.ok(harness.frames.size > 0);
  assert.equal(harness.opened.length, 0);
  harness.render();
  harness.click(1);
  assert.equal(harness.opened.length, 0);
  harness.settle();
  assert.equal(harness.selection().activeIndex, 1);
  harness.click(1);
  assert.equal(harness.opened.length, 1);
  assert.equal(harness.stage.dataset.moving, "false");
  harness.cleanup();
});

test("pointer cancellation and lost capture never switch packs or leave the wheel stuck", () => {
  const harness = carouselHarness();
  const stage = harness.stageProps();
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerMove(harness.pointer(100));
  stage.onPointerCancel(harness.pointer(100));
  assert.equal(harness.capture, null);
  assert.equal(harness.selection().activeIndex, 0);
  stage.onLostPointerCapture(harness.pointer(100));
  harness.settle();
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerUp(harness.pointer(200));
  harness.click(0);
  assert.equal(harness.opened.length, 1);
  harness.cleanup();
});

test("secondary pointers and stale stage capture events cannot cancel the active swipe", () => {
  const harness = carouselHarness();
  const stage = harness.stageProps();
  stage.onPointerDown(harness.pointer(200, 0, 100, { pointerId: 2, isPrimary: false }));
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerMove(harness.pointer(100));
  assert.equal(harness.capture, 1);
  const secondary = harness.pointer(100, 0, 116, { pointerId: 2, isPrimary: false });
  stage.onPointerCancel(secondary);
  stage.onLostPointerCapture(secondary);
  stage.onPointerLeave(secondary);
  stage.onLostPointerCapture(harness.pointer(100));
  assert.equal(harness.capture, 1, "ignore stale loss while the stage still owns capture");
  stage.onPointerUp(harness.pointer(100));
  harness.settle();
  assert.equal(harness.selection().activeIndex, 1);
  harness.cleanup();
});

test("real stage capture loss cancels without switching or opening, and the next gesture works", () => {
  const harness = carouselHarness();
  const stage = harness.stageProps();
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerMove(harness.pointer(100));
  harness.loseCapture();
  stage.onLostPointerCapture(harness.pointer(100, 0, 116));
  stage.onPointerUp(harness.pointer(100, 0, 132));
  harness.click(0, 133);
  assert.equal(harness.opened.length, 0);
  assert.equal(harness.selection().activeIndex, 0);
  harness.settle();
  stage.onPointerDown(harness.pointer(200, 0, 148));
  stage.onPointerMove(harness.pointer(280, 0, 164));
  stage.onPointerUp(harness.pointer(280, 0, 180));
  harness.settle();
  assert.equal(harness.selection().activeIndex, 5);
  harness.cleanup();
});

test("keyboard and wheel are scoped to the selected wheel; freeze/resume and cleanup remain functional", () => {
  const harness = carouselHarness();
  harness.stageProps().onKeyDown({ key: "ArrowLeft", preventDefault() {} });
  harness.settle();
  assert.equal(harness.selection().activeIndex, 5);
  harness.settle();
  harness.listeners.get("wheel")({ deltaX: 80, deltaY: 0, preventDefault() {} });
  harness.settle();
  assert.equal(harness.selection().activeIndex, 0);
  harness.handle.current.freezeAndSnapshot();
  assert.equal(harness.finished, 0, "freeze never finishes route or fan CSS animations");
  harness.stageProps().onKeyDown({ key: "ArrowRight", preventDefault() {} });
  assert.equal(harness.selection().activeIndex, 0);
  harness.handle.current.resume();
  harness.stageProps().onKeyDown({ key: "ArrowRight", preventDefault() {} });
  harness.settle();
  assert.equal(harness.selection().activeIndex, 1);
  harness.cleanup();
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.listeners.size, 0);
});

test("zero through 24 decks have one active card, no fake copies, and valid visibility", () => {
  for (const count of [0, 1, 2, 3, 4, 5, 6, 24]) {
    const harness = carouselHarness({ count });
    assert.equal(harness.cards().length, count);
    assert.equal(harness.cards().filter(card => card.props["aria-current"] === "true").length, count ? 1 : 0);
    assert.ok(harness.cards().filter(card => !card.props["aria-hidden"]).length <= 5);
    for (const card of harness.cards()) {
      assert.doesNotMatch(card.props.style.transform, /NaN|undefined/);
      if (card.props["aria-hidden"]) assert.equal(card.props.tabIndex, -1);
    }
    harness.cleanup();
  }
});

test("reduced motion skips the internal transition lock and idle timers", () => {
  const harness = carouselHarness({ count: 2, reduced: true });
  harness.click(1);
  harness.render();
  harness.click(1);
  assert.equal(harness.opened.length, 1);
  assert.equal(harness.timers.size, 0);
  harness.cleanup();
  assert.match(read("features/packs/components/PackDeck.module.css"), /prefers-reduced-motion: reduce/);
  assert.match(read("features/packs/components/ArcCarousel.module.css"), /transition: none !important/);
});

test("mock count changes preserve the selected pack where possible and clamp safely at one", () => {
  const harness = carouselHarness({ count: 6, activeIndex: 5 });
  const decrease = () => {
    const tree = harness.render();
    nodes(tree, node => node.props?.["aria-label"] === "减少图片 / Decrease images")[0].props.onClick();
  };
  decrease();
  assert.deepEqual(harness.selection(), { count: 5, activeIndex: 4 });
  for (let i = 0; i < 10; i++) decrease();
  assert.deepEqual(harness.selection(), { count: 1, activeIndex: 0 });
  const tree = harness.render();
  assert.equal(nodes(tree, node => node.props?.["aria-label"] === "减少图片 / Decrease images")[0].props.disabled, true);
  nodes(tree, node => node.props?.["aria-label"] === "增加图片 / Increase images")[0].props.onClick();
  assert.deepEqual(harness.selection(), { count: 2, activeIndex: 0 });
  harness.cleanup();
});

test("disabled wheels reject click, keyboard, pointer and count changes while a menu or route owns input", () => {
  const harness = carouselHarness();
  const tree = harness.render({ interactionDisabled: true });
  harness.stageProps().onKeyDown({ key: "ArrowRight", preventDefault() {} });
  harness.stageProps().onPointerDown(harness.pointer(200));
  harness.stageProps().onPointerUp(harness.pointer(100));
  harness.click(0);
  nodes(tree, node => node.props?.["aria-label"] === "减少图片 / Decrease images")[0].props.onClick();
  assert.deepEqual(harness.selection(), { count: 6, activeIndex: 0 });
  assert.equal(harness.opened.length, 0);
  assert.equal(harness.captures, 0);
  assert.equal(nodes(tree, node => node.type === "section")[0].props.inert, true);
  harness.cleanup();
});

test("short drags follow immediately and return softly, rather than waiting for a 42px swipe", () => {
  const harness = carouselHarness();
  const stage = harness.stageProps();
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerMove(harness.pointer(180, 0, 200));
  const dragged = harness.position();
  assert.ok(dragged > 0 && dragged < .5);
  stage.onPointerUp(harness.pointer(180, 0, 300));
  assert.equal(harness.position(), dragged, "release must not teleport to a slot");
  harness.frame();
  assert.ok(harness.position() < dragged);
  harness.settle();
  assert.equal(harness.position(), 0);
  assert.equal(harness.opened.length, 0);
  harness.cleanup();
});

test("a drag can cross multiple cards before release, and an in-place React commit cannot reset its live pose", () => {
  const harness = carouselHarness({ count: 24 });
  const stage = harness.stageProps();
  const pixels = getDeckMetrics(viewport).gap * 2.25 / DECK_DRAG_SENSITIVITY;
  stage.onPointerDown(harness.pointer(800));
  stage.onPointerMove(harness.pointer(800 - pixels, 0, 500));
  assert.equal(harness.selection().activeIndex, 2);
  assert.ok(Math.abs(harness.position() - 2.25) < 1e-9);
  const before = harness.cardElements[2].style.transform;
  harness.render();
  assert.equal(harness.cardElements[2].style.transform, before);
  stage.onPointerUp(harness.pointer(800 - pixels, 0, 600));
  harness.settle();
  assert.equal(harness.position(), 2);
  harness.cleanup();
});

test("an in-flight spring can be re-grabbed and reversed without jumping", () => {
  const harness = carouselHarness();
  const stage = harness.stageProps();
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerMove(harness.pointer(110, 0, 116));
  stage.onPointerUp(harness.pointer(110, 0, 132));
  const released = harness.position();
  harness.frame();
  assert.ok(harness.position() > released, "inertia continues in the release direction");
  const coasting = harness.position();
  stage.onPointerDown(harness.pointer(200, 0, 148));
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.position(), coasting);
  stage.onPointerMove(harness.pointer(240, 0, 164));
  assert.ok(harness.position() < coasting, "right drag moves cards right immediately");
  stage.onPointerUp(harness.pointer(240, 0, 280));
  harness.settle();
  assert.equal(harness.position(), 0);
  harness.cleanup();
});

test("pause before release removes stale fling velocity", () => {
  const harness = carouselHarness();
  const stage = harness.stageProps();
  stage.onPointerDown(harness.pointer(200));
  stage.onPointerMove(harness.pointer(120, 0, 116));
  stage.onPointerUp(harness.pointer(120, 0, 300));
  harness.settle();
  assert.equal(harness.selection().activeIndex, 0);
  harness.cleanup();
});

test("one to five cards have finite, resisted edges and settle back without duplicates", () => {
  for (const count of [1, 2, 3, 4, 5]) {
    for (const activeIndex of [0, count - 1]) {
      const harness = carouselHarness({ count, activeIndex });
      const stage = harness.stageProps();
      const x = activeIndex === 0 ? 1500 : -1000;
      stage.onPointerDown(harness.pointer(200));
      stage.onPointerMove(harness.pointer(x, 0, 116));
      assert.ok(Math.abs(harness.position() - activeIndex) < .3, "edge resistance is bounded");
      stage.onPointerUp(harness.pointer(x, 0, 300));
      harness.settle();
      assert.equal(harness.position(), activeIndex);
      assert.equal(harness.cards().length, count);
      harness.cleanup();
    }
  }
});

test("fractional freeze/return preserves geometry; resize and blur release capture and motion", () => {
  const harness = carouselHarness({ activeIndex: 2, position: 2.2 });
  assert.ok(Math.abs(harness.position() - 2.2) < 1e-9);
  const snapshot = plain(harness.handle.current.freezeAndSnapshot());
  assert.equal(snapshot.position, 2.2);
  assert.equal(snapshot.activeIndex, 2);
  assert.equal(harness.frames.size, 0);
  harness.handle.current.resume();
  harness.settle();
  assert.equal(harness.position(), 2);
  for (const event of ["resize", "blur"]) {
    const stage = harness.stageProps();
    stage.onPointerDown(harness.pointer(200));
    stage.onPointerMove(harness.pointer(120, 0, 116));
    harness.globalListeners.get(event)();
    assert.equal(harness.capture, null);
    assert.equal(harness.frames.size, 0);
    assert.equal(harness.position(), Math.round(harness.position()));
  }
  harness.cleanup();
  assert.equal(harness.globalListeners.size, 0);
});

test("continuous deck poses have no size/opacity jumps at center, visible edges or cyclic seams", () => {
  const metrics = getDeckMetrics(viewport);
  for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
    const before = getContinuousDeckPose(offset - 1e-5, metrics);
    const after = getContinuousDeckPose(offset + 1e-5, metrics);
    for (const property of ["x", "y", "scale", "rotation", "opacity"]) {
      assert.ok(Math.abs(before[property] - after[property]) < .01);
    }
  }
  for (const count of [6, 7, 12, 24]) {
    const before = getContinuousDeckPose(getRelativeSlot(0, count / 2 - 1e-5, count), metrics);
    const after = getContinuousDeckPose(getRelativeSlot(0, count / 2 + 1e-5, count), metrics);
    assert.ok(before.opacity < .001 && after.opacity < .001, "wrapping happens off-screen");
  }
  const css = read("features/packs/components/ArcCarousel.module.css");
  const transformCard = css.match(/\.card\s*\{[^}]*\}/)[0];
  assert.doesNotMatch(transformCard, /transition:\s*\n?\s*transform/, "CSS transform easing must not fight the RAF spring");
});
