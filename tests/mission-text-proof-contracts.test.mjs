import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260904090015_add_text_mission_completion_proof.sql");
const actions = read("features/missions/actions.ts");
const chooser = read("features/missions/components/MissionCompletionProofChooser.tsx");
const completionContract = read("data/contracts/mission-completion.ts");
const calendar = read("data/repositories/get-completed-missions.ts");
const completions = read("data/repositories/get-mission-completions.ts");

test("mission completion schema stores exactly one private proof shape", () => {
  assert.match(migration, /add column proof_type text/);
  assert.match(migration, /add column proof_text text null/);
  assert.match(migration, /set proof_type = 'audio'/);
  assert.match(migration, /alter column proof_path drop not null/);
  assert.match(migration, /proof_type = 'audio' and proof_path is not null and proof_text is null/);
  assert.match(migration, /proof_type = 'text'[\s\S]*proof_path is null[\s\S]*proof_text is not null/);
  assert.match(migration, /char_length\(btrim\(proof_text\)\) between 1 and 1000/);
  assert.match(migration, /proof_text = btrim\(proof_text\)/);
});

test("audio keeps the existing RPC contract and text adds an authenticated RPC without storage", () => {
  assert.match(migration, /complete_mission_with_audio\(uuid, text, date\)/);
  assert.match(migration, /proof_path, proof_type, proof_text/);
  assert.match(migration, /values \(v_user_id, p_mission_id, now\(\), p_completed_local_date, p_proof_path, 'audio', null\)/);
  assert.match(migration, /create or replace function public\.complete_mission_with_text/);
  assert.match(migration, /p_proof_text text/);
  assert.match(migration, /v_proof_text text := btrim\(p_proof_text\)/);
  assert.match(migration, /grant execute on function public\.complete_mission_with_text\(uuid, text, date\)\s+to authenticated/);
  assert.match(migration, /revoke all privileges on function public\.complete_mission_with_text\(uuid, text, date\)/);
  assert.doesNotMatch(migration.slice(migration.indexOf("create or replace function public.complete_mission_with_text")), /storage\.objects|mission-proofs/);
});

test("Server Action and chooser share validation, completion and private evidence boundaries", () => {
  assert.match(actions, /completeMissionWithTextAction/);
  assert.match(actions, /complete_mission_with_text/);
  assert.match(actions, /p_proof_text: proofText/);
  assert.doesNotMatch(actions.slice(actions.indexOf("export async function completeMissionWithTextAction")), /userId/);
  assert.match(chooser, /maxLength=\{1000\}/);
  assert.match(chooser, /normalizeMissionTextProof/);
  assert.match(chooser, /setMode\("audio"\)/);
  assert.match(chooser, /onCompleted\(completion\.completedLocalDate\)/);
  assert.doesNotMatch(chooser, /mission-proofs|storage/);
  assert.doesNotMatch(completionContract, /proof_path|proof_text|proof_type/);
  assert.doesNotMatch(calendar, /proof_path|proof_text|proof_type/);
  assert.doesNotMatch(completions, /proof_path|proof_text|proof_type/);
});
