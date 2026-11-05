import type { Brand, CurrencyCode, FeeCharge, Id, IsoDate, Statement, StatementTotals } from '@/shared/types';
import { convert, currentTerms, inRange, lineFigures, rateOn, termsOn, toIsoDate, type DateRange } from '@/shared/utils';
import type { Database } from './database';

// How a brand's payout is worked out. Pure functions over the data, shared by the payout pages and the seed.
//
// For each sale line of the brand in the period: what the store owes the brand (the sale without VAT, minus the
// brand's share of discounts, minus commission), converted from the sale's currency to the brand's payout
// currency at the rate of the sale's day. Returns take it back. Defects the brand is liable for, monthly fees
// taken out of payouts, and anything the brand still owes from earlier statements are deducted.

export interface StatementItem {
  key: string; // sale line id, or `${returnId}:${saleLineId}` for a return
  kind: 'sale' | 'return';
  at: string;
  saleNumber: string;
  branchId: Id;
  productId: Id;
  variantId: Id;
  qty: number;
  currency: CurrencyCode; // the sale's currency
  rate: number; // 1 sale currency in the payout currency, on the sale's day
  sales: number; // net sales without VAT, in the sale's currency
  brandDiscount: number;
  commission: number;
  payout: number; // owed to the brand, in the sale's currency (negative for returns)
  payoutConverted: number; // in the payout currency
  carried: boolean; // a return of a sale already settled in an earlier statement
}

const usedKeys = (data: Database, brandId: Id, exceptStatementId?: Id) => {
  const keys = new Set<string>();
  data.statements
    .filter((statement) => statement.brandId === brandId && statement.id !== exceptStatementId)
    .forEach((statement) => {
      statement.saleLineIds.forEach((id) => keys.add(id));
      statement.returnLineIds.forEach((id) => keys.add(id));
    });
  return keys;
};

// The sale and return lines of a brand in a period that no other statement includes yet
// (or exactly the ones a saved statement lists, when `only` is given).
export const statementItems = (
  data: Database,
  brandId: Id,
  range: DateRange,
  payoutCurrency: CurrencyCode,
  only?: { saleLineIds: string[]; returnLineIds: string[] },
  includeSettled = false, // also lines already on a statement (for sales reports)
): StatementItem[] => {
  const used = only || includeSettled ? new Set<string>() : usedKeys(data, brandId);
  const wanted = only ? new Set([...only.saleLineIds, ...only.returnLineIds]) : null;
  const settledSales = new Set(data.statements.filter((statement) => statement.brandId === brandId && statement.status !== 'draft').flatMap((statement) => statement.saleLineIds));
  const base = data.settings.baseCurrency;
  const items: StatementItem[] = [];
  const saleById = new Map(data.sales.map((sale) => [sale.id, sale]));

  data.sales.forEach((sale) => {
    if (sale.voidedAt) return;
    sale.lines.forEach((line) => {
      if (line.brandId !== brandId || line.model !== 'commission') return;
      const include = wanted ? wanted.has(line.id) : inRange(sale.at, range) && !used.has(line.id);
      if (!include) return;
      const figures = lineFigures(sale, line);
      const rate = convert(1, sale.currency, payoutCurrency, sale.at, data.rates, base, sale.rate);
      items.push({
        key: line.id,
        kind: 'sale',
        at: sale.at,
        saleNumber: sale.number,
        branchId: sale.branchId,
        productId: line.productId,
        variantId: line.variantId,
        qty: line.qty,
        currency: sale.currency,
        rate,
        sales: figures.net,
        brandDiscount: figures.brandDiscount,
        commission: figures.commission,
        payout: figures.brandPayout,
        payoutConverted: figures.brandPayout * rate,
        carried: false,
      });
    });
  });

  data.returns.forEach((saleReturn) => {
    const sale = saleById.get(saleReturn.saleId);
    if (!sale) return;
    saleReturn.lines.forEach((returned) => {
      const line = sale.lines.find((current) => current.id === returned.saleLineId);
      if (!line || line.brandId !== brandId || line.model !== 'commission') return;
      const key = `${saleReturn.id}:${line.id}`;
      const include = wanted ? wanted.has(key) : inRange(saleReturn.at, range) && !used.has(key);
      if (!include) return;
      const figures = lineFigures(sale, line, returned.qty);
      const rate = convert(1, sale.currency, payoutCurrency, sale.at, data.rates, base, sale.rate);
      items.push({
        key,
        kind: 'return',
        at: saleReturn.at,
        saleNumber: sale.number,
        branchId: saleReturn.branchId,
        productId: line.productId,
        variantId: line.variantId,
        qty: -returned.qty,
        currency: sale.currency,
        rate,
        sales: -figures.net,
        brandDiscount: -figures.brandDiscount,
        commission: -figures.commission,
        payout: -figures.brandPayout,
        payoutConverted: -figures.brandPayout * rate,
        carried: settledSales.has(line.id),
      });
    });
  });
  return items.sort((a, b) => a.at.localeCompare(b.at));
};

