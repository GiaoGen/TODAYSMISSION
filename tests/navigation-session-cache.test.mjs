import assert from "node:assert/strict";
import test from "node:test";

import {
  batchRoutes,
  createCompletedRoutePrefetchPlan,
  getCompletedDayRoute,
  getCompletedDayRoutes,
  getPackDetailRoutes,
  getPrefetchedRoutesForTests,
  getPriorityCompletedDates,
  prefetchCompletedRoutes,
  prefetchPackRoutes,
  resetNavigationPrefetchForTests,
} from "../features/navigation/model/navigation-prefetch.ts";
import { getMissionExperiencePool } from "../features/missions/model/mission-experience-cache.ts";
import { readFileSync } from "node:fs";
import {
  addJoinedPack,
  addMissionCompletion,
  clearSessionSnapshot,
  getSessionSnapshot,
  initializeSessionSnapshot,
  resetSessionSnapshotForTests,
} from "../features/navigation/model/session-snapshot.ts";

test("Pack detail routes are generated once per published slug", () => {
  assert.deepEqual(getPackDetailRoutes([
    { slug: "go-alone" },
    { slug: "talk-first" },
    { slug: "go-alone" },
    { slug: "" },
  ]), ["/pack/go-alone", "/pack/talk-first"]);
});

test("Pack prefetch deduplicates a route and retries a synchronous failure", () => {
  resetNavigationPrefetchForTests();
  const calls = [];
  const router = { prefetch: (route) => calls.push(route) };
  assert.equal(prefetchPackRoutes(router, [{ slug: "go-alone" }]), 1);
  assert.equal(prefetchPackRoutes(router, [{ slug: "go-alone" }]), 0);
  assert.deepEqual(calls, ["/pack/go-alone"]);

  resetNavigationPrefetchForTests();
  let attempts = 0;
  const failingRouter = { prefetch: () => { attempts += 1; if (attempts === 1) throw new Error("warm-up failed"); } };
  assert.equal(prefetchCompletedRoutes(failingRouter, ["/completed/2026-09-03"]), 0);
  assert.equal(prefetchCompletedRoutes(failingRouter, ["/completed/2026-09-03"]), 1);
  assert.deepEqual(getPrefetchedRoutesForTests(), ["/completed/2026-09-03"]);
});

test("prefetch invalidation removes a route so it can be warmed again", () => {
  resetNavigationPrefetchForTests();
  const calls = [];
  const invalidations = [];
  const router = {
    prefetch: (route, options) => {
      calls.push({ route, options });
      invalidations.push(options.onInvalidate);
    },
  };

  assert.equal(prefetchPackRoutes(router, [{ slug: "go-alone" }]), 1);
  assert.equal(calls[0].options.kind, "full");
  invalidations[0]();
  assert.equal(prefetchPackRoutes(router, [{ slug: "go-alone" }]), 1);
  assert.equal(calls.length, 2);
});

test("experience cache separates community and own Mission scopes", async () => {
  const missionId = "scope-test-mission";
  const loads = [];
  const load = async id => {
    loads.push(id);
    return { ok: true, experiences: [{ id, kind: "text", text: id }] };
  };

  const community = await getMissionExperiencePool(missionId, { kind: "community" }, load);
  const own = await getMissionExperiencePool(missionId, { kind: "own", userId: "user-a" }, load);

  assert.notStrictEqual(community, own);
  assert.deepEqual(loads, [missionId, missionId]);
  assert.strictEqual(
    await getMissionExperiencePool(missionId, { kind: "community" }, load),
    community,
  );
  assert.strictEqual(
    await getMissionExperiencePool(missionId, { kind: "own", userId: "user-a" }, load),
    own,
  );
  assert.equal(loads.length, 2);
});

