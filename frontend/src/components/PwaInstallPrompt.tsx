import { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { usePlatform } from "../hooks/usePlatform";

/**
 * PWA install prompt component.
 *
 * Chromium browsers (Chrome, Edge, Samsung Internet):
 *   Shows an "Install LIFEY" button when `beforeinstallprompt` fires.
 *
 * Firefox on Android:
 *   `beforeinstallprompt` is not supported. Shows instructions to use
 *   Firefox's built-in "Install" option from the three-dot menu.
 *
 * iOS Safari:
 *   `beforeinstallprompt` is not supported. Shows instructions to use
 *   the Share → Add to Home Screen flow.
 */
export function PwaInstallPrompt() {
  const { isInstallable, install } = useInstallPrompt();
  const { isIOS, isFirefox, isStandalone } = usePlatform();
  const [dismissed, setDismissed] = useState(false);

  // Already installed as PWA — don't show anything
  if (isStandalone) return null;
  if (dismissed) return null;

  // iOS fallback: safari doesn't support beforeinstallprompt
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-neutral-800 bg-neutral-900/95 p-4 text-white shadow-lg backdrop-blur-sm">
        <p className="mb-1 text-sm font-semibold text-purple-400">
          Install LIFEY
        </p>
        <p className="mb-3 text-xs leading-relaxed text-neutral-300">
          Tap the Share button{" "}
          <span className="inline-block font-mono text-sm">⎋</span> then scroll
          down and tap{" "}
          <strong className="text-neutral-50">Add to Home Screen</strong>.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="w-full rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
        >
          Got it
        </button>
      </div>
    );
  }

  // Firefox fallback: doesn't fire beforeinstallprompt either
  if (isFirefox) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-neutral-800 bg-neutral-900/95 p-4 text-white shadow-lg backdrop-blur-sm">
        <p className="mb-1 text-sm font-semibold text-purple-400">
          Install LIFEY
        </p>
        <p className="mb-3 text-xs leading-relaxed text-neutral-300">
          Tap the menu button{" "}
          <span className="inline-block font-mono text-sm">⋮</span> then tap{" "}
          <strong className="text-neutral-50">Install</strong> (or{" "}
          <strong className="text-neutral-50">Add app to Home Screen</strong>
          ).
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="w-full rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
        >
          Got it
        </button>
      </div>
    );
  }

  // Chromium browsers: beforeinstallprompt-based button
  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-purple-600 p-4 text-white shadow-lg">
      <p className="mb-2 text-sm font-medium">
        Install LIFEY for the best experience
      </p>
      <button
        onClick={() => void install()}
        className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-50"
      >
        Install LIFEY
      </button>
    </div>
  );
}
