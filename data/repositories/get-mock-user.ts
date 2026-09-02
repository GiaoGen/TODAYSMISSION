import { MOCK_LOGIN_NAME, MOCK_REGISTERED_ON } from "@/data/fixtures/user-fixtures";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import { MISSION_COMPLETION_FIXTURES } from "@/data/fixtures/mission-completion-fixtures";

export function getMockLoginName(): string {
  return MOCK_LOGIN_NAME;
}

export function getMockMissionCalendar(): MissionCalendarData {
  return {
    registeredOn: MOCK_REGISTERED_ON,
    completedOn: [...new Set(MISSION_COMPLETION_FIXTURES.map((record) => record.completedOn))].sort(),
  };
}
