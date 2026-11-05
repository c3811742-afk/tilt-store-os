import { newCountrySettings } from '@/shared/constants';
import type { Branch, CountryCode, CurrencyCode, Id, IsoDate, Localized, StockLocation, TaxAuthority, TaxRegistration, TillDevice } from '@/shared/types';
import { nowIso, rateOn, stockLevels, today, vatRateOn } from '@/shared/utils';
import { onHandStatuses } from '@/shared/constants/statuses';
import { ApiError } from './errors';
import { actor, db, diff, findById, logActivity, mutate, newId, notify, respond } from './server';

// ---- Branches -------------------------------------------------------------------------------------------------

export interface BranchListRow {
  branch: Branch;
  stock: number;
  staff: number;
}

export const listBranches = () =>
  respond((): BranchListRow[] => {
    const levels = stockLevels(db.movements);
    return db.branches.map((branch) => ({
      branch,
      stock: levels.filter((level) => level.branchId === branch.id && onHandStatuses.includes(level.status)).reduce((sum, level) => sum + level.qty, 0),
      staff: db.users.filter((user) => user.status === 'active' && user.branchIds.includes(branch.id)).length,
    }));
  });

export const getBranch = (branchId: Id) => respond(() => findById(db.branches, branchId));

export type BranchInput = Omit<Branch, 'id' | 'archived' | 'createdAt'>;

// Locations every new branch starts with: shop floor and back room for a store, one storage area otherwise.
const defaultLocations = (kind: Branch['kind']): StockLocation[] =>
  kind === 'store'
    ? [
        { id: newId(), kind: 'floor', name: { en: 'Shop floor', ar: 'صالة العرض' } },
        { id: newId(), kind: 'backRoom', name: { en: 'Back room', ar: 'المخزن الخلفي' } },
      ]
    : [{ id: newId(), kind: 'storage', name: kind === 'warehouse' ? { en: 'Warehouse', ar: 'المستودع' } : { en: 'Online stock', ar: 'مخزون المتجر الإلكتروني' } }];

// A country the store hasn't worked in before gets its own settings (tax, receipts, returns) to fill in.
const ensureCountry = (countryCode: CountryCode) => {
  if (!db.settings.countries.some((country) => country.countryCode === countryCode)) db.settings.countries.push(newCountrySettings(countryCode));
};

const ensureRate = (currency: CurrencyCode) => {
  if (rateOn(db.rates, currency, nowIso(), db.settings.baseCurrency) === null) throw new ApiError('noRate');
};

// A new branch, sales channel (online store) or warehouse. Nothing else changes: it appears in every list and report.
export const createBranch = (input: BranchInput) =>
  mutate(() => {
    ensureRate(input.currency);
    ensureCountry(input.countryCode);
    const branch: Branch = { ...input, locations: input.locations.length ? input.locations : defaultLocations(input.kind), id: newId(), archived: false, createdAt: nowIso() };
    db.branches.push(branch);
    logActivity({ action: 'create', target: { type: 'branch', id: branch.id, label: branch.name } });
    return branch;
  });

export const updateBranch = (branchId: Id, input: BranchInput) =>
  mutate(() => {
    const branch = findById(db.branches, branchId);
    ensureRate(input.currency);
    ensureCountry(input.countryCode);
    const before = { ...branch };
    Object.assign(branch, input);
    logActivity({ action: 'update', target: { type: 'branch', id: branch.id, label: branch.name }, changes: diff(before, branch, ['name', 'kind', 'countryCode', 'city', 'address', 'phone', 'currency', 'paymentMethodIds', 'locations']) });
    return branch;
  });

// A closed branch is archived: its sales, stock movements and staff history stay in every report.
export const setBranchArchived = (branchId: Id, archived: boolean) =>
  mutate(() => {
    const branch = findById(db.branches, branchId);
    branch.archived = archived;
    logActivity({ action: archived ? 'archive' : 'restore', target: { type: 'branch', id: branchId, label: branch.name } });
    return branch;
  });

export const newLocation = (kind: StockLocation['kind'], name: Localized): StockLocation => ({ id: crypto.randomUUID(), kind, name });

// ---- Currencies -----------------------------------------------------------------------------------------------

export const listRates = () =>
  respond(() => ({
    baseCurrency: db.settings.baseCurrency,
    reportingCurrency: db.settings.reportingCurrency,
    rates: [...db.rates].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at)),
    current: [...new Set(db.rates.map((rate) => rate.currency))].map((currency) => ({ currency, rate: rateOn(db.rates, currency, nowIso(), db.settings.baseCurrency) })),
  }));

// Rates are added, never edited, so every past sale keeps the rate of its day.
export const addRate = (currency: CurrencyCode, rate: number, date: IsoDate) =>
  mutate(() => {
    const entry = { id: newId(), currency, rate, date, byId: actor().id, at: nowIso() };
    db.rates.push(entry);
    logActivity({ action: 'create', target: { type: 'rate', id: entry.id, label: currency }, changes: [{ field: date, from: null, to: rate }] });
    return entry;
  });

