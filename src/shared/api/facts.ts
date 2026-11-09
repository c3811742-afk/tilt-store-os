import { onHandStatuses } from '@/shared/constants/statuses';
import type { BrandModel, CurrencyCode, Id, IsoDate, IsoDateTime, Sale, SalesChannel, StockStatus } from '@/shared/types';
import {
  addFigures,
  convert,
  daysBetween,
  emptyFigures,
  endOfMonth,
  inRange,
  lineFigures,
  rateOn,
  saleFees,
  sellingPrice,
  stockLevels,
  toIsoDate,
  type StockLevel,
  type DateRange,
  type LineFigures,
} from '@/shared/utils';
import type { Database } from './database';
import { currentUnitCost, variantIndex } from './engine';

// Where the numbers come from, for every report: which sales, and in which currency.
export interface SalesFilter {
  range: DateRange;
  branchIds?: Id[]; // none: every branch
  brandIds?: Id[];
  categoryIds?: Id[];
  channel?: SalesChannel;
  // 'reporting': every amount converted to the reporting currency at the rate of the sale's day.
  // A currency code: amounts stay in the branch's own currency (only sensible for branches using that currency).
  currency?: 'reporting' | CurrencyCode;
}

// One sale line, or one returned line (negative), with its figures in the chosen currency.
export interface Fact {
  saleId: Id;
  saleNumber: string;
  lineId: Id;
  returnId?: Id;
  at: IsoDateTime;
  day: IsoDate;
  branchId: Id;
  channel: SalesChannel;
  brandId: Id;
  categoryId: Id;
  productId: Id;
  variantId: Id;
  cashierId: Id;
  customerId?: Id;
  model: BrandModel;
  promotionId?: Id;
  promoCodeId?: Id;
  discountReasonId?: Id;
  discountById?: Id;
  returnReasonId?: Id;
  paymentMethodIds: Id[];
  isReturn: boolean;
  isExchange: boolean;
  figures: LineFigures;
  fees: number; // this line's share of the card and wallet fees
  currency: CurrencyCode;
}

const matches = (data: Database, sale: Sale, filter: SalesFilter) => {
  if (sale.voidedAt) return false;
  if (filter.branchIds?.length && !filter.branchIds.includes(sale.branchId)) return false;
  if (filter.channel && sale.channel !== filter.channel) return false;
  return data.branches.some((branch) => branch.id === sale.branchId);
};

// The factor that turns an amount in the sale's currency into the report's currency, at the sale's own rate.
const factorFor = (data: Database, sale: Sale, filter: SalesFilter) => {
  const target = !filter.currency || filter.currency === 'reporting' ? data.settings.reportingCurrency : filter.currency;
  return { target, factor: convert(1, sale.currency, target, sale.at, data.rates, data.settings.baseCurrency, sale.rate) };
};

