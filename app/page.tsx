import { getPacks } from "@/data/repositories/get-packs";
import { getJoinedPacks } from "@/data/repositories/get-pack-memberships";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getMissionCalendar } from "@/data/repositories/get-mission-calendar";
import { logout } from "@/features/auth/actions";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";

export const instant = false;

export default async function Home() {
  const packsPromise = getPacks();
  const currentUser = await getCurrentUser();
  const [packs, joinedPacks, calendar] = await Promise.all([
    packsPromise,
    currentUser ? getJoinedPacks() : Promise.resolve([]),
    getMissionCalendar(currentUser),
  ]);

  if (packs.length === 0) {
    return <main><p>No public mission Packs are available right now.</p></main>;
  }

  return <HomeCarouselEntry
    calendar={calendar}
    currentUser={currentUser}
    joinedPacks={joinedPacks}
    onLogout={logout}
    packs={packs}
  />;
}
