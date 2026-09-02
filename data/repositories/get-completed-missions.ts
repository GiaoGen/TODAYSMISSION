import "server-only";

import type { CurrentUser } from "@/data/contracts/current-user";
import type { CompletedMissionDay } from "@/data/contracts/mission-calendar";
import type { Tables } from "@/data/database.types";
import { mapMissionSummary } from "@/data/mappers/pack-mapper";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { parseDateKey } from "@/features/calendar/model/calendar-month";
import { createClient } from "@/lib/supabase/server";

type CompletedMissionRow = Pick<
  Tables<"mission_completions">,
  "mission_id" | "completed_at" | "completed_local_date"
> & {
  missions: Pick<
    Tables<"missions">,
    "id" | "slug" | "title" | "note" | "tag" | "code" | "theme_key" | "artwork_key" | "sort_order"
  > | null;
};

const COMPLETED_DAY_SELECT = `
  mission_id,
  completed_at,
  completed_local_date,
  missions!mission_completions_mission_id_fkey(
    id,slug,title,note,tag,code,theme_key,artwork_key,sort_order
  )
`;

export async function getCompletedMissionsByDate(
  date: string,
  currentUser?: CurrentUser | null,
): Promise<CompletedMissionDay | null> {
  if (!parseDateKey(date)) return null;

  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission_completions")
    .select(COMPLETED_DAY_SELECT)
    .eq("user_id", user.id)
    .eq("completed_local_date", date)
    .order("completed_at", { ascending: true });

  if (error) throw new Error("Failed to read completed Missions.");

  const missions = (data as unknown as CompletedMissionRow[]).flatMap((row) => (
    row.missions ? [mapMissionSummary(row.missions)] : []
  ));
  const uniqueMissions = [...new Map(missions.map((mission) => [mission.id, mission])).values()];

  return uniqueMissions.length ? { date, missions: uniqueMissions } : null;
}
