import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { localDateKey, parseDateKey } from "../features/calendar/model/calendar-month.ts";
import { getCompletedMissionCount } from "../features/packs/model/pack-progress.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260902102721_add_completion_local_date.sql");
const calendarRepository = read("data/repositories/get-mission-calendar.ts");
const historyRepository = read("data/repositories/get-completed-missions.ts");
const actions = read("features/missions/actions.ts");
const proofRecorder = read("features/missions/components/MissionProofRecorder.tsx");
const home = read("app/page.tsx");
const completedPage = read("app/completed/[date]/page.tsx");
const packDetail = read("features/packs/components/MissionPackDetail.tsx");

test("browser local date uses local calendar fields and rejects malformed dates", () => {
  assert.equal(localDateKey(new Date(2026, 8, 2, 23, 59)), "2026-09-02");
  assert.ok(parseDateKey("2026-09-02"));
  assert.equal(parseDateKey("2026-02-30"), null);
  assert.doesNotMatch(proofRecorder, /toISOString\(\)\.slice\(0,\s*10\)/);
  assert.match(proofRecorder, /localDateKey\(new Date\(\)\)/);
});

test("completion local date migration backfills UTC best effort and keeps proof data", () => {
  assert.match(migration, /add column completed_local_date date/);
  assert.match(migration, /historical timezone information was unavailable/i);
  assert.match(migration, /completed_at at time zone 'UTC'/);
  assert.match(migration, /alter column completed_local_date set not null/);
  assert.match(migration, /drop function public\.complete_mission_with_audio\(uuid, text\)/);
  assert.match(migration, /p_completed_local_date date/);
  assert.match(migration, /p_completed_local_date < current_date - 1/);
  assert.match(migration, /p_completed_local_date > current_date \+ 1/);
  assert.match(migration, /completed_at, completed_local_date/);
  assert.match(migration, /completed_local_date, proof_path/);
  assert.doesNotMatch(migration, /update public\.mission_completions[\s\S]*completed_at\s*=/);
  assert.doesNotMatch(migration, /update public\.mission_completions[\s\S]*proof_path\s*=/);
});

test("completion action sends local date and revalidates only affected routes", () => {
  assert.match(actions, /completedLocalDate: string/);
  assert.match(actions, /p_completed_local_date: completedLocalDate/);
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(actions, /revalidatePath\(`\/completed\/\$\{completion\.completed_local_date\}`\)/);
  assert.match(proofRecorder, /completeMissionWithAudioAction\([\s\S]*localDateKey\(new Date\(\)\)/);
});

test("calendar repository returns unique sorted local dates without proof paths", () => {
  assert.match(calendarRepository, /from\("mission_completions"\)/);
  assert.match(calendarRepository, /select\("completed_local_date"\)/);
  assert.match(calendarRepository, /new Set\(data\.map/);
  assert.match(calendarRepository, /completedOn: \[\.\.\.new Set/);
  assert.match(calendarRepository, /if \(!user\) return \{ registeredOn, completedOn: \[\] \}/);
  assert.doesNotMatch(calendarRepository, /proof_path/);
});

test("completed day repository filters by local date and preserves completion order", () => {
  assert.match(historyRepository, /from\("mission_completions"\)/);
  assert.match(historyRepository, /completed_local_date/);
  assert.match(historyRepository, /eq\("completed_local_date", date\)/);
  assert.match(historyRepository, /order\("completed_at", \{ ascending: true \}\)/);
  assert.match(historyRepository, /missions!mission_completions_mission_id_fkey/);
  assert.doesNotMatch(historyRepository, /proof_path|mission-proofs|mission-voices|storage\.objects/);
});

test("completed day route is private runtime data and uses the existing MissionGallery", () => {
  assert.doesNotMatch(completedPage, /generateStaticParams/);
  assert.match(completedPage, /getCurrentUser/);
  assert.match(completedPage, /redirect\(`\/login\?next=\$\{encodeURIComponent/);
  assert.match(completedPage, /getDayGalleryId\(day\.date\)/);
  assert.match(completedPage, /title=\{`\$\{day\.date\} Completed Missions`\}/);
  assert.match(completedPage, /completedDate=\{day\.date\}/);
  assert.match(completedPage, /if \(!day\) notFound\(\)/);
});

test("Pack progress is derived from completion state and updates without persistence", () => {
  assert.equal(getCompletedMissionCount({}), 0);
  assert.equal(getCompletedMissionCount({ one: "completed", two: "incomplete", three: "completed" }), 2);
  assert.equal(getCompletedMissionCount({ one: "completed", two: "completed", three: "completed" }), 3);
  const before = { one: "completed", two: "incomplete" };
  const after = { ...before, two: "completed" };
  assert.equal(getCompletedMissionCount(after), getCompletedMissionCount(before) + 1);
  assert.match(packDetail, /getCompletedMissionCount\(missionCompletionStatuses\)/);
  assert.match(packDetail, /completedMissionCount=\{completedMissionCount\}/);
  assert.doesNotMatch(packDetail, /pack_progress|progress_table|fetch\(/i);
});

test("homepage passes real calendar data while preserving the existing carousel entry", () => {
  assert.match(home, /getMissionCalendar\(currentUser\)/);
  assert.match(home, /calendar=\{calendar\}/);
  assert.match(home, /Promise\.all\(\[joinedPacksPromise, calendarPromise\]\)/);
  assert.doesNotMatch(home, /completedOn:\s*\[\]/);
});
