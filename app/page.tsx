import { getPacks } from "@/data/repositories/get-packs";
import type { CurrentUser } from "@/data/contracts/current-user";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { localDateKey } from "@/features/calendar/model/calendar-month";
import { logout } from "@/features/auth/actions";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";

function getHomeCalendar(currentUser: CurrentUser | null): MissionCalendarData {
  return {
    registeredOn: currentUser?.createdAt.slice(0, 10) ?? localDateKey(new Date()),
    completedOn: [],
  };
}

export default async function Home() {
  const [packs, currentUser] = await Promise.all([getPacks(), getCurrentUser()]);

  if (packs.length === 0) {
    return <main><p>No public mission Packs are available right now.</p></main>;
  }

  // Prototype-only subset until Take/Progress can load real user participation.
  const joinedPacks = packs.slice(0, Math.min(5, packs.length));

  // Route-owned DOM above the wheel boundaries would suppress their enter/exit.
  return <HomeCarouselEntry
    calendar={getHomeCalendar(currentUser)}
    currentUser={currentUser}
    joinedPacks={joinedPacks}
    onLogout={logout}
    packs={packs}
  />;
}
