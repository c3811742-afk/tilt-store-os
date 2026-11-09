import type { Locale } from '@/shared/theme';

export const formatNumber = (value: number, locale: Locale) => new Intl.NumberFormat(locale).format(value);

// A minus sign sits next to the number, not before the currency ("EGP -2,000", not "-EGP 2,000").
export const formatPrice = (amount: number, currency: string, locale: Locale) => {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    // Whole amounts and totals from 1,000 up are shown without cents.
    maximumFractionDigits: Number.isInteger(amount) || Math.abs(amount) >= wholeAmountsFrom ? 0 : 2,
  }).formatToParts(amount);
  const minus = parts.find((part) => part.type === 'minusSign')?.value;
  if (!minus) return parts.map((part) => part.value).join('');
  const number = parts.findIndex((part) => part.type === 'integer');
  return parts.map((part, index) => (part.type === 'minusSign' ? '' : index === number ? `${minus}${part.value}` : part.value)).join('');
};

const wholeAmountsFrom = 1000;

export const formatDate = (
  date: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) => new Intl.DateTimeFormat(locale, options).format(new Date(date));

const fileSizeUnits = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
const bytesPerUnit = 1024;

// 1536 -> "1.5 kB" / "١٫٥ كيلوبايت"
export const formatFileSize = (bytes: number, locale: Locale) => {
  const unitIndex = Math.min(
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(bytesPerUnit)),
    fileSizeUnits.length - 1,
  );
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: fileSizeUnits[unitIndex],
    maximumFractionDigits: 1,
  }).format(bytes / bytesPerUnit ** unitIndex);
};

// 12.5 -> "12.5%" / "١٢٫٥٪"
export const formatPercent = (value: number, locale: Locale, digits = 1) =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: digits }).format(value / 100);

// "Nov 8, 2026 11:42 PM": the date, a space, then the time (no comma between them).
export const formatDateTime = (date: Date | string, locale: Locale) =>
  `${formatDate(date, locale, { dateStyle: 'medium' })} ${formatDate(date, locale, { timeStyle: 'short' })}`;

// 10:02 / ١٠:٠٢
export const formatTime = (date: Date | string, locale: Locale) => formatDate(date, locale, { timeStyle: 'short' });
