"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PackSummary } from "@/data/contracts/pack-summary";
import type { CurrentUser } from "@/data/contracts/current-user";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import type { CarouselPlacement } from "@/features/packs/model/arc-carousel-geometry";
import type { CarouselHandle } from "@/features/packs/model/carousel-handle";
import {
  getPackCarouselReturnState,
  setPackCarouselReturnState,
  resolveCarouselState,
} from "@/features/packs/model/pack-carousel-return-state";
import {
  createHomeCarouselState,
  captureHomeCarousels,
  selectHomeCarousel,
  getChangedCarouselPlacements,
  normalizeCarouselAssignments,
  type CarouselSwapPhase,
  type HomeCarouselSelection,
} from "@/features/packs/model/home-carousel-state";
import { carouselSettingsStore } from "@/features/packs/model/carousel-settings";
import { animateCarouselPair } from "@/features/packs/model/carousel-swap-motion";
import {
  getHomePreferences,
  setHomePreferences,
  type HomePreferences,
} from "@/features/packs/model/home-preferences";
import { PACK_OPEN_TRANSITION_TYPE } from "@/features/packs/model/pack-transition";
import { ArcCarousel } from "./ArcCarousel";
import { HomeUserMenu } from "./HomeUserMenu";
import { CalendarCarousel } from "@/features/calendar/components/CalendarCarousel";
import { getDayGalleryHref, getDayGalleryId } from "@/features/calendar/model/calendar-day-transition";
import { clearSessionSnapshot } from "@/features/navigation/model/session-snapshot";

export type HomePackCarouselsProps = {
  packs: readonly PackSummary[];
  joinedPacks: readonly PackSummary[];
  currentUser: CurrentUser | null;
  calendar: MissionCalendarData;
  onLogout: () => Promise<void>;
};

type CarouselView = HomeCarouselSelection & { phase: CarouselSwapPhase; changing: readonly CarouselPlacement[] };

