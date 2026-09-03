"use client";

import { useSyncExternalStore } from "react";
import { useEffect } from "react";
import type { MissionCalendarData } from "@/data/contracts/mission-calendar";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  initializeSessionSnapshot,
  subscribeSessionSnapshot,
} from "@/features/navigation/model/session-snapshot";
import { NavigationPrefetch } from "@/features/navigation/components/NavigationPrefetch";
import { HomePackCarousels, type HomePackCarouselsProps } from "./HomePackCarousels";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function HomeCarouselEntry(props: HomePackCarouselsProps) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const sessionSnapshot = useSyncExternalStore(
    subscribeSessionSnapshot,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const safeProps: HomePackCarouselsProps = props?.calendar ? props : {
    packs: [], joinedPacks: [], currentUser: null,
    calendar: { registeredOn: "1970-01-01", completedOn: [] },
    onLogout: async () => {},
  };
  const { currentUser, joinedPacks, calendar, packs } = safeProps;

  useEffect(() => {
    initializeSessionSnapshot(currentUser?.id ?? null, {
      joinedPackIds: joinedPacks.map((pack) => pack.id),
      completedDates: calendar.completedOn,
    });
  }, [calendar.completedOn, currentUser?.id, joinedPacks]);

  // Only merge the in-memory hint when it belongs to the server-rendered user.
  // This prevents a previous account's snapshot from appearing during login.
  const sameUser = currentUser !== null && sessionSnapshot.userId === currentUser.id;
  const sessionJoinedIds = sameUser
    ? new Set([...joinedPacks.map((pack) => pack.id), ...sessionSnapshot.joinedPackIds])
    : null;
  const effectiveJoinedPacks = sessionJoinedIds
    ? packs.filter((pack) => sessionJoinedIds.has(pack.id))
    : joinedPacks;
  const effectiveCalendar: MissionCalendarData = sessionSnapshot.userId === currentUser?.id && currentUser
    ? {
      ...calendar,
      completedOn: [...new Set([...calendar.completedOn, ...sessionSnapshot.completedDates])].sort(),
    }
    : calendar;

  // Until local settings can be read, show only the persistent page background.
  // No host wrapper here: it would break both wheels' route enter/exit animation.
  // On client-side Pack returns, ready is already true in the navigation commit.
  return ready ? <>
    <NavigationPrefetch packs={packs} completedDates={effectiveCalendar.completedOn} />
    <HomePackCarousels {...safeProps} calendar={effectiveCalendar} joinedPacks={effectiveJoinedPacks} />
  </> : null;
}
