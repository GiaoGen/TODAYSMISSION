"use client";

import type { PackDetail } from "@/data/contracts/pack-summary";

import { MissionGallery } from "./MissionGallery";

export function PackPublicShell({ pack }: { pack: PackDetail }) {
  return (
    <MissionGallery
      id={pack.id}
      title={pack.title}
      hero={pack}
      missions={pack.missions}
      expandMissions={false}
    />
  );
}
