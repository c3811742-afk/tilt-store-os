import { storageKeys } from '@/shared/constants';
import { safeAsync, storage } from '@/shared/utils';

// Whether the app is offline, and how many changes are waiting to sync. The demo keeps its data in the browser,
// so working offline is simulated: changes made while offline are counted, and "synced" when the connection returns.
export interface ConnectionState {
  offline: boolean; // no internet: the browser lost its connection, or offline mode is turned on (demo)
  simulated: boolean; // offline mode turned on from the account menu
  pending: number; // changes made while offline, waiting to sync
  syncedAt?: string; // the last time waiting changes were sent
}

const browserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const load = (): Omit<ConnectionState, 'offline'> => {
  const saved = storage.get(storageKeys.connection);
  if (!saved) return { simulated: false, pending: 0 };
  try {
    return JSON.parse(saved) as Omit<ConnectionState, 'offline'>;
  } catch (error) {
    console.error('Unreadable connection state, starting fresh', error);
    return { simulated: false, pending: 0 };
  }
};

let state = load();
const listeners = new Set<() => void>();

export const getConnection = (): ConnectionState => ({ ...state, offline: state.simulated || browserOffline() });

const update = (next: Partial<typeof state>) => {
  state = { ...state, ...next };
  storage.set(storageKeys.connection, JSON.stringify(state));
  listeners.forEach((listener) => listener());
};

// Runs `listener` when the connection or the waiting changes change. Returns the unsubscribe function.
export const onConnectionChange = (listener: () => void) => {
  listeners.add(listener);
  const browserChanged = () => {
    if (!browserOffline()) void syncPending();
    listener();
  };
  window.addEventListener('online', browserChanged);
  window.addEventListener('offline', browserChanged);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('online', browserChanged);
    window.removeEventListener('offline', browserChanged);
  };
};

// Called for every change: while offline it waits to sync.
export const countOfflineChange = () => {
  if (getConnection().offline) update({ pending: state.pending + 1 });
};

const syncDelayMs = 1200;

// Sends the waiting changes once the connection is back.
export const syncPending = async () => {
  if (getConnection().offline || !state.pending) return;
  await new Promise((resolve) => setTimeout(resolve, syncDelayMs));
  update({ pending: 0, syncedAt: new Date().toISOString() });
};

// Turns the demo's offline mode on or off. Turning it off syncs what was waiting.
export const setOfflineMode = (offline: boolean) => {
  update({ simulated: offline });
  if (!offline) void safeAsync(syncPending);
};
