import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as months from "../features/calendar/model/calendar-month.ts";
import * as geometry from "../features/calendar/model/calendar-geometry.ts";
import * as dayTransitions from "../features/calendar/model/calendar-day-transition.ts";

const source = ts.createSourceFile("CalendarCarousel.tsx", readFileSync(new URL(
  "../features/calendar/components/CalendarCarousel.tsx", import.meta.url,
), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function findNode(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => findNode(child, predicate));
}

// Execute the component's actual handlers, supplying only event targets, refs,
// time and RAF. No browser, duplicate input implementation or new dependency.
function createInputHarness(placement = "top") {
  let now = 0;
  let captured = null;
  const frameCallbacks = [];
  const settlements = [];
  const opened = [];
  const range = months.getCalendarRange("2026-05-12", "2026-08-30");
  const center = months.monthNumber("2026-07");
  const stage = {
    dataset: {}, focus() {},
    hasPointerCapture: id => captured === id,
    setPointerCapture(id) { captured = id; },
    releasePointerCapture() { captured = null; },
  };
  const state = {
    dragRef: { current: null }, lockedRef: { current: false },
    suppressDateClickUntilRef: { current: 0 }, interactionDisabled: false,
    completedOn: new Set(["2026-07-11", "2026-07-20", "2026-08-05"]),
    onOpenDate: (date, side) => opened.push({ date, side }), placement, monthKey: months.monthKey,
    positionRef: { current: center }, centerRef: { current: center },
    geometryRef: { current: geometry.getCalendarGeometry(375, 812, true, placement) },
    stageRef: { current: stage }, paintFrameRef: { current: null }, range,
    performance: { now: () => now },
    requestAnimationFrame(fn) { frameCallbacks.push(fn); return frameCallbacks.length; },
    paint() {}, stop() { frameCallbacks.length = 0; state.paintFrameRef.current = null; },
    releasePointer() { state.dragRef.current = null; captured = null; },
    resistMonthPosition: months.resistMonthPosition,
    settle(velocity) {
      settlements.push(velocity);
      state.positionRef.current = months.getMonthSnapTarget(state.positionRef.current, velocity, center, range);
    },
  };
  const context = vm.createContext(state);
  function evaluate(node) {
    const js = ts.transpileModule(`(${node.getText(source)})`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText;
    return vm.runInContext(js, context);
  }
  const variable = name => {
    const initializer = findNode(source, node =>
      ts.isVariableDeclaration(node) && node.name.getText(source) === name).initializer;
    return evaluate(ts.isCallExpression(initializer) ? initializer.arguments[0] : initializer);
  };
  const attribute = name => evaluate(findNode(source, node =>
    ts.isJsxAttribute(node) && node.name.text === name).initializer.expression);
  state.finishDrag = variable("finishDrag");
  const handlers = {
    down: variable("pointerDown"), move: variable("pointerMove"),
    up: attribute("onPointerUp"), cancel: attribute("onPointerCancel"),
    lost: attribute("onLostPointerCapture"), leave: attribute("onPointerLeave"),
  };
  return {
    state, stage, center, settlements, opened, openDate: variable("openDate"),
    loseCapture() { captured = null; },
    event(type, x = 100, extra = {}) {
      now += 16;
      handlers[type]({ pointerId: 1, pointerType: "touch", isPrimary: true, button: 0,
        clientX: x, currentTarget: stage, target: stage, ...extra });
    },
  };
}

for (const placement of ["top", "bottom"]) {
  test(`${placement}: touch capture transfer from an SVG date does not cancel swiping`, () => {
    const input = createInputHarness(placement);
    const date = { tagName: "text" };
    input.event("down", 100, { target: date });
    input.event("move", 108, { target: date });
    assert.equal(input.stage.hasPointerCapture(1), true);
    // Touch implicitly captured the date. Moving past the threshold transfers
    // capture to the stage, so the old date's lost event bubbles through it.
    input.event("lost", 108, { target: date });
    assert.notEqual(input.state.dragRef.current, null);
    assert.equal(input.settlements.length, 0);
    input.event("move", 340);
    assert.ok(input.state.positionRef.current < input.center - .5);
    input.event("up", 340);
    assert.equal(input.state.positionRef.current, input.center - 1);
    assert.equal(input.settlements.length, 1);
    input.event("lost", 340);
    assert.equal(input.settlements.length, 1);
  });
}

test("mouse drag retains its threshold and leftward movement", () => {
  const input = createInputHarness();
  input.event("down", 340, { pointerType: "mouse" });
  input.event("move", 337, { pointerType: "mouse" });
  assert.equal(input.stage.hasPointerCapture(1), false);
  input.event("move", 100, { pointerType: "mouse" });
  assert.ok(input.state.positionRef.current > input.center + .5);
  input.event("up", 100, { pointerType: "mouse" });
  assert.equal(input.state.positionRef.current, input.center + 1);
});

test("only a genuine loss by the active stage cancels the gesture", () => {
  const input = createInputHarness();
  input.event("down");
  input.event("move", 120);
  input.event("lost", 120);
  assert.notEqual(input.state.dragRef.current, null, "ignore a stale loss when stage still owns capture");
  input.loseCapture();
  input.event("lost", 120, { pointerId: 2 });
  assert.notEqual(input.state.dragRef.current, null, "ignore another pointer's capture");
  input.event("lost", 120);
  assert.equal(input.state.dragRef.current, null);
  assert.deepEqual(input.settlements, [0]);
});

test("another finger cannot cancel the active drag; real pointercancel still settles", () => {
  const input = createInputHarness();
  input.event("down");
  input.event("move", 120);
  input.event("cancel", 120, { pointerId: 2 });
  assert.notEqual(input.state.dragRef.current, null);
  input.event("cancel", 120);
  assert.equal(input.state.dragRef.current, null);
  assert.deepEqual(input.settlements, [0]);
});

test("open menu/navigation lock prevents starting a calendar gesture", () => {
  const input = createInputHarness();
  input.state.lockedRef.current = true;
  input.event("down");
  input.event("move", 300);
  assert.equal(input.state.dragRef.current, null);
  assert.equal(input.state.positionRef.current, input.center);
});

test("actual month markup has only twelve open dividers, no paper or shadow", () => {
  const require = createRequire(import.meta.url);
  const css = readFileSync(new URL("../features/calendar/components/CalendarCarousel.module.css", import.meta.url), "utf8");
  const component = readFileSync(new URL("../features/calendar/components/CalendarMonth.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(component, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === "react") return { ...require(name), ViewTransition: ({ children }) => children };
    if (name.endsWith("calendar-month")) return months;
    if (name.endsWith("calendar-geometry")) return geometry;
    if (name.endsWith("calendar-day-transition")) return dayTransitions;
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }) };
    return require(name);
  } });
  const html = renderToStaticMarkup(createElement(exports.CalendarMonth, {
    month: months.monthNumber("2026-08"), range: months.getCalendarRange("2026-05-12", "2026-08-30"),
    geometry: geometry.getCalendarGeometry(375, 812, true, "top"), completedOn: new Set(["2026-08-05"]),
  }));
  assert.equal((html.match(/<path\b/g) || []).length, 12);
  assert.doesNotMatch(html, /class="(?:paper|shadow)"/);
  assert.doesNotMatch(css, /\.(?:paper|shadow)\s*\{/);
  assert.match(css, /\.rule\s*\{[^}]*fill:\s*none/);
  assert.equal((html.match(/<circle\b/g) || []).length, 1);
  assert.equal((html.match(/<text\b/g) || []).length, 38);
});

