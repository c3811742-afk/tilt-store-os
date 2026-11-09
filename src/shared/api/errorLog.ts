import { storageKeys } from '@/shared/constants';
import { storage, tabStorage } from '@/shared/utils';

// Errors that happened in this browser, for the IT admin to investigate: when, on which page, for whom, and the
// technical message. Every error the app logs with console.error ends up here too.
export interface ErrorEntry {
  id: string;
  at: string;
  page: string;
  userId: string;
  message: string;
}

const keep = 200;

const read = (): ErrorEntry[] => {
  try {
    return JSON.parse(storage.get(storageKeys.errorLog) ?? '[]') as ErrorEntry[];
  } catch {
    return []; // an unreadable log starts again; logging this here would loop back into the log
  }
};

// Pages that were still loading when someone logged out fail with "signed out": that is expected, not a bug.
const expected = (message: string) => message.startsWith('ApiError: signedOut');

export const recordError = (message: string) => {
  if (expected(message)) return;
  const entry: ErrorEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), page: window.location.hash.replace(/^#/, '') || '/', userId: tabStorage.get(storageKeys.session) ?? storage.get(storageKeys.session) ?? '', message: message.slice(0, 2000) };
  storage.set(storageKeys.errorLog, JSON.stringify([entry, ...read()].slice(0, keep)));
};

const describe = (value: unknown) => (value instanceof Error ? `${value.name}: ${value.message}\n${value.stack ?? ''}` : typeof value === 'string' ? value : JSON.stringify(value));

let installed = false;

// Starts catching errors: console.error, uncaught errors and failed promises nobody handled.
export const installErrorLog = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    recordError(args.map(describe).join(' '));
  };
  window.addEventListener('error', (event) => recordError(describe(event.error ?? event.message)));
  window.addEventListener('unhandledrejection', (event) => recordError(describe(event.reason)));
};

export const readErrorLog = () => read();

export const clearErrorLog = () => storage.set(storageKeys.errorLog, '[]');
