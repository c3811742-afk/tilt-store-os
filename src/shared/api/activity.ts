import type { ActivityAction, FlagRules, Id } from '@/shared/types';
import { inRange, saleTotal, type DateRange } from '@/shared/utils';
import { db, mutate, respond } from './server';

export interface ActivityFilter {
  range: DateRange;
  userId?: Id;
  branchId?: Id;
  action?: ActivityAction;
  flaggedOnly?: boolean;
}

const pageSize = 300; // the newest entries; narrow the filters to see older ones

// The activity log: who did what, when and in which branch, with the old and new values of each change.
export const listActivity = (filter: ActivityFilter) =>
  respond(() => {
    const rows = db.activity.filter(
      (entry) =>
        inRange(entry.at, filter.range) &&
        (!filter.userId || entry.userId === filter.userId) &&
        (!filter.branchId || entry.branchId === filter.branchId) &&
        (!filter.action || entry.action === filter.action) &&
        (!filter.flaggedOnly || entry.flagged),
    );
    return { rows: rows.slice(0, pageSize), total: rows.length };
  });

// Which actions are flagged for the owners (discounts or refunds above a limit, price changes, write-offs...).
export const setFlagRules = (rules: FlagRules) =>
  mutate(() => {
    db.settings.flagRules = rules;
    return rules;
  });

// ---- Customers ------------------------------------------------------------------------------------------------

export const listCustomers = (query: string) =>
  respond(() => {
    const needle = query.trim().toLowerCase();
    const stats = new Map<Id, { orders: number; lastAt: string; total: number; currency: string }>();
    db.sales.forEach((sale) => {
      if (!sale.customerId || sale.voidedAt) return;
      const current = stats.get(sale.customerId) ?? { orders: 0, lastAt: '', total: 0, currency: sale.currency };
      current.orders += 1;
      current.total += sale.currency === current.currency ? saleTotal(sale) : 0;
      if (sale.at > current.lastAt) current.lastAt = sale.at;
      stats.set(sale.customerId, current);
    });
    return db.customers
      .filter((customer) => !needle || customer.name.toLowerCase().includes(needle) || customer.phone.includes(needle))
      .map((customer) => ({ customer, ...(stats.get(customer.id) ?? { orders: 0, lastAt: '', total: 0, currency: db.settings.baseCurrency }) }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  });

export const getCustomer = (customerId: Id) =>
  respond(() => {
    const customer = db.customers.find((current) => current.id === customerId);
    if (!customer) return null;
    const productName = new Map(db.products.flatMap((product) => product.variants.map((variant) => [variant.id, `${product.name} · ${variant.size} · ${variant.color}`] as const)));
    const sales = db.sales
      .filter((sale) => sale.customerId === customerId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((sale) => ({
        sale,
        total: saleTotal(sale),
        items: sale.lines.map((line) => ({ label: productName.get(line.variantId) ?? '', qty: line.qty, paid: line.unitPrice * line.qty - line.discount })),
        returned: db.returns.filter((saleReturn) => saleReturn.saleId === sale.id).reduce((sum, saleReturn) => sum + saleReturn.lines.reduce((lineSum, line) => lineSum + line.qty, 0), 0),
      }));
    return { customer, sales };
  });
