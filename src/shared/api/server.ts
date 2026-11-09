import { mockConfig, storageKeys } from '@/shared/constants';
import type { ActivityAction, ActivityChange, ActivityEntry, ActivityTarget, AlertKind, Id, StaffAlertKind, User } from '@/shared/types';
import { compressText, decompressText, nowIso, safeAsync, storage, tabStorage } from '@/shared/utils';
import { buildSeed } from '@/shared/mocks/seed';
import type { Database } from './database';
import { countOfflineChange } from './connection';
import { ApiError } from './errors';

export const newId = () => crypto.randomUUID();

const loadSaved = async (): Promise<Database | null> => {
  const saved = storage.get(storageKeys.database);
  if (!saved) return null;
  const result = await safeAsync(async () => JSON.parse(await decompressText(saved)) as Database);
  // Unreadable or older saved data: start again from the seed.
  return result.ok && result.data.version === mockConfig.databaseVersion ? result.data : null;
};

// The in-memory "database", loaded once: the changes saved in this browser, or fresh seed data.
export let db = undefined as unknown as Database;
export const ready = (async () => {
  db = (await loadSaved()) ?? buildSeed();
})();

let saveTimer: ReturnType<typeof setTimeout> | undefined;
const saveDelayMs = 500;

const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void safeAsync(async () => storage.set(storageKeys.database, await compressText(JSON.stringify(db))));
  }, saveDelayMs);
};

const listeners = new Set<() => void>();

// Runs `listener` after every change (e.g. the dashboard updating after a checkout). Returns the unsubscribe function.
export const onDataChange = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const changed = () => {
  countOfflineChange();
  save();
  setTimeout(() => listeners.forEach((listener) => listener()));
};

// Another tab of this browser saved (e.g. the manager approving in one tab while the cashier waits in another): load
// what it saved and refresh this tab's pages, so several people can use the demo side by side. A change still waiting
// to be saved here is dropped, because the newer saved data already counts from the other tab.
window.addEventListener('storage', (event) => {
  if (event.key !== storageKeys.database || !event.newValue) return;
  clearTimeout(saveTimer);
  void loadSaved().then((saved) => {
    if (!saved) return;
    db = saved;
    listeners.forEach((listener) => listener());
  });
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Simulates a network call: waits, sometimes fails (see mockConfig), then runs `handle`.
// Returns a copy, so a page can't change the stored data by accident.
export const respond = async <T>(handle: () => T): Promise<T> => {
  await ready;
  await wait(mockConfig.delayMs);
  if (Math.random() < mockConfig.failureRate) throw new ApiError('network');
  return structuredClone(handle());
};

// Like respond, for calls that change data: saves and tells the listeners afterwards.
export const mutate = async <T>(handle: () => T): Promise<T> => {
  const result = await respond(handle);
  changed();
  return result;
};

// Replaces all the data with a backup (IT admin › Backups › Restore).
export const replaceDatabase = async (data: Database) => {
  await ready;
  await wait(mockConfig.delayMs);
  db = data;
  changed();
};

// Puts the seed data back (Settings › Reset demo data).
export const resetDatabase = async () => {
  await ready;
  await wait(mockConfig.delayMs);
  db = buildSeed();
  changed();
};

// ---- Session -------------------------------------------------------------------------------------------------

// Who is signed in, per tab: each tab keeps its own person (a cashier in one tab, the manager in another), and a new
// tab starts as whoever signed in last in this browser.
export const sessionUserId = () => {
  const own = tabStorage.get(storageKeys.session);
  if (own !== null) return own;
  const last = storage.get(storageKeys.session);
  if (last) tabStorage.set(storageKeys.session, last);
  return last;
};

export const setSessionUserId = (userId: string) => {
  tabStorage.set(storageKeys.session, userId);
  storage.set(storageKeys.session, userId);
};

// The signed-in user, or an error the page shows as "Please sign in again".
export const actor = (): User => {
  const user = db.users.find((current) => current.id === sessionUserId() && current.status !== 'inactive');
  if (!user) throw new ApiError('signedOut');
  return user;
};

export const isOwner = (user: User) => user.roleIds.some((roleId) => db.roles.find((role) => role.id === roleId)?.builtIn === 'owner');

export const ownerIds = () => db.users.filter((user) => user.status === 'active' && isOwner(user)).map((user) => user.id);

// ---- Lookups ---------------------------------------------------------------------------------------------------

export const findById = <T extends { id: string }>(list: T[], id: string): T => {
  const item = list.find((current) => current.id === id);
  if (!item) throw new ApiError('notFound');
  return item;
};

// The next document number of a kind: S-000124, TR-0031...
export const nextNumber = (kind: string, digits = 5) => {
  db.counters[kind] = (db.counters[kind] ?? 0) + 1;
  return `${kind}-${String(db.counters[kind]).padStart(digits, '0')}`;
};

// ---- Activity log and alerts ---------------------------------------------------------------------------------

interface LogInput {
  action: ActivityAction;
  target: { type: ActivityTarget; id: Id; label: string };
  changes?: ActivityChange[];
  amount?: number;
  currency?: string;
  branchId?: Id;
  userId?: Id;
  at?: string;
  flagged?: boolean; // set by the caller when one of the owner's flag rules matches
}

// Every change goes through here, so nothing is missing from the activity log.
export const logActivity = (input: LogInput): ActivityEntry => {
  const entry: ActivityEntry = {
    id: newId(),
    at: input.at ?? nowIso(),
    userId: input.userId ?? actor().id,
    branchId: input.branchId,
    action: input.action,
    target: input.target,
    changes: input.changes,
    amount: input.amount,
    currency: input.currency,
    flagged: input.flagged ?? false,
  };
  db.activity.unshift(entry);
  return entry;
};

// The changed fields between two versions of a record, for the activity log.
export const diff = <T extends object>(before: T, after: T, fields: (keyof T)[]): ActivityChange[] =>
  fields
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field: String(field), from: toLogValue(before[field]), to: toLogValue(after[field]) }));

const toLogValue = (value: unknown) =>
  value === undefined || value === null ? null : typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean);

// Sends an alert to the owners who have it turned on, plus any `extraUserIds` (e.g. the branch manager).
// `includeOwners: false` sends it only to `extraUserIds` (e.g. a cashier's alert with a link to a cashier page).
export const notify = (kind: AlertKind | StaffAlertKind, params: Record<string, string>, link: string, extraUserIds: readonly Id[] = [], includeOwners = true) => {
  const owners = includeOwners && kind in db.settings.ownerAlerts && db.settings.ownerAlerts[kind as AlertKind] ? ownerIds() : [];
  const muted = (userId: Id) => db.users.find((user) => user.id === userId)?.mutedAlerts?.some((current) => current === kind) ?? false;
  const userIds = [...new Set([...owners, ...extraUserIds])].filter((userId) => !muted(userId));
  if (!userIds.length) return;
  db.notifications.unshift({ id: newId(), at: nowIso(), kind, userIds, openedBy: [], params, link });
};
