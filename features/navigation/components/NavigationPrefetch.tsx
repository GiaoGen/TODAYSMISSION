"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PackSummary } from "@/data/contracts/pack-summary";
import {
  batchRoutes,
  createCompletedRoutePrefetchPlan,
  prefetchCompletedRoutes,
  prefetchPackRoutes,
} from "../model/navigation-prefetch";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function scheduleWhenIdle(callback: () => void): () => void {
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const id = idleWindow.requestIdleCallback(callback, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(callback, 1000);
  return () => window.clearTimeout(timer);
}

type NavigationPrefetchProps = {
  packs: readonly PackSummary[];
  completedDates: readonly string[];
};

export function NavigationPrefetch({ packs, completedDates }: NavigationPrefetchProps) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const scheduledCleanups: Array<() => void> = [];
    const plan = createCompletedRoutePrefetchPlan(completedDates);
    const historicalBatches = batchRoutes(plan.historicalRoutes);

    const scheduleHistoricalBatch = (index: number) => {
      if (cancelled || index >= historicalBatches.length) return;
      const cleanup = scheduleWhenIdle(() => {
        if (cancelled) return;
        const batch = historicalBatches[index];
        prefetchCompletedRoutes(router, batch);
        scheduleHistoricalBatch(index + 1);
      });
      scheduledCleanups.push(cleanup);
    };

    const cleanupInitial = scheduleWhenIdle(() => {
      if (cancelled) return;
      prefetchPackRoutes(router, packs);
      prefetchCompletedRoutes(router, plan.priorityRoutes);
      scheduleHistoricalBatch(0);
    });
    scheduledCleanups.push(cleanupInitial);

    return () => {
      cancelled = true;
      scheduledCleanups.forEach((cleanup) => cleanup());
    };
  }, [completedDates, packs, router]);

  return null;
}
