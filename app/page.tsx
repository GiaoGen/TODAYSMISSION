import { Suspense } from "react";

import type { PackSummary } from "@/data/contracts/pack-summary";
import { getPacks } from "@/data/repositories/get-packs";
import { getJoinedPacks } from "@/data/repositories/get-pack-memberships";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getMissionCalendar } from "@/data/repositories/get-mission-calendar";
import { logout } from "@/features/auth/actions";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";

async function HomeUserState({ packs }: { packs: readonly PackSummary[] }) {
  const currentUser = await getCurrentUser();
  const calendarPromise = getMissionCalendar(currentUser);
  const joinedPacksPromise = currentUser ? getJoinedPacks() : Promise.resolve([]);
  const [joinedPacks, calendar] = await Promise.all([joinedPacksPromise, calendarPromise]);

  return <HomeCarouselEntry
    calendar={calendar}
    currentUser={currentUser}
    joinedPacks={joinedPacks}
    onLogout={logout}
    packs={packs}
  />;
}

function HomePublicShell({ packs }: { packs: readonly PackSummary[] }) {
  return <HomeCarouselEntry
    calendar={{ registeredOn: "1970-01-01", completedOn: [] }}
    currentUser={null}
    joinedPacks={[]}
    onLogout={logout}
    packs={packs}
  />;
}

export default async function Home() {
  const packs = await getPacks();

  if (packs.length === 0) {
    return <main><p>No public mission Packs are available right now.</p></main>;
  }

  return (
    <Suspense fallback={<HomePublicShell packs={packs} />}>
      <HomeUserState packs={packs} />
    </Suspense>
  );
}
