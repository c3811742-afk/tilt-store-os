import { useSyncExternalStore } from 'react';
import { getConnection, onConnectionChange, type ConnectionState } from '@/shared/api';

let last: ConnectionState = getConnection();
const snapshot = () => {
  const next = getConnection();
  if (JSON.stringify(next) !== JSON.stringify(last)) last = next;
  return last;
};

// Online or offline, and how many changes are waiting to sync. Updates by itself.
export const useConnection = () => useSyncExternalStore(onConnectionChange, snapshot);
