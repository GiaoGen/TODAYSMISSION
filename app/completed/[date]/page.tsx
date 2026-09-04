import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getCompletedMissionsByDate } from "@/data/repositories/get-completed-missions";
import { getDayGalleryId } from "@/features/calendar/model/calendar-day-transition";
import { parseDateKey } from "@/features/calendar/model/calendar-month";
import { MissionGallery } from "@/features/packs/components/MissionGallery";

export default async function CompletedMissionsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!parseDateKey(date)) notFound();

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?next=${encodeURIComponent(`/completed/${date}`)}`);
  }

  const day = await getCompletedMissionsByDate(date, currentUser);
  if (!day) notFound();

  return (
    <MissionGallery
      id={getDayGalleryId(day.date)}
      title={`${day.date} Completed Missions`}
      hero={day.missions[0]}
      missions={day.missions}
      completedDate={day.date}
    />
  );
}
