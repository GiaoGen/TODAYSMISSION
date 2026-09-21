import { Suspense } from "react";

import { ExploreAccountControl } from "@/features/packs/components/ExploreAccountControl";
import { ExplorePackCarousel } from "@/features/packs/components/ExplorePackCarousel";
import { EXPLORE_PACK_SUMMARIES } from "@/features/packs/model/explore-pack-content";
import { ExploreAccountState } from "./ExploreAccountState";

export default function ExplorePage() {
  return <>
    <ExplorePackCarousel packs={EXPLORE_PACK_SUMMARIES} />
    <Suspense fallback={<ExploreAccountControl authenticated={null} />}>
      <ExploreAccountState />
    </Suspense>
  </>;
}
