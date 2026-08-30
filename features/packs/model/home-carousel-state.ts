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
  const assignments = saved?.topCollection
    ? getCarouselAssignments(saved.topCollection, saved.bottomCollection)
    : settings ?? getCarouselAssignments("joined");
  return {
    topCollection: assignments.top,
    bottomCollection: assignments.bottom,
    snapshots: {
      joined: null,
      all: null,
      calendar: null,
      ...saved?.snapshots,
      [assignments.top]: saved?.carousels.top ?? null,
      [assignments.bottom]: saved?.carousels.bottom ?? null,
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
  const spare = getSpareCollection(state.settings);
  const settings = action === "preview" ? state.settings : { ...state.settings, [action]: spare };
  return {
    ...state,
    settings,
    // A settings edit exits temporary viewing. Never promote the other side's
    // temporary content to a saved setting as a side effect of changing one row.
    topCollection: action === "preview" ? spare : settings.top,
    bottomCollection: settings.bottom,
  };
}

export function getChangedCarouselPlacements(before: HomeCarouselState, after: HomeCarouselState): CarouselPlacement[] {
  const changed: CarouselPlacement[] = [];
  if (before.topCollection !== after.topCollection) changed.push("top");
  if (before.bottomCollection !== after.bottomCollection) changed.push("bottom");
  return changed;
}
