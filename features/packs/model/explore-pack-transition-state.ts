let returnSlug: string | null = null;

export function setExplorePackReturnSlug(slug: string) {
  returnSlug = slug;
}

export function getExplorePackReturnSlug() {
  return returnSlug;
}

export function clearExplorePackReturnSlug() {
  returnSlug = null;
}
