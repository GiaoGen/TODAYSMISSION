import assert from "node:assert/strict";
import test from "node:test";
import {
  createHomeCarouselState,
  exchangeHomeCarousels,
  getCarouselAssignments,
} from "../features/packs/model/home-carousel-state.ts";
import {
  createDirectPackReturnState,
  getPackEntrySource,
  resolveCarouselState,
} from "../features/packs/model/pack-carousel-return-state.ts";
import {
  animateCarouselPair,
  getCarouselSwapKeyframes,
} from "../features/packs/model/carousel-swap-motion.ts";
import { getHomePreferences, setHomePreferences } from "../features/packs/model/home-preferences.ts";
import { getPackTransitionName } from "../features/packs/model/pack-transition.ts";

const packs = Array.from({ length: 24 }, (_, index) => ({ id: `pack-${index}` }));
const joined = [0, 2, 4, 6, 8].map((index) => packs[index]);
const snapshot = (packId, count, activeIndex, position = activeIndex) => ({
  packId, count, activeIndex, position,
});
const joinedSnapshot = snapshot("pack-4", 5, 2, 2.1);
const allSnapshot = snapshot("pack-7", 12, 7, 31.2);

test("initial assignments are joined above and all below", () => {
  const state = createHomeCarouselState(null);
  assert.deepEqual(getCarouselAssignments(state.topCollection), { top: "joined", bottom: "all" });
});

test("repeated swaps cannot select the same collection on both sides", () => {
  let state = createHomeCarouselState(null);
  for (let index = 0; index < 10; index++) {
    const assignments = getCarouselAssignments(state.topCollection);
    const byCollection = { joined: joinedSnapshot, all: allSnapshot };
    state = exchangeHomeCarousels(state, {
      top: byCollection[assignments.top], bottom: byCollection[assignments.bottom],
    });
    const next = getCarouselAssignments(state.topCollection);
    assert.notEqual(next.top, next.bottom);
    assert.equal(next.top, assignments.bottom);
    assert.deepEqual(state.snapshots.joined, joinedSnapshot);
    assert.deepEqual(state.snapshots.all, allSnapshot);
  }
});

test("a reduced mock count and fractional winding travel with their collection", () => {
  const state = exchangeHomeCarousels(createHomeCarouselState(null), {
    top: joinedSnapshot, bottom: allSnapshot,
  });
  assert.deepEqual(resolveCarouselState(packs, 24, "all", state.snapshots.all), {
    activeIndex: 7, count: 12, position: 31.2,
  });
  const changedJoined = snapshot("pack-2", 3, 1, 1.25);
  const restored = exchangeHomeCarousels(state, { top: allSnapshot, bottom: changedJoined });
  assert.deepEqual(resolveCarouselState(joined, 5, "joined", restored.snapshots.joined), {
    activeIndex: 1, count: 3, position: 1.25,
  });
  assert.deepEqual(joinedSnapshot.position, 2.1);
});

for (const source of ["top", "bottom"]) {
  test(`${source} detail entry after swapping preserves collections and shared identity`, () => {
    const selected = source === "top" ? allSnapshot : joinedSnapshot;
    const saved = {
      source, packId: selected.packId, topCollection: "all",
      carousels: { top: allSnapshot, bottom: joinedSnapshot },
    };
    const restored = createHomeCarouselState(saved);
    assert.deepEqual(getCarouselAssignments(restored.topCollection), { top: "all", bottom: "joined" });
    assert.deepEqual(restored.snapshots.all, allSnapshot);
    assert.deepEqual(restored.snapshots.joined, joinedSnapshot);
    assert.equal(getPackTransitionName(saved.packId, getPackEntrySource(saved.packId, saved)),
      getPackTransitionName(selected.packId, source));
  });
}

test("direct detail links fall back to all packs on the bottom", () => {
  const saved = createDirectPackReturnState("pack-20");
  const state = createHomeCarouselState(saved);
  assert.equal(getCarouselAssignments(state.topCollection).bottom, "all");
  assert.deepEqual(resolveCarouselState(packs, 24, "all", null, saved.packId), {
    activeIndex: 20, count: 21, position: 20,
  });
});

for (const phase of ["exiting", "entering"]) {
  test(`${phase}: wheel keyframes are vertically mirrored`, () => {
    const top = getCarouselSwapKeyframes("top", phase, false);
    const bottom = getCarouselSwapKeyframes("bottom", phase, false);
    const hiddenIndex = phase === "exiting" ? 1 : 0;
    assert.match(top[hiddenIndex].transform, /-112vh/);
    assert.match(bottom[hiddenIndex].transform, /, 112vh/);
    assert.equal(top[hiddenIndex].opacity, 0);
    assert.deepEqual(top[1 - hiddenIndex], bottom[1 - hiddenIndex]);
  });
}

test("reduced motion uses only opacity and never moves a wheel", () => {
  for (const placement of ["top", "bottom"]) {
    for (const phase of ["entering", "exiting"]) {
      const frames = getCarouselSwapKeyframes(placement, phase, true);
      assert.equal(frames[0].transform, frames[1].transform);
    }
  }
});

for (const phase of ["exiting", "entering"]) {
  test(`${phase}: the actual pair runner starts both together and waits for both`, async () => {
    const calls = [];
    const resolvers = [];
    const makeElement = (placement) => ({
      ownerDocument: { timeline: { currentTime: 1234 } },
      animate(frames, options) {
        const animation = {
          startTime: null,
          finished: new Promise((resolve) => resolvers.push(resolve)),
          cancelled: false,
          cancel() { this.cancelled = true; },
        };
        calls.push({ placement, frames, options, animation });
        return animation;
      },
    });
    const motion = animateCarouselPair({ top: makeElement("top"), bottom: makeElement("bottom") }, phase, false);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].animation.startTime, calls[1].animation.startTime);
    assert.equal(calls[0].animation.startTime, 1234);
    assert.deepEqual(calls[0].options, calls[1].options);
    assert.equal(calls[0].options.duration, 520);
    let complete = false;
    void motion.finished.then(() => { complete = true; });
    resolvers[0]();
    await Promise.resolve();
    assert.equal(complete, false);
    resolvers[1]();
    await motion.finished;
    assert.equal(complete, true);
    motion.cancel();
    assert.ok(calls.every((call) => call.animation.cancelled));
  });
}

test("mock logout and theme survive route navigation without mutating the caller", () => {
  const next = { theme: "dark", loggedOut: true };
  setHomePreferences(next);
  next.theme = "light";
  assert.deepEqual(getHomePreferences(), { theme: "dark", loggedOut: true });
  setHomePreferences({ theme: "light", loggedOut: false });
});
