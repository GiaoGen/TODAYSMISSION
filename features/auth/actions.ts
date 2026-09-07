"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/features/auth/model/safe-next-path";
import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

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

function getCredentials(formData: FormData) {
  const rawEmail = getFormText(formData, "email");
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  const password = getFormText(formData, "password") ?? "";
  return { email, password };
}

function validateCredentials(email: string, password: string): string | null {
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

function authErrorMessage(
  error: { code?: string; message?: string; status?: number },
  operation: "signin" | "signup",
): string {
  const message = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (error.status === 429 || /rate|too many|retry|limit/.test(message)) {
    return "Please wait a moment and try again.";
  }
  if (operation === "signin" && /email[_ ]not[_ ]confirmed/.test(message)) {
    return "Please confirm your email before signing in.";
  }
  if (operation === "signin" && /invalid login credentials|invalid_credentials/.test(message)) {
    return "Email or password is incorrect.";
  }
  if (/invalid.*email|email.*invalid/.test(message)) {
    return "Enter a valid email address.";
  }
  if (operation === "signup" && /already registered|user already exists/.test(message)) {
    return "An account with this email already exists. Try signing in.";
  }
  if (operation === "signup" && /password/.test(message)) {
    return "That password does not meet the account requirements.";
  }
  return operation === "signin"
    ? "We couldn't sign you in right now. Please try again."
    : "We couldn't create your account right now. Please try again.";
}

async function getEmailRedirectTo(next: string): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = origin ?? (host ? `${protocol}://${host}` : null);

  if (!baseUrl) throw new Error("Unable to determine the email confirmation URL.");

  const callbackUrl = new URL("/auth/callback", baseUrl);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData);
  const validationError = validateCredentials(email, password);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await getEmailRedirectTo(getSafeNextFromForm(formData)),
    },
  });
  if (error) return { error: authErrorMessage(error, "signup") };

  return { message: "Check your email to confirm your account." };
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData);
  const validationError = validateCredentials(email, password);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error, "signin") };

  revalidatePath("/", "layout");
  redirect(getSafeNextFromForm(formData));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Failed to sign out.");

  revalidatePath("/", "layout");
  redirect("/");
}
