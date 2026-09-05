import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPackBySlug } from "@/data/repositories/get-packs";
import { PackPublicShell } from "@/features/packs/components/PackPublicShell";
import { PackUserState } from "./PackUserState";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default function PackDetailPage({ params }: PackDetailPageProps) {
  return (
    <Suspense fallback={null}>
      <PackRouteContent params={params} />
    </Suspense>
  );
}

async function PackRouteContent({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const pack = await getPackBySlug(slug);

  if (!pack) {
    notFound();
  }

  return (
    <Suspense fallback={<PackPublicShell pack={pack} />}>
      <PackUserState pack={pack} />
    </Suspense>
  );
}
