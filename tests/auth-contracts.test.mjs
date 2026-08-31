import assert from "node:assert/strict";
import test from "node:test";

import { mapCurrentUser } from "../data/mappers/current-user-mapper.ts";
import { getSafeNextPath } from "../features/auth/model/safe-next-path.ts";

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
