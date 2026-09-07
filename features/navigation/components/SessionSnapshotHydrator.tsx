"use client";

import { useEffect } from "react";

import type { NavigationUserState } from "@/data/repositories/get-navigation-user-state";
import { hydrateSessionSnapshot } from "../model/session-snapshot";

export function SessionSnapshotHydrator({ state }: { state: NavigationUserState }) {
  useEffect(() => {
    hydrateSessionSnapshot(state);
  }, [state]);

  return null;
}
