import type { CompletedMissionDay } from "../contracts/mission-calendar";
import { MISSION_COMPLETION_FIXTURES } from "../fixtures/mission-completion-fixtures";
import { PACK_DETAIL_FIXTURES } from "../fixtures/pack-fixtures";
import { MOCK_REGISTERED_ON } from "../fixtures/user-fixtures";
import { parseDateKey } from "../../features/calendar/model/calendar-month";

export function getCompletionDates(): readonly string[] {
  return [...new Set(MISSION_COMPLETION_FIXTURES.map((record) => record.completedOn))].sort();
}

export function getCompletedMissionsByDate(date: string): CompletedMissionDay | null {
  if (!parseDateKey(date) || date < MOCK_REGISTERED_ON) return null;
  const records = MISSION_COMPLETION_FIXTURES.filter((record) => record.completedOn === date);
  const missions = records.flatMap((record) => {
    const pack = PACK_DETAIL_FIXTURES.find((item) => item.id === record.packId);
    const mission = pack?.missions.find((item) => item.id === record.missionId);
    return mission ? [mission] : [];
  });
  const unique = [...new Map(missions.map((mission) => [mission.id, mission])).values()];
  return unique.length ? { date, missions: unique } : null;
}
