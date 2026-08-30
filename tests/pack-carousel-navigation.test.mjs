import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createDirectPackReturnState,
  getInitialCarouselState,
  getPackCarouselReturnState,
  getPackEntrySource,
  getServerPackCarouselReturnState,
  setPackCarouselReturnState,
  subscribePackCarouselReturnState,
} from "../features/packs/model/pack-carousel-return-state.ts";
import { getPackTransitionName } from "../features/packs/model/pack-transition.ts";

const packs = Array.from({ length: 24 }, (_, index) => ({ id: `pack-${index}` }));
const joinedPacks = [0, 2, 4, 6, 8].map((index) => packs[index]);
const snapshot = (packId, count, activeIndex, position = activeIndex) => ({
  packId, count, activeIndex, position,
});

function entry(source = "top") {
  return {
    source,
    packId: "pack-4",
    carousels: {
      top: snapshot("pack-4", 5, 2),
      bottom: snapshot("pack-7", 12, 7, 31.2),
    },
  };
}

test("the same Pack in both wheels has unique shared-element names", () => {
  const names = [
    ...packs.map((pack) => getPackTransitionName(pack.id, "bottom")),
    ...joinedPacks.map((pack) => getPackTransitionName(pack.id, "top")),
  ];
  assert.equal(new Set(names).size, names.length);
  for (const source of ["top", "bottom"]) {
    assert.equal(
      getPackTransitionName("pack-4", getPackEntrySource("pack-4", entry(source))),
      getPackTransitionName("pack-4", source),
    );
  }
});

test("first visit preserves top centering and bottom default count", () => {
  assert.deepEqual(getInitialCarouselState(joinedPacks, 5, "top", null), {
    activeIndex: 2, count: 5, position: 2,
  });
  assert.deepEqual(getInitialCarouselState(packs, 24, "bottom", null), {
    activeIndex: 0, count: 12, position: 0,
  });
});

for (const source of ["top", "bottom"]) {
  test(`${source} entry restores both rows independently, including fractional winding`, () => {
    const state = entry(source);
    assert.deepEqual(getInitialCarouselState(joinedPacks, 5, "top", state), {
      activeIndex: 2, count: 5, position: 2,
    });
    assert.deepEqual(getInitialCarouselState(packs, 24, "bottom", state), {
      activeIndex: 7, count: 12, position: 31.2,
    });
  });
}

test("top entry preserves a reduced bottom mock count", () => {
  const state = entry();
  state.carousels.bottom = snapshot("pack-1", 3, 1, 1.3);
  assert.deepEqual(getInitialCarouselState(packs, 24, "bottom", state), {
    activeIndex: 1, count: 3, position: 1.3,
  });
});

test("direct detail entry returns to bottom and includes a Pack outside the initial 12", () => {
  const state = createDirectPackReturnState("pack-20");
  assert.equal(getPackEntrySource("pack-20", state), "bottom");
  assert.deepEqual(getInitialCarouselState(packs, 24, "bottom", state), {
    activeIndex: 20, count: 21, position: 20,
  });
  assert.deepEqual(getInitialCarouselState(joinedPacks, 5, "top", state), {
    activeIndex: 2, count: 5, position: 2,
  });
  assert.equal(getPackEntrySource("pack-20", entry()), "bottom");
  assert.equal(getPackEntrySource("pack-20", null), "bottom");
  assert.equal(getServerPackCarouselReturnState(), null);
});

test("reordered data restores identity instead of the old numeric slot", () => {
  const reordered = [packs[4], packs[0], packs[2], packs[6], packs[8]];
  assert.deepEqual(getInitialCarouselState(reordered, 5, "top", entry()), {
    activeIndex: 0, count: 5, position: 0,
  });
});

test("removed Pack or empty row falls back without invalid positions", () => {
  assert.deepEqual(getInitialCarouselState([packs[0]], 1, "top", entry()), {
    activeIndex: 0, count: 1, position: 0,
  });
  assert.deepEqual(getInitialCarouselState([], 0, "top", entry()), {
    activeIndex: 0, count: 0, position: 0,
  });
});

test("shrinking a cyclic row does not restore its obsolete winding", () => {
  assert.deepEqual(getInitialCarouselState(packs.slice(0, 8), 8, "bottom", entry()), {
    activeIndex: 7, count: 8, position: 7,
  });
});

test("finite rows clamp restored positions to their own endpoints", () => {
  const state = entry();
  state.carousels.top = snapshot("pack-8", 5, 4, 4.2);
  assert.deepEqual(getInitialCarouselState(joinedPacks, 5, "top", state), {
    activeIndex: 4, count: 5, position: 4,
  });
});

test("same Pack opened from alternating rows updates the subscription and source", () => {
  const sources = [];
  const unsubscribe = subscribePackCarouselReturnState(() => {
    sources.push(getPackEntrySource("pack-4", getPackCarouselReturnState()));
  });
  for (const source of ["top", "bottom", "top"]) {
    const state = entry(source);
    setPackCarouselReturnState(state);
    state.carousels.top.position = 100;
    assert.equal(getPackCarouselReturnState().carousels.top.position, 2);
  }
  unsubscribe();
  setPackCarouselReturnState(entry("bottom"));
  assert.deepEqual(sources, ["top", "bottom", "top"]);
});

test("top and bottom reuse the same keyframes with opposite edge offsets", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /::view-transition-old\(\.pack-home-exit\),\s*::view-transition-old\(\.pack-home-top-exit\)\s*\{\s*animation: pack-wheel-exit 520ms/);
  assert.match(css, /::view-transition-new\(\.pack-home-enter\),\s*::view-transition-new\(\.pack-home-top-enter\)\s*\{\s*animation: pack-wheel-enter 520ms/);
  assert.match(css, /::view-transition-old\(\.pack-home-top-exit\),\s*::view-transition-new\(\.pack-home-top-enter\)\s*\{\s*--pack-wheel-offset: -112vh;/);
  assert.equal(css.match(/var\(--pack-wheel-offset, 112vh\)/g)?.length, 2);
});
