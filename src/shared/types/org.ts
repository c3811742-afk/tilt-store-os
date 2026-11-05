import type { CountryCode, CurrencyCode, Id, IsoDate, IsoDateTime, Localized } from './common';

export type BranchKind = 'store' | 'online' | 'warehouse';
export type LocationKind = 'floor' | 'backRoom' | 'storage';

// A place inside a branch where stock is kept: the shop floor, the back room, a warehouse.
export interface StockLocation {
  id: Id;
  kind: LocationKind;
  name: Localized;
}

export interface Branch {
  id: Id;
  name: string;
  kind: BranchKind;
  countryCode: CountryCode;
  city: string;
  address: string;
  phone: string;
  currency: CurrencyCode;
  paymentMethodIds: Id[]; // the payment methods this branch accepts
  locations: StockLocation[];
  archived: boolean;
  createdAt: IsoDateTime;
}

// What 1 unit of `currency` is worth in the base currency, from `date` on. Rates are never edited, only added.
export interface ExchangeRate {
  id: Id;
  currency: CurrencyCode;
  rate: number;
  date: IsoDate;
  byId: Id;
  at: IsoDateTime;
}

export interface TaxRegistration {
  countryCode: CountryCode;
  legalName: string;
  vatNumber: string;
  commercialRegistration: string;
  address: string;
}

export interface VatRate {
  id: Id;
  countryCode: CountryCode;
  rate: number; // percent
  startDate: IsoDate;
  byId: Id;
  at: IsoDateTime;
}

export type TaxAuthority = 'eta' | 'zatca' | 'none';

export interface TillDevice {
  id: Id;
  branchId: Id;
  name: string;
  serial: string;
  registration: { status: 'registered' | 'notRegistered'; authorityId?: string; at?: IsoDateTime };
}