export const salesFacts = (data: Database, filter: SalesFilter): Fact[] => {
  const facts: Fact[] = [];
  const saleById = new Map(data.sales.map((sale) => [sale.id, sale]));
  const lineFilter = (brandId: Id, categoryId: Id) =>
    (!filter.brandIds?.length || filter.brandIds.includes(brandId)) && (!filter.categoryIds?.length || filter.categoryIds.includes(categoryId));

  data.sales.forEach((sale) => {
    if (!inRange(sale.at, filter.range) || !matches(data, sale, filter)) return;
    const { target, factor } = factorFor(data, sale, filter);
    const fees = saleFees(sale);
    const saleNet = sale.lines.reduce((total, line) => total + line.unitPrice * line.qty - line.discount, 0);
    sale.lines.forEach((line) => {
      if (!lineFilter(line.brandId, line.categoryId)) return;
      const figures = addFigures(emptyFigures(), lineFigures(sale, line), factor);
      const lineNet = line.unitPrice * line.qty - line.discount;
      facts.push({
        saleId: sale.id,
        saleNumber: sale.number,
        lineId: line.id,
        at: sale.at,
        day: toIsoDate(sale.at),
        branchId: sale.branchId,
        channel: sale.channel,
        brandId: line.brandId,
        categoryId: line.categoryId,
        productId: line.productId,
        variantId: line.variantId,
        cashierId: sale.cashierId,
        customerId: sale.customerId,
        model: line.model,
        promotionId: line.promotionId,
        promoCodeId: line.promoCodeId,
        discountReasonId: line.discountReasonId,
        discountById: line.discountById,
        paymentMethodIds: sale.payments.map((payment) => payment.methodId),
        isReturn: false,
        isExchange: false,
        figures,
        fees: saleNet ? ((fees * lineNet) / saleNet) * factor : 0,
        currency: target,
      });
    });
  });

  // Returns count on the day they happen, at the original sale's rate and snapshots, so past profit never changes.
  data.returns.forEach((saleReturn) => {
    if (!inRange(saleReturn.at, filter.range)) return;
    const sale = saleById.get(saleReturn.saleId);
    if (!sale || !matches(data, { ...sale, branchId: saleReturn.branchId }, filter)) return;
    const { target, factor } = factorFor(data, sale, filter);
    saleReturn.lines.forEach((returned) => {
      const line = sale.lines.find((current) => current.id === returned.saleLineId);
      if (!line || !lineFilter(line.brandId, line.categoryId)) return;
      facts.push({
        saleId: sale.id,
        saleNumber: sale.number,
        lineId: line.id,
        returnId: saleReturn.id,
        at: saleReturn.at,
        day: toIsoDate(saleReturn.at),
        branchId: saleReturn.branchId,
        channel: sale.channel,
        brandId: line.brandId,
        categoryId: line.categoryId,
        productId: line.productId,
        variantId: line.variantId,
        cashierId: saleReturn.byId,
        customerId: sale.customerId,
        model: line.model,
        promotionId: line.promotionId,
        returnReasonId: returned.reasonId,
        paymentMethodIds: saleReturn.refunds.map((refund) => refund.methodId),
        isReturn: true,
        isExchange: saleReturn.kind === 'exchange',
        figures: addFigures(emptyFigures(), lineFigures(sale, line, returned.qty), -factor),
        fees: 0,
        currency: target,
      });
    });
  });
  return facts;
};

export interface Totals extends LineFigures {
  fees: number;
  orders: number;
  returnsAmount: number; // net sales given back, positive
  returnedUnits: number;
  soldUnits: number;
  grossSales: number; // before discounts and returns
}

export const totalsOf = (facts: readonly Fact[]): Totals => {
  const figures = emptyFigures();
  let fees = 0;
  let returnsAmount = 0;
  let returnedUnits = 0;
  let soldUnits = 0;
  let grossSales = 0;
  facts.forEach((fact) => {
    addFigures(figures, fact.figures);
    fees += fact.fees;
    if (fact.isReturn) {
      returnsAmount -= fact.figures.net;
      returnedUnits -= fact.figures.units;
    } else {
      soldUnits += fact.figures.units;
      grossSales += fact.figures.gross;
    }
  });
  return { ...figures, fees, orders: new Set(facts.filter((fact) => !fact.isReturn).map((fact) => fact.saleId)).size, returnsAmount, returnedUnits, soldUnits, grossSales };
};

// Groups facts by a key and totals each group.
export const totalsBy = (facts: readonly Fact[], key: (fact: Fact) => string) => {
  const groups = new Map<string, Fact[]>();
  facts.forEach((fact) => {
    const k = key(fact);
    const list = groups.get(k);
    if (list) list.push(fact);
    else groups.set(k, [fact]);
  });
  return [...groups.entries()].map(([groupKey, list]) => ({ key: groupKey, totals: totalsOf(list) }));
};

// ---- Stock value ------------------------------------------------------------------------------------------------

export interface StockSummary {
  units: number;
  costValue: number; // in the reporting currency
  retailValue: number; // at selling prices, converted to the reporting currency
}

