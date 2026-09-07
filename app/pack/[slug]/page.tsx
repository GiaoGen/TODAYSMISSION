import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPackBySlug, getPacks } from "@/data/repositories/get-packs";
import { getMissionExperiencesAction, getMyMissionExperienceAction } from "@/features/missions/actions";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";
import { getInitialMissionCompletionStatuses } from "@/features/missions/model/mission-action-state";
import { RoutePrefetch } from "./RoutePrefetch";
import { PackUserState } from "./PackUserState";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const packs = await getPacks();
  return packs.map((pack) => ({ slug: pack.slug }));
}

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
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
