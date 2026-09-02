import type { MissionVoiceStatus, MissionVoiceStatusByMission } from "@/data/contracts/mission-voice";
import type { Tables } from "@/data/database.types";

export type MissionVoiceStatusRow = Pick<Tables<"mission_voices">, "mission_id">;

export function mapMissionVoiceStatusRows(rows: readonly MissionVoiceStatusRow[]): MissionVoiceStatusByMission {
  return rows.reduce<MissionVoiceStatusByMission>((result, row) => {
    const status: MissionVoiceStatus = { missionId: row.mission_id, submitted: true };
    result[row.mission_id] = status;
    return result;
  }, {});
}
