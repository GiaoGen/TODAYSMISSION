import type { CarouselPlacement } from "./arc-carousel-geometry";
import type { PackCarouselReturnState, PackCarouselSnapshot } from "./pack-carousel-return-state";

export type PackCollection = "joined" | "all";
export type CarouselSwapPhase = "idle" | "exiting" | "entering";
export type HomeCarouselState = {
  topCollection: PackCollection;
  snapshots: Record<PackCollection, PackCarouselSnapshot | null>;
};

export const COLLECTION_LABELS: Record<PackCollection, string> = {
  joined: "用户 Pack",
  all: "所有 Pack",
};

// Store one choice, so both wheels can never select the same collection.
export function getCarouselAssignments(topCollection: PackCollection): Record<CarouselPlacement, PackCollection> {
  return { top: topCollection, bottom: topCollection === "joined" ? "all" : "joined" };
}

export function createHomeCarouselState(saved: PackCarouselReturnState | null): HomeCarouselState {
  const topCollection = saved?.topCollection ?? "joined";
  const assignments = getCarouselAssignments(topCollection);
  return {
    topCollection,
    snapshots: {
      [assignments.top]: saved?.carousels.top ?? null,
      [assignments.bottom]: saved?.carousels.bottom ?? null,
    } as HomeCarouselState["snapshots"],
  };
}

export function exchangeHomeCarousels(
  state: HomeCarouselState,
  snapshots: Record<CarouselPlacement, PackCarouselSnapshot | null>,
): HomeCarouselState {
  const assignments = getCarouselAssignments(state.topCollection);
  return {
    topCollection: assignments.bottom,
    snapshots: {
      [assignments.top]: snapshots.top ? { ...snapshots.top } : null,
      [assignments.bottom]: snapshots.bottom ? { ...snapshots.bottom } : null,
    } as HomeCarouselState["snapshots"],
  };
}
