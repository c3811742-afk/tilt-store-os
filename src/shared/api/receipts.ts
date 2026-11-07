import type { CountrySettings, Id, Localized, Sale, SaleReturn, TaxAuthority } from '@/shared/types';
import { promotionDiscount, zatcaQrPayload, roundMoney, phoneDigits } from '@/shared/utils';
import { variantIndex } from './engine';
import { ApiError } from './errors';
import { actor, db, findById, isOwner, logActivity, mutate, respond } from './server';
import { workBranch } from './till';
import { tillDefaults } from '@/shared/constants';

// Receipts for sales, returns and exchanges: what the receipt printer prints and what is sent on WhatsApp or SMS.


export interface ReceiptLine {
  name: string;
  size: string;
  color: string;
  sku: string;
  qty: number;
  unitPrice: number;
  promotionName?: string;
  promotionSaving: number; // what the promotion took off, for every piece of the line
  otherDiscount: number; // manual, code and order discounts
  total: number;
}

export interface ReceiptView {
  kind: 'sale' | 'return' | 'exchange';
  id: Id;
  number: string;
  saleId: Id; // the sale it belongs to (the sale itself, or the one returned)
  at: string;
  branch: { name: string; address: string; city: string; phone: string; countryCode: string };
  currency: string;
  language: 'en' | 'ar' | 'both';
  header: Localized;
  footer: Localized;
  returnPolicy: Localized;
  showLogo: boolean;
  registration: CountrySettings['registration'];
  authority: TaxAuthority;
  eReceiptStatus?: string;
  cashierName: string;
  customer?: { name: string; phone: string };
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  vatRate: number;
  vat: number;
  payments: { methodId: Id; amount: number; reference?: string }[]; // refunds on a return
  originalNumber?: string; // a return: the sale it returns
  exchangeNumber?: string; // an exchange: the new sale
  taxQr?: string; // the QR code's content where the country requires one (Saudi Arabia)
}

const countryOf = (countryCode: string) => db.settings.countries.find((country) => country.countryCode === countryCode);

// A receipt can be printed by people working in its branch (owners and IT: any branch).
const canSee = (branchId: Id) => {
  const me = actor();
  if (isOwner(me) || me.branchIds.includes(branchId)) return;
  workBranch(branchId);
};

const base = (branchId: Id, currency: string, vatRate: number, total: number, at: string) => {
  const branch = findById(db.branches, branchId);
  const country = countryOf(branch.countryCode);
  const vat = roundMoney((total * vatRate) / (100 + vatRate));
  const registration = country?.registration ?? { countryCode: branch.countryCode, legalName: '', vatNumber: '', commercialRegistration: '', address: '' };
  const authority = country?.authority ?? 'none';
  return {
    branch: { name: branch.name, address: branch.address, city: branch.city, phone: branch.phone, countryCode: branch.countryCode },
    currency,
    language: db.settings.receiptLanguage,
    header: country?.receipt.header ?? { en: db.settings.company.name, ar: db.settings.company.name },
    footer: country?.receipt.footer ?? { en: '', ar: '' },
    returnPolicy: country?.receipt.returnPolicy ?? { en: '', ar: '' },
    showLogo: country?.receipt.showLogo ?? true,
    registration,
    authority,
    vatRate,
    vat,
    taxQr: authority === 'zatca' ? zatcaQrPayload({ sellerName: registration.legalName || db.settings.company.name, vatNumber: registration.vatNumber, at, total, vat }) : undefined,
  };
};

const saleLines = (sale: Sale): ReceiptLine[] => {
  const index = variantIndex(db);
  return sale.lines.map((line) => {
    const entry = index.get(line.variantId);
    const promotion = line.promotionId ? db.promotions.find((current) => current.id === line.promotionId) : undefined;
    const promotionSaving = promotion ? roundMoney(Math.min(promotionDiscount(promotion, line.unitPrice) * line.qty, line.discount)) : 0;
    return {
      name: entry?.product.name ?? '',
      size: entry?.variant.size ?? '',
      color: entry?.variant.color ?? '',
      sku: entry?.variant.sku ?? '',
      qty: line.qty,
      unitPrice: line.unitPrice,
      promotionName: promotion?.name,
      promotionSaving,
      otherDiscount: roundMoney(line.discount - promotionSaving),
      total: roundMoney(line.unitPrice * line.qty - line.discount),
    };
  });
};

const customerOf = (customerId?: Id) => {
  const customer = customerId ? db.customers.find((current) => current.id === customerId) : undefined;
  return customer ? { name: customer.name, phone: customer.phone } : undefined;
};

const nameOf = (userId: Id) => db.users.find((user) => user.id === userId)?.name ?? '';

