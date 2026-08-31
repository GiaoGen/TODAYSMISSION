import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSafeNextPath } from "@/features/auth/model/safe-next-path";
import { createClient } from "@/lib/supabase/server";

const PENDING_EMAIL_COOKIE = "tm_pending_email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      (await cookies()).set({
        name: PENDING_EMAIL_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/login",
        maxAge: 0,
      });

      return NextResponse.redirect(new URL(getSafeNextPath(url.searchParams.get("next")), url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
