'use client';

import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { getSyncStatus } from '@/lib/sync';
import { useEffect, useState } from 'react';

export default function ConnectionIndicator() {
  const { isOnline } = useConnectionStatus();
  const [syncStatus, setSyncStatus] = useState({ syncInProgress: false });

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const baseClasses =
    'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg shadow-lg';

  if (syncStatus.syncInProgress) {
    return (
      <div className={`${baseClasses} bg-blue-500 text-white`}>
        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
        <span className="text-xs sm:text-sm">Syncing...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`${baseClasses} bg-orange-500 text-white`}>
        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white rounded-full"></div>
        <span className="text-xs sm:text-sm">Offline</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-green-500 text-white`}>
      <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white rounded-full"></div>
      <span className="text-xs sm:text-sm">Online</span>
    </div>
  );
}

