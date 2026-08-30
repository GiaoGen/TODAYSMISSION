import type { MissionCompletion } from "../contracts/mission-calendar";
import { PACK_DETAIL_FIXTURES } from "./pack-fixtures";

const COMPLETION_DATES = [
  "2026-05-12", "2026-05-17", "2026-05-28",
  "2026-06-03", "2026-06-08", "2026-06-16", "2026-06-24",
  "2026-07-02", "2026-07-11", "2026-07-20", "2026-07-29",
  "2026-08-02", "2026-08-05", "2026-08-08", "2026-08-11",
  "2026-08-14", "2026-08-17", "2026-08-21", "2026-08-23",
  "2026-08-26", "2026-08-28",
] as const;
const DAILY_COUNTS = [1, 2, 3, 5, 8] as const;

// Frontend-only history. Each row points to an existing Mission, across Packs;
// single and small collections are intentional fixtures, not fabricated covers.
export const MISSION_COMPLETION_FIXTURES: readonly MissionCompletion[] =
  COMPLETION_DATES.flatMap((completedOn, dayIndex) =>
    Array.from({ length: DAILY_COUNTS[dayIndex % DAILY_COUNTS.length] }, (_, index) => {
      const pack = PACK_DETAIL_FIXTURES[(dayIndex + index * 3) % PACK_DETAIL_FIXTURES.length];
      return {
        completedOn,
        packId: pack.id,
        missionId: pack.missions[(dayIndex + index) % pack.missions.length].id,
      };
    }),
  );
