"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/features/auth/model/safe-next-path";

const PENDING_EMAIL_COOKIE = "tm_pending_email";
const PENDING_EMAIL_MAX_AGE = 10 * 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthActionState = {
  error?: string;
  message?: string;
};

function getFormText(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getSafeNextFromForm(formData: FormData) {
  return getSafeNextPath(getFormText(formData, "next"));
}

function authErrorMessage(error: { message?: string; status?: number }): string {
  const message = error.message ?? "";
  if (error.status === 429 || /rate|too many|retry|limit/i.test(message)) {
    return "Please wait a moment before requesting another code.";
  }
  if (/invalid.*email|email.*invalid/i.test(message)) {
    return "Enter a valid email address.";
  }
  return "We couldn't send a code right now. Please try again.";
}

function setPendingEmail(cookieStore: Awaited<ReturnType<typeof cookies>>, email: string) {
  cookieStore.set({
    name: PENDING_EMAIL_COOKIE,
    value: email,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/login",
    maxAge: PENDING_EMAIL_MAX_AGE,
  });
}

function clearPendingEmail(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set({
    name: PENDING_EMAIL_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/login",
    maxAge: 0,
  });
}

async function sendEmailOtp(email: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
}

export async function sendOtp(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const rawEmail = getFormText(formData, "email");
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };

  const { error } = await sendEmailOtp(email);
  if (error) return { error: authErrorMessage(error) };

  setPendingEmail(await cookies(), email);
  const next = getSafeNextFromForm(formData);
  redirect(`/login?step=otp&next=${encodeURIComponent(next)}`);
}

export async function resendOtp(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  void _previousState;
  void formData;
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) return { error: "Your code request has expired. Start again." };

  const { error } = await sendEmailOtp(email);
  if (error) return { error: authErrorMessage(error) };

  setPendingEmail(cookieStore, email);
  return { message: "A new code was sent." };
}

export async function verifyOtp(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) return { error: "Your code request has expired. Start again." };

  const token = getFormText(formData, "token")?.trim() ?? "";
  if (!/^\d{6}$/.test(token)) return { error: "Enter the six-digit code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "That code was not accepted. Try again or request a new code." };

  clearPendingEmail(cookieStore);
  revalidatePath("/", "layout");
  redirect(getSafeNextPath(getFormText(formData, "next")));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Failed to sign out.");

  clearPendingEmail(await cookies());
  revalidatePath("/", "layout");
  redirect("/");
}
