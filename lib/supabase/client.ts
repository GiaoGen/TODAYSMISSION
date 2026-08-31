import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/data/database.types";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase browser client is not configured.");
  }

  return createBrowserClient<Database>(supabaseUrl, publishableKey);
}
