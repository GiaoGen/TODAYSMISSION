type SafeNextPath = "/" | "/explore" | "/pack/go-alone";

const SAFE_NEXT_PATHS = new Set<string>(["/", "/explore", "/pack/go-alone"]);

export function getSafeNextPath(value: string | null | undefined): SafeNextPath {
  return value && SAFE_NEXT_PATHS.has(value)
    ? value as SafeNextPath
    : "/";
}
