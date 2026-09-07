"use client";

import { useSyncExternalStore } from "react";

import type { CurrentUser } from "@/data/contracts/current-user";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSessionSnapshot,
} from "@/features/navigation/model/session-snapshot";
import { NavigationPrefetch } from "@/features/navigation/components/NavigationPrefetch";
import { HomePackCarousels, type HomePackCarouselsProps } from "./HomePackCarousels";

type HomeCarouselEntryProps = {
  packs: HomePackCarouselsProps["packs"];
  initialRegisteredOn: string;
  today: string;
  onLogout: HomePackCarouselsProps["onLogout"];
};

export function HomeCarouselEntry({ packs, initialRegisteredOn, onLogout, today }: HomeCarouselEntryProps) {
  const sessionSnapshot = useSyncExternalStore(
    subscribeSessionSnapshot,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const currentUser: CurrentUser | null = sessionSnapshot.currentUser;
  const joinedIds = new Set(sessionSnapshot.joinedPackIds);
  const joinedPacks = packs.filter((pack) => joinedIds.has(pack.id));
  const calendar: MissionCalendarData = {
    registeredOn: sessionSnapshot.registeredOn ?? initialRegisteredOn,
    completedOn: sessionSnapshot.completedDates,
  };

  return <>
    <NavigationPrefetch packs={packs} completedDates={calendar.completedOn} />
    <HomePackCarousels
      calendar={calendar}
      currentUser={currentUser}
      joinedPacks={joinedPacks}
      onLogout={onLogout}
      packs={packs}
      today={today}
    />
  </>;
}
