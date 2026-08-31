export default async function CompletedMissionsPage({ params }: { params: Promise<{ date: string }> }) {
  await params;
  return <p>Completed mission history is unavailable.</p>;
}
