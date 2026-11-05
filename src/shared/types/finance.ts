import type { CurrencyCode, Id, IsoDate, IsoDateTime, StoredFile } from './common';

export interface Expense {
  id: Id;
  categoryId: Id;
  branchId: Id | null; // null: the whole company
  currency: CurrencyCode;
  amount: number;
  date: IsoDate;
  repeatMonthly: boolean;
  note: string;
  receipt?: StoredFile;
  seriesId?: Id; // the monthly expense this one repeats
  byId: Id;
  at: IsoDateTime;
}

export type BrandPaymentMethod = 'bank' | 'instapay' | 'cash';

export interface BrandPayment {
  id: Id;
  brandId: Id;
  date: IsoDate;
  amount: number;
  currency: CurrencyCode;
  method: BrandPaymentMethod;
  reference: string;
  statementId?: Id;
  byId: Id;
  at: IsoDateTime;
}

// A brand's monthly fee for one month. Paid when collected or taken out of a payout.
export interface FeeCharge {
  id: Id;
  brandId: Id;
  month: string; // 2026-11
  amount: number;
  currency: CurrencyCode;
  paidAt?: IsoDateTime;
  deductedInStatementId?: Id;
}

export interface StatementTotals {
  soldUnits: number;
  sales: number; // in the payout currency
  returnedUnits: number;
  returns: number;
  defectiveUnits: number;
  brandDiscounts: number; // discounts the brand pays for
  commission: number;
  monthlyFees: number;
  defectDeductions: number;
  carriedIn: number; // deductions from earlier statements (returns after payment, rent owed)
  amountDue: number; // what the store owes the brand; negative when the brand owes the store
}

export type StatementStatus = 'draft' | 'approved' | 'paid';

export interface Statement {
  id: Id;
  number: string;
  brandId: Id;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  currency: CurrencyCode;
  totals: StatementTotals;
  saleLineIds: Id[];
  returnLineIds: string[]; // `${returnId}:${saleLineId}`
  status: StatementStatus;
  locked: boolean; // a locked period can no longer change; later returns carry into the next statement
  createdAt: IsoDateTime;
  byId: Id;
  approvedById?: Id;
  paymentId?: Id;
}
