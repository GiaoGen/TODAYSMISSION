import type {
  MissionSummary,
  PackDetail,
  PackSummary,
} from "@/data/contracts/pack-summary";

const PACK_COUNT = 24;
const MISSION_OFFSETS = [-4, -3, -2, -1, 1, 2, 3, 4] as const;

// The five supplied stream designs repeat without changing Mission identities,
// counts or calendar presentation.
const MISSION_DESIGNS = [
  { title: "Go to a movie alone.", note: "Pick the film yourself. Buy one ticket. Stay until the credits begin.", tag: "GO ALONE", themeKey: "coral", artworkKey: "circle" },
  { title: "Ask a stranger for a recommendation.", note: "Coffee, food, music, anything. Start the conversation before you overthink it.", tag: "TALK FIRST", themeKey: "blue", artworkKey: "square" },
  { title: "Ask for something they might say no to.", note: "Keep it harmless and ordinary. The goal is hearing an answer, not getting a yes.", tag: "GET REJECTED", themeKey: "yellow", artworkKey: "triangle" },
  { title: "Sit alone in a busy café.", note: "No laptop shield. No pretending to wait for someone. Just stay for twenty minutes.", tag: "BE SEEN", themeKey: "ink", artworkKey: "diamond" },
  { title: "Give someone a simple compliment.", note: "Say it once, clearly, without turning it into a joke or explaining yourself.", tag: "TALK FIRST", themeKey: "paper", artworkKey: "ring" },
] as const;

// Cover designs copied from the supplied Mission Deck Wheel prototype.
const DECK_DESIGNS = [
  { themeKey: "go-alone", title: "GO ALONE", description: "Do things without waiting for company." },
  { themeKey: "talk-first", title: "TALK FIRST", description: "Start small conversations before your fear does." },
  { themeKey: "get-rejected", title: "GET REJECTED", description: "Practice hearing no without shrinking yourself." },
  { themeKey: "be-seen", title: "BE SEEN", description: "Let yourself take up a little more space." },
] as const;

export const PACK_FIXTURES: readonly PackSummary[] = Array.from(
  { length: PACK_COUNT },
  (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const design = DECK_DESIGNS[index % DECK_DESIGNS.length];

    return {
      id: `mock-pack-${number}`,
      slug: `mock-pack-${number}`,
      title: design.title,
      description: design.description,
      number,
      missionCount: MISSION_OFFSETS.length,
      designKey: "field-edition",
      themeKey: design.themeKey,
    };
  },
);

// An independent joined-pack list for the frontend-only home prototype.
export const JOINED_PACK_FIXTURES: readonly PackSummary[] =
  PACK_FIXTURES.filter((_, index) => [0, 2, 4, 6, 8].includes(index));

function createMissionFixtures(packIndex: number): readonly MissionSummary[] {
  return MISSION_OFFSETS.map((_, missionIndex) => {
    const number = String(missionIndex + 1).padStart(2, "0");

    return {
      id: `${PACK_FIXTURES[packIndex].id}-mission-${number}`,
      slug: `mock-mission-${number}`,
      ...MISSION_DESIGNS[missionIndex % MISSION_DESIGNS.length],
      code: `${number}—${String.fromCharCode(65 + missionIndex)}`,
    };
  });
}

export const PACK_DETAIL_FIXTURES: readonly PackDetail[] = PACK_FIXTURES.map(
  (pack, index) => ({
    ...pack,
    missions: createMissionFixtures(index),
  }),
);
