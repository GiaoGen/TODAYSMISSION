import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ExplorePackPreview } from "@/features/packs/components/ExplorePackPreview";
import { ExplorePackTransitionFallback } from "@/features/packs/components/ExplorePackTransitionFallback";
import {
  EXPLORE_PACK_SUMMARIES,
  getExplorePackPreview,
} from "@/features/packs/model/explore-pack-content";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return EXPLORE_PACK_SUMMARIES.map((pack) => ({ slug: pack.slug }));
}

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const pack = getExplorePackPreview(slug);
  if (!pack) {
    notFound();
  }
  return (
    <Suspense fallback={<ExplorePackTransitionFallback pack={pack} />}>
      <ExplorePackPreview pack={pack} />
    </Suspense>
  );
}
