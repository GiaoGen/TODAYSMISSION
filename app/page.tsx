import { getJoinedPacks, getPacks } from "@/data/repositories/get-packs";
import { getMockLoginName, getMockMissionCalendar } from "@/data/repositories/get-mock-user";
import { HomeCarouselEntry } from "@/features/packs/components/HomeCarouselEntry";

export default function Home() {
  const packs = getPacks();
  const joinedPacks = getJoinedPacks();

  // Route-owned DOM above the wheel boundaries would suppress their enter/exit.
  return <HomeCarouselEntry joinedPacks={joinedPacks} packs={packs} mockLoginName={getMockLoginName()} calendar={getMockMissionCalendar()} />;
}
