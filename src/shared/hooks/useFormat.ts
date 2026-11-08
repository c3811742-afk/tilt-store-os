import { useMemo } from 'react';
import type { Id, Localized } from '@/shared/types';
import { countryName, currencyName, formatDate, formatDateTime, formatNumber, formatPercent, formatPrice, formatTime, localized } from '@/shared/utils';
import { useLocale } from './useLocale';
import { useReference } from './useReference';

// Formatters bound to the active language, and names looked up from the reference data.
// Pages use these instead of calling the formatters with the locale each time.
export const useFormat = () => {
  const { locale, text } = useLocale();
  const reference = useReference();

  return useMemo(() => {
    const branchById = new Map(reference.branches.map((branch) => [branch.id, branch]));
    const brandById = new Map(reference.brands.map((brand) => [brand.id, brand]));
    const categoryById = new Map(reference.categories.map((category) => [category.id, category]));
    const userById = new Map(reference.users.map((user) => [user.id, user]));
    const roleById = new Map(reference.roles.map((role) => [role.id, role]));
    const paymentById = new Map(reference.settings.paymentMethods.map((method) => [method.id, method]));
    const listOptions = Object.values(reference.settings.lists).flat();
    const optionById = new Map(listOptions.map((option) => [option.id, option]));

    return {
      money: (amount: number, currency: string = reference.settings.reportingCurrency) => formatPrice(amount, currency, locale),
      number: (value: number) => formatNumber(value, locale),
      percent: (value: number, digits?: number) => formatPercent(value, locale, digits),
      date: (value: string) => formatDate(value, locale),
      dateTime: (value: string) => formatDateTime(value, locale),
      time: (value: string) => formatTime(value, locale),
      shortDate: (value: string) => formatDate(value, locale, { day: 'numeric', month: 'short' }),
      month: (value: string) => formatDate(`${value.slice(0, 7)}-01T12:00:00`, locale, { month: 'long', year: 'numeric' }),
      text: (value: Localized | undefined) => localized(value, locale),
      country: (code: string) => countryName(code, locale),
      currency: (code: string) => `${code} · ${currencyName(code, locale)}`,
      branch: (id: Id | null | undefined) => (id ? (branchById.get(id)?.name ?? text.common.unknown) : text.common.wholeCompany),
      brand: (id: Id | undefined) => (id ? (brandById.get(id)?.name ?? text.common.unknown) : ''),
      category: (id: Id | undefined) => localized(id ? categoryById.get(id)?.name : undefined, locale) || text.common.unknown,
      user: (id: Id | undefined) => (id ? (userById.get(id)?.name ?? text.common.unknown) : ''),
      role: (id: Id) => localized(roleById.get(id)?.name, locale),
      payment: (id: Id) => localized(paymentById.get(id)?.name, locale) || id,
      option: (id: Id | undefined) => (id ? localized(optionById.get(id)?.label, locale) || text.common.unknown : ''),
    };
  }, [locale, reference, text]);
};
