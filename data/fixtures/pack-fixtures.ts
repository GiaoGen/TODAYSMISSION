import type {
  MissionSummary,
  PackDetail,
  PackSummary,
} from "@/data/contracts/pack-summary";

const PACK_COUNT = 24;
const PACK_GROUP_SIZE = 12;
const MISSION_OFFSETS = [-4, -3, -2, -1, 1, 2, 3, 4] as const;

export const PACK_FIXTURES: readonly PackSummary[] = Array.from(
  { length: PACK_COUNT },
  (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      id: `mock-pack-${number}`,
      slug: `mock-pack-${number}`,
      title: `Mock Pack ${number}`,
      imageSrc: `https://picsum.photos/seed/todaysmission-${number}/600/800`,
      imageAlt: `Mock Pack ${number}`,
    };
  },
);

// An independent joined-pack list for the frontend-only home prototype.
export const JOINED_PACK_FIXTURES: readonly PackSummary[] =
  PACK_FIXTURES.filter((_, index) => [0, 2, 4, 6, 8].includes(index));

function createMissionFixtures(packIndex: number): readonly MissionSummary[] {
  const groupStart = Math.floor(packIndex / PACK_GROUP_SIZE) * PACK_GROUP_SIZE;
  const localPackIndex = packIndex - groupStart;

  return MISSION_OFFSETS.map((offset, missionIndex) => {
    const sourceIndex =
      groupStart +
      ((localPackIndex + offset + PACK_GROUP_SIZE) % PACK_GROUP_SIZE);
    const sourcePack = PACK_FIXTURES[sourceIndex];
    const number = String(missionIndex + 1).padStart(2, "0");

    return {
      id: `${PACK_FIXTURES[packIndex].id}-mission-${number}`,
      slug: `mock-mission-${number}`,
      title: `Mock Mission ${number}`,
      imageSrc: sourcePack.imageSrc,
      imageAlt: `Mock Mission ${number}`,
    };
  });
}

export const PACK_DETAIL_FIXTURES: readonly PackDetail[] = PACK_FIXTURES.map(
  (pack, index) => ({
    ...pack,
    missions: createMissionFixtures(index),
  }),
);
