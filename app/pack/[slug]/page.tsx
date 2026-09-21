import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getExplorePackBySlug } from "@/data/repositories/get-explore-pack-detail";
import { getPackBySlug, getPacks } from "@/data/repositories/get-packs";
import { getMissionExperiencesAction, getMyMissionExperienceAction } from "@/features/missions/actions";
import { ExplorePackPreview } from "@/features/packs/components/ExplorePackPreview";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";
import {
  EXPLORE_PACK_SUMMARIES,
} from "@/features/packs/model/explore-pack-content";
import { getInitialMissionCompletionStatuses } from "@/features/missions/model/mission-action-state";
import { SessionSnapshotHydrator } from "@/features/navigation/components/SessionSnapshotHydrator";
import { RoutePrefetch } from "./RoutePrefetch";
import { PackUserState } from "./PackUserState";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const packs = await getPacks();
  const slugs = new Set([
    ...packs.map((pack) => pack.slug),
    ...EXPLORE_PACK_SUMMARIES.map((pack) => pack.slug),
  ]);
  return Array.from(slugs, (slug) => ({ slug }));
}

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const previewPackData = await getExplorePackBySlug(slug);

  if (previewPackData) {
    const { navigationState, ...previewPack } = previewPackData;
    return (
      <>
        <ExplorePackPreview
          loadMissionExperiences={getMissionExperiencesAction}
          pack={previewPack}
        />
        <SessionSnapshotHydrator state={navigationState} />
      </>
    );
  }

  const pack = await getPackBySlug(slug);

  if (!pack) {
    notFound();
  }

  const missionIds = pack.missions.map((mission) => mission.id);
  return <>
    <MissionPackDetail
      authenticated={false}
      currentUserId={null}
      initialActiveMissionId={null}
      initialMissionCompletionStatuses={getInitialMissionCompletionStatuses(missionIds, {})}
      initialPackJoined={false}
      loadMissionExperiences={getMissionExperiencesAction}
      loadMyMissionExperience={getMyMissionExperienceAction}
      pack={pack}
    />
    <Suspense fallback={null}>
      <PackUserState pack={pack} />
    </Suspense>
    <RoutePrefetch href="/" />
  </>;
}