export const setReportingCurrency = (currency: CurrencyCode) =>
  mutate(() => {
    ensureRate(currency);
    const from = db.settings.reportingCurrency;
    db.settings.reportingCurrency = currency;
    logActivity({ action: 'update', target: { type: 'settings', id: 'reportingCurrency', label: currency }, changes: [{ field: 'reportingCurrency', from, to: currency }] });
    return currency;
  });

// ---- Tax --------------------------------------------------------------------------------------------------------

export const getTaxSetup = () =>
  respond(() => ({
    countries: db.settings.countries.map((country) => ({
      ...country,
      vatToday: vatRateOn(db.vatRates, country.countryCode, today()),
      vatRates: db.vatRates.filter((rate) => rate.countryCode === country.countryCode).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    })),
    devices: db.devices,
  }));

export const saveTaxRegistration = (registration: TaxRegistration, authority: TaxAuthority) =>
  mutate(() => {
    ensureCountry(registration.countryCode);
    const country = db.settings.countries.find((current) => current.countryCode === registration.countryCode);
    if (!country) throw new ApiError('notFound');
    const before = { ...country.registration, authority: country.authority };
    country.registration = registration;
    country.authority = authority;
    logActivity({ action: 'update', target: { type: 'tax', id: registration.countryCode, label: registration.legalName }, changes: diff(before, { ...registration, authority }, ['legalName', 'vatNumber', 'commercialRegistration', 'address', 'authority']) });
    return country;
  });

// A VAT rate from a date. Sales before the date keep the rate they were sold with.
export const addVatRate = (countryCode: CountryCode, rate: number, startDate: IsoDate) =>
  mutate(() => {
    const entry = { id: newId(), countryCode, rate, startDate, byId: actor().id, at: nowIso() };
    db.vatRates.push(entry);
    logActivity({ action: 'create', target: { type: 'vat', id: entry.id, label: countryCode }, changes: [{ field: startDate, from: null, to: rate }] });
    return entry;
  });

export const saveDevice = (input: { id?: Id; branchId: Id; name: string; serial: string }) =>
  mutate(() => {
    if (input.id) {
      const device = findById(db.devices, input.id);
      Object.assign(device, { branchId: input.branchId, name: input.name, serial: input.serial });
      return device;
    }
    const device: TillDevice = { id: newId(), branchId: input.branchId, name: input.name, serial: input.serial, registration: { status: 'notRegistered' } };
    db.devices.push(device);
    logActivity({ action: 'create', target: { type: 'device', id: device.id, label: device.name } });
    return device;
  });

// Registers a till with its country's tax authority (ETA in Egypt, ZATCA in Saudi Arabia). In the demo the
// authority answers at once with a device ID.
export const registerDevice = (deviceId: Id) =>
  mutate(() => {
    const device = findById(db.devices, deviceId);
    const branch = findById(db.branches, device.branchId);
    const authority = db.settings.countries.find((country) => country.countryCode === branch.countryCode)?.authority ?? 'none';
    device.registration = { status: 'registered', authorityId: `${authority.toUpperCase()}-${device.serial}`, at: nowIso() };
    logActivity({ action: 'update', target: { type: 'device', id: device.id, label: device.name }, changes: [{ field: 'registration', from: 'notRegistered', to: 'registered' }] });
    return device;
  });

// ---- E-receipts ---------------------------------------------------------------------------------------------

export const listEReceipts = (filter: { status?: string; branchId?: Id; limit?: number }) =>
  respond(() =>
    db.sales
      .filter((sale) => sale.eReceipt.status !== 'notRequired' && (!filter.status || sale.eReceipt.status === filter.status) && (!filter.branchId || sale.branchId === filter.branchId))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, filter.limit ?? 200)
      .map((sale) => ({ saleId: sale.id, number: sale.number, at: sale.at, branchId: sale.branchId, currency: sale.currency, total: sale.payments.reduce((sum, payment) => sum + payment.amount, 0), eReceipt: sale.eReceipt })),
  );

export const eReceiptCounts = () =>
  respond(() => ({
    sent: db.sales.filter((sale) => sale.eReceipt.status === 'sent').length,
    failed: db.sales.filter((sale) => sale.eReceipt.status === 'failed').length,
    pending: db.sales.filter((sale) => sale.eReceipt.status === 'pending').length,
  }));

// Sends a failed e-receipt again. It goes through once the till is registered with the tax authority.
export const resendEReceipt = (saleId: Id) =>
  mutate(() => {
    const sale = findById(db.sales, saleId);
    const device = db.devices.find((current) => current.id === sale.eReceipt.deviceId) ?? db.devices.find((current) => current.branchId === sale.branchId);
    const ok = device?.registration.status === 'registered';
    sale.eReceipt = { ...sale.eReceipt, deviceId: device?.id, status: ok ? 'sent' : 'failed', error: ok ? undefined : 'deviceNotRegistered', attempts: sale.eReceipt.attempts + 1, lastAttemptAt: nowIso() };
    logActivity({ action: 'send', target: { type: 'eReceipt', id: sale.id, label: sale.number }, changes: [{ field: 'status', from: 'failed', to: sale.eReceipt.status }] });
    if (!ok) notify('eReceiptFailed', { number: sale.number }, '/owner/tax?tab=receipts');
    return sale.eReceipt;
  });
