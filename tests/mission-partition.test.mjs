import assert from "node:assert/strict";
import test from "node:test";

import {
  getMissionBrowsingPermission,
  getNextIncompleteMissionIndex,
  getPackMissionView,
} from "../features/packs/model/mission-selection.ts";

const ids = ["A", "B", "C", "D", "E"];
const statuses = { A: "completed", B: "completed", C: "incomplete", D: "incomplete", E: "incomplete" };

test("partial Pack partitions completed Missions left and selected incomplete at the boundary", () => {
  assert.deepEqual(getPackMissionView(ids, statuses, "C"), {
    displayMissionIds: ["A", "B", "C", "D", "E"],
    completedMissionIds: ["A", "B"],
    incompleteMissionIds: ["C", "D", "E"],
    selectedMissionId: "C",
    boundaryIndex: 2,
  });
  assert.deepEqual(getPackMissionView(ids, statuses, "D").displayMissionIds, ["A", "B", "D", "C", "E"]);
  assert.deepEqual(getPackMissionView(ids, statuses, "D").completedMissionIds, ["A", "B"]);
});

test("Try another follows stable original incomplete order even after the display is reordered", () => {
  assert.equal(getNextIncompleteMissionIndex(2, ids, statuses), 3);
  assert.equal(getNextIncompleteMissionIndex(3, ids, statuses), 4);
  assert.equal(getNextIncompleteMissionIndex(4, ids, statuses), 2);
});

test("completion hand-off keeps the completed card at the boundary until auto-advance", () => {
  const afterCompletion = { ...statuses, C: "completed" };
  const view = getPackMissionView(ids, afterCompletion, "C");
  assert.deepEqual(view.displayMissionIds, ["A", "B", "C", "D", "E"]);
  assert.deepEqual(view.completedMissionIds, ["A", "B"]);
  assert.equal(view.boundaryIndex, 2);
});

test("all-completed Packs unlock free browsing while Calendar is always free", () => {
  const all = Object.fromEntries(ids.map((id) => [id, "completed"]));
  assert.deepEqual(getPackMissionView(ids, all, "C").displayMissionIds, ids);
  assert.deepEqual(getMissionBrowsingPermission({ isJoined: true, completedMissionCount: 5, missionCount: 5, boundaryIndex: 4 }), { mode: "free" });
  assert.deepEqual(getMissionBrowsingPermission({ isJoined: false, completedMissionCount: 5, missionCount: 5, boundaryIndex: 4 }), { mode: "bounded", minIndex: 0, maxIndex: 4 });
  assert.deepEqual(getMissionBrowsingPermission({ completedDate: true, isJoined: false, completedMissionCount: 0, missionCount: 0, boundaryIndex: 0 }), { mode: "free" });
});
