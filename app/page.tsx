import { getPacks } from "@/data/repositories/get-packs";
import { ArcCarousel } from "@/features/packs/components/ArcCarousel";

export default function Home() {
  const packs = getPacks();

  return <ArcCarousel packs={packs} />;
}
