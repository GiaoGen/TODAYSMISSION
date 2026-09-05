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
const actionLayer = read("features/missions/components/MissionActionLayer.tsx");
const slider = read("features/missions/components/MissionCompleteSlider.tsx");
const proofStyles = read("features/missions/components/MissionActionLayer.module.css");
const confetti = read("features/missions/components/MissionCompletionConfetti.tsx");
const gallery = read("features/packs/components/MissionGallery.tsx");
const galleryCss = read("features/packs/components/MissionGallery.module.css");
const nativeGallery = read("features/packs/model/native-mission-gallery.ts");
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
  assert.doesNotMatch(actions, /revalidatePath\("\/"\)/);
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
  assert.match(completedPage, /CompletedMissionGallery/);
  assert.match(completedPage, /date=\{day\.date\}/);
  assert.match(read("features/packs/components/CompletedMissionGallery.tsx"), /completedDate=\{date\}/);
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
  assert.match(packDetail, /completedMissionCount=\{packJoined \? completedMissionCount : undefined\}/);
  assert.match(packDetail, /gallerySettled && currentStatus !== "completed"/);
  assert.match(read("features/packs/components/MissionGallery.tsx"), /className=\{styles\.packProgress\}/);
  assert.doesNotMatch(packDetail, /pack_progress|progress_table|fetch\(/i);
});

test("slider progress directly drives the matching completion face and resets on cancellation", () => {
  assert.match(slider, /onProgressChangeRef\.current\(next\)/);
  assert.match(slider, /animateTo\(finish \? 1 : 0, finish\)/);
  assert.match(gallery, /data-completion-mission-id=\{mission\.id\}/);
  assert.match(gallery, /setProperty\("--completion-card-y"/);
  assert.match(galleryCss, /var\(--completion-card-y, -100%\)/);
  assert.match(gallery, /missionCompletionStatuses\?\.\[mission\.id\] === "completed"/);
});

test("completion audio experience keeps real recording, preview and upload in the shared capsule", () => {
  assert.match(proofRecorder, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(proofRecorder, /new MediaRecorder/);
  assert.match(proofRecorder, /createAnalyser\(\)/);
  assert.match(proofRecorder, /className=\{styles\.proofWaveform\}/);
  assert.match(proofRecorder, /Upload recording/);
  assert.match(proofRecorder, /Play recording/);
  assert.match(proofRecorder, /\.from\("mission-voices"\)/);
  assert.match(proofRecorder, /createMissionExperienceAudioUploadTarget/);
  assert.match(proofRecorder, /completeMissionWithAudioAction/);
  assert.match(actionLayer, /completionRequested \? \([\s\S]*MissionCompletionProofChooser/);
  assert.match(read("features/missions/components/MissionCompletionProofChooser.tsx"), /MissionProofRecorder/);
  assert.doesNotMatch(actionLayer, /CompletionProofTransition|setTimeout\(/);
  assert.match(proofRecorder, /"requesting"/);
  assert.match(proofRecorder, /startLockRef\.current/);
  assert.match(proofRecorder, /submitLockRef\.current/);
  assert.match(proofRecorder, /state !== "idle" && state !== "recorded"/);
  assert.match(proofRecorder, /Record again/);
  assert.match(proofRecorder, /generationRef\.current = generation/);
  assert.doesNotMatch(proofRecorder, /setState\("idle"\);\s*startRecording/);
});

test("completion action placement reserves a stable auxiliary row and derives its 112px shift from the thumb", () => {
  assert.match(actionLayer, /MISSION_SLIDER_THUMB_SIZE/);
  assert.match(proofStyles, /var\(--tm-thumb-size\) \* 2/);
  assert.match(proofStyles, /var\(--tm-capsule-height\) \+ var\(--tm-auxiliary-gap\) \+ var\(--tm-auxiliary-height\)/);
  assert.match(proofStyles, /env\(safe-area-inset-bottom\)/);
  assert.match(proofStyles, /proofAuxiliary/);
  assert.match(proofStyles, /auxiliaryAction/);
});

test("proof media states lock both Gallery drivers while the pending Record state remains switchable", () => {
  assert.match(proofRecorder, /const locked = state !== "idle"/);
  assert.match(packDetail, /interactionLocked=\{galleryInteractionLocked\}/);
  assert.match(gallery, /data-interaction-locked=\{interactionLocked\}/);
  assert.match(gallery, /root\.dataset\.interactionLocked === "true"/);
  assert.match(nativeGallery, /root\.dataset\.interactionLocked === "true"/);
  assert.match(galleryCss, /data-interaction-locked="true"/);
});

test("completion confetti is a non-interactive viewport Portal driven by one completion event", () => {
  assert.match(confetti, /createPortal/);
  assert.match(confetti, /eventId/);
  assert.match(confetti, /runRef\.current\?\.eventId !== eventId/);
  assert.match(confetti, /CONFETTI_DURATION_MS = 2_000/);
  assert.match(confetti, /REDUCED_CONFETTI_DURATION_MS = 250/);
  assert.match(confetti, /width < 700 \? 80 : 120/);
  assert.match(confetti, /Math\.min\(2, window\.devicePixelRatio/);
  assert.match(proofStyles, /\.confettiCanvas[\s\S]*pointer-events: none/);
  assert.match(packDetail, /setCompletionEventId\(`/);
  assert.doesNotMatch(packDetail, /useEffect\([\s\S]{0,240}setCompletionEventId/);
});

test("homepage passes real calendar data while preserving the existing carousel entry", () => {
  assert.match(home, /getMissionCalendar\(currentUser\)/);
  assert.match(home, /calendar=\{calendar\}/);
  assert.match(home, /Promise\.all\(\[joinedPacksPromise, calendarPromise\]\)/);
  assert.doesNotMatch(home, /completedOn:\s*\[\]/);
});
