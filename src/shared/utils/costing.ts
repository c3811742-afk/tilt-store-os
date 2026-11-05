import type { Batch } from '@/shared/types';

// A batch's cost per piece before defects, and after them: defects spread their cost over the good pieces
// (500 of 5,000 defective: EGP 100 -> EGP 111.11), unless written off as a loss. A brand credit lowers it again.
export const batchUnitCosts = (batch: Batch) => {
  const original = batch.qty ? batch.totalCost / batch.qty : 0;
  const good = batch.qty - batch.defects;
  const spread = batch.defectHandling === 'redistribute' && batch.redistribution !== 'rejected';
  const adjusted = spread && good > 0 ? (batch.totalCost - batch.brandCredit) / good : batch.qty ? (batch.totalCost - batch.brandCredit) / batch.qty : 0;
  // A redistribution waiting for approval doesn't change the cost yet.
  const effective = spread && batch.redistribution === 'pending' ? original : adjusted;
  const writtenOffLoss = batch.defectHandling === 'writeOff' ? Math.max(batch.defects * original - batch.brandCredit, 0) : 0;
  return { original, adjusted, effective, proposed: adjusted, writtenOffLoss };
};

// The selling price that keeps the target margin on a cost (margin on the price without VAT).
export const suggestedPrice = (unitCost: number, targetMarginPercent: number, vatRate: number) => {
  const exVat = unitCost / (1 - Math.min(targetMarginPercent, 95) / 100);
  return exVat * (1 + vatRate / 100);
};

// Margin and markup of a price (VAT included) on a cost.
export const priceMargins = (priceInclVat: number, unitCost: number, vatRate: number) => {
  const price = priceInclVat / (1 + vatRate / 100);
  return {
    margin: price ? ((price - unitCost) / price) * 100 : 0,
    markup: unitCost ? ((price - unitCost) / unitCost) * 100 : 0,
    profit: price - unitCost,
  };
};

// Rounds a suggested price to a shop price: 50s in EGP-sized amounts, 5s in smaller currencies, then minus 1 (1,449).
export const shopPrice = (amount: number) => {
  const step = amount > 500 ? 50 : 5;
  const rounded = Math.ceil(amount / step) * step;
  return rounded > step ? rounded - 1 : rounded;
};
