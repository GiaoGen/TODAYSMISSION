import { notFound } from "next/navigation";

import { getPackBySlug } from "@/data/repositories/get-packs";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const pack = await getPackBySlug(slug);

  if (!pack) {
    notFound();
  }

  return <MissionPackDetail pack={pack} />;
}
