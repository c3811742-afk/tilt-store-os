import type { CurrencyCode, Id } from '@/shared/types';
import { addDays, datesIn, presetRange, previousRange, sortBy, stockLevels, today, type DateRange } from '@/shared/utils';
import { netProfitOf, periodCostsIn, salesFacts, stockSummary, totalsBy, totalsOf, type PeriodCosts, type Totals } from './facts';
import { db, respond } from './server';

export interface DashboardFilter {
  range: DateRange;
  branchId?: Id; // none: all branches combined; the online store is a branch of kind "online"
  brandId?: Id;
}

export interface RankedRow {
  id: Id;
  label: string;
  units: number;
  net: number;
  profit: number;
  share: number; // % of total net sales
}

export interface BranchRow {
  branchId: Id;
  currency: CurrencyCode;
  netLocal: number; // in the branch's own currency
  net: number; // in the reporting currency
  profit: number;
  orders: number;
}

export interface Dashboard {
  currency: CurrencyCode;
  totals: Totals;
  previous: Totals;
  costs: PeriodCosts;
  previousCosts: PeriodCosts;
  netProfit: number;
  previousNetProfit: number;
  quick: { key: 'today' | 'week' | 'month'; net: number; previous: number }[];
  branches: BranchRow[];
  stock: { units: number; costValue: number; retailValue: number };
  topProducts: RankedRow[];
  slowProducts: RankedRow[];
  brandsByProfit: RankedRow[];
  daily: { day: string; net: number; previous: number }[];
  pendingApprovals: number;
}

const rankedLimit = 5;

export const getDashboard = (filter: DashboardFilter) =>
  respond((): Dashboard => {
    const branchIds = filter.branchId ? [filter.branchId] : undefined;
    const brandIds = filter.brandId ? [filter.brandId] : undefined;
    // One branch is shown in its own currency (Souq 7 in SAR); all branches together in the reporting currency.
    const ownCurrency = db.branches.find((branch) => branch.id === filter.branchId)?.currency;
    const currency = ownCurrency ?? db.settings.reportingCurrency;
    const previousPeriod = previousRange(filter.range);
    const facts = salesFacts(db, { range: filter.range, branchIds, brandIds, currency: ownCurrency });
    const previousFacts = salesFacts(db, { range: previousPeriod, branchIds, brandIds, currency: ownCurrency });
    const totals = totalsOf(facts);
    const previous = totalsOf(previousFacts);
    const costs = periodCostsIn(db, filter.range, branchIds, ownCurrency);
    const previousCosts = periodCostsIn(db, previousPeriod, branchIds, ownCurrency);

    const quick = (['today', 'week', 'month'] as const).map((key) => {
      const range = presetRange(key);
      return {
        key,
        net: totalsOf(salesFacts(db, { range, branchIds, brandIds, currency: ownCurrency })).net,
        previous: totalsOf(salesFacts(db, { range: previousRange(range), branchIds, brandIds, currency: ownCurrency })).net,
      };
    });

    const branches = db.branches
      .filter((branch) => branch.kind !== 'warehouse' && !branch.archived && (!filter.branchId || branch.id === filter.branchId))
      .map((branch): BranchRow => {
        const local = totalsOf(salesFacts(db, { range: filter.range, branchIds: [branch.id], brandIds, currency: branch.currency }));
        const reporting = totalsOf(salesFacts(db, { range: filter.range, branchIds: [branch.id], brandIds }));
        return { branchId: branch.id, currency: branch.currency, netLocal: local.net, net: reporting.net, profit: reporting.profit, orders: reporting.orders };
      });

    const stock = stockSummary(db, { branchIds, brandIds });

    const productName = new Map(db.products.map((product) => [product.id, product.name]));
    const brandName = new Map(db.brands.map((brand) => [brand.id, brand.name]));
    const toRanked = (key: string, group: Totals, names: Map<string, string>): RankedRow => ({
      id: key,
      label: names.get(key) ?? key,
      units: group.soldUnits - group.returnedUnits,
      net: group.net,
      profit: group.profit,
      share: totals.net ? (group.net / totals.net) * 100 : 0,
    });
    const byProduct = totalsBy(facts, (fact) => fact.productId).map((row) => toRanked(row.key, row.totals, productName));
    // Slow sellers: products with stock on hand that sold least (including those that didn't sell at all).
    const productsWithStock = db.products.filter((product) => !product.archived && (!filter.brandId || product.brandId === filter.brandId) && product.variants.some((variant) => (stock.unitsByVariant.get(variant.id) ?? 0) > 0));
    const soldById = new Map(byProduct.map((row) => [row.id, row]));
    const slow = productsWithStock.map((product) => soldById.get(product.id) ?? { id: product.id, label: product.name, units: 0, net: 0, profit: 0, share: 0 });
    const byBrand = totalsBy(facts, (fact) => fact.brandId).map((row) => toRanked(row.key, row.totals, brandName));

    const days = datesIn(filter.range);
    const shift = days.length;
    const daily = days.map((day) => ({
      day,
      net: facts.filter((fact) => fact.day === day).reduce((sum, fact) => sum + fact.figures.net, 0),
      previous: previousFacts.filter((fact) => fact.day === addDays(day, -shift)).reduce((sum, fact) => sum + fact.figures.net, 0),
    }));

    return {
      currency,
      totals,
      previous,
      costs,
      previousCosts,
      netProfit: netProfitOf(totals, costs),
      previousNetProfit: netProfitOf(previous, previousCosts),
      quick,
      branches,
      stock: stock.summary,
      topProducts: sortBy(byProduct, (row) => row.units, 'desc').slice(0, rankedLimit),
      slowProducts: sortBy(slow, (row) => row.units).slice(0, rankedLimit),
      brandsByProfit: sortBy(byBrand, (row) => row.profit, 'desc'),
      daily,
      pendingApprovals: db.approvals.filter((approval) => approval.status === 'pending' && approval.level === 'owner').length,
    };
  });

