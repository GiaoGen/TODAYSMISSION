import { notFound } from "next/navigation";

import { getPackBySlug, getPacks } from "@/data/repositories/get-packs";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPacks().map((pack) => ({ slug: pack.slug }));
}

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const pack = getPackBySlug(slug);

  if (!pack) {
    notFound();
  }

  return <MissionPackDetail pack={pack} />;
}
