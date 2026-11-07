import type { Id, IsoDate } from '@/shared/types';
import { inRange, saleTotal, type DateRange } from '@/shared/utils';
import { assertBranch } from './branchScope';
import { describeVariant } from './stock';
import { db, respond } from './server';

// The branch manager's reports: every completed sale of a day, and the returns and exchanges of a period.
// Selling prices and refunds only, never cost, margin or profit.

export interface BranchSaleRow {
  id: Id;
  number: string;
  at: string;
  cashierId: Id;
  items: number;
  methodIds: Id[];
  total: number;
  discount: number;
  voided: boolean;
}

export const getBranchDailySales = (branchId: Id, day: IsoDate) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const rows: BranchSaleRow[] = db.sales
      .filter((sale) => sale.branchId === branchId && inRange(sale.at, { from: day, to: day }))
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((sale) => ({
        id: sale.id,
        number: sale.number,
        at: sale.at,
        cashierId: sale.cashierId,
        items: sale.lines.reduce((sum, line) => sum + line.qty, 0),
        methodIds: sale.payments.map((payment) => payment.methodId),
        total: saleTotal(sale),
        discount: sale.lines.reduce((sum, line) => sum + line.discount, 0),
        voided: Boolean(sale.voidedAt),
      }));
    const completed = rows.filter((row) => !row.voided);
    return {
      currency: branch.currency,
      rows,
      total: completed.reduce((sum, row) => sum + row.total, 0),
      items: completed.reduce((sum, row) => sum + row.items, 0),
      discount: completed.reduce((sum, row) => sum + row.discount, 0),
      count: completed.length,
    };
  });

export interface BranchReturnRow {
  id: Id;
  number: string;
  at: string;
  saleNumber: string;
  kind: 'return' | 'exchange';
  byId: Id;
  lines: { productName: string; size: string; color: string; qty: number; reasonId: Id; condition: string }[];
  refund: number;
  exchangeSaleNumber?: string;
}

export const getBranchReturns = (branchId: Id, range: DateRange) =>
  respond(() => {
    const branch = assertBranch(branchId);
    const saleById = new Map(db.sales.map((sale) => [sale.id, sale]));
    const rows: BranchReturnRow[] = db.returns
      .filter((saleReturn) => saleReturn.branchId === branchId && inRange(saleReturn.at, range))
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((saleReturn) => {
        const sale = saleById.get(saleReturn.saleId);
        return {
          id: saleReturn.id,
          number: saleReturn.number,
          at: saleReturn.at,
          saleNumber: sale?.number ?? '',
          kind: saleReturn.kind,
          byId: saleReturn.byId,
          lines: saleReturn.lines.map((line) => {
            const saleLine = sale?.lines.find((current) => current.id === line.saleLineId);
            const info = describeVariant(saleLine?.variantId ?? '');
            return { productName: info.productName, size: info.size, color: info.color, qty: line.qty, reasonId: line.reasonId, condition: line.condition };
          }),
          refund: saleReturn.refunds.reduce((sum, refund) => sum + refund.amount, 0),
          exchangeSaleNumber: saleReturn.exchangeSaleId ? saleById.get(saleReturn.exchangeSaleId)?.number : undefined,
        };
      });
    return {
      currency: branch.currency,
      rows,
      returns: rows.filter((row) => row.kind === 'return').length,
      exchanges: rows.filter((row) => row.kind === 'exchange').length,
      refunded: rows.reduce((sum, row) => sum + row.refund, 0),
      pieces: rows.reduce((sum, row) => sum + row.lines.reduce((total, line) => total + line.qty, 0), 0),
    };
  });