export interface MorningSummary {
  currency: CurrencyCode;
  yesterday: { net: number; lastWeek: number; orders: number; profit: number };
  today: { net: number; orders: number };
  monthToDate: { net: number; previous: number };
  branches: { branchId: Id; net: number }[];
  pendingApprovals: number;
  newAlerts: number;
  lowStockItems: number;
  cashDifferences: { branchId: Id; difference: number; currency: CurrencyCode }[];
  failedReceipts: number;
}

// Yesterday at a glance, for the owner's phone in the morning.
export const getMorningSummary = (userId: Id) =>
  respond((): MorningSummary => {
    const day = today();
    const yesterday = addDays(day, -1);
    const yesterdayTotals = totalsOf(salesFacts(db, { range: { from: yesterday, to: yesterday } }));
    const lastWeek = totalsOf(salesFacts(db, { range: { from: addDays(yesterday, -7), to: addDays(yesterday, -7) } }));
    const todayTotals = totalsOf(salesFacts(db, { range: { from: day, to: day } }));
    const month = presetRange('month');
    const yesterdayFacts = salesFacts(db, { range: { from: yesterday, to: yesterday } });
    return {
      currency: db.settings.reportingCurrency,
      yesterday: { net: yesterdayTotals.net, lastWeek: lastWeek.net, orders: yesterdayTotals.orders, profit: yesterdayTotals.profit },
      today: { net: todayTotals.net, orders: todayTotals.orders },
      monthToDate: { net: totalsOf(salesFacts(db, { range: month })).net, previous: totalsOf(salesFacts(db, { range: previousRange(month) })).net },
      branches: db.branches
        .filter((branch) => branch.kind !== 'warehouse' && !branch.archived)
        .map((branch) => ({ branchId: branch.id, net: totalsOf(yesterdayFacts.filter((fact) => fact.branchId === branch.id)).net })),
      pendingApprovals: db.approvals.filter((approval) => approval.status === 'pending' && approval.level === 'owner').length,
      newAlerts: db.notifications.filter((item) => item.userIds.includes(userId) && !item.openedBy.includes(userId)).length,
      lowStockItems: lowStockRows().length,
      cashDifferences: db.shifts
        .filter((shift) => shift.closedAt?.startsWith(yesterday) || (shift.closedAt && shift.closedAt.slice(0, 10) === yesterday))
        .map((shift) => ({ branchId: shift.branchId, difference: (shift.countedCash ?? 0) - (shift.expectedCash ?? 0), currency: shift.currency }))
        .filter((row) => row.difference !== 0),
      failedReceipts: db.sales.filter((sale) => sale.eReceipt.status === 'failed').length,
    };
  });

// Items at or under their minimum in a store branch (low or out of stock), counting pieces available to sell.
export const lowStockRows = () => {
  const available = new Map<string, number>();
  const carried = new Set<string>(); // the branch has had stock of the item, so it carries it
  db.movements.forEach((movement) => {
    if (movement.to) carried.add(`${movement.variantId}|${movement.to.branchId}`);
  });
  stockLevels(db.movements).forEach((level) => {
    if (level.status !== 'available') return;
    const key = `${level.variantId}|${level.branchId}`;
    available.set(key, (available.get(key) ?? 0) + level.qty);
  });
  const rows: { variantId: Id; branchId: Id; qty: number; min: number }[] = [];
  db.branches
    .filter((branch) => branch.kind === 'store' && !branch.archived)
    .forEach((branch) =>
      db.products
        .filter((product) => !product.archived)
        .forEach((product) =>
          product.variants.forEach((variant) => {
            const key = `${variant.id}|${branch.id}`;
            if (!carried.has(key)) return;
            const min = db.minQty[key] ?? db.settings.lowStockDefault;
            const qty = available.get(key) ?? 0;
            if (qty <= min) rows.push({ variantId: variant.id, branchId: branch.id, qty, min });
          }),
        ),
    );
  return rows;
};
