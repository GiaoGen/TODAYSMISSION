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
const proofStyles = read("features/missions/components/MissionActionLayer.module.css");
const completionContract = read("data/contracts/mission-completion.ts");
const calendar = read("data/repositories/get-completed-missions.ts");
const completions = read("data/repositories/get-mission-completions.ts");
const packMembershipStyles = read("features/packs/components/PackMembershipAction.module.css");

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

test("text proof card follows the completion card drop and stays borderless", () => {
  const textFace = proofStyles.match(/\.textProofFace \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const textCard = proofStyles.match(/\.textProofCard \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const textInput = proofStyles.match(/\.textProofInput \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(textFace, /position: fixed/);
  assert.match(textFace, /top: 50%/);
  assert.match(textFace, /left: 50%/);
  assert.match(textFace, /width: var\(--mission-card-width/);
  assert.match(textFace, /overflow: hidden/);
  assert.match(textCard, /transform: translate3d\(0, -100%, 0\)/);
  assert.match(proofStyles, /@keyframes completionCardDrop[\s\S]*translate3d\(0, 0, 0\)/);
  assert.doesNotMatch(proofStyles, /textProofDrop/);
  assert.match(textInput, /border: 0/);
  assert.match(textInput, /appearance: none/);
  assert.match(textInput, /box-shadow: none/);
  assert.match(proofStyles, /\.proofChooserCapsule \{[\s\S]*background: light-dark\(#c7c7c2, #464642\)/);
});

test("Take this Pack keeps its dimensions and becomes a pill", () => {
  const primary = packMembershipStyles.match(/\.primary \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(primary, /min-height: 48px/);
  assert.match(primary, /border-radius: 999px/);
  assert.doesNotMatch(primary, /width:/);
});
