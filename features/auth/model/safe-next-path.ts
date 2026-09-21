type SafeNextPath =
  | "/"
  | "/explore"
  | "/pack/go-alone"
  | "/pack/doing-things-alone"
  | "/pack/fear-of-rejection"
  | "/pack/talking-to-strangers";

const SAFE_NEXT_PATHS = new Set<string>([
  "/",
  "/explore",
  "/pack/go-alone",
  "/pack/doing-things-alone",
  "/pack/fear-of-rejection",
  "/pack/talking-to-strangers",
]);

export function getSafeNextPath(value: string | null | undefined): SafeNextPath {
  return value && SAFE_NEXT_PATHS.has(value)
    ? value as SafeNextPath
    : "/";
}