// Pieces on hand and their value, at cost and at selling price, in the reporting currency (today's rates).
// `match` narrows to some items (a category, a size...); `currency` gives the values in another currency than the
// reporting one (e.g. one branch in its own currency), at today's rate.
export const stockSummary = (
  data: Database,
  filter: { branchIds?: Id[]; brandIds?: Id[]; productIds?: Id[]; match?: (variantId: Id) => boolean; currency?: CurrencyCode } = {},
  levels: StockLevel[] = stockLevels(data.movements),
) => {
  const index = variantIndex(data);
  const { baseCurrency } = data.settings;
  const reportingCurrency = filter.currency ?? data.settings.reportingCurrency;
  const now = new Date().toISOString();
  const branchById = new Map(data.branches.map((branch) => [branch.id, branch]));
  const costCache = new Map<Id, number>();
  const summary: StockSummary = { units: 0, costValue: 0, retailValue: 0 };
  const byBranch = new Map<Id, StockSummary>();
  const byBrand = new Map<Id, StockSummary>();
  const byProduct = new Map<Id, StockSummary>();
  const unitsByVariant = new Map<Id, number>();

  levels.forEach((level) => {
    if (!onHandStatuses.includes(level.status)) return;
    if (filter.branchIds?.length && !filter.branchIds.includes(level.branchId)) return;
    const entry = index.get(level.variantId);
    const branch = branchById.get(level.branchId);
    if (!entry || !branch) return;
    if (filter.brandIds?.length && !filter.brandIds.includes(entry.product.brandId)) return;
    if (filter.productIds?.length && !filter.productIds.includes(entry.product.id)) return;
    if (filter.match && !filter.match(level.variantId)) return;
    if (!costCache.has(entry.product.id)) costCache.set(entry.product.id, currentUnitCost(data, entry.product.id, now));
    const unitCost = convert(costCache.get(entry.product.id) ?? 0, baseCurrency, reportingCurrency, now, data.rates, baseCurrency);
    const price = sellingPrice(data.schedules, entry.product, entry.variant, branch.currency, now) ?? 0;
    const unitRetail = convert(price, branch.currency, reportingCurrency, now, data.rates, baseCurrency);
    const add = (target: StockSummary) => {
      target.units += level.qty;
      target.costValue += unitCost * level.qty;
      target.retailValue += unitRetail * level.qty;
    };
    add(summary);
    add(byBranch.get(level.branchId) ?? byBranch.set(level.branchId, { units: 0, costValue: 0, retailValue: 0 }).get(level.branchId)!);
    add(byBrand.get(entry.product.brandId) ?? byBrand.set(entry.product.brandId, { units: 0, costValue: 0, retailValue: 0 }).get(entry.product.brandId)!);
    add(byProduct.get(entry.product.id) ?? byProduct.set(entry.product.id, { units: 0, costValue: 0, retailValue: 0 }).get(entry.product.id)!);
    unitsByVariant.set(level.variantId, (unitsByVariant.get(level.variantId) ?? 0) + level.qty);
  });
  return { summary, byBranch, byBrand, byProduct, unitsByVariant };
};

// The pieces there were to sell in a period, per key (a product or a brand): the stock when the period started (with
// pieces already on their way in) plus what came in during it from outside the scope (deliveries from brands and,
// for a branch, transfers from elsewhere). Moves inside the scope, and customer returns (taken off the pieces sold),
// are not counted again.
export const availableInPeriod = (data: Database, range: DateRange, keyOf: (variantId: Id) => Id | undefined, branchIds?: readonly Id[]) => {
  const inScope = (branchId?: Id) => Boolean(branchId) && (!branchIds?.length || branchIds.includes(branchId as Id));
  const counted: readonly StockStatus[] = [...onHandStatuses, 'inTransit'];
  const result = new Map<Id, number>();
  const add = (variantId: Id, qty: number) => {
    const key = keyOf(variantId);
    if (key) result.set(key, (result.get(key) ?? 0) + qty);
  };
  stockLevels(data.movements.filter((movement) => toIsoDate(movement.at) < range.from)).forEach((level) => {
    if (counted.includes(level.status) && inScope(level.branchId)) add(level.variantId, level.qty);
  });
  data.movements.forEach((movement) => {
    if (movement.kind === 'return' || movement.kind === 'adjust' || !inRange(movement.at, range)) return;
    if (movement.to && inScope(movement.to.branchId) && counted.includes(movement.to.status) && !(movement.from && inScope(movement.from.branchId))) add(movement.variantId, movement.qty);
  });
  return result;
};

