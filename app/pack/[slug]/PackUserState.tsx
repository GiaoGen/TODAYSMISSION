import type { PackDetail } from "@/data/contracts/pack-summary";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getNavigationUserState } from "@/data/repositories/get-navigation-user-state";
import { getUnlockedFinalMission } from "@/data/repositories/get-unlocked-final-mission";
import { SessionSnapshotHydrator } from "@/features/navigation/components/SessionSnapshotHydrator";

export async function PackUserState({ pack }: { pack: PackDetail }) {
  const currentUser = await getCurrentUser();
  const [state, finalMission] = await Promise.all([
    getNavigationUserState(currentUser, [pack]),
    currentUser && pack.slug === "go-alone" ? getUnlockedFinalMission(pack.id) : null,
  ]);
  return <SessionSnapshotHydrator state={{
    ...state,
    unlockedFinalMissionsByPack: finalMission ? { [pack.id]: finalMission } : {},
  }} />;
}
