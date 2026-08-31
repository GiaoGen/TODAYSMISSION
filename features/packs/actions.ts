"use server";

import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type TakePackActionResult =
  | { ok: true }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failedTake(message: string): TakePackActionResult {
  return { ok: false, error: message };
}

export async function takePackAction(packId: string): Promise<TakePackActionResult> {
  if (!UUID_PATTERN.test(packId)) return failedTake("That Pack is unavailable.");

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (isAuthSessionMissingError(authError)) return failedTake("Please log in to take a Pack.");
    return failedTake("We couldn't verify your login. Please try again.");
  }

  const user = userData.user;
  if (!user || user.is_anonymous) return failedTake("Please log in to take a Pack.");

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .select("id,slug")
    .eq("id", packId)
    .eq("is_published", true)
    .maybeSingle();

  if (packError) return failedTake("We couldn't verify this Pack. Please try again.");
  if (!pack) return failedTake("That Pack is unavailable.");

  const { error: insertError } = await supabase
    .from("pack_memberships")
    .insert({ user_id: user.id, pack_id: pack.id });

  if (insertError && insertError.code !== "23505") {
    return failedTake("We couldn't take this Pack right now. Please try again.");
  }

  revalidatePath("/");
  revalidatePath(`/pack/${pack.slug}`);
  return { ok: true };
}
