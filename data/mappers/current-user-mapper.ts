import type { CurrentUser } from "../contracts/current-user";

export type CurrentUserRecord = {
  id: unknown;
  email?: unknown;
  created_at: unknown;
};

export function mapCurrentUser(user: CurrentUserRecord): CurrentUser {
  if (
    typeof user.id !== "string" || user.id.trim().length === 0 ||
    typeof user.email !== "string" || user.email.trim().length === 0 ||
    typeof user.created_at !== "string" || user.created_at.trim().length === 0
  ) {
    throw new Error("Invalid current Auth user.");
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
  };
}