// Monthly fees to take out of this payout: unpaid ones up to the end of the period, not deducted yet.
export const feesToDeduct = (data: Database, brand: Brand, periodEnd: IsoDate, exceptStatementId?: Id): FeeCharge[] =>
  data.fees.filter(
    (fee) =>
      fee.brandId === brand.id &&
      !fee.paidAt &&
      (!fee.deductedInStatementId || fee.deductedInStatementId === exceptStatementId) &&
      `${fee.month}-01` <= periodEnd &&
      termsOn(brand, `${fee.month}-01`).deductFeeFromPayout,
  );

// Defects the brand pays for, found in the period: their value is deducted.
export const brandDefects = (data: Database, brandId: Id, range: DateRange) =>
  data.defects.filter((defect) => defect.liability === 'brand' && inRange(defect.at, range) && data.products.find((product) => product.id === defect.productId)?.brandId === brandId && defect.status !== 'credited');

// What the brand still owed after its latest settled statement (a negative amount due), carried into the next one.
export const carriedFromBefore = (data: Database, brandId: Id, before: IsoDate, exceptStatementId?: Id) => {
  const last = data.statements
    .filter((statement) => statement.brandId === brandId && statement.id !== exceptStatementId && statement.status !== 'draft' && statement.periodEnd < before)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
  return last && last.totals.amountDue < 0 ? -last.totals.amountDue : 0;
};

export const computeTotals = (data: Database, brand: Brand, range: DateRange, items: StatementItem[], payoutCurrency: CurrencyCode, exceptStatementId?: Id): StatementTotals => {
  const base = data.settings.baseCurrency;
  const sold = items.filter((item) => item.kind === 'sale');
  const returned = items.filter((item) => item.kind === 'return');
  const sum = (list: StatementItem[], value: (item: StatementItem) => number) => list.reduce((total, item) => total + value(item) * item.rate, 0);
  const defects = brandDefects(data, brand.id, range);
  const defectDeductions = defects.reduce((total, defect) => total + convert(defect.unitCost * defect.qty, base, payoutCurrency, defect.at, data.rates, base), 0);
  const monthlyFees = feesToDeduct(data, brand, range.to, exceptStatementId).reduce((total, fee) => total + convert(fee.amount, fee.currency, payoutCurrency, `${fee.month}-01`, data.rates, base), 0);
  const carriedIn = carriedFromBefore(data, brand.id, range.from, exceptStatementId);
  const payout = items.reduce((total, item) => total + item.payoutConverted, 0);
  return {
    soldUnits: sold.reduce((total, item) => total + item.qty, 0),
    sales: sum(sold, (item) => item.sales),
    returnedUnits: -returned.reduce((total, item) => total + item.qty, 0),
    returns: -sum(returned, (item) => item.sales),
    defectiveUnits: defects.reduce((total, defect) => total + defect.qty, 0),
    brandDiscounts: sum(items, (item) => item.brandDiscount),
    commission: sum(items, (item) => item.commission),
    monthlyFees,
    defectDeductions,
    carriedIn,
    amountDue: payout - defectDeductions - monthlyFees - carriedIn,
  };
};

// A new draft statement for a brand and period (not saved: the caller adds it to the data).
export const buildStatement = (data: Database, brand: Brand, range: DateRange, ids: { id: Id; number: string; byId: Id; at: string }): Statement => {
  const payoutCurrency = currentTerms(brand).payoutCurrency;
  const items = statementItems(data, brand.id, range, payoutCurrency);
  return {
    id: ids.id,
    number: ids.number,
    brandId: brand.id,
    periodStart: range.from,
    periodEnd: range.to,
    currency: payoutCurrency,
    totals: computeTotals(data, brand, range, items, payoutCurrency, ids.id),
    saleLineIds: items.filter((item) => item.kind === 'sale').map((item) => item.key),
    returnLineIds: items.filter((item) => item.kind === 'return').map((item) => item.key),
    status: 'draft',
    locked: false,
    createdAt: ids.at,
    byId: ids.byId,
  };
};

// The state of a monthly fee: paid (collected or taken out of a payout), overdue after the due day, due, or upcoming.
export const feeState = (fee: FeeCharge, dueDay: number, day: IsoDate = toIsoDate()) => {
  if (fee.paidAt || fee.deductedInStatementId) return 'paid' as const;
  const due = `${fee.month}-${String(dueDay).padStart(2, '0')}`;
  if (day > due) return 'overdue' as const;
  if (day >= `${fee.month}-01`) return 'due' as const;
  return 'upcoming' as const;
};

export const feeDueDate = (fee: FeeCharge, dueDay: number) => `${fee.month}-${String(dueDay).padStart(2, '0')}`;

export const payoutRate = (data: Database, from: CurrencyCode, to: CurrencyCode, date: string) => {
  const base = data.settings.baseCurrency;
  const a = rateOn(data.rates, from, date, base) ?? 1;
  const b = rateOn(data.rates, to, date, base) ?? 1;
  return a / b;
};
