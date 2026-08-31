export type PackMembership = {
  packId: string;
  joinedAt: string;
};

export type PackMembershipByPack = Record<string, PackMembership>;
