type NavigatorWithStandalone = Navigator & { standalone?: boolean };

/**
 * Hook that detects the user's platform.
 * Used to adapt PWA install prompts per platform.
 */
export function usePlatform() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  // iPad on iPadOS 13+ reports as MacIntel with touch points
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (typeof navigator !== "undefined" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1);

  const isAndroid = /Android/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isChromium =
    /Chrome|CriOS|Edg|SamsungBrowser|Opera/.test(ua) && !isFirefox;
  const isStandalone =
    typeof window !== "undefined" &&
    "standalone" in window.navigator &&
    (window.navigator as NavigatorWithStandalone).standalone === true;

  return { isIOS, isAndroid, isFirefox, isChromium, isStandalone } as const;
}
