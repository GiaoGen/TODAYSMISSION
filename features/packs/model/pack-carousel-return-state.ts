import type { PackSummary } from "@/data/contracts/pack-summary";
import type { CarouselPlacement } from "./arc-carousel-geometry";
import type { PackCollection, CarouselContent, CarouselSnapshot, HomeCarouselState } from "./home-carousel-state";

export type PackCarouselSnapshot = {
  activeIndex: number;
  count: number;
  packId: string;
  position: number;
};

export type PackCarouselReturnState = {
  completedDate?: string;
  source: CarouselPlacement;
  topCollection?: CarouselContent;
  bottomCollection?: CarouselContent;
  snapshots?: HomeCarouselState["snapshots"];
  packId: string;
  carousels: Record<CarouselPlacement, CarouselSnapshot | null>;
};

let returnState: PackCarouselReturnState | null = null;
const listeners = new Set<() => void>();

export function getPackCarouselReturnState() {
  return returnState;
}

export function getServerPackCarouselReturnState() {
  return null;
}

export function subscribePackCarouselReturnState(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setPackCarouselReturnState(state: PackCarouselReturnState) {
  returnState = {
    ...state,
    snapshots: state.snapshots ? {
      joined: state.snapshots.joined ? { ...state.snapshots.joined } : null,
      all: state.snapshots.all ? { ...state.snapshots.all } : null,
      calendar: state.snapshots.calendar ? { ...state.snapshots.calendar } : null,
    } : undefined,
    carousels: {
      top: state.carousels.top ? { ...state.carousels.top } : null,
      bottom: state.carousels.bottom ? { ...state.carousels.bottom } : null,
    },
  };
  listeners.forEach((listener) => listener());
}

export function getPackEntrySource(
  packId: string,
  state: PackCarouselReturnState | null,
): CarouselPlacement {
  return state?.packId === packId ? state.source : "bottom";
}

export function createDirectPackReturnState(packId: string): PackCarouselReturnState {
  return { source: "bottom", packId, topCollection: "calendar", bottomCollection: "all", carousels: { top: null, bottom: null } };
}

export function getInitialCarouselState(
  packs: readonly PackSummary[],
  maximumCount: number,
  placement: CarouselPlacement,
  state: PackCarouselReturnState | null,
) {
  return resolveCarouselState(
    packs, maximumCount, placement === "top" ? "joined" : "all",
    state?.carousels[placement] ?? null,
    state?.source === placement ? state.packId : undefined,
  );
}

export type InitialCarouselState = { activeIndex: number; count: number; position: number };

export function resolveCarouselState(
  packs: readonly PackSummary[],
  maximumCount: number,
  collection: PackCollection,
  snapshot: CarouselSnapshot | null,
  requestedPackId?: string,
): InitialCarouselState {
  const saved = snapshot && "packId" in snapshot ? snapshot : null;
  const defaultCount = collection === "joined" ? maximumCount : Math.min(12, maximumCount);
  const defaultIndex = collection === "joined" && defaultCount < 6
    ? Math.floor(defaultCount / 2)
    : 0;
  const fallback = { activeIndex: defaultIndex, count: defaultCount, position: defaultIndex };
  const packId = saved?.packId ?? requestedPackId;
  const packIndex = packId ? packs.findIndex((pack) => pack.id === packId) : -1;

  if (packIndex < 0 || packIndex >= maximumCount) {
    return fallback;
  }

  const count = Math.min(maximumCount, Math.max(saved?.count ?? defaultCount, packIndex + 1));
  const canRestorePosition = saved?.count === count &&
    saved.activeIndex === packIndex && Number.isFinite(saved.position);
  const position = canRestorePosition ? saved.position : packIndex;

  return {
    activeIndex: packIndex,
    count,
    position: count < 6 ? Math.max(0, Math.min(count - 1, position)) : position,
  };
}
