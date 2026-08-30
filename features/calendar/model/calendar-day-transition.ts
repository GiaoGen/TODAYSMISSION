import type { CarouselPlacement } from "../../packs/model/arc-carousel-geometry";
import type { CarouselAssignments } from "../../packs/model/home-carousel-state";
import { normalizeCarouselAssignments } from "../../packs/model/home-carousel-state.ts";
import type { PackCarouselReturnState } from "../../packs/model/pack-carousel-return-state";

export function getDayGalleryId(date: string) {
  return `completed-${date}`;
}

export function getDayTransitionName(date: string, placement: CarouselPlacement) {
  return `calendar-${placement}-${date}`;
}

export function getDayGalleryHref(date: string) {
  return `/completed/${encodeURIComponent(date)}`;
}

// A refreshed/deep-linked gallery has no live wheel snapshot. Restore this month
// in the fixed top calendar without rewriting the user's saved Pack selection.
export function createDirectDayReturnState(date: string, settings: CarouselAssignments): PackCarouselReturnState {
  const source = "top";
  const calendar = { month: date.slice(0, 7), position: Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 };
  return {
    source, packId: getDayGalleryId(date), completedDate: date,
    topCollection: "calendar",
    bottomCollection: normalizeCarouselAssignments(settings).bottom,
    snapshots: { joined: null, all: null, calendar },
    carousels: { top: calendar, bottom: null },
  };
}
