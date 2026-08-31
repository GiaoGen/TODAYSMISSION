import assert from "node:assert/strict";
import test from "node:test";

import {
  completeMission,
  getCompletionOutcome,
  getMissionLoginDestination,
  MISSION_COMPLETION_THRESHOLD,
  takeMission,
} from "../features/missions/model/mission-action-state.ts";

test("Mission action state moves from available to taken to completed", () => {
  assert.equal(takeMission("available"), "taken");
  assert.equal(completeMission("taken"), "completed");
});

test("Mission action state does not skip or repeat transitions", () => {
  assert.equal(completeMission("available"), "available");
  assert.equal(takeMission("completed"), "completed");
  assert.equal(completeMission("completed"), "completed");
});

test("completion only confirms at the threshold and resets below it", () => {
  assert.equal(getCompletionOutcome(MISSION_COMPLETION_THRESHOLD), "complete");
  assert.equal(getCompletionOutcome(MISSION_COMPLETION_THRESHOLD - 0.01), "reset");
});

test("Guest Take uses the current Pack login destination", () => {
  assert.equal(getMissionLoginDestination("go-alone"), "/login?next=%2Fpack%2Fgo-alone");
});
