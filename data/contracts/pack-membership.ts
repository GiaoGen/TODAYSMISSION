export type PackMembership = {
  activeMissionId: string | null;
  packId: string;
  joinedAt: string;
};

export type PackMembershipByPack = Record<string, PackMembership>;