for (const placement of ["top", "bottom"]) {
  test(`${placement}: a date tap opens only recorded dates, not a drag/cancel or neighboring month`, () => {
    const input = createInputHarness(placement);
    input.event("down");
    input.event("up");
    input.openDate("2026-07-11");
    assert.deepEqual(input.opened, [{ date: "2026-07-11", side: placement }]);
    input.openDate("2026-07-12");
    input.openDate("2026-08-05");
    input.openDate("2026-02-30");
    assert.equal(input.opened.length, 1);
    input.event("down");
    input.event("move", 106);
    input.event("up", 106);
    input.openDate("2026-07-11");
    assert.equal(input.opened.length, 1, "release click after a swipe is suppressed");
    input.event("down");
    input.event("cancel");
    input.openDate("2026-07-11");
    assert.equal(input.opened.length, 1, "cancelled touches do not navigate");
    input.event("down");
    input.event("up");
    input.openDate("2026-07-20");
    assert.equal(input.opened.length, 2, "a fresh tap works immediately");
    input.state.lockedRef.current = true;
    input.openDate("2026-07-11");
    assert.equal(input.opened.length, 2);
    input.state.lockedRef.current = false;
    input.state.positionRef.current = input.center + .7;
    input.openDate("2026-07-11");
    assert.equal(input.opened.length, 2, "do not open an anchor absent from the snapped return month");
  });
}
