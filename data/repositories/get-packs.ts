import type {
  PackDetail,
  PackSummary,
} from "@/data/contracts/pack-summary";
import {
  JOINED_PACK_FIXTURES,
  PACK_DETAIL_FIXTURES,
  PACK_FIXTURES,
} from "@/data/fixtures/pack-fixtures";

export function getPacks(): readonly PackSummary[] {
  return PACK_FIXTURES;
}

export function getJoinedPacks(): readonly PackSummary[] {
  return JOINED_PACK_FIXTURES;
}

export function getPackBySlug(slug: string): PackDetail | null {
  return PACK_DETAIL_FIXTURES.find((pack) => pack.slug === slug) ?? null;
}
