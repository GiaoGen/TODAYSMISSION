import type { CarouselAssignments, CarouselContent } from "./home-carousel-state";
import { normalizeCarouselAssignments } from "./home-carousel-state.ts";

export const CAROUSEL_SETTINGS_KEY = "todaysmission:carousel-settings:v2";
const LEGACY_SETTINGS_KEY = "todaysmission:carousel-settings:v1";
export const DEFAULT_CAROUSEL_SETTINGS: Readonly<CarouselAssignments> = { top: "calendar", bottom: "all" };
type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

function isContent(value: unknown): value is CarouselContent {
  return value === "joined" || value === "all" || value === "calendar";
}

export function parseCarouselSettings(value: string | null): CarouselAssignments | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if ((record.version !== 1 && record.version !== 2) || !isContent(record.top) || !isContent(record.bottom) || record.top === record.bottom) return null;
    if (record.version === 2 && (record.top !== "calendar" || record.bottom === "calendar")) return null;
    return normalizeCarouselAssignments({ top: record.top, bottom: record.bottom });
  } catch {
    return null;
  }
}

export function createCarouselSettingsStore(getStorage: () => SettingsStorage | null) {
  let sessionSettings: CarouselAssignments | null = null;
  return {
    read(): CarouselAssignments {
      if (!sessionSettings) {
        try {
          const storage = getStorage();
          sessionSettings = parseCarouselSettings(storage?.getItem(CAROUSEL_SETTINGS_KEY) ?? null)
            ?? parseCarouselSettings(storage?.getItem(LEGACY_SETTINGS_KEY) ?? null);
        } catch {
          // Storage access itself can be denied; keep the frontend usable.
        }
      }
      sessionSettings ??= { ...DEFAULT_CAROUSEL_SETTINGS };
      return { ...sessionSettings };
    },
    save(settings: CarouselAssignments): boolean {
      if (settings.top !== "calendar" || (settings.bottom !== "joined" && settings.bottom !== "all")) return false;
      sessionSettings = { top: settings.top, bottom: settings.bottom };
      try {
        const storage = getStorage();
        if (!storage) return false;
        // Never persist temporary views, snapshots, account data or motion state.
        storage.setItem(CAROUSEL_SETTINGS_KEY, JSON.stringify({ version: 2, ...sessionSettings }));
        return true;
      } catch {
        return false;
      }
    },
  };
}

// Read only after the client entry is hydrated. The server never touches storage.
export const carouselSettingsStore = createCarouselSettingsStore(
  () => typeof window === "undefined" ? null : window.localStorage,
);