test("NavigationPrefetch warms Pack routes immediately and batches historical dates", () => {
  const source = readFileSync(new URL("../features/navigation/components/NavigationPrefetch.tsx", import.meta.url), "utf8");
  assert.match(source, /prefetchPackRoutes\(router, packs, keepWarm\)/);
  assert.match(source, /prefetchCompletedRoutes\(router, plan\.priorityRoutes, keepWarm\)/);
  assert.match(source, /scheduleHistoricalBatch\(0\)/);
  assert.match(source, /requestIdleCallback|setTimeout/);
});

test("completed routes reject invalid dates and prioritize the adjacent calendar months", () => {
  assert.equal(getCompletedDayRoute("2026-02-30"), null);
  assert.deepEqual(getCompletedDayRoutes(["2026-09-03", "bad", "2026-09-03"]), ["/completed/2026-09-03"]);
  const dates = ["2026-07-11", "2026-08-31", "2026-09-03", "2026-10-01", "2026-11-04", "2026-02-12"];
  assert.deepEqual(getPriorityCompletedDates(dates, new Date(2026, 8, 3)), [
    "2026-08-31", "2026-09-03", "2026-10-01",
  ]);
  const plan = createCompletedRoutePrefetchPlan(dates, new Date(2026, 8, 3));
  assert.deepEqual(plan.priorityRoutes, [
    "/completed/2026-08-31", "/completed/2026-09-03", "/completed/2026-10-01",
  ]);
  assert.deepEqual(plan.historicalRoutes, ["/completed/2026-02-12", "/completed/2026-07-11", "/completed/2026-11-04"]);
});

test("historical completed routes are batched without an unbounded request burst", () => {
  const routes = Array.from({ length: 17 }, (_, index) => `/completed/2026-01-${String(index + 1).padStart(2, "0")}`);
  assert.deepEqual(batchRoutes(routes, 8).map((batch) => batch.length), [8, 8, 1]);
  assert.deepEqual(batchRoutes(routes, 0), []);
});

test("session snapshot seeds server data and records Take Pack only after success", () => {
  resetSessionSnapshotForTests();
  initializeSessionSnapshot("user-a", {
    joinedPackIds: ["pack-a"],
    completedDates: ["2026-09-02"],
  });
  assert.deepEqual(getSessionSnapshot(), {
    userId: "user-a",
    joinedPackIds: ["pack-a"],
    completedMissionIds: [],
    completedDates: ["2026-09-02"],
    completionCountsByPack: {},
  });

  addJoinedPack("pack-b", "user-a");
  addJoinedPack("pack-b", "user-a");
  assert.deepEqual(getSessionSnapshot().joinedPackIds, ["pack-a", "pack-b"]);
});

test("successful Mission completion updates date and Pack count exactly once", () => {
  addMissionCompletion({
    userId: "user-a", missionId: "mission-a", packId: "pack-a", completedLocalDate: "2026-09-03",
  });
  addMissionCompletion({
    userId: "user-a", missionId: "mission-a", packId: "pack-a", completedLocalDate: "2026-09-03",
  });
  assert.deepEqual(getSessionSnapshot().completedMissionIds, ["mission-a"]);
  assert.deepEqual(getSessionSnapshot().completedDates, ["2026-09-02", "2026-09-03"]);
  assert.deepEqual(getSessionSnapshot().completionCountsByPack, { "pack-a": 1 });
});

test("changing Auth identity replaces the previous user's snapshot and logout clears it", () => {
  initializeSessionSnapshot("user-b", { joinedPackIds: ["pack-b"], completedDates: ["2026-09-04"] });
  assert.equal(getSessionSnapshot().userId, "user-b");
  assert.deepEqual(getSessionSnapshot().joinedPackIds, ["pack-b"]);
  assert.deepEqual(getSessionSnapshot().completedDates, ["2026-09-04"]);

  clearSessionSnapshot();
  assert.deepEqual(getSessionSnapshot(), {
    userId: null,
    joinedPackIds: [],
    completedMissionIds: [],
    completedDates: [],
    completionCountsByPack: {},
  });
});
