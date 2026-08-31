export function getPackLoginDestination(packSlug: string): string {
  return `/login?next=${encodeURIComponent(`/pack/${packSlug}`)}`;
}
