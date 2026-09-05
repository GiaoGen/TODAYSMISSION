import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import {
  canRevealMissionExperience,
  getDeterministicWaveform,
  getMissionExperienceRevealTravel,
  selectMissionExperience,
} from "../features/missions/model/mission-experience.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(path.join(root, file), "utf8");
const experiences = [
  { id: "a", kind: "text", text: "A" },
  { id: "b", kind: "audio", signedPlaybackUrl: "https://example.test/b" },
  { id: "c", kind: "text", text: "C" },
];

test("random selection does not immediately repeat when the pool has alternatives", () => {
  assert.equal(selectMissionExperience(experiences, "a", () => 0)?.id, "b");
  assert.equal(selectMissionExperience(experiences, "b", () => 0)?.id, "a");
  assert.equal(selectMissionExperience([experiences[0]], "a", () => 0)?.id, "a");
  assert.equal(selectMissionExperience([], null), null);
});

test("experience travel is relative to card height and clamps long text", () => {
  const cardHeight = 600;
  assert.equal(getMissionExperienceRevealTravel(cardHeight, "audio"), 200);
  assert.equal(getMissionExperienceRevealTravel(cardHeight, "text", 20), 120);
  assert.ok(getMissionExperienceRevealTravel(cardHeight, "text", 220) > 120);
  assert.equal(getMissionExperienceRevealTravel(cardHeight, "text", 900), 444);
});

test("only an incomplete joined Pack Mission in the settled Pack Gallery is eligible", () => {
  assert.equal(canRevealMissionExperience({ completed: false, completedDay: false, joined: true, settled: true }), true);
  assert.equal(canRevealMissionExperience({ completed: true, completedDay: false, joined: true, settled: true }), false);
  assert.equal(canRevealMissionExperience({ completed: false, completedDay: true, joined: true, settled: true }), false);
  assert.equal(canRevealMissionExperience({ completed: false, completedDay: false, joined: false, settled: true }), false);
});

test("waveforms are deterministic per Experience without decoding audio", () => {
  assert.deepEqual(getDeterministicWaveform("voice-a"), getDeterministicWaveform("voice-a"));
  assert.notDeepEqual(getDeterministicWaveform("voice-a"), getDeterministicWaveform("voice-b"));
  assert.ok(getDeterministicWaveform("voice-a").every((height) => height >= 0.24 && height <= 1));
});

test("public Experience DTO and action never expose contributor or completion-proof fields", () => {
  const contract = read("data/contracts/mission-experience.ts");
  const actions = read("features/missions/actions.ts");
  for (const privateField of ["proof_text", "proof_path", "user_id", "storage_path", "email"]) {
    assert.doesNotMatch(contract, new RegExp(privateField));
    const experienceAction = actions.slice(actions.indexOf("export async function getMissionExperiencesAction"));
    assert.doesNotMatch(experienceAction, new RegExp(privateField));
  }
});

test("one Experience source can fail without hiding the other source", () => {
  const repository = read("data/repositories/get-mission-experiences.ts");
  assert.match(repository, /voiceResult\.error && textResult\.error/);
  assert.match(repository, /voiceResult\.error \? \[\] : \(voiceResult\.data \?\? \[\]\)/);
  assert.match(repository, /textResult\.error \? \[\] : \(textResult\.data \?\? \[\]\)/);
  assert.doesNotMatch(repository, /voiceResult\.error \|\| textResult\.error/);
});

test("text experiences are unpublished by default and readable only to permanent joined users", () => {
  const migration = read("supabase/migrations/20260904124236_create_mission_text_experiences.sql");
  assert.match(migration, /is_published boolean not null default false/);
  assert.match(migration, /alter table public\.mission_text_experiences enable row level security/);
  assert.match(migration, /revoke all privileges on table public\.mission_text_experiences from anon, authenticated/);
  assert.match(migration, /grant select \(id, mission_id, body, is_published, created_at\)/);
  assert.match(migration, /auth\.jwt\(\)[\s\S]*is_anonymous[\s\S]*is false/);
  assert.match(migration, /membership\.user_id = \(select auth\.uid\(\)\)/);
});

