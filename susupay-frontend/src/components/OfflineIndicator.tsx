import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white text-center text-sm py-1 px-4">
      You are offline. Some features may be unavailable.
    </div>
  );
}
