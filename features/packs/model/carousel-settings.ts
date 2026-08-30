import type { CarouselAssignments, CarouselContent } from "./home-carousel-state";

export const CAROUSEL_SETTINGS_KEY = "todaysmission:carousel-settings:v1";
export const DEFAULT_CAROUSEL_SETTINGS: Readonly<CarouselAssignments> = { top: "joined", bottom: "all" };
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
    if (record.version !== 1 || !isContent(record.top) || !isContent(record.bottom) || record.top === record.bottom) return null;
    return { top: record.top, bottom: record.bottom };
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
          sessionSettings = parseCarouselSettings(getStorage()?.getItem(CAROUSEL_SETTINGS_KEY) ?? null);
        } catch {
          // Storage access itself can be denied; keep the frontend usable.
        }
      }
      sessionSettings ??= { ...DEFAULT_CAROUSEL_SETTINGS };
      return { ...sessionSettings };
    },
    save(settings: CarouselAssignments): boolean {
      if (!isContent(settings.top) || !isContent(settings.bottom) || settings.top === settings.bottom) return false;
      sessionSettings = { top: settings.top, bottom: settings.bottom };
      try {
        const storage = getStorage();
        if (!storage) return false;
        // Never persist temporary views, snapshots, account data or motion state.
        storage.setItem(CAROUSEL_SETTINGS_KEY, JSON.stringify({ version: 1, ...sessionSettings }));
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
