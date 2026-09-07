import { Suspense } from "react";

import { getCurrentDateKey } from "@/data/repositories/get-current-date";
import { getPacks } from "@/data/repositories/get-packs";
import { logout } from "@/features/auth/actions";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";
import { HomeUserStateHydrator } from "./HomeUserStateHydrator";

export default async function Home() {
  const [packs, today] = await Promise.all([getPacks(), getCurrentDateKey()]);

  if (packs.length === 0) {
    return <main><p>No public mission Packs are available right now.</p></main>;
  }

  return <>
    <HomeCarouselEntry initialRegisteredOn="1970-01-01" onLogout={logout} packs={packs} today={today} />
    <Suspense fallback={null}>
      <HomeUserStateHydrator packs={packs} />
    </Suspense>
  </>;
}
