import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * PWA install prompt component.
 * Shows an "Install LIFEY" button when the browser supports
 * and fires the beforeinstallprompt event.
 */
export function PwaInstallPrompt() {
  const { isInstallable, install } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg bg-purple-600 p-4 text-white shadow-lg">
      <p className="mb-2 text-sm font-medium">Install LIFEY for the best experience</p>
      <button
        onClick={install}
        className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-50"
      >
        Install LIFEY
      </button>
    </div>
  );
}
