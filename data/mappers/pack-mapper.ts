import type {
  MissionArtworkKey,
  MissionSummary,
  MissionThemeKey,
  PackDetail,
  PackDesignKey,
  PackSummary,
  PackThemeKey,
} from "@/data/contracts/pack-summary";
import type { Tables } from "@/data/database.types";

type PackRow = Tables<"packs">;
type MissionRow = Tables<"missions">;

type PackContentRow = Pick<
  PackRow,
  "id" | "slug" | "title" | "description" | "design_key" | "theme_key" | "sort_order"
>;

type MissionContentRow = Pick<
  MissionRow,
  "id" | "slug" | "title" | "note" | "tag" | "code" | "theme_key" | "artwork_key" | "sort_order"
>;

export type PackListRow = PackContentRow & {
  missions: readonly { count: number }[];
};

export type PackDetailRow = PackContentRow & {
  missions: readonly MissionContentRow[];
};

const PACK_DESIGN_KEYS = ["field-edition"] as const satisfies readonly PackDesignKey[];
const PACK_THEME_KEYS = ["go-alone", "talk-first", "get-rejected", "be-seen"] as const satisfies readonly PackThemeKey[];
const MISSION_THEME_KEYS = ["coral", "blue", "yellow", "ink", "paper"] as const satisfies readonly MissionThemeKey[];
const MISSION_ARTWORK_KEYS = ["circle", "square", "triangle", "diamond", "ring"] as const satisfies readonly MissionArtworkKey[];

function requireText(value: unknown, field: string, entity: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${entity}: ${field} must be non-empty.`);
  }
  return value;
}

function requireSortOrder(value: unknown, entity: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Invalid ${entity}: sort_order must be a non-negative integer.`);
  }
  return value as number;
}

function fallbackKey<T extends string>(value: unknown, keys: readonly T[], fallback: T, label: string): T {
  if (typeof value === "string" && keys.includes(value as T)) {
    return value as T;
  }

  console.warn(`[content-mapper] Unknown ${label}; using ${fallback}.`);
  return fallback;
}

function mapPackContent(row: PackContentRow): Omit<PackSummary, "number" | "missionCount"> {
  return {
    id: requireText(row.id, "id", "Pack"),
    slug: requireText(row.slug, "slug", "Pack"),
    title: requireText(row.title, "title", "Pack"),
    description: requireText(row.description, "description", "Pack"),
    designKey: fallbackKey(row.design_key, PACK_DESIGN_KEYS, "field-edition", "Pack design key"),
    themeKey: fallbackKey(row.theme_key, PACK_THEME_KEYS, "go-alone", "Pack theme key"),
  };
}

function getMissionCount(value: unknown): number {
  if (!Array.isArray(value) || value.length !== 1 || !Number.isInteger(value[0]?.count) || value[0].count < 0) {
    throw new Error("Invalid Pack: published Mission count response.");
  }
  return value[0].count;
}

export function formatPackNumber(position: number): string {
  if (!Number.isInteger(position) || position < 0) {
    throw new Error("Pack position must be a non-negative integer.");
  }
  return String(position + 1).padStart(2, "0");
}

export function mapMissionSummary(row: MissionContentRow): MissionSummary {
  return {
    id: requireText(row.id, "id", "Mission"),
    slug: requireText(row.slug, "slug", "Mission"),
    title: requireText(row.title, "title", "Mission"),
    note: requireText(row.note, "note", "Mission"),
    tag: requireText(row.tag, "tag", "Mission"),
    code: requireText(row.code, "code", "Mission"),
    themeKey: fallbackKey(row.theme_key, MISSION_THEME_KEYS, "paper", "Mission theme key"),
    artworkKey: fallbackKey(row.artwork_key, MISSION_ARTWORK_KEYS, "circle", "Mission artwork key"),
  };
}

export function mapPackSummary(row: PackListRow, position: number): PackSummary {
  requireSortOrder(row.sort_order, "Pack");

  return {
    ...mapPackContent(row),
    number: formatPackNumber(position),
    missionCount: getMissionCount(row.missions),
  };
}

export function mapPackDetail(row: PackDetailRow, position: number): PackDetail {
  const missions = [...row.missions]
    .sort((left, right) => {
      const sortDifference = requireSortOrder(left.sort_order, "Mission") - requireSortOrder(right.sort_order, "Mission");
      return sortDifference || left.id.localeCompare(right.id);
    })
    .map(mapMissionSummary);

  return {
    ...mapPackContent(row),
    number: formatPackNumber(position),
    missionCount: missions.length,
    missions,
  };
}