// Sell-through: the share of the pieces there were to sell in the period that sold
// (sold / (stock at the start + received during the period)).
export const sellThrough = (sold: number, available: number) => (available > 0 ? Math.min((sold / available) * 100, 100) : 0);

// ---- Costs outside sales -------------------------------------------------------------------------------------

const toReporting = (data: Database, amount: number, currency: CurrencyCode, date: string) =>
  convert(amount, currency, data.settings.reportingCurrency, date, data.rates, data.settings.baseCurrency);

export interface PeriodCosts {
  expenses: number;
  monthlyFees: number; // income from brands' shelf rent
  absorbedDefects: number;
  writeOffs: number;
  cashShortages: number;
  countShortages: number;
  transferMissing: number;
}

// Money that leaves or enters the business outside sales, in a period and branch scope, in the reporting currency.
export const periodCosts = (data: Database, range: DateRange, branchIds?: Id[]): PeriodCosts => {
  const inScope = (branchId: Id | null | undefined) => !branchIds?.length || (branchId ? branchIds.includes(branchId) : branchIds.length === data.branches.length);
  const all = !branchIds?.length;
  const base = data.settings.baseCurrency;
  const index = variantIndex(data);

  // Monthly costs and fees count for the share of their month the period covers (accrued day by day),
  // so "this month so far" isn't charged the whole month's rent on day one.
  const monthShare = (date: IsoDate) => {
    const first = `${date.slice(0, 7)}-01`;
    const last = endOfMonth(first);
    const from = range.from > first ? range.from : first;
    const to = range.to < last ? range.to : last;
    return to < from ? 0 : (daysBetween(from, to) + 1) / (daysBetween(first, last) + 1);
  };
  const expenses = data.expenses
    .filter((expense) => (expense.branchId ? inScope(expense.branchId) : all))
    .reduce((total, expense) => {
      const share = expense.repeatMonthly ? monthShare(expense.date) : inRange(expense.date, range) ? 1 : 0;
      return share ? total + share * toReporting(data, expense.amount, expense.currency, expense.date) : total;
    }, 0);
  // Shelf rent is paid by a brand for the whole company. For a branch it is split by where that brand sold that month
  // (or, when it sold nothing, by each branch's share of all sales), so the branches add up to the company total.
  const salesByMonth = new Map<string, number>(); // month|brand|branch -> net sales in the reporting currency
  if (!all) {
    data.sales.forEach((sale) => {
      if (sale.voidedAt) return;
      const month = sale.at.slice(0, 7);
      sale.lines.forEach((line) => {
        const brandId = index.get(line.variantId)?.product.brandId ?? '';
        const key = `${month}|${brandId}|${sale.branchId}`;
        salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + toReporting(data, line.unitPrice * line.qty - line.discount, sale.currency, sale.at));
      });
    });
  }
  const sold = (month: string, brandId: Id | null, inBranches: boolean) =>
    [...salesByMonth.entries()].reduce((total, [key, amount]) => {
      const [keyMonth, keyBrand, keyBranch] = key.split('|');
      return keyMonth === month && (brandId === null || keyBrand === brandId) && (!inBranches || inScope(keyBranch)) ? total + amount : total;
    }, 0);
  const feeShare = (month: string, brandId: Id) => {
    if (all) return 1;
    const brandAll = sold(month, brandId, false);
    if (brandAll) return sold(month, brandId, true) / brandAll;
    const companyAll = sold(month, null, false);
    return companyAll ? sold(month, null, true) / companyAll : 0;
  };
  const monthlyFees = data.fees.reduce((total, fee) => {
    const share = monthShare(`${fee.month}-01`);
    return share ? total + share * feeShare(fee.month, fee.brandId) * toReporting(data, fee.amount, fee.currency, `${fee.month}-01`) : total;
  }, 0);
  const absorbedDefects = data.defects
    .filter((defect) => defect.liability === 'store' && inRange(defect.at, range) && inScope(defect.branchId))
    .reduce((total, defect) => total + toReporting(data, defect.unitCost * defect.qty, base, defect.at), 0);
  const writeOffs = data.writeOffs
    .filter((writeOff) => writeOff.status === 'approved' && inRange(writeOff.at, range) && inScope(writeOff.branchId))
    .reduce((total, writeOff) => total + toReporting(data, writeOff.unitCost * writeOff.qty, base, writeOff.at), 0);
  const cashShortages = data.shifts
    .filter((shift) => shift.closedAt && inRange(shift.closedAt, range) && inScope(shift.branchId))
    .reduce((total, shift) => total + Math.max((shift.expectedCash ?? 0) - (shift.countedCash ?? 0), 0) * (convert(1, shift.currency, data.settings.reportingCurrency, shift.closedAt ?? '', data.rates, base)), 0);
  const countShortages = data.counts
    .filter((count) => count.status === 'approved' && inRange(count.at, range) && inScope(count.branchId))
    .reduce(
      (total, count) =>
        total +
        count.lines.reduce((sum, line) => {
          const entry = index.get(line.variantId);
          return sum + Math.max(line.expected - line.counted, 0) * toReporting(data, entry ? currentUnitCost(data, entry.product.id, count.at) : 0, base, count.at);
        }, 0),
      0,
    );
  const transferMissing = data.transfers
    .filter((transfer) => transfer.receivedAt && inRange(transfer.receivedAt, range) && inScope(transfer.toBranchId))
    .reduce(
      (total, transfer) =>
        total +
        transfer.lines.reduce((sum, line) => {
          const entry = index.get(line.variantId);
          const missing = Math.max(line.qty - (line.received ?? line.qty), 0);
          return sum + missing * toReporting(data, entry ? currentUnitCost(data, entry.product.id, transfer.receivedAt) : 0, base, transfer.receivedAt ?? '');
        }, 0),
      0,
    );
  return { expenses, monthlyFees, absorbedDefects, writeOffs, cashShortages, countShortages, transferMissing };
};

