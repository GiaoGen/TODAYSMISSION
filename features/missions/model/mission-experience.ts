import type { MissionExperience } from "@/data/contracts/mission-experience";

export const MISSION_EXPERIENCE_AUDIO_REVEAL_RATIO = 1 / 3;
export const MISSION_EXPERIENCE_MIN_REVEAL_RATIO = 0.2;
export const MISSION_EXPERIENCE_MAX_REVEAL_RATIO = 0.74;

export function selectMissionExperience(
  experiences: readonly MissionExperience[],
  previousExperienceId: string | null,
  random: () => number = Math.random,
): MissionExperience | null {
  if (experiences.length === 0) return null;

  const candidates = experiences.length > 1 && previousExperienceId
    ? experiences.filter((experience) => experience.id !== previousExperienceId)
    : experiences;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  return candidates[index] ?? null;
}

export function getMissionExperienceRevealTravel(
  cardHeight: number,
  kind: MissionExperience["kind"] | "empty",
  textContentHeight = 0,
): number {
  if (!Number.isFinite(cardHeight) || cardHeight <= 0) return 0;
  if (kind === "audio") return cardHeight * MISSION_EXPERIENCE_AUDIO_REVEAL_RATIO;

  const minimum = cardHeight * MISSION_EXPERIENCE_MIN_REVEAL_RATIO;
  const maximum = cardHeight * MISSION_EXPERIENCE_MAX_REVEAL_RATIO;
  if (kind === "empty") return minimum;

  const safeSpacing = Math.max(40, cardHeight * 0.14);
  return Math.min(maximum, Math.max(minimum, textContentHeight + safeSpacing));
}

export function canRevealMissionExperience({
  completed,
  completedDay,
  joined,
  settled,
}: {
  completed: boolean;
  completedDay: boolean;
  joined: boolean;
  settled: boolean;
}) {
  return joined && settled && !completed && !completedDay;
}

export function getDeterministicWaveform(experienceId: string, count = 28): readonly number[] {
  let seed = 2166136261;
  for (let index = 0; index < experienceId.length; index += 1) {
    seed ^= experienceId.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return Array.from({ length: count }, (_, index) => {
    seed += 0x6d2b79f5 + index;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const normalized = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    return 0.24 + normalized * 0.76;
  });
}
