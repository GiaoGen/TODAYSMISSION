"use client";

import type { MissionExperience } from "@/data/contracts/mission-experience";

const EXPERIENCE_CACHE_TTL_MS = 8 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  promise: Promise<readonly MissionExperience[]>;
};

const experienceCache = new Map<string, CacheEntry>();

type MissionExperienceLoader = (missionId: string) => Promise<
  | { ok: true; experiences: readonly MissionExperience[] }
  | { ok: false; error: string }
>;

export function getMissionExperiencePool(
  missionId: string,
  loadExperiences: MissionExperienceLoader,
): Promise<readonly MissionExperience[]> {
  const now = Date.now();
  const cached = experienceCache.get(missionId);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = loadExperiences(missionId).then((result) => {
    if (!result.ok) throw new Error(result.error);
    return result.experiences;
  }).catch((error) => {
    if (experienceCache.get(missionId)?.promise === promise) experienceCache.delete(missionId);
    throw error;
  });

  experienceCache.set(missionId, { expiresAt: now + EXPERIENCE_CACHE_TTL_MS, promise });
  return promise;
}
