import { isAuthSessionMissingError } from "@supabase/supabase-js";

import type { CurrentUser } from "@/data/contracts/current-user";
import { mapCurrentUser } from "@/data/mappers/current-user-mapper";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isAuthSessionMissingError(error)) return null;
    throw new Error("Failed to read the current Auth user.");
  }

  return data.user ? mapCurrentUser(data.user) : null;
}
