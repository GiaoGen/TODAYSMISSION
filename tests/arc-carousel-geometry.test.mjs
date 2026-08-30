import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveIndex,
  getCarouselCardPose,
  getCarouselMetrics,
  getCarouselPointerAngle,
  getRelativeSlot,
  getSnapTarget,
} from "../features/packs/model/arc-carousel-geometry.ts";

const viewports = [
  { name: "phone portrait", width: 375, height: 812, coarsePointer: true },
  { name: "phone landscape", width: 812, height: 375, coarsePointer: true },
  { name: "foldable", width: 540, height: 720, coarsePointer: true },
  { name: "tablet portrait", width: 820, height: 1180, coarsePointer: true },
  { name: "tablet landscape", width: 1180, height: 820, coarsePointer: true },
  { name: "desktop", width: 1440, height: 900, coarsePointer: false },
  { name: "wide desktop", width: 1920, height: 1080, coarsePointer: false },
];

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

for (const viewport of viewports) {
  test(`${viewport.name}: gentler tilt opens inner corners without moving cards`, () => {
    for (const placement of ["top", "bottom"]) {
      const metrics = getCarouselMetrics({ ...viewport, placement });
      const { stepAngle, radius, cardWidth, cardHeight, verticalDirection } = metrics;
      const pose = getCarouselCardPose(1, metrics);

      near(pose.x, metrics.centerX + Math.sin(stepAngle) * radius);
      near(pose.y, metrics.centerY - verticalDirection * Math.cos(stepAngle) * radius);
      near(pose.rotation, verticalDirection * stepAngle * 0.75);

      const inwardReach = (tilt) =>
        (cardWidth * Math.cos(tilt) + cardHeight * Math.sin(tilt)) / 2;
      assert.ok(inwardReach(Math.abs(pose.rotation)) < inwardReach(stepAngle));
    }
  });

  test(`${viewport.name}: top is the exact horizontal-axis reflection`, () => {
    const bottom = getCarouselMetrics(viewport);
    const top = getCarouselMetrics({ ...viewport, placement: "top" });

    near(top.centerY + bottom.centerY, viewport.height);
    near(top.cardWidth, bottom.cardWidth);
    near(top.cardHeight, bottom.cardHeight);
    near(top.cardWidth / top.cardHeight, 3 / 4);
    near(top.radius, bottom.radius);
    near(top.stepAngle, bottom.stepAngle);

    for (const slot of [-3, -1.5, -1, 0, 1, 1.5, 3]) {
      const a = getCarouselCardPose(slot, bottom);
      const b = getCarouselCardPose(slot, top);
      near(a.x, b.x);
      near(a.y + b.y, viewport.height);
      near(a.rotation, -b.rotation);
    }

    near(getCarouselCardPose(0, top).rotation, 0);
  });

  for (const placement of ["top", "bottom"]) {
    test(`${viewport.name}, ${placement}: horizontal drag follows the pointer`, () => {
      const metrics = getCarouselMetrics({ ...viewport, placement });

      for (const slot of [-1, 0, 1]) {
        for (const deltaX of [-24, 24]) {
          const before = getCarouselCardPose(slot, metrics);
          const startAngle = getCarouselPointerAngle(before.x, before.y, metrics);
          const endAngle = getCarouselPointerAngle(before.x + deltaX, before.y, metrics);
          const positionChange = wrapAngle(endAngle - startAngle) / metrics.stepAngle;
          const after = getCarouselCardPose(slot - positionChange, metrics);

          assert.equal(Math.sign(after.x - before.x), Math.sign(deltaX));
        }
      }
    });

    test(`${viewport.name}, ${placement}: following the arc has no direction reversal`, () => {
      const metrics = getCarouselMetrics({ ...viewport, placement });
      const start = getCarouselCardPose(0, metrics);
      const end = getCarouselCardPose(0.3, metrics);
      const turn = wrapAngle(
        getCarouselPointerAngle(end.x, end.y, metrics) -
        getCarouselPointerAngle(start.x, start.y, metrics),
      );
      const moved = getCarouselCardPose(-turn / metrics.stepAngle, metrics);

      near(moved.x, end.x);
      near(moved.y, end.y);
    });
  }
}

test("small lists keep equal slot spacing and finite bounds", () => {
  for (let count = 1; count <= 5; count += 1) {
    const selected = Math.floor(count / 2);
    near(getRelativeSlot(selected, selected, count), 0);
    assert.equal(getSnapTarget(-10, count), 0);
    assert.equal(getSnapTarget(10, count), count - 1);

    for (let index = 1; index < count; index += 1) {
      near(
        getRelativeSlot(index, selected, count) -
        getRelativeSlot(index - 1, selected, count),
        1,
      );
    }
  }
});

test("six or more cards keep cyclic wrapping", () => {
  for (const count of [6, 12, 24]) {
    near(getRelativeSlot(0, count, count), 0);
    assert.equal(getActiveIndex(count + 2, count), 2);
    assert.equal(getActiveIndex(-1, count), count - 1);
  }
});

test("the existing bottom card size and position are unchanged", () => {
  const phone = getCarouselMetrics(viewports[0]);
  near(phone.cardWidth, 172.5);
  near(getCarouselCardPose(0, phone).y, 587.28);

  const tablet = getCarouselMetrics(viewports[3]);
  near(tablet.cardWidth, 246);
  near(getCarouselCardPose(0, tablet).y, 847.2);
});

test("card angular spacing is 15 percent tighter, including clamped layouts", () => {
  const previousAngles = [0.42, 0.6, 308 / 540, 356.7 / 944, 0.54, 355.4 / 774, 0.42];

  for (const [index, viewport] of viewports.entries()) {
    for (const placement of ["top", "bottom"]) {
      const metrics = getCarouselMetrics({ ...viewport, placement });
      near(metrics.stepAngle, previousAngles[index] * 0.85);
    }
  }
});
