import { cacheLife } from "next/cache";

import { localDateKey } from "@/features/calendar/model/calendar-month";

export async function getCurrentDateKey(): Promise<string> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return localDateKey(new Date());
}
