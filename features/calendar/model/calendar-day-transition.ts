import type { CarouselPlacement } from "../../packs/model/arc-carousel-geometry";
import type { CarouselAssignments } from "../../packs/model/home-carousel-state";
import { normalizeCarouselAssignments } from "../../packs/model/home-carousel-state.ts";
import type { PackCarouselReturnState } from "../../packs/model/pack-carousel-return-state";
import { PACK_CLOSE_TRANSITION_TYPE } from "../../packs/model/pack-transition.ts";

// Keep the date as origin/target; only returning artwork shrinks to a point.
export const CALENDAR_DAY_TRANSITION_CLASSES = {
  default: "calendar-day-morph",
  [PACK_CLOSE_TRANSITION_TYPE]: "calendar-day-dismiss",
};

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