export function HomePackCarousels({ packs, joinedPacks, currentUser, calendar, onLogout }: HomePackCarouselsProps) {
  const router = useRouter();
  const [returnState] = useState(getPackCarouselReturnState);
  const [view, setView] = useState<CarouselView>(() => {
    const settings = carouselSettingsStore.read();
    return { ...createHomeCarouselState(returnState, settings), settings, phase: "idle", changing: [] };
  });
  const [preferences, setPreferences] = useState(getHomePreferences);
  const [ready, setReady] = useState(returnState === null);
  const [menuOpen, setMenuOpen] = useState(false);
  const topRef = useRef<CarouselHandle>(null);
  const bottomRef = useRef<CarouselHandle>(null);
  const navigationLockRef = useRef(false);
  const swapLockRef = useRef(false);
  const menuOpenRef = useRef(false);
  const pendingSwapRef = useRef<HomeCarouselSelection | null>(null);
  const assignments = normalizeCarouselAssignments({ top: view.topCollection, bottom: view.bottomCollection });
  const collections = { joined: joinedPacks, all: packs };
  const busy = !ready || view.phase !== "idle";

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  useLayoutEffect(() => {
    // Freeze the destination before React captures the shared-element snapshot.
    const returning = getPackCarouselReturnState() !== null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    navigationLockRef.current = returning;
    if (returning) {
      topRef.current?.freezeAndSnapshot();
      bottomRef.current?.freezeAndSnapshot();
    }
    const timer = window.setTimeout(() => {
      navigationLockRef.current = false;
      topRef.current?.resume();
      bottomRef.current?.resume();
      setReady(true);
    }, returning && !reducedMotion && "startViewTransition" in document ? 520 : 0);
    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (view.phase === "idle") {
      swapLockRef.current = false;
      if (!menuOpenRef.current && !navigationLockRef.current) {
        // A bottom swap never paused the calendar; resuming it would restart
        // its spring and interrupt a month gesture still in progress.
        if (view.changing.length === 0) topRef.current?.resume();
        bottomRef.current?.resume();
      }
      return;
    }

    const top = topRef.current?.getElement();
    const bottom = bottomRef.current?.getElement();
    if (!top || !bottom) return;
    let disposed = false;
    const phase = view.phase;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = animateCarouselPair(
      { top, bottom }, phase, reducedMotion, view.changing,
    );
    void motion.finished.then(() => {
      if (disposed) return;
      if (phase === "exiting" && pendingSwapRef.current) {
        const next = pendingSwapRef.current;
        setView((current) => ({ ...next, phase: "entering", changing: current.changing }));
        pendingSwapRef.current = null;
      } else {
        setView((current) => ({ ...current, phase: "idle" }));
      }
    });
    return () => {
      disposed = true;
      motion.cancel();
    };
  }, [view.phase, view.topCollection, view.bottomCollection, view.changing]);

  const changeMenu = (open: boolean) => {
    if (open && (navigationLockRef.current || swapLockRef.current)) return false;
    menuOpenRef.current = open;
    setMenuOpen(open);
    if (open) {
      topRef.current?.freezeAndSnapshot();
      bottomRef.current?.freezeAndSnapshot();
    } else if (!navigationLockRef.current && !swapLockRef.current) {
      topRef.current?.resume();
      bottomRef.current?.resume();
    }
    return true;
  };

  const changeCollection = () => {
    if (navigationLockRef.current || swapLockRef.current || menuOpenRef.current) return;
    const captured = {
      ...view,
      snapshots: { ...view.snapshots, [view.bottomCollection]: bottomRef.current?.freezeAndSnapshot() ?? null },
    };
    // The calendar stays mounted and keeps its live month, even during a swap.
    const next = selectHomeCarousel({ ...captured, settings: { top: "calendar", bottom: assignments.bottom } }, "bottom");
    const changing = getChangedCarouselPlacements(view, next);
    carouselSettingsStore.save(next.settings);
    if (changing.length === 0) {
      setView({ ...next, phase: "idle", changing });
      return;
    }
    swapLockRef.current = true;
    pendingSwapRef.current = next;
    setView((current) => ({ ...current, settings: next.settings, phase: "exiting", changing }));
  };

  const updatePreferences = (next: HomePreferences) => {
    setHomePreferences(next);
    setPreferences(next);
  };

  const openPack = (pack: PackSummary, source: CarouselPlacement) => {
    if (navigationLockRef.current || swapLockRef.current || menuOpenRef.current) return;
    navigationLockRef.current = true;
    setReady(false);

    // Capture both live positions, including a wheel still coasting, in one event.
    const carousels = {
      top: topRef.current?.freezeAndSnapshot() ?? null,
      bottom: bottomRef.current?.freezeAndSnapshot() ?? null,
    };
    setPackCarouselReturnState({
      source,
      topCollection: view.topCollection,
      bottomCollection: view.bottomCollection,
      snapshots: captureHomeCarousels(view, carousels).snapshots,
      packId: pack.id,
      carousels,
    });
    router.push(`/pack/${encodeURIComponent(pack.slug)}`, {
      scroll: false,
      transitionTypes: [PACK_OPEN_TRANSITION_TYPE],
    });
  };

  const openCompletedDay = (date: string, source: CarouselPlacement) => {
    if (navigationLockRef.current || swapLockRef.current || menuOpenRef.current || !calendar.completedOn.includes(date)) return;
    navigationLockRef.current = true;
    setReady(false);
    const carousels = {
      top: topRef.current?.freezeAndSnapshot() ?? null,
      bottom: bottomRef.current?.freezeAndSnapshot() ?? null,
    };
    setPackCarouselReturnState({
      source, completedDate: date, packId: getDayGalleryId(date), carousels,
      topCollection: view.topCollection, bottomCollection: view.bottomCollection,
      snapshots: captureHomeCarousels(view, carousels).snapshots,
    });
    router.push(getDayGalleryHref(date), {
      scroll: false,
      transitionTypes: [PACK_OPEN_TRANSITION_TYPE],
    });
  };

  return (
    <>
      <CalendarCarousel
        key="top-calendar"
        data={calendar}
        placement="top"
        onOpenDate={openCompletedDay}
        returnDate={returnState?.completedDate}
        snapshot={view.snapshots.calendar}
        interactionDisabled={!ready || menuOpen}
        swappingIn={false}
        ref={topRef}
      />
      <ArcCarousel
        key={`bottom-${assignments.bottom}`}
        packs={collections[assignments.bottom]}
        collection={assignments.bottom}
        initialCarouselState={resolveCarouselState(
          collections[assignments.bottom], Math.min(24, collections[assignments.bottom].length),
          assignments.bottom, view.snapshots[assignments.bottom],
          !returnState?.completedDate ? returnState?.packId : undefined,
        )}
        interactionDisabled={busy || menuOpen}
        swappingIn={view.phase === "entering" && view.changing.includes("bottom")}
        ref={bottomRef}
        onOpenPack={openPack}
      />
      <HomeUserMenu
        busy={busy}
        currentUser={currentUser}
        theme={preferences.theme}
        bottomCollection={assignments.bottom}
        onMenuChange={changeMenu}
        onSwitchPacks={changeCollection}
        onThemeChange={() => updatePreferences({
          ...preferences,
          theme: preferences.theme === "light" ? "dark" : "light",
        })}
        onLogout={() => { clearSessionSnapshot(); void onLogout(); }}
      />
    </>
  );
}