// The period's costs in one branch's own currency (they are kept in the reporting currency), converted at the period's
// average rate: the branch's sales in its currency divided by the same sales converted (the rate on the last day when
// it sold nothing). Without a currency they stay in the reporting currency.
export const periodCostsIn = (data: Database, range: DateRange, branchIds: Id[] | undefined, currency?: CurrencyCode): PeriodCosts => {
  const costs = periodCosts(data, range, branchIds);
  if (!currency || currency === data.settings.reportingCurrency) return costs;
  const local = totalsOf(salesFacts(data, { range, branchIds, currency })).net;
  const reporting = totalsOf(salesFacts(data, { range, branchIds })).net;
  const factor = reporting ? local / reporting : convert(1, data.settings.reportingCurrency, currency, range.to, data.rates, data.settings.baseCurrency);
  return Object.fromEntries(Object.entries(costs).map(([key, value]) => [key, value * factor])) as unknown as PeriodCosts;
};

// Net profit after everything outside the sale itself.
export const netProfitOf = (totals: Totals, costs: PeriodCosts) =>
  totals.profit + costs.monthlyFees - totals.fees - costs.absorbedDefects - costs.writeOffs - costs.cashShortages - costs.countShortages - costs.transferMissing - costs.expenses;

export const rateExists = (data: Database, currency: CurrencyCode, date: IsoDateTime) => rateOn(data.rates, currency, date, data.settings.baseCurrency) !== null;
