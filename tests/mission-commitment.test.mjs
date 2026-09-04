import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const packDetail = read("features/packs/components/MissionPackDetail.tsx");
const packActions = read("features/packs/actions.ts");
const actionLayer = read("features/missions/components/MissionActionLayer.tsx");
const gallery = read("features/packs/components/MissionGallery.tsx");
const nativeGallery = read("features/packs/model/native-mission-gallery.ts");
const nativeController = read("features/packs/model/native-scroll-controller.ts");
const galleryCss = read("features/packs/components/MissionGallery.module.css");
const actionCss = read("features/missions/components/MissionActionLayer.module.css");
const calendarPage = read("app/completed/[date]/page.tsx");
const packPage = read("app/pack/[slug]/page.tsx");
const membershipRepository = read("data/repositories/get-pack-memberships.ts");
const migration = read("supabase/migrations/20260904100746_persist_active_mission_commitment.sql");
const indexMigration = read("supabase/migrations/20260904100913_add_active_mission_commitment_index.sql");

test("Pack Detail keeps the original Pack Mission order and removes browsing boundaries", () => {
  assert.match(packDetail, /missions=\{pack\.missions\}/);
  assert.doesNotMatch(packDetail, /getPackMissionView|getMissionBrowsingPermission|manualBrowsing|mission-selection/);
  assert.doesNotMatch(gallery, /manualBrowsing|selectionMissionIds|missionNumbers|getNextIncomplete/);
  assert.doesNotMatch(nativeGallery, /manualBrowsing|selectionMissionIds|getNextIncomplete/);
  assert.doesNotMatch(nativeController, /manualBrowsing|blockUserScroll/);
});

test("Take persists one membership commitment and restores it on re-entry", () => {
  assert.match(migration, /alter table public\.pack_memberships[\s\S]*add column active_mission_id uuid null/);
  assert.match(migration, /foreign key \(active_mission_id, pack_id\)[\s\S]*references public\.missions \(id, pack_id\)/);
  assert.match(migration, /create or replace function public\.take_mission\(/);
  assert.match(migration, /membership\.active_mission_id is null/);
  assert.match(migration, /Another Mission is already active for this Pack/);
  assert.match(packActions, /supabase\.rpc\("take_mission"/);
  assert.match(packActions, /p_pack_id: packId/);
  assert.match(packActions, /p_mission_id: missionId/);
  assert.match(membershipRepository, /select\("active_mission_id,pack_id,joined_at"\)/);
  assert.match(packPage, /initialActiveMissionId=\{membership\?\.activeMissionId \?\? null\}/);
  assert.match(packDetail, /initialActiveMissionId/);
  assert.doesNotMatch(packDetail, /missionTaken|localStorage|sessionStorage/);
});

test("Take gates the existing completion flow without changing proof UI", () => {
  assert.match(packDetail, /committedMissionId/);
  assert.match(packDetail, /takeMissionAction\(pack\.id, missionId\)/);
  assert.match(actionLayer, /committed: boolean/);
  assert.match(actionLayer, /committing: boolean/);
  assert.match(actionLayer, /take this mission/);
  assert.match(actionLayer, /committed && completionRequested/);
  assert.match(actionLayer, /committed \?/);
  assert.match(actionCss, /\.takeMission[\s\S]*height: var\(--tm-capsule-height\)/);
  assert.match(actionCss, /\.takeMission[\s\S]*border-radius: 999px/);
  assert.match(actionCss, /\.takeMission[\s\S]*background: var\(--tm-accent\)/);
});

test("Hard lock cancels motion, blocks navigation input, and keeps blank return available", () => {
  assert.match(gallery, /const setInteractionLocked = \(locked: boolean\)/);
  assert.match(gallery, /cancelAnimationFrame\(animationFrame\)/);
  assert.match(gallery, /pointerId = null/);
  assert.match(gallery, /root\.dataset\.dragging = "false"/);
  assert.match(nativeGallery, /const setInteractionLocked = \(locked: boolean\)/);
  assert.match(nativeGallery, /root\.dataset\.interactionLocked !== "true" && !controller\?\.canActivate\(\)/);
  assert.match(nativeController, /setInteractionLocked\(nextLocked: boolean\)/);
  assert.match(nativeController, /const snappedLeft = [\s\S]*?jump\(snappedLeft\)/);
  assert.match(galleryCss, /data-interaction-locked="true"\] \.scrollViewport[\s\S]*overflow-x: hidden/);
});

test("Completion clears the membership lock atomically for Audio and Text", () => {
  assert.match(migration, /create constraint trigger mission_completions_clear_active_mission/);
  assert.match(migration, /after insert on public\.mission_completions/);
  assert.match(migration, /v_active_mission_id is distinct from new\.mission_id/);
  assert.match(migration, /set active_mission_id = null/);
  assert.match(packDetail, /releaseMissionCommitment\(\)/);
  assert.match(packDetail, /onCompleted=\{\(completedLocalDate\) => handleCompleted/);
  assert.doesNotMatch(calendarPage, /take this mission|committedMissionId/);
  assert.match(indexMigration, /pack_memberships_active_mission_pack_idx/);
});
