import { notFound } from "next/navigation";

import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getPackBySlug } from "@/data/repositories/get-packs";
import { MissionPackDetail } from "@/features/packs/components/MissionPackDetail";

type PackDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PackDetailPage({ params }: PackDetailPageProps) {
  const { slug } = await params;
  const [pack, currentUser] = await Promise.all([
    getPackBySlug(slug),
    getCurrentUser(),
  ]);

  if (!pack) {
    notFound();
  }

  return <MissionPackDetail authenticated={Boolean(currentUser)} pack={pack} />;
}
