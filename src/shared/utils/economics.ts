import type { Sale, SaleLine } from '@/shared/types';

// Everything one sale line means for the store, in the sale's currency. Prices include VAT; every money figure
// below except `grossInclVat` and `netInclVat` is without VAT, so profit is never inflated by tax.
// Commission brands: the store's revenue is its commission; what it owes the brand is its "cost".
export interface LineFigures {
  units: number;
  grossInclVat: number; // list price x quantity
  netInclVat: number; // what the customer paid for it
  gross: number;
  discount: number;
  brandDiscount: number; // the part of the discount the brand pays
  storeDiscount: number; // the part the store pays
  net: number; // net sales
  vat: number;
  cost: number; // cost of goods sold; for commission brands, the brand's share
  commission: number; // commission brands only
  brandPayout: number; // commission brands only: what the store owes the brand
  profit: number; // gross profit
}

const exVat = (amount: number, vatRate: number) => amount / (1 + vatRate / 100);

// `units` lets a report count part of a line (e.g. what's left after a return).
export const lineFigures = (sale: Pick<Sale, 'vatRate' | 'rate'>, line: SaleLine, units: number = line.qty): LineFigures => {
  const share = line.qty ? units / line.qty : 0;
  const grossInclVat = line.unitPrice * units;
  const discountInclVat = line.discount * share;
  const netInclVat = grossInclVat - discountInclVat;
  const gross = exVat(grossInclVat, sale.vatRate);
  const discount = exVat(discountInclVat, sale.vatRate);
  const net = gross - discount;
  const brandDiscount = line.model === 'own' ? 0 : (discount * line.brandSharePercent) / 100;
  const storeDiscount = discount - brandDiscount;

  if (line.model === 'commission') {
    const base = line.commissionOnOriginal ? gross : net;
    const commission = (base * line.commissionRate) / 100;
    const brandPayout = gross - brandDiscount - commission;
    return {
      units,
      grossInclVat,
      netInclVat,
      gross,
      discount,
      brandDiscount,
      storeDiscount,
      net,
      vat: netInclVat - net,
      cost: brandPayout,
      commission,
      brandPayout,
      profit: net - brandPayout,
    };
  }
  // Own and bought stock: the cost is what the store paid (unitCost is in the base currency: converted with the sale's rate).
  const cost = (line.unitCost / (sale.rate || 1)) * units;
  return {
    units,
    grossInclVat,
    netInclVat,
    gross,
    discount,
    brandDiscount,
    storeDiscount,
    net,
    vat: netInclVat - net,
    cost,
    commission: 0,
    brandPayout: 0,
    profit: net - cost,
  };
};

// The card and wallet fees of a sale, in its currency.
export const saleFees = (sale: Sale) => sale.payments.reduce((total, payment) => total + (payment.amount * payment.feePercent) / 100, 0);

export const saleTotal = (sale: Sale) => sale.lines.reduce((total, line) => total + line.unitPrice * line.qty - line.discount, 0);

export const emptyFigures = (): LineFigures => ({
  units: 0,
  grossInclVat: 0,
  netInclVat: 0,
  gross: 0,
  discount: 0,
  brandDiscount: 0,
  storeDiscount: 0,
  net: 0,
  vat: 0,
  cost: 0,
  commission: 0,
  brandPayout: 0,
  profit: 0,
});

// Adds `figures` scaled by `factor` (a currency conversion, or -1 for a return) into `total`.
export const addFigures = (total: LineFigures, figures: LineFigures, factor = 1) => {
  (Object.keys(total) as (keyof LineFigures)[]).forEach((key) => {
    total[key] += figures[key] * (key === 'units' ? Math.sign(factor) : factor);
  });
  return total;
};

export const marginPercent = (profit: number, net: number) => (net ? (profit / net) * 100 : 0);
