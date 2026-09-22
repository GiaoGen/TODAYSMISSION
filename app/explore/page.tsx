import { Suspense } from "react";

import { getExplorePacks } from "@/data/repositories/get-explore-packs";
import { ExploreAccountControl } from "@/features/packs/components/ExploreAccountControl";
import { ExplorePackCarousel } from "@/features/packs/components/ExplorePackCarousel";
import { EXPLORE_PACK_SUMMARIES } from "@/features/packs/model/explore-pack-content";
import { ExploreAccountState } from "./ExploreAccountState";

export default function ExplorePage() {
  return <>
    <Suspense fallback={<ExplorePackCarousel clearReturnSlug={false} packs={EXPLORE_PACK_SUMMARIES} />}>
      <LiveExplorePacks />
    </Suspense>
    <Suspense fallback={<ExploreAccountControl authenticated={null} />}>
      <ExploreAccountState />
    </Suspense>
  </>;
}

async function LiveExplorePacks() {
  const packs = await getExplorePacks();
  return <ExplorePackCarousel packs={packs} />;
}
