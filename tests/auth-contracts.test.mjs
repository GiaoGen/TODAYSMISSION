import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mapCurrentUser } from "../data/mappers/current-user-mapper.ts";
import { getSafeNextPath } from "../features/auth/model/safe-next-path.ts";

const authActions = readFileSync(new URL("../features/auth/actions.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
const loginPage = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const loginForm = readFileSync(new URL("../app/login/LoginForm.tsx", import.meta.url), "utf8");

test("safe next paths accept the current site routes only", () => {
  assert.equal(getSafeNextPath("/"), "/");
  assert.equal(getSafeNextPath("/pack/go-alone"), "/pack/go-alone");
  for (const value of ["https://evil.example", "//evil.example", "pack/go-alone", "/pack/talk-first", ""]) {
    assert.equal(getSafeNextPath(value), "/");
  }
});

test("CurrentUser mapping exposes only the minimal trusted DTO", () => {
  assert.deepEqual(mapCurrentUser({
    id: "user-1",
    email: "user@example.com",
    created_at: "2026-08-31T00:00:00Z",
  }), {
    id: "user-1",
    email: "user@example.com",
    createdAt: "2026-08-31T00:00:00Z",
  });
  assert.throws(() => mapCurrentUser({ id: "user-1", email: null, created_at: "" }), /Invalid current Auth user/);
});

test("email authentication uses password sign-up, confirmation callback and password sign-in", () => {
  assert.match(authActions, /supabase\.auth\.signUp\(\{[\s\S]*emailRedirectTo: await getEmailRedirectTo/);
  assert.match(authActions, /supabase\.auth\.signInWithPassword\(\{ email, password \}\)/);
  assert.match(authActions, /Check your email to confirm your account\./);
  assert.match(authActions, /redirect\(getSafeNextFromForm\(formData\)\)/);
  assert.doesNotMatch(authActions, /signInWithOtp|verifyOtp|resendOtp|tm_pending_email|PENDING_EMAIL/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /getSafeNextPath\(url\.searchParams\.get\("next"\)\)/);
  assert.doesNotMatch(callback, /tm_pending_email|PENDING_EMAIL/);
  assert.match(loginPage, /query\.mode === "signup" \? "signup" : "signin"/);
  assert.match(loginForm, /name="password"/);
  assert.match(loginForm, /name="confirmPassword"/);
  assert.doesNotMatch(loginForm, /6-digit|resendOtp|verifyOtp|pending email|confirmation link/);
});
