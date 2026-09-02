import { getPacks } from "@/data/repositories/get-packs";
import { getJoinedPacks } from "@/data/repositories/get-pack-memberships";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getMissionCalendar } from "@/data/repositories/get-mission-calendar";
import { logout } from "@/features/auth/actions";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";

export default async function Home() {
  const [packs, currentUser] = await Promise.all([getPacks(), getCurrentUser()]);

  if (packs.length === 0) {
    return <main><p>No public mission Packs are available right now.</p></main>;
  }

  const calendarPromise = getMissionCalendar(currentUser);
  const joinedPacksPromise = currentUser ? getJoinedPacks() : Promise.resolve([]);
  const [joinedPacks, calendar] = await Promise.all([joinedPacksPromise, calendarPromise]);

  // Route-owned DOM above the wheel boundaries would suppress their enter/exit.
  return <HomeCarouselEntry
    calendar={calendar}
    currentUser={currentUser}
    joinedPacks={joinedPacks}
    onLogout={logout}
    packs={packs}
  />;
}