export const saleReceipt = (sale: Sale): ReceiptView => {
  const lines = saleLines(sale);
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0));
  const total = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
  return {
    ...base(sale.branchId, sale.currency, sale.vatRate, total, sale.at),
    kind: 'sale',
    id: sale.id,
    number: sale.number,
    saleId: sale.id,
    at: sale.at,
    eReceiptStatus: sale.eReceipt.status,
    cashierName: nameOf(sale.cashierId),
    customer: customerOf(sale.customerId),
    lines,
    subtotal,
    discount: roundMoney(subtotal - total),
    total,
    payments: sale.payments.map(({ methodId, amount, reference }) => ({ methodId, amount, reference })),
  };
};

export const returnReceipt = (saleReturn: SaleReturn): ReceiptView => {
  const sale = findById(db.sales, saleReturn.saleId);
  const all = saleLines(sale);
  const lines = saleReturn.lines.flatMap((returned) => {
    const position = sale.lines.findIndex((line) => line.id === returned.saleLineId);
    const line = all[position];
    return line ? [{ ...line, qty: returned.qty, promotionSaving: 0, otherDiscount: 0, unitPrice: roundMoney(returned.amount / returned.qty), total: returned.amount }] : [];
  });
  const total = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
  return {
    ...base(saleReturn.branchId, sale.currency, sale.vatRate, total, saleReturn.at),
    kind: saleReturn.kind,
    id: saleReturn.id,
    number: saleReturn.number,
    saleId: sale.id,
    at: saleReturn.at,
    cashierName: nameOf(saleReturn.byId),
    customer: customerOf(sale.customerId),
    lines,
    subtotal: total,
    discount: 0,
    total,
    payments: saleReturn.refunds.map(({ methodId, amount }) => ({ methodId, amount })),
    originalNumber: sale.number,
    exchangeNumber: saleReturn.exchangeSaleId ? db.sales.find((current) => current.id === saleReturn.exchangeSaleId)?.number : undefined,
  };
};

// A sale's receipt, or a return's (`kind` from the receipt list).
export const getReceipt = (id: Id) =>
  respond((): ReceiptView => {
    const sale = db.sales.find((current) => current.id === id);
    if (sale) {
      canSee(sale.branchId);
      return saleReceipt(sale);
    }
    const saleReturn = db.returns.find((current) => current.id === id);
    if (!saleReturn) throw new ApiError('notFound');
    canSee(saleReturn.branchId);
    return returnReceipt(saleReturn);
  });

export interface ReceiptRow {
  id: Id;
  kind: 'sale' | 'return' | 'exchange';
  number: string;
  at: string;
  customerName: string;
  phone: string;
  total: number;
  currency: string;
}

// Past receipts in a branch, newest first: by receipt number, customer phone or name, or day.
export const listReceipts = (branchId: Id, filter: { query?: string; day?: string }) =>
  respond((): ReceiptRow[] => {
    workBranch(branchId);
    const needle = filter.query?.trim().toLowerCase() ?? '';
    const digits = phoneDigits(needle);
    const matches = (row: ReceiptRow) => !needle || row.number.toLowerCase().includes(needle) || row.customerName.toLowerCase().includes(needle) || (digits.length >= tillDefaults.searchDigits && phoneDigits(row.phone).includes(digits));
    const rows: ReceiptRow[] = [
      ...db.sales
        .filter((sale) => sale.branchId === branchId)
        .map((sale) => {
          const customer = customerOf(sale.customerId);
          return { id: sale.id, kind: 'sale' as const, number: sale.number, at: sale.at, customerName: customer?.name ?? '', phone: customer?.phone ?? '', total: roundMoney(sale.payments.reduce((sum, payment) => sum + payment.amount, 0)), currency: sale.currency };
        }),
      ...db.returns
        .filter((saleReturn) => saleReturn.branchId === branchId)
        .map((saleReturn) => {
          const sale = db.sales.find((current) => current.id === saleReturn.saleId);
          const customer = customerOf(sale?.customerId);
          return { id: saleReturn.id, kind: saleReturn.kind, number: saleReturn.number, at: saleReturn.at, customerName: customer?.name ?? '', phone: customer?.phone ?? '', total: roundMoney(saleReturn.refunds.reduce((sum, refund) => sum + refund.amount, 0)), currency: sale?.currency ?? '' };
        }),
    ];
    return rows
      .filter((row) => (!filter.day || row.at.startsWith(filter.day)) && matches(row))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 100);
  });

// Printing or sending a receipt is logged (a reprint too), so the owner can see receipts given out again.
export const logReceipt = (id: Id, how: 'print' | 'reprint' | 'whatsApp' | 'sms') =>
  mutate(() => {
    const sale = db.sales.find((current) => current.id === id);
    const saleReturn = sale ? undefined : db.returns.find((current) => current.id === id);
    const record = sale ?? saleReturn;
    if (!record) throw new ApiError('notFound');
    logActivity({ action: how === 'print' || how === 'reprint' ? 'export' : 'send', target: { type: sale ? 'sale' : 'return', id, label: record.number }, branchId: record.branchId, changes: [{ field: 'receipt', from: null, to: how }] });
    return true;
  });
