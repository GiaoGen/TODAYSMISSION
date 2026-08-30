"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PackSummary } from "@/data/contracts/pack-summary";
import type { CarouselPlacement } from "@/features/packs/model/arc-carousel-geometry";
import {
  getPackCarouselReturnState,
  setPackCarouselReturnState,
  resolveCarouselState,
} from "@/features/packs/model/pack-carousel-return-state";
import {
  createHomeCarouselState,
  exchangeHomeCarousels,
  getCarouselAssignments,
  type CarouselSwapPhase,
  type HomeCarouselState,
} from "@/features/packs/model/home-carousel-state";
import { animateCarouselPair } from "@/features/packs/model/carousel-swap-motion";
import {
  getHomePreferences,
  setHomePreferences,
  type HomePreferences,
} from "@/features/packs/model/home-preferences";
import { PACK_OPEN_TRANSITION_TYPE } from "@/features/packs/model/pack-transition";
import { ArcCarousel, type ArcCarouselHandle } from "./ArcCarousel";
import { HomeUserMenu } from "./HomeUserMenu";

type HomePackCarouselsProps = {
  packs: readonly PackSummary[];
  joinedPacks: readonly PackSummary[];
  mockLoginName: string;
};

type CarouselView = HomeCarouselState & { phase: CarouselSwapPhase };

export function HomePackCarousels({ packs, joinedPacks, mockLoginName }: HomePackCarouselsProps) {
  const router = useRouter();
  const [returnState] = useState(getPackCarouselReturnState);
  const [view, setView] = useState<CarouselView>(() => ({
    ...createHomeCarouselState(returnState), phase: "idle",
  }));
  const [preferences, setPreferences] = useState(getHomePreferences);
  const [ready, setReady] = useState(returnState === null);
  const [menuOpen, setMenuOpen] = useState(false);
  const topRef = useRef<ArcCarouselHandle>(null);
  const bottomRef = useRef<ArcCarouselHandle>(null);
  const navigationLockRef = useRef(false);
  const swapLockRef = useRef(false);
  const menuOpenRef = useRef(false);
  const pendingSwapRef = useRef<HomeCarouselState | null>(null);
  const assignments = getCarouselAssignments(view.topCollection);
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
        topRef.current?.resume();
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
    const motion = animateCarouselPair({ top, bottom }, phase, reducedMotion);
    void motion.finished.then(() => {
      if (disposed) return;
      if (phase === "exiting" && pendingSwapRef.current) {
        setView({ ...pendingSwapRef.current, phase: "entering" });
        pendingSwapRef.current = null;
      } else {
        setView((current) => ({ ...current, phase: "idle" }));
      }
    });
    return () => {
      disposed = true;
      motion.cancel();
    };
  }, [view.phase, view.topCollection]);

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

  const swapCollections = () => {
    if (navigationLockRef.current || swapLockRef.current) return;
    swapLockRef.current = true;
    pendingSwapRef.current = exchangeHomeCarousels(view, {
      top: topRef.current?.freezeAndSnapshot() ?? null,
      bottom: bottomRef.current?.freezeAndSnapshot() ?? null,
    });
    setView((current) => ({ ...current, phase: "exiting" }));
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
    setPackCarouselReturnState({
      source,
      topCollection: view.topCollection,
      packId: pack.id,
      carousels: {
        top: topRef.current?.freezeAndSnapshot() ?? null,
        bottom: bottomRef.current?.freezeAndSnapshot() ?? null,
      },
    });
    router.push(`/pack/${encodeURIComponent(pack.slug)}`, {
      scroll: false,
      transitionTypes: [PACK_OPEN_TRANSITION_TYPE],
    });
  };

  return (
    <>
      <ArcCarousel
        key={`top-${assignments.top}`}
        packs={collections[assignments.top]}
        placement="top"
        collection={assignments.top}
        initialCarouselState={resolveCarouselState(
          collections[assignments.top], Math.min(24, collections[assignments.top].length),
          assignments.top, view.snapshots[assignments.top],
          returnState?.source === "top" ? returnState.packId : undefined,
        )}
        interactionDisabled={busy || menuOpen}
        swappingIn={view.phase === "entering"}
        ref={topRef}
        onOpenPack={openPack}
      />
      <ArcCarousel
        key={`bottom-${assignments.bottom}`}
        packs={collections[assignments.bottom]}
        collection={assignments.bottom}
        initialCarouselState={resolveCarouselState(
          collections[assignments.bottom], Math.min(24, collections[assignments.bottom].length),
          assignments.bottom, view.snapshots[assignments.bottom],
          returnState?.source === "bottom" ? returnState.packId : undefined,
        )}
        interactionDisabled={busy || menuOpen}
        swappingIn={view.phase === "entering"}
        ref={bottomRef}
        onOpenPack={openPack}
      />
      <HomeUserMenu
        busy={busy}
        loginName={preferences.loggedOut ? "Guest" : mockLoginName}
        theme={preferences.theme}
        topCollection={view.topCollection}
        onMenuChange={changeMenu}
        onSwap={swapCollections}
        onThemeChange={() => updatePreferences({
          ...preferences,
          theme: preferences.theme === "light" ? "dark" : "light",
        })}
        onLogout={() => updatePreferences({ ...preferences, loggedOut: true })}
      />
    </>
  );
}
