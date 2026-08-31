import type { Tables } from "@/data/database.types";
import type { PackMembership, PackMembershipByPack } from "@/data/contracts/pack-membership";

export type PackMembershipRow = Pick<Tables<"pack_memberships">, "pack_id" | "joined_at">;

export function mapPackMembershipRow(row: PackMembershipRow): PackMembership {
  return {
    packId: row.pack_id,
    joinedAt: row.joined_at,
  };
}

export function mapPackMembershipRows(rows: readonly PackMembershipRow[]): PackMembershipByPack {
  return Object.fromEntries(rows.map((row) => {
    const membership = mapPackMembershipRow(row);
    return [membership.packId, membership];
  }));
}
