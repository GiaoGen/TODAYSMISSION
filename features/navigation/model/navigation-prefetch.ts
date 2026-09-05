import type { PackSummary } from "../../../data/contracts/pack-summary";
import type { useRouter } from "next/navigation";
import { getDayGalleryHref } from "../../calendar/model/calendar-day-transition.ts";
import { monthNumber, parseDateKey } from "../../calendar/model/calendar-month.ts";

type RouterPrefetchOptions = NonNullable<Parameters<ReturnType<typeof useRouter>["prefetch"]>[1]>;

export type RoutePrefetcher = {
  prefetch: (href: string, options?: RouterPrefetchOptions) => void;
};

export type RoutePrefetchInvalidationHandler = (href: string) => void;

export const HISTORICAL_PREFETCH_BATCH_SIZE = 8;

const prefetchedRoutes = new Map<string, object>();

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function getPackDetailRoutes(packs: readonly Pick<PackSummary, "slug">[]): string[] {
  return unique(packs
    .map((pack) => pack.slug.trim())
    .filter(Boolean)
    .map((slug) => `/pack/${encodeURIComponent(slug)}`));
}

export function getCompletedDayRoute(date: string): string | null {
  return parseDateKey(date) ? getDayGalleryHref(date) : null;
}

export function getCompletedDayRoutes(dates: readonly string[]): string[] {
  return unique(dates
    .map(getCompletedDayRoute)
    .filter((route): route is string => route !== null));
}

export function getPriorityCompletedDates(dates: readonly string[], today = new Date()): string[] {
  const currentMonth = monthNumber(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`);
  return unique(dates)
    .filter((date) => parseDateKey(date) !== null)
    .filter((date) => {
      const month = monthNumber(date);
      return month >= currentMonth - 1 && month <= currentMonth + 1;
    })
    .sort();
}

export function getHistoricalCompletedDates(dates: readonly string[], priorityDates: readonly string[]): string[] {
  const priority = new Set(priorityDates);
  return unique(dates)
    .filter((date) => parseDateKey(date) !== null && !priority.has(date))
    .sort();
}

export function createCompletedRoutePrefetchPlan(dates: readonly string[], today = new Date()) {
  const priorityDates = getPriorityCompletedDates(dates, today);
  const historicalDates = getHistoricalCompletedDates(dates, priorityDates);
  return {
    priorityRoutes: getCompletedDayRoutes(priorityDates),
    historicalRoutes: getCompletedDayRoutes(historicalDates),
  } as const;
}

export function batchRoutes(routes: readonly string[], batchSize = HISTORICAL_PREFETCH_BATCH_SIZE): string[][] {
  if (!Number.isInteger(batchSize) || batchSize < 1) return [];
  const batches: string[][] = [];
  for (let index = 0; index < routes.length; index += batchSize) {
    batches.push([...routes.slice(index, index + batchSize)]);
  }
  return batches;
}

export function prefetchNavigationRoute(
  router: RoutePrefetcher,
  href: string,
  onInvalidate?: RoutePrefetchInvalidationHandler,
): boolean {
  if (prefetchedRoutes.has(href)) return false;
  const request = {};
  prefetchedRoutes.set(href, request);
  try {
    router.prefetch(href, {
      kind: "full" as RouterPrefetchOptions["kind"],
      onInvalidate: () => {
        if (prefetchedRoutes.get(href) !== request) return;
        prefetchedRoutes.delete(href);
        onInvalidate?.(href);
      },
    });
    return true;
  } catch {
    // A failed warm-up must not affect a later normal navigation.
    if (prefetchedRoutes.get(href) === request) prefetchedRoutes.delete(href);
    return false;
  }
}

export function prefetchPackRoutes(
  router: RoutePrefetcher,
  packs: readonly Pick<PackSummary, "slug">[],
  onInvalidate?: RoutePrefetchInvalidationHandler,
): number {
  return getPackDetailRoutes(packs).filter((route) => prefetchNavigationRoute(router, route, onInvalidate)).length;
}

export function prefetchCompletedRoutes(
  router: RoutePrefetcher,
  routes: readonly string[],
  onInvalidate?: RoutePrefetchInvalidationHandler,
): number {
  return routes.filter((route) => prefetchNavigationRoute(router, route, onInvalidate)).length;
}

export function getPrefetchedRoutesForTests(): readonly string[] {
  return [...prefetchedRoutes.keys()];
}

export function resetNavigationPrefetchForTests() {
  prefetchedRoutes.clear();
}