test("gesture controller preserves horizontal arbitration and resets playback on close or Mission change", () => {
  const component = read("features/missions/components/MissionExperienceReveal.tsx");
  const gallery = read("features/packs/components/MissionGallery.tsx");
  const completedPage = read("app/completed/[date]/page.tsx");
  assert.match(component, /GESTURE_THRESHOLD_PX = 8/);
  assert.match(component, /Math\.abs\(deltaX\) > Math\.abs\(deltaY\)/);
  assert.match(component, /audio\?\.pause\(\)/);
  assert.match(component, /audio\.currentTime = 0/);
  assert.match(gallery, /key=\{experienceMissionId\}/);
  assert.match(gallery, /experienceGesture === "pending" \|\| root\.dataset\.experienceGesture === "vertical"/);
  assert.doesNotMatch(completedPage, /experienceMissionId|experienceRevealEnabled|MissionExperienceReveal/);
});

test("Reveal stays visually closed until travel begins", () => {
  const css = read("features/missions/components/MissionExperienceReveal.module.css");
  assert.match(css, /opacity:\s*var\(--experience-progress\)/);
  assert.doesNotMatch(css, /opacity:\s*calc\(\.72/);
});

test("audio Reveal uses the complete waveform as its accessible playback control", () => {
  const component = read("features/missions/components/MissionExperienceReveal.tsx");
  const css = read("features/missions/components/MissionExperienceReveal.module.css");
  assert.match(component, /<button[\s\S]*aria-pressed=\{playing\}[\s\S]*className=\{styles\.waveform\}/);
  assert.match(component, /className=\{styles\.waveform\}[\s\S]*event\.stopPropagation\(\)/);
  assert.doesNotMatch(component, /styles\.playbackToggle/);
  assert.match(css, /\.waveformPlayed \.waveformBars \{ width: 100%; \}/);
  assert.match(css, /\.waveform:focus-visible/);
});

test("Gallery blank clicks request Reveal close before navigation", () => {
  const gallery = read("features/packs/components/MissionGallery.tsx");
  assert.match(gallery, /root\.dataset\.experienceReveal && root\.dataset\.experienceReveal !== "closed"/);
  assert.match(gallery, /dispatchEvent\(new Event\("mission-experience-reveal-close", \{ cancelable: true \}\)\)/);
  const native = read("features/packs/model/native-mission-gallery.ts");
  assert.match(native, /root\.dataset\.experienceReveal && root\.dataset\.experienceReveal !== "closed"/);
  assert.match(native, /dispatchEvent\(new Event\("mission-experience-reveal-close", \{ cancelable: true \}\)\)/);
  const reveal = read("features/missions/components/MissionExperienceReveal.tsx");
  assert.match(reveal, /root\.dataset\.experienceReveal = state/);
  assert.match(reveal, /setRevealState\("dragging"\)/);
  assert.match(reveal, /setRevealState\(open \? "open" : "closing"\)/);
  assert.match(reveal, /setRevealState\("closed"\)/);
  assert.match(reveal, /root\.addEventListener\("mission-experience-reveal-close", onCloseRequest\)/);
  assert.match(reveal, /resetReveal\(false\);/);
});

test("track transparency exposes active Reveal content without changing card ownership", () => {
  const galleryCss = read("features/packs/components/MissionGallery.module.css");
  const reveal = read("features/missions/components/MissionExperienceReveal.tsx");
  const revealCss = read("features/missions/components/MissionExperienceReveal.module.css");
  assert.match(galleryCss, /\.track \{[\s\S]*pointer-events: none;[\s\S]*\}/);
  assert.match(galleryCss, /\.missionMotion \{[\s\S]*pointer-events: auto;[\s\S]*\}/);
  assert.match(revealCss, /\.underlay \{[\s\S]*z-index: 9;[\s\S]*\}/);
  assert.match(reveal, /data-reveal-active=\{sessionActive\}/);
});
