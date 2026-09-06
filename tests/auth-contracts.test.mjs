import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mapCurrentUser } from "../data/mappers/current-user-mapper.ts";
import { getSafeNextPath } from "../features/auth/model/safe-next-path.ts";

const authActions = readFileSync(new URL("../features/auth/actions.ts", import.meta.url), "utf8");
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

test("email authentication uses one pure OTP flow for send, resend and verify", () => {
  assert.match(authActions, /signInWithOtp\(\{[\s\S]*shouldCreateUser: true/);
  assert.doesNotMatch(authActions, /emailRedirectTo|getEmailRedirectTo|headers\(\)/);
  assert.match(authActions, /redirect\(`\/login\?step=otp&next=/);
  assert.match(authActions, /verifyOtp\(\{ email, token, type: "email" \}\)/);
  assert.match(loginPage, /const mode = pendingEmail \? "otp" : "email"/);
  assert.doesNotMatch(loginPage, /mode === "sent"|HomePublicShell/);
  assert.match(loginForm, /6-digit code/);
  assert.doesNotMatch(loginForm, /confirmation email|confirmation link|Sign in link|Confirm email/);
});
