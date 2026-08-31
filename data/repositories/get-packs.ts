import type { PackDetail, PackSummary } from "@/data/contracts/pack-summary";
import {
  mapPackDetail,
  mapPackSummary,
  type PackDetailRow,
  type PackListRow,
} from "@/data/mappers/pack-mapper";
import { createClient } from "@/lib/supabase/server";

const PACK_LIST_SELECT = "id,slug,title,description,design_key,theme_key,sort_order,missions(count)";
const PACK_DETAIL_SELECT = `
  id,slug,title,description,design_key,theme_key,sort_order,
  missions!missions_pack_id_fkey(
    id,slug,title,note,tag,code,theme_key,artwork_key,sort_order
  )
`;

function throwReadError(scope: string, error: { message: string }): never {
  throw new Error(`Failed to read public ${scope}: ${error.message}`);
}

export async function getPacks(): Promise<readonly PackSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packs")
    .select(PACK_LIST_SELECT)
    .eq("is_published", true)
    .eq("missions.is_published", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throwReadError("Packs", error);
  }

  return (data as unknown as PackListRow[]).map(mapPackSummary);
}

export async function getPackBySlug(slug: string): Promise<PackDetail | null> {
  const packs = await getPacks();
  const position = packs.findIndex((pack) => pack.slug === slug);

  if (position < 0) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packs")
    .select(PACK_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("missions.is_published", true)
    .order("sort_order", { ascending: true, referencedTable: "missions" })
    .order("id", { ascending: true, referencedTable: "missions" })
    .maybeSingle();

  if (error) {
    throwReadError("Pack detail", error);
  }

  return data ? mapPackDetail(data as unknown as PackDetailRow, position) : null;
}
