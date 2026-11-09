import type { CurrencyCode, Id, IsoDate } from '@/shared/types';
import { compareRange, presetRange, type CompareTo, type DateRange } from '@/shared/utils';
import { assertBranch } from './branchScope';
import { lowStockRows } from './dashboard';
import { salesFacts, totalsBy, totalsOf, type Fact } from './facts';
import { db, respond } from './server';

// The branch manager's view of their branch. Only selling figures: no cost, margin, commission or profit
// ever leaves these calls, and only the manager's own branch.

export type BranchPeriod = 'today' | 'week' | 'month';

export interface BranchSales {
  sales: number; // net sales before returns
  returns: number; // given back to customers
  net: number; // sales minus returns
  orders: number;
  units: number;
}

export interface BranchProductRow {
  productId: Id;
  productName: string;
  brandId: Id;
  units: number;
  net: number;
  unitShare: number; // % of the units the branch sold
  netShare: number; // % of the branch's net sales
}

export interface BranchDashboard {
  currency: CurrencyCode;
  today: { current: BranchSales; previous: BranchSales; previousRange: DateRange };
  week: { current: BranchSales; previous: BranchSales; previousRange: DateRange };
  products: BranchProductRow[]; // every product sold in the chosen period, best-selling first
  attention: { approvals: number; lowStock: number; arriving: number; openRegisters: number };
}

const branchFacts = (branchId: Id, currency: CurrencyCode, range: DateRange) => salesFacts(db, { range, branchIds: [branchId], currency });

const salesOf = (facts: readonly Fact[]): BranchSales => {
  const totals = totalsOf(facts);
  return { sales: totals.net + totals.returnsAmount, returns: totals.returnsAmount, net: totals.net, orders: totals.orders, units: totals.soldUnits - totals.returnedUnits };
};

// A period and the period the manager compares it with.
const compare = (branchId: Id, currency: CurrencyCode, range: DateRange, compareTo: CompareTo, date?: IsoDate) => {
  const previousRange = compareRange(range, compareTo, date);
  return { current: salesOf(branchFacts(branchId, currency, range)), previous: salesOf(branchFacts(branchId, currency, previousRange)), previousRange };
};

// Products ranked by units sold, each with its share of the branch's units and net sales.
export const branchProductRows = (facts: readonly Fact[]): BranchProductRow[] => {
  const all = totalsOf(facts);
  const allUnits = all.soldUnits - all.returnedUnits;
  return totalsBy(facts, (fact) => fact.productId)
    .map(({ key, totals }) => {
      const product = db.products.find((current) => current.id === key);
      const units = totals.soldUnits - totals.returnedUnits;
      return {
        productId: key,
        productName: product?.name ?? '',
        brandId: product?.brandId ?? '',
        units,
        net: totals.net,
        unitShare: allUnits ? (units / allUnits) * 100 : 0,
        netShare: all.net ? (totals.net / all.net) * 100 : 0,
      };
    })
    .filter((row) => row.units > 0)
    .sort((a, b) => b.units - a.units || b.net - a.net);
};

export const getBranchDashboard = (branchId: Id, period: BranchPeriod, compareTo: CompareTo = 'previous', compareDate?: IsoDate) =>
  respond((): BranchDashboard => {
    const branch = assertBranch(branchId);
    const currency = branch.currency;
    return {
      currency,
      today: compare(branchId, currency, presetRange('today'), compareTo, compareDate),
      week: compare(branchId, currency, presetRange('week'), compareTo, compareDate),
      products: branchProductRows(branchFacts(branchId, currency, presetRange(period))),
      attention: {
        approvals: db.approvals.filter((approval) => approval.status === 'pending' && approval.level === 'manager' && approval.branchId === branchId).length,
        lowStock: lowStockRows().filter((row) => row.branchId === branchId).length,
        arriving: db.transfers.filter((transfer) => transfer.toBranchId === branchId && transfer.status === 'sent').length,
        openRegisters: db.shifts.filter((shift) => shift.branchId === branchId && !shift.closedAt).length,
      },
    };
  });
