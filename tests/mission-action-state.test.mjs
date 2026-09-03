import assert from "node:assert/strict";
import test from "node:test";

import {
  getCompletionOutcome,
  getInitialMissionCompletionStatuses,
  getMissionSliderTravel,
  MISSION_COMPLETION_THRESHOLD,
  MISSION_SLIDER_INSET,
  MISSION_SLIDER_THUMB_SIZE,
} from "../features/missions/model/mission-action-state.ts";
import { getPackLoginDestination } from "../features/packs/model/pack-action-state.ts";
import {
  getMissionProofFormat,
  getSupportedMissionProofFormat,
  MISSION_PROOF_MAX_BYTES,
  MISSION_PROOF_MAX_DURATION_MS,
  MISSION_PROOF_MIN_DURATION_MS,
} from "../features/missions/model/mission-proof.ts";

test("initial Mission completion statuses map missing and completed records", () => {
  assert.deepEqual(
    getInitialMissionCompletionStatuses(["mission-1", "mission-2", "mission-3"], {
      "mission-2": {
        completedAt: "2026-08-31T00:00:00.000Z",
        missionId: "mission-2",
      },
    }),
    { "mission-1": "incomplete", "mission-2": "completed", "mission-3": "incomplete" },
  );
});

test("completion requests audio proof at the threshold", () => {
  assert.equal(getCompletionOutcome(MISSION_COMPLETION_THRESHOLD), "request");
  assert.equal(getCompletionOutcome(MISSION_COMPLETION_THRESHOLD - 0.01), "reset");
});

test("completion slider travel keeps the circular thumb fully inside the track", () => {
  assert.equal(MISSION_SLIDER_THUMB_SIZE, 56);
  assert.equal(MISSION_SLIDER_INSET, 6);
  assert.equal(getMissionSliderTravel(240), 172);
  assert.equal(getMissionSliderTravel(MISSION_SLIDER_THUMB_SIZE), 0);
  assert.equal(0 * getMissionSliderTravel(240), 0);
  assert.equal(
    MISSION_SLIDER_INSET + getMissionSliderTravel(240) + MISSION_SLIDER_THUMB_SIZE + MISSION_SLIDER_INSET,
    240,
  );
});

test("Guest Pack Take uses the current Pack login destination", () => {
  assert.equal(getPackLoginDestination("go-alone"), "/login?next=%2Fpack%2Fgo-alone");
});

test("Mission proof format negotiation stays within the explicit audio allowlist", () => {
  assert.deepEqual(
    getSupportedMissionProofFormat((mimeType) => mimeType === "audio/mp4"),
    { mimeType: "audio/mp4", extension: "mp4" },
  );
  assert.equal(getSupportedMissionProofFormat(() => false), null);
  assert.deepEqual(getMissionProofFormat("audio/webm;codecs=opus"), {
    mimeType: "audio/webm;codecs=opus",
    extension: "webm",
  });
  assert.equal(getMissionProofFormat("audio/ogg"), null);
});

test("Mission proof limits match the private bucket boundary", () => {
  assert.equal(MISSION_PROOF_MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(MISSION_PROOF_MAX_DURATION_MS, 120_000);
  assert.equal(MISSION_PROOF_MIN_DURATION_MS, 1_000);
});
