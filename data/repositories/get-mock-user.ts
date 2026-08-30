import { MOCK_LOGIN_NAME, MOCK_REGISTERED_ON } from "@/data/fixtures/user-fixtures";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import { getCompletionDates } from "./get-completed-missions";

export function getMockLoginName(): string {
  return MOCK_LOGIN_NAME;
}

export function getMockMissionCalendar(): MissionCalendarData {
  return { registeredOn: MOCK_REGISTERED_ON, completedOn: getCompletionDates() };
}
