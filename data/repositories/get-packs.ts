import type { PackDetail, PackSummary } from "@/data/contracts/pack-summary";
import { cacheLife, cacheTag } from "next/cache";
import {
  mapPackDetail,
  type PackDetailRow,
} from "@/data/mappers/pack-mapper";
import { createPublicClient } from "@/lib/supabase/public-server";

const PACK_DETAIL_SELECT = `
  id,slug,title,description,design_key,theme_key,sort_order,
  missions!missions_pack_id_fkey(
    id,slug,title,note,tag,code,theme_key,artwork_key,sort_order
  )
`;

function throwReadError(scope: string, error: { message: string }): never {
  throw new Error(`Failed to read public ${scope}: ${error.message}`);
}

type CachedPublicPack = {
  detail: PackDetail;
  summary: PackSummary;
};

async function getCachedPublicPacks(): Promise<readonly CachedPublicPack[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("public-pack-content");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("packs")
    .select(PACK_DETAIL_SELECT)
    .eq("is_published", true)
    .eq("missions.is_published", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throwReadError("Packs", error);
  }

  return (data as unknown as PackDetailRow[]).map((row, position) => {
    const detail = mapPackDetail(row, position);
    const { missions: _missions, ...summary } = detail;
    void _missions;
    return { detail, summary };
  });
}

export async function getPacks(): Promise<readonly PackSummary[]> {
  const packs = await getCachedPublicPacks();
  return packs.map(({ summary }) => summary);
}

export async function getPackBySlug(slug: string): Promise<PackDetail | null> {
  const pack = (await getCachedPublicPacks()).find(({ detail }) => detail.slug === slug);
  return pack?.detail ?? null;
}
