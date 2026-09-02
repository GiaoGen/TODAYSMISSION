import "server-only";

import type { CurrentUser } from "@/data/contracts/current-user";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { localDateKey } from "@/features/calendar/model/calendar-month";
import { createClient } from "@/lib/supabase/server";

export async function getMissionCalendar(currentUser?: CurrentUser | null): Promise<MissionCalendarData> {
  const user = currentUser === undefined ? await getCurrentUser() : currentUser;
  const registeredOn = user?.createdAt.slice(0, 10) ?? localDateKey(new Date());

  if (!user) return { registeredOn, completedOn: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mission_completions")
    .select("completed_local_date")
    .eq("user_id", user.id);

  if (error) throw new Error("Failed to read Mission calendar.");

  return {
    registeredOn,
    completedOn: [...new Set(data.map((row) => row.completed_local_date))].sort(),
  };
}
