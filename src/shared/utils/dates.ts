import type { IsoDate, IsoDateTime } from '@/shared/types';

const dayMs = 86_400_000;

// A date as YYYY-MM-DD in the browser's time zone.
export const toIsoDate = (date: Date | string = new Date()): IsoDate => {
  const value = new Date(date);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

export const nowIso = (): IsoDateTime => new Date().toISOString();
export const today = () => toIsoDate();

export const addDays = (date: IsoDate, days: number): IsoDate => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return toIsoDate(value);
};

export const addMonths = (date: IsoDate, months: number): IsoDate => {
  const value = new Date(`${date}T12:00:00`);
  value.setMonth(value.getMonth() + months);
  return toIsoDate(value);
};

export const daysBetween = (from: IsoDate | IsoDateTime, to: IsoDate | IsoDateTime) =>
  Math.round((new Date(toIsoDate(to)).getTime() - new Date(toIsoDate(from)).getTime()) / dayMs);

export const monthKey = (date: IsoDate | IsoDateTime) => toIsoDate(date).slice(0, 7); // 2026-11
export const startOfMonth = (date: IsoDate) => `${date.slice(0, 7)}-01`;
export const endOfMonth = (date: IsoDate) => addDays(addMonths(startOfMonth(date), 1), -1);

// Weeks start on Saturday, as in Egypt and Saudi Arabia.
const weekStartDay = 6;
export const startOfWeek = (date: IsoDate) => {
  const day = new Date(`${date}T12:00:00`).getDay();
  return addDays(date, -((day - weekStartDay + 7) % 7));
};

export interface DateRange {
  from: IsoDate;
  to: IsoDate; // inclusive
}

export const periodPresets = ['today', 'week', 'month', 'last7', 'last30', 'last90', 'custom'] as const;
export type PeriodPreset = (typeof periodPresets)[number];

export const presetRange = (preset: Exclude<PeriodPreset, 'custom'>, day: IsoDate = today()): DateRange => {
  switch (preset) {
    case 'today':
      return { from: day, to: day };
    case 'week':
      return { from: startOfWeek(day), to: day };
    case 'month':
      return { from: startOfMonth(day), to: day };
    case 'last7':
      return { from: addDays(day, -6), to: day };
    case 'last30':
      return { from: addDays(day, -29), to: day };
    case 'last90':
      return { from: addDays(day, -89), to: day };
  }
};

// The period just before, of the same length (this week so far -> the same days last week).
export const previousRange = ({ from, to }: DateRange): DateRange => {
  const length = daysBetween(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(to, -length) };
};

// What a period is compared with: the period just before it, the same days a month or a year earlier, or a day the
// person picks (a single day is compared with that day; a longer period with as many days from the start of that
// day's week).
export type CompareTo = 'previous' | 'lastMonth' | 'lastYear' | 'date';

export const compareRange = (range: DateRange, compareTo: CompareTo, date?: IsoDate): DateRange => {
  const length = daysBetween(range.from, range.to);
  switch (compareTo) {
    case 'lastMonth':
      return { from: addMonths(range.from, -1), to: addMonths(range.to, -1) };
    case 'lastYear':
      return { from: addMonths(range.from, -12), to: addMonths(range.to, -12) };
    case 'date': {
      if (!date) return previousRange(range);
      const from = length === 0 ? date : startOfWeek(date);
      return { from, to: addDays(from, length) };
    }
    default:
      return previousRange(range);
  }
};

export const inRange = (date: IsoDate | IsoDateTime, { from, to }: DateRange) => {
  const day = toIsoDate(date);
  return day >= from && day <= to;
};

export const datesIn = ({ from, to }: DateRange) => {
  const days: IsoDate[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
};
