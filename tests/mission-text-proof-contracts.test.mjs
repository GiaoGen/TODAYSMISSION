import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260904233301_unify_mission_completion_around_experiences.sql");
const actions = read("features/missions/actions.ts");
const chooser = read("features/missions/components/MissionCompletionProofChooser.tsx");
const proofStyles = read("features/missions/components/MissionActionLayer.module.css");
const completionContract = read("data/contracts/mission-completion.ts");
const calendar = read("data/repositories/get-completed-missions.ts");
const completions = read("data/repositories/get-mission-completions.ts");
const packMembershipStyles = read("features/packs/components/PackMembershipAction.module.css");

test("mission completions contain only completion state and archive old evidence", () => {
  assert.match(migration, /create table public\.mission_completion_legacy_proofs/);
  assert.match(migration, /insert into public\.mission_completion_legacy_proofs/);
  assert.match(migration, /from public\.mission_completions as completion/);
  assert.match(migration, /drop column proof_type/);
  assert.match(migration, /drop column proof_text/);
  assert.match(migration, /drop column proof_path/);
  assert.match(migration, /mission_text_experiences_user_mission_key/);
  assert.doesNotMatch(completionContract, /proof_path|proof_text|proof_type/);
  assert.doesNotMatch(calendar, /proof_path|proof_text|proof_type/);
  assert.doesNotMatch(completions, /proof_path|proof_text|proof_type/);
});

test("Text and Audio completion RPCs atomically create one Experience and one completion", () => {
  const textRpc = migration.slice(migration.indexOf("create or replace function public.complete_mission_with_text"));
  const audioRpc = migration.slice(migration.indexOf("create or replace function public.complete_mission_with_audio"));
  assert.match(textRpc, /p_body text/);
  assert.match(textRpc, /insert into public\.mission_text_experiences/);
  assert.match(textRpc, /on conflict \(user_id, mission_id\) do nothing/);
  assert.match(textRpc, /insert into public\.mission_completions \(user_id, mission_id, completed_local_date\)/);
  assert.match(textRpc, /mission_voices/);
  assert.match(audioRpc, /p_storage_path text/);
  assert.match(audioRpc, /object\.bucket_id = 'mission-voices'/);
  assert.match(audioRpc, /insert into public\.mission_voices/);
  assert.match(audioRpc, /insert into public\.mission_completions \(user_id, mission_id, completed_local_date\)/);
  assert.doesNotMatch(audioRpc, /mission-proofs|proof_path|proof_text|proof_type/);
  assert.match(migration, /for update/);
  assert.match(migration, /mission_completions \(user_id, mission_id, completed_local_date\)/);
});

test("Server Actions submit Experience payloads and the chooser keeps the existing layout", () => {
  assert.match(actions, /completeMissionWithTextAction/);
  assert.match(actions, /p_body: proofText/);
  assert.match(actions, /createMissionExperienceAudioUploadTarget/);
  assert.match(actions, /p_storage_path: audioPath/);
  assert.doesNotMatch(actions, /submitMissionVoiceAction|createMissionVoiceUploadTarget/);
  assert.match(chooser, /maxLength=\{1000\}/);
  assert.match(chooser, /normalizeMissionTextProof/);
  assert.match(chooser, /setMode\("audio"\)/);
  assert.match(chooser, /onCompleted\(completion\.completedLocalDate\)/);
  assert.doesNotMatch(chooser, /mission-proofs|storage/);
  assert.match(chooser, /MISSION EXPERIENCE/);
});

test("text experience card follows the completion card drop and stays borderless", () => {
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
  const chooser = proofStyles.match(/\.proofChooserCapsule \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(chooser, /background: transparent/);
  assert.match(chooser, /border-radius: 0/);
  assert.doesNotMatch(chooser, /padding:/);
});

test("Take this Pack keeps its dimensions and becomes a pill", () => {
  const primary = packMembershipStyles.match(/\.primary \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(primary, /min-height: 48px/);
  assert.match(primary, /border-radius: 999px/);
  assert.doesNotMatch(primary, /width:/);
});
