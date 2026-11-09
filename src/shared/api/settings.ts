import { defaultSettings } from '@/shared/constants';
import type { ConfigListKey, ConfigOption, Expense, Id, Settings } from '@/shared/types';
import { addMonths, convert, inRange, monthKey, nowIso, startOfMonth, today, type DateRange } from '@/shared/utils';
import { actor, db, diff, findById, logActivity, mutate, newId, respond } from './server';

// ---- Settings ----------------------------------------------------------------------------------------------------

export const getSettings = () => respond(() => db.settings);

// Saves part of the settings (one page's worth). Every change is in the activity log.
export const updateSettings = (patch: Partial<Settings>) =>
  mutate(() => {
    const before = structuredClone(db.settings);
    Object.assign(db.settings, structuredClone(patch));
    logActivity({ action: 'update', target: { type: 'settings', id: 'settings', label: Object.keys(patch).join(', ') }, changes: diff(before, db.settings, Object.keys(patch) as (keyof Settings)[]) });
    return db.settings;
  });

// Puts some settings back to the values in the shared defaults file.
export const resetSettings = (keys: (keyof Settings)[]) =>
  mutate(() => {
    const patch = Object.fromEntries(keys.map((key) => [key, structuredClone(defaultSettings[key])])) as Partial<Settings>;
    Object.assign(db.settings, patch);
    logActivity({ action: 'update', target: { type: 'settings', id: 'settings', label: keys.join(', ') }, changes: keys.map((key) => ({ field: String(key), from: null, to: 'default' })) });
    return db.settings;
  });

// One of the lists staff choose from (discount reasons, return reasons, expense categories...).
// Options in use are archived, not deleted, so past records keep their label.
export const saveConfigList = (key: ConfigListKey, options: ConfigOption[]) =>
  mutate(() => {
    const before = db.settings.lists[key];
    db.settings.lists[key] = options;
    logActivity({ action: 'update', target: { type: 'settings', id: key, label: key }, changes: [{ field: key, from: before.length, to: options.length }] });
    return options;
  });

export const newOption = (): ConfigOption => ({ id: crypto.randomUUID(), label: { en: '', ar: '' } });

// ---- Expenses ----------------------------------------------------------------------------------------------------

const seriesKey = (expense: Expense) => expense.seriesId ?? `${expense.categoryId}|${expense.branchId ?? ''}|${expense.note}`;

// Monthly expenses repeat by themselves: the months still missing, up to this month.
const dueRepeats = (): Expense[] => {
  const latest = new Map<string, Expense>();
  db.expenses.filter((expense) => expense.repeatMonthly).forEach((expense) => {
    const current = latest.get(seriesKey(expense));
    if (!current || current.date < expense.date) latest.set(seriesKey(expense), expense);
  });
  const thisMonth = monthKey(today());
  return [...latest.values()].flatMap((last) => {
    const due: Expense[] = [];
    for (let date = addMonths(startOfMonth(last.date), 1); monthKey(date) <= thisMonth; date = addMonths(date, 1)) {
      due.push({ ...last, id: newId(), date, seriesId: seriesKey(last), receipt: undefined, at: nowIso() });
    }
    return due;
  });
};

export interface ExpenseFilter {
  range: DateRange;
  branchId?: Id | 'company';
  categoryId?: Id;
}

// A read: it only counts as a change (saved, pages told) when a new month of a monthly expense is added. Otherwise
// every page refresh would be a "change" that refreshes the page again and keeps the save from ever running.
export const listExpenses = async (filter: ExpenseFilter) => {
  const due = await respond(() => dueRepeats().length > 0);
  if (due) await mutate(() => db.expenses.push(...dueRepeats()));
  return respond(() => {
    const { baseCurrency, reportingCurrency } = db.settings;
    const rows = db.expenses
      .filter(
        (expense) =>
          inRange(expense.date, filter.range) &&
          (!filter.branchId || (filter.branchId === 'company' ? expense.branchId === null : expense.branchId === filter.branchId)) &&
          (!filter.categoryId || expense.categoryId === filter.categoryId),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((expense) => ({ expense, converted: convert(expense.amount, expense.currency, reportingCurrency, expense.date, db.rates, baseCurrency) }));
    return { rows, total: rows.reduce((sum, row) => sum + row.converted, 0), currency: reportingCurrency };
  });
};

export type ExpenseInput = Omit<Expense, 'id' | 'byId' | 'at' | 'seriesId'>;

export const saveExpense = (input: ExpenseInput, expenseId?: Id) =>
  mutate(() => {
    if (expenseId) {
      const expense = findById(db.expenses, expenseId);
      const before = { ...expense };
      Object.assign(expense, input);
      logActivity({ action: 'update', target: { type: 'expense', id: expense.id, label: expense.note }, branchId: expense.branchId ?? undefined, changes: diff(before, expense, ['categoryId', 'branchId', 'amount', 'currency', 'date', 'repeatMonthly', 'note']) });
      return expense;
    }
    const expense: Expense = { ...input, id: newId(), byId: actor().id, at: nowIso() };
    db.expenses.push(expense);
    logActivity({ action: 'create', target: { type: 'expense', id: expense.id, label: expense.note }, branchId: expense.branchId ?? undefined, amount: expense.amount, currency: expense.currency });
    return expense;
  });

export const deleteExpense = (expenseId: Id) =>
  mutate(() => {
    const expense = findById(db.expenses, expenseId);
    db.expenses = db.expenses.filter((current) => current.id !== expenseId);
    // A deleted monthly expense stops repeating.
    if (expense.repeatMonthly) db.expenses.filter((current) => seriesKey(current) === seriesKey(expense)).forEach((current) => (current.repeatMonthly = false));
    logActivity({ action: 'delete', target: { type: 'expense', id: expenseId, label: expense.note }, amount: expense.amount, currency: expense.currency });
    return true;
  });
