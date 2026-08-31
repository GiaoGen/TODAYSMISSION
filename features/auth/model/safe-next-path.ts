const SAFE_NEXT_PATHS = new Set(["/", "/pack/go-alone"]);

export function getSafeNextPath(value: string | null | undefined): "/" | "/pack/go-alone" {
  return value && SAFE_NEXT_PATHS.has(value)
    ? value as "/" | "/pack/go-alone"
    : "/";
}
