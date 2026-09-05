import type { PackDetail } from "@/data/contracts/pack-summary";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getMissionCompletionsForMissions } from "@/data/repositories/get-mission-completions";
import { getCurrentPackMembership } from "@/data/repositories/get-pack-memberships";
import { getMissionExperiencesAction, getMyMissionExperienceAction } from "@/features/missions/actions";
import { getInitialMissionCompletionStatuses } from "@/features/missions/model/mission-action-state";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";

export async function PackUserState({ pack }: { pack: PackDetail }) {
  const currentUser = await getCurrentUser();
  const missionIds = pack.missions.map((mission) => mission.id);
  const [membership, missionCompletions] = currentUser
    ? await Promise.all([
      getCurrentPackMembership(pack.id, currentUser),
      getMissionCompletionsForMissions(missionIds, currentUser),
    ])
    : [null, {}];
  const initialMissionCompletionStatuses = getInitialMissionCompletionStatuses(missionIds, missionCompletions);

  return (
    <MissionPackDetail
      authenticated={Boolean(currentUser)}
      currentUserId={currentUser?.id ?? null}
      initialActiveMissionId={membership?.activeMissionId ?? null}
      initialMissionCompletionStatuses={initialMissionCompletionStatuses}
      initialPackJoined={Boolean(membership)}
      loadMissionExperiences={getMissionExperiencesAction}
      loadMyMissionExperience={getMyMissionExperienceAction}
      pack={pack}
    />
  );
}
