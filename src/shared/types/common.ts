export type Id = string;
export type IsoDate = string; // 2026-11-05
export type IsoDateTime = string; // 2026-11-05T09:30:00.000Z
export type CurrencyCode = string; // ISO 4217: EGP, SAR, AED...
export type CountryCode = string; // ISO 3166: EG, SA...

// A name the store types in both languages (a reason, a category, a role).
export interface Localized {
  en: string;
  ar: string;
}

// An item in a list the owner can change: discount reasons, return reasons, expense categories...
export interface ConfigOption {
  id: Id;
  label: Localized;
  archived?: boolean;
}

// An amount in each currency the store sells in: { EGP: 1450, SAR: 120 }.
export type PriceList = Record<CurrencyCode, number>;

export interface StoredFile {
  name: string;
  size: number;
  dataUrl: string;
}

// Who did something and when.
export interface Stamp {
  at: IsoDateTime;
  byId: Id;
}
