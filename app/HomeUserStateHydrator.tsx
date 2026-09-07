import type { PackSummary } from "@/data/contracts/pack-summary";
import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getNavigationUserState } from "@/data/repositories/get-navigation-user-state";
import { SessionSnapshotHydrator } from "@/features/navigation/components/SessionSnapshotHydrator";

export async function HomeUserStateHydrator({ packs }: { packs: readonly PackSummary[] }) {
  const currentUser = await getCurrentUser();
  const state = await getNavigationUserState(currentUser, packs);
  return <SessionSnapshotHydrator state={state} />;
}
