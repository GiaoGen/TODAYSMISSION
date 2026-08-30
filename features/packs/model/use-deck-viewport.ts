"use client";

import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  const pointer = window.matchMedia("(pointer: coarse)");
  window.addEventListener("resize", notify);
  pointer.addEventListener("change", notify);
  return () => {
    window.removeEventListener("resize", notify);
    pointer.removeEventListener("change", notify);
  };
}

const snapshot = () => `${window.innerWidth},${window.innerHeight},${Number(window.matchMedia("(pointer: coarse)").matches)}`;
const serverSnapshot = () => "1440,900,0";

// Both ends of the shared-cover transition need the same geometry on the first
// navigation commit, before React collects the shared-element snapshots.
export function useDeckViewport() {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [width, height, coarse] = value.split(",").map(Number);
  return { width, height, coarsePointer: coarse === 1 };
}
