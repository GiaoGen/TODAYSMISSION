import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getMissionAudioFormat,
  getSupportedMissionAudioFormat,
  MISSION_AUDIO_FORMATS,
  MISSION_AUDIO_MAX_BYTES,
  MISSION_AUDIO_MAX_DURATION_MS,
  MISSION_AUDIO_MIN_DURATION_MS,
} from "../features/missions/model/mission-audio.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260902064257_create_mission_voices.sql");
const actions = read("features/missions/actions.ts");
const actionLayer = read("features/missions/components/MissionActionLayer.tsx");
const recorder = read("features/missions/components/MissionProofRecorder.tsx");
const listener = read("features/missions/components/MissionVoiceListener.tsx");
const repository = read("data/repositories/get-mission-voices.ts");

test("Mission Voice audio stays within the same explicit allowlist and limits", () => {
  assert.deepEqual(MISSION_AUDIO_FORMATS, [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp4", extension: "mp4" },
  ]);
  assert.deepEqual(getSupportedMissionAudioFormat(mimeType => mimeType === "audio/mp4"), {
    mimeType: "audio/mp4",
    extension: "mp4",
  });
  assert.equal(getMissionAudioFormat("audio/ogg"), null);
  assert.equal(MISSION_AUDIO_MAX_BYTES, 10 * 1024 * 1024);
  assert.equal(MISSION_AUDIO_MAX_DURATION_MS, 120_000);
  assert.equal(MISSION_AUDIO_MIN_DURATION_MS, 1_000);
});

test("mission_voices schema is minimal and unpublished by default", () => {
  for (const field of ["id", "user_id", "mission_id", "storage_path", "is_published", "created_at"]) {
    assert.match(migration, new RegExp(`\\b${field}\\b`));
  }
  assert.match(migration, /unique \(user_id, mission_id\)/);
  assert.match(migration, /is_published boolean not null default false/);
  for (const forbiddenField of ["title", "text body", "likes", "nickname", "avatar", "play count", "comments"]) {
    assert.doesNotMatch(migration, new RegExp(`\\b${forbiddenField}\\b`, "i"));
  }
});

test("Mission Voice table has published-only joined SELECT and no client writes", () => {
  assert.match(migration, /alter table public\.mission_voices enable row level security/);
  assert.match(migration, /grant select \(id, mission_id, storage_path, is_published, created_at\)/);
  assert.match(migration, /is_published\n\s+and exists/);
  assert.match(migration, /revoke all privileges on table public\.mission_voices from anon, authenticated/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete).*mission_voices/i);
});

test("Mission Voice Storage is independent, private, and does not gate INSERT on metadata", () => {
  assert.match(migration, /'mission-voices',\n\s+'mission-voices',\n\s+false,\n\s+10485760/);
  assert.match(migration, /array\['audio\/webm', 'audio\/webm;codecs=opus', 'audio\/mp4'\]/);
  const insertPolicy = migration.match(/create policy "Permanent users can upload their own mission voices"[\s\S]*?;\n\ncreate policy/);
  assert.ok(insertPolicy);
  assert.match(insertPolicy[0], /for insert\n\s+to authenticated/);
  assert.match(insertPolicy[0], /storage\.foldername\(name\)\)\[1\]/);
  assert.doesNotMatch(insertPolicy[0], /metadata|mimetype|size/);
  assert.doesNotMatch(insertPolicy[0], /upsert/i);
  assert.match(migration, /create policy "Joined users can read published Mission voices"/);
});

test("incomplete Mission prepares its audio Experience before completion", () => {
  assert.match(actions, /createMissionExperienceAudioUploadTarget/);
  assert.match(actions, /active_mission_id/);
  assert.match(actions, /Take this Mission before completing it/);
  assert.match(actions, /get_my_mission_voice_statuses/);
  assert.match(actions, /pathBase: `\$\{user\.id\}\/\$\{missionId\}\/\$\{crypto\.randomUUID\(\)\}`/);
});

test("Audio completion owns the Experience insert and keeps publication server-owned", () => {
  assert.match(actions, /completeMissionWithAudioAction/);
  assert.match(actions, /p_storage_path: audioPath/);
  assert.match(recorder, /createMissionExperienceAudioUploadTarget/);
  assert.match(recorder, /completeMissionWithAudioAction/);
  assert.doesNotMatch(actions, /submitMissionVoiceAction|rpc\("submit_mission_voice"/);
  assert.doesNotMatch(actions, /p_is_published|is_published\s*:/);
});

test("Mission completion recorder uploads to the Experience bucket without upsert", () => {
  assert.match(recorder, /createMissionExperienceAudioUploadTarget/);
  assert.match(recorder, /from\("mission-voices"\)/);
  assert.match(recorder, /upsert: false/);
  assert.match(recorder, /completeMissionWithAudioAction/);
  assert.doesNotMatch(recorder, /mission-proofs/);
});

test("the normal incomplete action area no longer keeps Mission Voice listening controls", () => {
  assert.doesNotMatch(actionLayer, /I am nervous|MissionVoiceListener|nervousOpen/);
  assert.doesNotMatch(actionLayer, /MissionVoiceRecorder|voiceRecorderOpen|Share what it was like|Submitted for review|> Completed/);
  assert.doesNotMatch(actions, /submitMissionVoiceAction|createMissionVoiceUploadTarget/);
  assert.match(actionLayer, /MissionCompleteSlider/);
  assert.match(actionLayer, /try another/);
  assert.match(actionLayer, /completionRequested \?/);
});

test("published voice repository verifies access, limits results, and returns signed URLs only", () => {
  assert.match(repository, /\.from\("missions"\)[\s\S]*\.eq\("is_published", true\)/);
  assert.match(repository, /\.from\("packs"\)[\s\S]*\.eq\("is_published", true\)/);
  assert.match(repository, /pack_memberships/);
  assert.match(repository, /eq\("is_published", true\)/);
  assert.match(repository, /limit\(5\)/);
  assert.match(repository, /createSignedUrl\(/);
  assert.match(repository, /signedPlaybackUrl/);
  assert.doesNotMatch(listener, /storage_path|user_id|email/);
  assert.doesNotMatch(listener, /autoPlay|autoplay/);
});

test("Mission switching remounts the current action state and recorders still clean up", () => {
  const packDetail = read("features/packs/components/MissionPackDetail.tsx");
  assert.match(packDetail, /key={activeMission\.id}/);
  assert.match(packDetail, /completionRequestedMissionIds\.has\(activeMission\.id\)/);
  assert.doesNotMatch(packDetail, /setCompletionRequestedMissionId\(null\)/);
  assert.match(listener, /audio\?\.pause\(\)/);
  assert.match(recorder, /track\.stop\(\)/);
  assert.match(recorder, /URL\.revokeObjectURL/);
});
