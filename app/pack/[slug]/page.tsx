import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPackBySlug, getPacks } from "@/data/repositories/get-packs";
import { PackPublicShell } from "@/features/packs/components/PackPublicShell";
import { PackUserState } from "./PackUserState";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const packs = await getPacks();
  return packs.map((pack) => ({ slug: pack.slug }));
}

export default async function PackDetailPage({ params }: PackDetailPageProps) {
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
