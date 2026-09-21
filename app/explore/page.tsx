import { Suspense } from "react";

import { getExplorePacks } from "@/data/repositories/get-explore-packs";
import { ExploreAccountControl } from "@/features/packs/components/ExploreAccountControl";
import { ExplorePackCarousel } from "@/features/packs/components/ExplorePackCarousel";
import { ExploreAccountState } from "./ExploreAccountState";

export default async function ExplorePage() {
  const packs = await getExplorePacks();

  return <>
    <ExplorePackCarousel packs={packs} />
    <Suspense fallback={<ExploreAccountControl authenticated={null} />}>
      <ExploreAccountState />
    </Suspense>
  </>;
}
