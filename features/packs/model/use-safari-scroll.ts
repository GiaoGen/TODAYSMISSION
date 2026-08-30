"use client";

import { useSyncExternalStore } from "react";
import { isSafariUserAgent } from "./safari-scroll";

const subscribe = () => () => {};
const clientSnapshot = () => isSafariUserAgent(window.navigator.userAgent);
const serverSnapshot = () => false;

export function useSafariScroll() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
