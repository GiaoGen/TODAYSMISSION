import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidMissionTextProof,
  MISSION_TEXT_PROOF_MAX_LENGTH,
  normalizeMissionTextProof,
} from "../features/missions/model/mission-text-proof.ts";

test("text proof trims valid input and rejects empty or whitespace-only input", () => {
  assert.equal(normalizeMissionTextProof("  What happened?  "), "What happened?");
  assert.equal(normalizeMissionTextProof(""), null);
  assert.equal(normalizeMissionTextProof("   \n\t"), null);
  assert.equal(isValidMissionTextProof("x"), true);
});

test("text proof accepts exactly one and 1000 characters, but rejects 1001", () => {
  assert.equal(normalizeMissionTextProof("x"), "x");
  assert.equal(normalizeMissionTextProof("x".repeat(MISSION_TEXT_PROOF_MAX_LENGTH))?.length, 1000);
  assert.equal(normalizeMissionTextProof("x".repeat(MISSION_TEXT_PROOF_MAX_LENGTH + 1)), null);
});
