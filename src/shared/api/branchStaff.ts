import type { CurrencyCode, Id } from '@/shared/types';
import { presetRange } from '@/shared/utils';
import type { BranchPeriod } from './branchDashboard';
import { assertBranch, builtInRolesOf } from './branchScope';
import { salesFacts, totalsBy } from './facts';
import { db, respond } from './server';

// The people of one branch and what each sold, for its manager. Selling figures only, never cost or profit.

export interface BranchStaffRow {
  userId: Id;
  name: string;
  roleIds: Id[];
  status: string;
  net: number; // net sales they rang up, after returns they took
  orders: number;
  units: number;
  discount: number; // manual discounts they gave
  discountCount: number;
  discountShare: number; // % of their gross sales given as manual discounts
}

export interface BranchDiscountRow {
  id: Id;
  at: string;
  saleNumber: string;
  cashierId: Id;
  productId: Id;
  productName: string;
  amount: number;
  reasonId?: Id;
}

export interface BranchStaff {
  currency: CurrencyCode;
  staff: BranchStaffRow[];
  discounts: BranchDiscountRow[]; // every manual discount in the period, newest first
}

export const getBranchStaff = (branchId: Id, period: BranchPeriod) =>
  respond((): BranchStaff => {
    const branch = assertBranch(branchId);
    const facts = salesFacts(db, { range: presetRange(period), branchIds: [branchId], currency: branch.currency });
    const byCashier = new Map(totalsBy(facts, (fact) => fact.cashierId).map((group) => [group.key, group.totals]));
    const manual = facts.filter((fact) => !fact.isReturn && fact.discountById && fact.figures.discount > 0);

    const staff = db.users
      .filter((user) => user.branchIds.includes(branchId) && !builtInRolesOf(user).includes('owner') && !builtInRolesOf(user).includes('brandPartner'))
      .map((user): BranchStaffRow => {
        const totals = byCashier.get(user.id);
        const given = manual.filter((fact) => fact.discountById === user.id);
        const discount = given.reduce((sum, fact) => sum + fact.figures.discount, 0);
        return {
          userId: user.id,
          name: user.name,
          roleIds: user.roleIds,
          status: user.status,
          net: totals?.net ?? 0,
          orders: totals?.orders ?? 0,
          units: totals ? totals.soldUnits - totals.returnedUnits : 0,
          discount,
          discountCount: given.length,
          discountShare: totals?.grossSales ? (discount / totals.grossSales) * 100 : 0,
        };
      })
      .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));

    const discounts = manual
      .map((fact): BranchDiscountRow => ({
        id: fact.lineId,
        at: fact.at,
        saleNumber: fact.saleNumber,
        cashierId: fact.discountById ?? fact.cashierId,
        productId: fact.productId,
        productName: db.products.find((product) => product.id === fact.productId)?.name ?? '',
        amount: fact.figures.discount,
        reasonId: fact.discountReasonId,
      }))
      .sort((a, b) => b.at.localeCompare(a.at));

    return { currency: branch.currency, staff, discounts };
  });
