import type { Tables } from "@/data/database.types";
import type {
  MissionProgress,
  MissionProgressByMission,
} from "@/data/contracts/mission-progress";

export type MissionProgressRow = Pick<
  Tables<"mission_progress">,
  "mission_id" | "status" | "taken_at" | "completed_at"
>;

export function mapMissionProgressRow(row: MissionProgressRow): MissionProgress {
  if (row.status !== "taken" && row.status !== "completed") {
    throw new Error("Invalid mission progress status.");
  }

  return {
    missionId: row.mission_id,
    status: row.status,
    takenAt: row.taken_at,
    completedAt: row.completed_at,
  };
}

export function mapMissionProgressRows(rows: readonly MissionProgressRow[]): MissionProgressByMission {
  return Object.fromEntries(rows.map((row) => {
    const progress = mapMissionProgressRow(row);
    return [progress.missionId, progress];
  }));
}
