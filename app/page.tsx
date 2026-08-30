import { getJoinedPacks, getPacks } from "@/data/repositories/get-packs";
import { getMockLoginName } from "@/data/repositories/get-mock-user";
import { HomePackCarousels } from "@/features/packs/components/HomePackCarousels";

export default function Home() {
  const packs = getPacks();
  const joinedPacks = getJoinedPacks();

  // Route-owned DOM above the wheel boundaries would suppress their enter/exit.
  return <HomePackCarousels joinedPacks={joinedPacks} packs={packs} mockLoginName={getMockLoginName()} />;
}
