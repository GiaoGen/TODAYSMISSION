import type {
  MissionSummary,
  PackDetail,
  PackSummary,
} from "@/data/contracts/pack-summary";

const PACK_COUNT = 24;
const PACK_GROUP_SIZE = 12;
const MISSION_OFFSETS = [-4, -3, -2, -1, 1, 2, 3, 4] as const;

// The five supplied stream designs repeat without changing Mission identities,
// counts, photo records or calendar presentation.
const MISSION_DESIGNS = [
  { title: "Go to a movie alone.", note: "Pick the film yourself. Buy one ticket. Stay until the credits begin.", tag: "GO ALONE", symbol: "●", background: "#e5392d", foreground: "#111111" },
  { title: "Ask a stranger for a recommendation.", note: "Coffee, food, music, anything. Start the conversation before you overthink it.", tag: "TALK FIRST", symbol: "■", background: "#1457c9", foreground: "#f3e8c8" },
  { title: "Ask for something they might say no to.", note: "Keep it harmless and ordinary. The goal is hearing an answer, not getting a yes.", tag: "GET REJECTED", symbol: "▲", background: "#f1c933", foreground: "#111111" },
  { title: "Sit alone in a busy café.", note: "No laptop shield. No pretending to wait for someone. Just stay for twenty minutes.", tag: "BE SEEN", symbol: "◆", background: "#111111", foreground: "#f3e8c8" },
  { title: "Give someone a simple compliment.", note: "Say it once, clearly, without turning it into a joke or explaining yourself.", tag: "TALK FIRST", symbol: "◐", background: "#f3e8c8", foreground: "#111111" },
] as const;

// Cover designs copied from the supplied Mission Deck Wheel prototype.
const DECK_DESIGNS = [
  { title: "GO ALONE", description: "Do things without waiting for company.", symbol: "●", background: "#E5392D", foreground: "#111111" },
  { title: "TALK FIRST", description: "Start small conversations before your fear does.", symbol: "■", background: "#1457C9", foreground: "#F3E8C8" },
  { title: "GET REJECTED", description: "Practice hearing no without shrinking yourself.", symbol: "▲", background: "#F1C933", foreground: "#111111" },
  { title: "BE SEEN", description: "Let yourself take up a little more space.", symbol: "◆", background: "#111111", foreground: "#F3E8C8" },
] as const;

export const PACK_FIXTURES: readonly PackSummary[] = Array.from(
  { length: PACK_COUNT },
  (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const { title, ...design } = DECK_DESIGNS[index % DECK_DESIGNS.length];

    return {
      id: `mock-pack-${number}`,
      slug: `mock-pack-${number}`,
      title,
      imageSrc: `https://picsum.photos/seed/todaysmission-${number}/600/800`,
      imageAlt: `Mock Pack ${number}`,
      deck: { ...design, number, missionCount: MISSION_OFFSETS.length },
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
      card: { ...MISSION_DESIGNS[missionIndex % MISSION_DESIGNS.length], code: `${number}—${String.fromCharCode(65 + missionIndex)}` },
    };
  });
}

export const PACK_DETAIL_FIXTURES: readonly PackDetail[] = PACK_FIXTURES.map(
  (pack, index) => ({
    ...pack,
    missions: createMissionFixtures(index),
  }),
);
