import { notFound } from "next/navigation";
import { getCompletedMissionsByDate, getCompletionDates } from "@/data/repositories/get-completed-missions";
import { MissionGallery } from "@/features/packs/components/MissionGallery";
import { getDayGalleryId } from "@/features/calendar/model/calendar-day-transition";

export function generateStaticParams() {
  return getCompletionDates().map((date) => ({ date }));
}

export default async function CompletedMissionsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const day = getCompletedMissionsByDate(date);
  if (!day) notFound();

  return <MissionGallery id={getDayGalleryId(date)} title={`${date} 已完成的 Mission / Completed Missions`}
    hero={day.missions[0]} missions={day.missions} completedDate={date} />;
}
