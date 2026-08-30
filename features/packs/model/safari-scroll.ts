// Deliberately Safari-only: Chrome/Firefox on iOS keep the existing renderer.
// iPad's desktop user agent still includes Version/... Safari/....
export function isSafariUserAgent(userAgent: string) {
  return /AppleWebKit\//.test(userAgent) && /Version\/[\d.]+.*Safari\//.test(userAgent)
    && !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg|OPR|OPiOS|Android|SamsungBrowser/.test(userAgent);
}

export function getNativeCopyCount(count: number, width: number, stride: number, looping: boolean) {
  if (!looping || count <= 1) return 1;
  // A finite buffer covering at least two viewports in either direction.
  // Re-centering is allowed only after momentum has completely stopped.
  return 1 + 2 * Math.max(1, Math.ceil(2 * width / (count * Math.max(1, stride))));
}

export function wrapNativeIndex(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0;
}
