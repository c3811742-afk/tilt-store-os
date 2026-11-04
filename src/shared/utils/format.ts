import type { Locale } from '@/shared/theme';

export const formatNumber = (value: number, locale: Locale) => new Intl.NumberFormat(locale).format(value);

export const formatPrice = (amount: number, currency: string, locale: Locale) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

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
