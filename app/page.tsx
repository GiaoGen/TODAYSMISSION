import { getPacks } from "@/data/repositories/get-packs";
import { getMockLoginName, getMockMissionCalendar } from "@/data/repositories/get-mock-user";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";

export default async function Home() {
  const packs = await getPacks();

  if (packs.length === 0) {
    return <main><p>No public mission Packs are available right now.</p></main>;
  }

  // Prototype-only subset until the Auth phase can load real user Packs.
  const joinedPacks = packs.slice(0, Math.min(5, packs.length));

  // Route-owned DOM above the wheel boundaries would suppress their enter/exit.
  return <HomeCarouselEntry joinedPacks={joinedPacks} packs={packs} mockLoginName={getMockLoginName()} calendar={getMockMissionCalendar()} />;
}
