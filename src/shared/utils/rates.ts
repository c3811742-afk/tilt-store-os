import type { Brand, BrandTerms, CountryCode, CurrencyCode, ExchangeRate, IsoDate, IsoDateTime, VatRate } from '@/shared/types';
import { toIsoDate } from './dates';

// What 1 unit of `currency` is worth in the base currency on `date`: the latest rate recorded on or before it.
// The base currency itself is always 1. Null when no rate is recorded yet.
export const rateOn = (rates: readonly ExchangeRate[], currency: CurrencyCode, date: IsoDate | IsoDateTime, base: CurrencyCode): number | null => {
  if (currency === base) return 1;
  const day = toIsoDate(date);
  const match = rates
    .filter((rate) => rate.currency === currency && rate.date <= day)
    .sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at))[0];
  return match?.rate ?? null;
};

// Converts an amount between two currencies at the rates of `date`.
// `fromRate` overrides the rate of the source currency (a sale keeps the rate of its own day).
export const convert = (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  date: IsoDate | IsoDateTime,
  rates: readonly ExchangeRate[],
  base: CurrencyCode,
  fromRate?: number,
) => {
  if (from === to) return amount;
  const source = fromRate ?? rateOn(rates, from, date, base) ?? 1;
  const target = rateOn(rates, to, date, base) ?? 1;
  return (amount * source) / target;
};

// The VAT rate (percent) of a country on a date: the latest one that started on or before it.
export const vatRateOn = (vatRates: readonly VatRate[], countryCode: CountryCode, date: IsoDate | IsoDateTime) => {
  const day = toIsoDate(date);
  return (
    vatRates
      .filter((rate) => rate.countryCode === countryCode && rate.startDate <= day)
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.at.localeCompare(a.at))[0]?.rate ?? 0
  );
};

// A brand's terms on a date: the latest version that started on or before it (the first one before any).
export const termsOn = (brand: Brand, date: IsoDate | IsoDateTime): BrandTerms => {
  const day = toIsoDate(date);
  const sorted = [...brand.termsHistory].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return (sorted.filter((version) => version.effectiveFrom <= day).at(-1) ?? sorted[0]).terms;
};

export const currentTerms = (brand: Brand) => termsOn(brand, new Date().toISOString());
