import { backupDefaults, storageKeys } from '@/shared/constants';
import { compressText, decompressText, nowIso, storage, today } from '@/shared/utils';
import type { Database } from './database';
import { ApiError } from './errors';
import { clearErrorLog, readErrorLog } from './errorLog';
import { actor, db, logActivity, mutate, replaceDatabase, respond } from './server';

// The IT admin's tools: every table of the data, fixing a record (with a reason, logged), the error log and the
// daily backups.

const itAdmin = () => {
  const me = actor();
  const allowed = db.roles.some((role) => me.roleIds.includes(role.id) && role.permissions.includes('system.admin'));
  if (!allowed) throw new ApiError('notAllowed');
  return me;
};

type TableName = Exclude<keyof Database, 'version'>;

const tableRows = (name: TableName): Record<string, unknown>[] => {
  const value = db[name] as unknown;
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === 'object') return [{ id: name, ...(value as Record<string, unknown>) }];
  return [];
};

export interface TableInfo {
  name: TableName;
  rows: number;
}

export const listTables = () =>
  respond((): TableInfo[] => {
    itAdmin();
    return (Object.keys(db) as (keyof Database)[]).filter((name): name is TableName => name !== 'version').map((name) => ({ name, rows: tableRows(name).length }));
  });

const pageSize = 50;

// One table's records, newest first where they have a date, filtered by any text in the record.
export const getTable = (name: TableName, query: string, page: number) =>
  respond(() => {
    itAdmin();
    if (!(name in db)) throw new ApiError('notFound');
    const needle = query.trim().toLowerCase();
    const rows = tableRows(name).filter((row) => !needle || JSON.stringify(row).toLowerCase().includes(needle));
    return { total: rows.length, pageSize, rows: rows.slice(page * pageSize, (page + 1) * pageSize).map((row, index) => ({ key: String(row.id ?? `${name}-${page * pageSize + index}`), json: JSON.stringify(row, null, 2) })) };
  });

// Fixes a record damaged by a bug. The reason and the old and new versions go to the activity log.
export const fixRecord = (name: TableName, id: string, json: string, reason: string) =>
  mutate(() => {
    const me = itAdmin();
    if (!reason.trim()) throw new ApiError('noteRequired');
    let next: Record<string, unknown>;
    try {
      next = JSON.parse(json) as Record<string, unknown>;
    } catch {
      throw new ApiError('invalidFile');
    }
    const value = db[name] as unknown;
    if (Array.isArray(value)) {
      const position = value.findIndex((row: { id?: string }) => row.id === id);
      if (position < 0) throw new ApiError('notFound');
      const before = JSON.stringify(value[position]);
      value[position] = { ...next, id };
      logActivity({ action: 'update', target: { type: 'record', id, label: `${name} / ${id}` }, userId: me.id, flagged: true, changes: [{ field: 'reason', from: null, to: reason.trim() }, { field: 'record', from: before.slice(0, 500), to: JSON.stringify(value[position]).slice(0, 500) }] });
      return true;
    }
    if (value && typeof value === 'object') {
      const { id: _id, ...fields } = next;
      Object.assign(value, fields);
      logActivity({ action: 'update', target: { type: 'record', id: name, label: name }, userId: me.id, flagged: true, changes: [{ field: 'reason', from: null, to: reason.trim() }] });
      return true;
    }
    throw new ApiError('notFound');
  });

// ---- Errors ----------------------------------------------------------------------------------------------------

export const listErrors = () =>
  respond(() => {
    itAdmin();
    return readErrorLog().map((entry) => ({ ...entry, userName: db.users.find((user) => user.id === entry.userId)?.name ?? '' }));
  });

export const clearErrors = () =>
  mutate(() => {
    const me = itAdmin();
    clearErrorLog();
    logActivity({ action: 'delete', target: { type: 'record', id: 'errorLog', label: 'Error log' }, userId: me.id });
    return true;
  });

// ---- Backups ---------------------------------------------------------------------------------------------------

interface StoredBackup {
  id: string;
  day: string;
  at: string;
  data: string; // the whole data, compressed
}

const readBackups = (): StoredBackup[] => {
  try {
    return JSON.parse(storage.get(storageKeys.backups) ?? '[]') as StoredBackup[];
  } catch (error) {
    console.error('Unreadable backups, starting a new list', error);
    return [];
  }
};

// Once a day, the first time anyone opens the system, everything is backed up. Only the last few days are kept.
export const runDailyBackup = async () => {
  const day = today();
  const backups = readBackups();
  if (backups.some((backup) => backup.day === day)) return false;
  const data = await compressText(JSON.stringify(db));
  const backup: StoredBackup = { id: crypto.randomUUID(), day, at: nowIso(), data };
  storage.set(storageKeys.backups, JSON.stringify([backup, ...backups].slice(0, backupDefaults.keepDays)));
  return true;
};

export const listBackups = () =>
  respond(() => {
    itAdmin();
    return readBackups().map(({ id, day, at, data }) => ({ id, day, at, size: data.length }));
  });

// The backup as a JSON file, to keep outside the system.
export const downloadBackup = async (backupId: string) => {
  const backup = readBackups().find((current) => current.id === backupId);
  if (!backup) throw new ApiError('notFound');
  return { name: `backup-${backup.day}.json`, json: await decompressText(backup.data) };
};

// Puts all data back as it was in a backup. Everything done since is replaced, so the restore itself is logged.
export const restoreBackup = async (backupId: string) => {
  const me = itAdmin();
  const backup = readBackups().find((current) => current.id === backupId);
  if (!backup) throw new ApiError('notFound');
  const data = JSON.parse(await decompressText(backup.data)) as Database;
  await replaceDatabase(data);
  return mutate(() => {
    logActivity({ action: 'restore', target: { type: 'backup', id: backup.id, label: backup.day }, userId: me.id, flagged: true });
    return true;
  });
};
