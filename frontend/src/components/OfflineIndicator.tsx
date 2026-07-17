import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Offline indicator banner.
 * Shows a "You are offline" banner at the top of the app when
 * the browser detects no network connection.
 */
export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      You are offline — some features may be unavailable
    </div>
  );
}
