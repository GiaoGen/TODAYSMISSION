import assert from "node:assert/strict";
import test from "node:test";

import {
  getInitialMissionIndex,
  getIncompleteMissionIndexes,
  getMissionBrowsingMode,
  getNextIncompleteMissionIndex,
} from "../features/packs/model/mission-selection.ts";

const ids = ["A", "B", "C", "D", "E"];
const partial = { A: "incomplete", B: "completed", C: "incomplete", D: "completed", E: "incomplete" };

test("next incomplete selection skips completed Missions and wraps in stable Pack order", () => {
  assert.deepEqual(getIncompleteMissionIndexes(ids, partial), [0, 2, 4]);
  assert.equal(getNextIncompleteMissionIndex(0, ids, partial), 2);
  assert.equal(getNextIncompleteMissionIndex(2, ids, partial), 4);
  assert.equal(getNextIncompleteMissionIndex(4, ids, partial), 0);
  assert.equal(getNextIncompleteMissionIndex(1, ids, partial), 2, "a completed current slot advances to the next incomplete Mission");
});

test("one incomplete Mission has no alternative, while all completed has no controlled target", () => {
  const one = { A: "completed", B: "incomplete", C: "completed" };
  const all = { A: "completed", B: "completed", C: "completed" };
  assert.equal(getNextIncompleteMissionIndex(1, Object.keys(one), one), null);
  assert.equal(getNextIncompleteMissionIndex(0, Object.keys(one), one), 1, "an unexpected completed current slot can recover to the only incomplete Mission");
  assert.equal(getNextIncompleteMissionIndex(0, Object.keys(all), all), null);
});

test("initial Pack Mission prefers the first incomplete slot and falls back to the first card", () => {
  assert.equal(getInitialMissionIndex(["A", "B", "C", "D"], { A: "completed", B: "completed", C: "incomplete", D: "incomplete" }), 2);
  assert.equal(getInitialMissionIndex(["A", "B"], { A: "completed", B: "completed" }), 0);
});

test("Pack and Completed Day browsing modes remain separate", () => {
  assert.equal(getMissionBrowsingMode({ isJoined: true, completedMissionCount: 1, missionCount: 3 }), "controlled");
  assert.equal(getMissionBrowsingMode({ isJoined: false, completedMissionCount: 3, missionCount: 3 }), "controlled");
  assert.equal(getMissionBrowsingMode({ isJoined: true, completedMissionCount: 3, missionCount: 3 }), "free");
  assert.equal(getMissionBrowsingMode({ completedDate: true, isJoined: false, completedMissionCount: 0, missionCount: 0 }), "free");
});
