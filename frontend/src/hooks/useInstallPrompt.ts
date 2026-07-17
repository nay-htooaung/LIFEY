import { useState, useCallback, useEffect } from 'react';

/**
 * Interface for the non-standard BeforeInstallPromptEvent.
 * This event is fired by Chrome, Edge, and Safari on supported platforms
 * when the PWA is installable.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

/**
 * Hook that captures the `beforeinstallprompt` event and provides
 * an `install` function to trigger the browser's install dialog.
 *
 * Returns:
 * - `isInstallable`: true if the beforeinstallprompt event has been captured
 * - `install`: function to trigger the browser install prompt
 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      // Prevent the default mini-infobar from appearing
      event.preventDefault();
      setPromptEvent(event as unknown as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }, [promptEvent]);

  return { isInstallable: promptEvent !== null, install };
}
