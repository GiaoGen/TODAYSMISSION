"use client";

import type { MissionExperience } from "@/data/contracts/mission-experience";

const EXPERIENCE_CACHE_TTL_MS = 8 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  promise: Promise<readonly MissionExperience[]>;
};

export type MissionExperienceScope =
  | { kind: "community" }
  | { kind: "own"; userId: string };

const experienceCache = new Map<string, CacheEntry>();

type MissionExperienceLoader = (missionId: string) => Promise<
  | { ok: true; experiences: readonly MissionExperience[] }
  | { ok: false; error: string }
>;

export function getMissionExperiencePool(
  missionId: string,
  scope: MissionExperienceScope,
  loadExperiences: MissionExperienceLoader,
): Promise<readonly MissionExperience[]> {
  const cacheKey = scope.kind === "own"
    ? `own:${scope.userId}:${missionId}`
    : `community:${missionId}`;
  const now = Date.now();
  const cached = experienceCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = loadExperiences(missionId).then((result) => {
    if (!result.ok) throw new Error(result.error);
    return result.experiences;
  }).catch((error) => {
    if (experienceCache.get(cacheKey)?.promise === promise) experienceCache.delete(cacheKey);
    throw error;
  });

  experienceCache.set(cacheKey, { expiresAt: now + EXPERIENCE_CACHE_TTL_MS, promise });
  return promise;
}
