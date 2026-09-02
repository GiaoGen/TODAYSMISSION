import { notFound } from "next/navigation";

import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getMissionCompletionsForMissions } from "@/data/repositories/get-mission-completions";
import { getMissionVoiceStatusesForMissions } from "@/data/repositories/get-mission-voices";
import { getCurrentPackMembership } from "@/data/repositories/get-pack-memberships";
import { getPackBySlug } from "@/data/repositories/get-packs";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";
import { getInitialMissionCompletionStatuses } from "@/features/missions/model/mission-action-state";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const [pack, currentUser] = await Promise.all([
    getPackBySlug(slug),
    getCurrentUser(),
  ]);

  if (!pack) {
    notFound();
  }

  const missionIds = pack.missions.map((mission) => mission.id);
  const [membership, missionCompletions, missionVoiceStatuses] = currentUser
    ? await Promise.all([
      getCurrentPackMembership(pack.id),
      getMissionCompletionsForMissions(missionIds),
      getMissionVoiceStatusesForMissions(missionIds),
    ])
    : [null, {}, {}];
  const initialMissionCompletionStatuses = getInitialMissionCompletionStatuses(missionIds, missionCompletions);

  return (
    <MissionPackDetail
      authenticated={Boolean(currentUser)}
      initialMissionCompletionStatuses={initialMissionCompletionStatuses}
      initialMissionVoiceStatuses={missionVoiceStatuses}
      initialPackJoined={Boolean(membership)}
      pack={pack}
    />
  );
}
