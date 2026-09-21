import { getCurrentUser } from "@/data/repositories/get-current-user";
import { ExploreAccountControl } from "@/features/packs/components/ExploreAccountControl";

export async function ExploreAccountState() {
  const currentUser = await getCurrentUser();
  return <ExploreAccountControl authenticated={currentUser !== null} />;
}
