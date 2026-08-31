import type { Tables } from "@/data/database.types";
import type { MissionCompletion, MissionCompletionByMission } from "@/data/contracts/mission-completion";

export type MissionCompletionRow = Pick<Tables<"mission_completions">, "mission_id" | "completed_at">;

export function mapMissionCompletionRow(row: MissionCompletionRow): MissionCompletion {
  return {
    missionId: row.mission_id,
    completedAt: row.completed_at,
  };
}

export function mapMissionCompletionRows(rows: readonly MissionCompletionRow[]): MissionCompletionByMission {
  return Object.fromEntries(rows.map((row) => {
    const completion = mapMissionCompletionRow(row);
    return [completion.missionId, completion];
  }));
}
