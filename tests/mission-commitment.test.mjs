import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const packDetail = read("features/packs/components/MissionPackDetail.tsx");
const actionLayer = read("features/missions/components/MissionActionLayer.tsx");
const gallery = read("features/packs/components/MissionGallery.tsx");
const nativeGallery = read("features/packs/model/native-mission-gallery.ts");
const nativeController = read("features/packs/model/native-scroll-controller.ts");
const galleryCss = read("features/packs/components/MissionGallery.module.css");
const actionCss = read("features/missions/components/MissionActionLayer.module.css");
const calendarPage = read("app/completed/[date]/page.tsx");

test("Pack Detail keeps the original Pack Mission order and removes browsing boundaries", () => {
  assert.match(packDetail, /missions=\{pack\.missions\}/);
  assert.doesNotMatch(packDetail, /getPackMissionView|getMissionBrowsingPermission|manualBrowsing|mission-selection/);
  assert.doesNotMatch(gallery, /manualBrowsing|selectionMissionIds|initialMissionId|missionNumbers|getNextIncomplete/);
  assert.doesNotMatch(nativeGallery, /manualBrowsing|selectionMissionIds|getNextIncomplete/);
  assert.doesNotMatch(nativeController, /manualBrowsing|blockUserScroll/);
});

test("Take is a client-only commitment that gates the existing completion flow", () => {
  assert.match(packDetail, /committedMissionId/);
  assert.match(packDetail, /committedMissionIdRef\.current = missionId/);
  assert.match(packDetail, /galleryInteractionLockRef\.current\?\.\(true\)/);
  const commitBlock = packDetail.slice(packDetail.indexOf("const commitMission"), packDetail.indexOf("const handleInteractionLockReady"));
  assert.doesNotMatch(commitBlock, /rpc\(|fetch\(|localStorage|sessionStorage/);
  assert.match(actionLayer, /committed: boolean/);
  assert.match(actionLayer, />take this mission</);
  assert.match(actionLayer, /committed && completionRequested/);
  assert.match(actionLayer, /committed \?/);
  assert.match(actionCss, /\.takeMission[\s\S]*height: var\(--tm-capsule-height\)/);
  assert.match(actionCss, /\.takeMission[\s\S]*border-radius: 999px/);
});

test("Hard lock cancels transform motion and disables native input without scroll reversion", () => {
  assert.match(gallery, /const setInteractionLocked = \(locked: boolean\)/);
  assert.match(gallery, /cancelAnimationFrame\(animationFrame\)/);
  assert.match(gallery, /pointerId = null/);
  assert.match(gallery, /root\.dataset\.dragging = "false"/);
  assert.match(nativeGallery, /const setInteractionLocked = \(locked: boolean\)/);
  assert.match(nativeController, /setInteractionLocked\(nextLocked: boolean\)/);
  assert.match(nativeController, /const snappedLeft = [\s\S]*?jump\(snappedLeft\)/);
  assert.match(galleryCss, /data-interaction-locked="true"\] \.scrollViewport[\s\S]*overflow-x: hidden/);
});

test("Commitment hides Try another, completion unlocks, and Calendar remains independent", () => {
  const committedStart = actionLayer.indexOf(") : committed ?");
  const uncommittedStart = actionLayer.indexOf(") : (", committedStart);
  const committedBranch = actionLayer.slice(committedStart, uncommittedStart);
  assert.doesNotMatch(committedBranch, /try another/);
  assert.match(packDetail, /releaseMissionCommitment\(\)/);
  assert.match(packDetail, /onCompleted=\{\(completedLocalDate\) => handleCompleted/);
  assert.doesNotMatch(calendarPage, /take this mission|committedMissionId/);
});
