import { notFound } from "next/navigation";

import { getMissionProgressForMissions } from "@/data/repositories/get-mission-progress";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getPackBySlug } from "@/data/repositories/get-packs";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";
import { getInitialMissionStatuses } from "@/features/missions/model/mission-action-state";

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
  const missionProgress = currentUser ? await getMissionProgressForMissions(missionIds) : {};
  const initialMissionStatuses = getInitialMissionStatuses(missionIds, missionProgress);

  return (
    <MissionPackDetail
      authenticated={Boolean(currentUser)}
      initialMissionStatuses={initialMissionStatuses}
      pack={pack}
    />
  );
}
