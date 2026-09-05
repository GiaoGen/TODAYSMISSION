import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/data/repositories/get-current-user";
import { getCompletedMissionsByDate } from "@/data/repositories/get-completed-missions";
import { getDayGalleryId } from "@/features/calendar/model/calendar-day-transition";
import { parseDateKey } from "@/features/calendar/model/calendar-month";
import { getMyMissionExperienceAction } from "@/features/missions/actions";
import { CompletedMissionGallery } from "@/features/packs/components/CompletedMissionGallery";

// This route is user-specific and is warmed with an explicit full prefetch
// from Home. Keep its existing blocking data contract while Pack adopts the
// cached public shell boundary.
export const instant = false;

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
    <CompletedMissionGallery
      id={getDayGalleryId(day.date)}
      title={`${day.date} Completed Missions`}
      date={day.date}
      missions={day.missions}
      currentUserId={currentUser.id}
      loadMissionExperiences={getMyMissionExperienceAction}
    />
  );
}
