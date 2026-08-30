"use client";

import { useSyncExternalStore } from "react";
import { HomePackCarousels, type HomePackCarouselsProps } from "./HomePackCarousels";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function HomeCarouselEntry(props: HomePackCarouselsProps) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  // Until local settings can be read, show only the persistent page background.
  // No host wrapper here: it would break both wheels' route enter/exit animation.
  // On client-side Pack returns, ready is already true in the navigation commit.
  return ready ? <HomePackCarousels {...props} /> : null;
}
