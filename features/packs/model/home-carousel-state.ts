import type { CarouselPlacement } from "./arc-carousel-geometry";
import type { PackCarouselReturnState, PackCarouselSnapshot } from "./pack-carousel-return-state";

export type PackCollection = "joined" | "all";
export type CarouselContent = PackCollection | "calendar";
export type CalendarSnapshot = { month: string; position: number };
export type CarouselSnapshot = PackCarouselSnapshot | CalendarSnapshot;
export type CarouselAssignments = Record<CarouselPlacement, CarouselContent>;
export type CarouselSwapPhase = "idle" | "exiting" | "entering";
export type HomeCarouselState = {
  topCollection: CarouselContent;
  bottomCollection: CarouselContent;
  snapshots: Record<CarouselContent, CarouselSnapshot | null>;
};
export type HomeCarouselSelection = HomeCarouselState & { settings: CarouselAssignments };
export type CarouselSelectionAction = CarouselPlacement | "preview";

export const COLLECTION_LABELS: Record<CarouselContent, string> = {
  joined: "用户 Pack",
  all: "所有 Pack",
  calendar: "日历",
};

export function normalizeCarouselAssignments(assignments?: CarouselAssignments): { top: "calendar"; bottom: PackCollection } {
  const bottom = assignments?.bottom === "joined" || assignments?.bottom === "all" ? assignments.bottom
    : assignments?.top === "joined" || assignments?.top === "all" ? assignments.top : "all";
  return { top: "calendar", bottom };
}

export function getCarouselAssignments(
  topCollection: CarouselContent,
  bottomCollection: CarouselContent = topCollection === "joined" ? "all" : "joined",
): CarouselAssignments {
  return { top: topCollection, bottom: bottomCollection };
}

export function getSpareCollection(assignments: CarouselAssignments): CarouselContent {
  return (["joined", "all", "calendar"] as const).find(
    (content) => content !== assignments.top && content !== assignments.bottom,
  )!;
}

export function createHomeCarouselState(
  saved: PackCarouselReturnState | null,
  settings?: CarouselAssignments,
): HomeCarouselState {
  const previous = saved?.topCollection
    ? getCarouselAssignments(saved.topCollection, saved.bottomCollection)
    : settings ?? normalizeCarouselAssignments();
  const assignments = normalizeCarouselAssignments(previous);
  // Old sessions could open a Pack from the top. Keep that collection on return,
  // but move it to the now-permanent bottom Pack wheel.
  if (saved && !saved.completedDate && previous[saved.source] !== "calendar") {
    assignments.bottom = previous[saved.source] as PackCollection;
  }
  return {
    topCollection: assignments.top,
    bottomCollection: assignments.bottom,
    snapshots: {
      joined: null,
      all: null,
      calendar: null,
      ...saved?.snapshots,
      ...(saved?.carousels.top ? { [previous.top]: saved.carousels.top } : {}),
      ...(saved?.carousels.bottom ? { [previous.bottom]: saved.carousels.bottom } : {}),
    },
  };
}

export function captureHomeCarousels(
  state: HomeCarouselState,
  snapshots: Record<CarouselPlacement, CarouselSnapshot | null>,
): HomeCarouselState {
  return {
    ...state,
    snapshots: {
      ...state.snapshots,
      [state.topCollection]: snapshots.top ? { ...snapshots.top } : null,
      [state.bottomCollection]: snapshots.bottom ? { ...snapshots.bottom } : null,
    },
  };
}

export function selectHomeCarousel(
  state: HomeCarouselSelection,
  action: CarouselSelectionAction,
): HomeCarouselSelection {
  const settings = normalizeCarouselAssignments(state.settings);
  if (action === "bottom") settings.bottom = settings.bottom === "joined" ? "all" : "joined";
  return {
    ...state,
    settings,
    // Legacy top/preview actions are deliberately inert after layout migration.
    topCollection: "calendar",
    bottomCollection: settings.bottom,
  };
}

export function getChangedCarouselPlacements(before: HomeCarouselState, after: HomeCarouselState): CarouselPlacement[] {
  const changed: CarouselPlacement[] = [];
  if (before.topCollection !== after.topCollection) changed.push("top");
  if (before.bottomCollection !== after.bottomCollection) changed.push("bottom");
  return changed;
}
