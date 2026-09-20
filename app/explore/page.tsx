import { ExplorePackCarousel } from "@/features/packs/components/ExplorePackCarousel";
import { EXPLORE_PACK_SUMMARIES } from "@/features/packs/model/explore-pack-content";

export default function ExplorePage() {
  return <ExplorePackCarousel packs={EXPLORE_PACK_SUMMARIES} />;
}
