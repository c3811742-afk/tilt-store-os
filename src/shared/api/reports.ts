import type { CurrencyCode, Id, IsoDate, SalesChannel } from '@/shared/types';
import { addDays, currentTerms, inRange, marginPercent, previousRange, stockLevels, today, toIsoDate, type DateRange } from '@/shared/utils';
import { onHandStatuses } from '@/shared/constants/statuses';
import { variantIndex } from './engine';
import { availableInPeriod, periodCosts, salesFacts, sellThrough, totalsBy, totalsOf, type Fact } from './facts';
import { lowStockRows } from './dashboard';
import { toTransferView } from './stock';
import { db, respond } from './server';

// Every report the owner can run. Each returns typed columns and rows; one page shows, compares and exports them.
export const reportIds = ['pnl', 'products', 'contribution', 'brands', 'sales', 'sizes', 'sellThrough', 'slowMovers', 'lowStock', 'discounts', 'returns', 'counts', 'shifts', 'transfers', 'vat'] as const;
export type ReportId = (typeof reportIds)[number];

export const reportGroupings = {
  products: ['product', 'variant'],
  contribution: ['brand', 'category', 'product'],
  sales: ['sale', 'date', 'branch', 'brand', 'category', 'product', 'cashier', 'paymentMethod', 'channel'],
  sizes: ['size', 'color', 'sizeColor'],
  sellThrough: ['product', 'brand'],
  returns: ['reason', 'product', 'brand', 'branch', 'cashier'],
} as const satisfies Partial<Record<ReportId, readonly string[]>>;

export type ReportGrouping = (typeof reportGroupings)[keyof typeof reportGroupings][number];

export type ColumnKind = 'text' | 'money' | 'number' | 'percent' | 'date' | 'dateTime';

export interface ReportColumn {
  key: string; // its label is text.owner.reports.columns[key]
  kind: ColumnKind;
  compare?: boolean; // shown with the previous period's value when comparing
}

export type ReportCell = string | number | null;
export interface ReportRow {
  key: string;
  cells: Record<string, ReportCell>;
  currency?: CurrencyCode; // money in this row is in this currency (default: the report's)
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: Record<string, ReportCell>;
  currency: CurrencyCode;
  previous?: Record<string, Record<string, ReportCell>>; // row key -> cells, when comparing
  previousTotals?: Record<string, ReportCell>;
}

export interface ReportFilter {
  range: DateRange;
  branchId?: Id;
  brandId?: Id;
  // Narrow the sales a report counts; every one can be combined with the others.
  categoryId?: Id;
  productId?: Id; // one product (e.g. drilled into from a brand)
  variantId?: Id; // one item: a product in one size and colour
  cashierId?: Id;
  paymentMethodId?: Id;
  channel?: SalesChannel;
  size?: string;
  color?: string;
  groupBy?: ReportGrouping;
  // 'reporting': converted to the reporting currency at each sale's rate. 'branch': each branch in its own currency.
  currencyMode?: 'reporting' | 'branch';
  compare?: boolean;
  weeks?: number; // slow movers: not sold for this many weeks
}

const col = (key: string, kind: ColumnKind, compare = false): ReportColumn => ({ key, kind, compare });

const names = () => {
  const index = variantIndex(db);
  return {
    index,
    product: new Map(db.products.map((product) => [product.id, product.name])),
    brand: new Map(db.brands.map((brand) => [brand.id, brand.name])),
    category: new Map(db.categories.map((category) => [category.id, category.name.en])),
    categoryAr: new Map(db.categories.map((category) => [category.id, category.name.ar])),
    branch: new Map(db.branches.map((branch) => [branch.id, branch.name])),
    user: new Map(db.users.map((user) => [user.id, user.name])),
  };
};

// The sale lines a report counts, with every filter applied together (branch, brand, category, staff member,
// payment method, channel, size and colour).
const factsFor = (filter: ReportFilter, range: DateRange = filter.range, currency?: CurrencyCode) => {
  const index = variantIndex(db);
  return salesFacts(db, {
    range,
    branchIds: filter.branchId ? [filter.branchId] : undefined,
    brandIds: filter.brandId ? [filter.brandId] : undefined,
    categoryIds: filter.categoryId ? [filter.categoryId] : undefined,
    channel: filter.channel,
    currency: currency ?? 'reporting',
  }).filter((fact) => {
    const variant = index.get(fact.variantId)?.variant;
    return (
      (!filter.productId || fact.productId === filter.productId) &&
      (!filter.variantId || fact.variantId === filter.variantId) &&
      (!filter.cashierId || fact.cashierId === filter.cashierId) &&
      (!filter.paymentMethodId || fact.paymentMethodIds.includes(filter.paymentMethodId)) &&
      (!filter.size || variant?.size === filter.size) &&
      (!filter.color || variant?.color === filter.color)
    );
  });
};

// The currency a report's money is in: the branch's own currency when asked and one branch is chosen.
const reportCurrency = (filter: ReportFilter) => {
  const branch = db.branches.find((current) => current.id === filter.branchId);
  return filter.currencyMode === 'branch' && branch ? branch.currency : db.settings.reportingCurrency;
};

const salesColumns = [col('orders', 'number', true), col('units', 'number', true), col('grossSales', 'money', true), col('discounts', 'money'), col('returns', 'money'), col('netSales', 'money', true), col('cost', 'money'), col('grossProfit', 'money', true), col('margin', 'percent')];

const salesCells = (facts: Fact[]) => {
  const totals = totalsOf(facts);
  return {
    orders: totals.orders,
    units: totals.soldUnits - totals.returnedUnits,
    grossSales: totals.grossSales,
    discounts: totals.discount,
    returns: totals.returnsAmount,
    netSales: totals.net,
    cost: totals.cost,
    grossProfit: totals.profit,
    margin: marginPercent(totals.profit, totals.net),
  };
};

// ---- Each report ------------------------------------------------------------------------------------------------

type Builder = (filter: ReportFilter, range: DateRange) => Omit<ReportResult, 'previous' | 'previousTotals'>;

// Profit and loss per branch: gross sales down to net profit (141, 142, 143). In 'branch' currency mode each
// branch is in its own currency (63).
const pnl: Builder = (filter, range) => {
  const ownCurrency = filter.currencyMode === 'branch';
  const branches = db.branches.filter((branch) => branch.kind !== 'warehouse' && (!filter.branchId || branch.id === filter.branchId) && (!branch.archived || db.sales.some((sale) => sale.branchId === branch.id && inRange(sale.at, range))));
  const row = (branchIds: Id[] | undefined, currency?: CurrencyCode) => {
    const facts = salesFacts(db, { range, branchIds, brandIds: filter.brandId ? [filter.brandId] : undefined, currency: currency ?? 'reporting' });
    const totals = totalsOf(facts);
    const costs = periodCosts(db, range, branchIds);
    // Costs outside sales are in the reporting currency; in a branch's own currency they are converted at the
    // period's average rate (its sales in its currency / the same sales converted).
    const converted = currency ? totalsOf(salesFacts(db, { range, branchIds })).net : 0;
    const factor = currency && converted ? totals.net / converted : 1;
    const losses = costs.absorbedDefects + costs.writeOffs + costs.cashShortages + costs.countShortages + costs.transferMissing;
    return {
      grossSales: totals.grossSales,
      discounts: totals.discount,
      returns: totals.returnsAmount,
      netSales: totals.net,
      cost: totals.cost,
      grossProfit: totals.profit,
      margin: marginPercent(totals.profit, totals.net),
      cardFees: totals.fees,
      monthlyFees: costs.monthlyFees * factor,
      losses: losses * factor,
      expenses: costs.expenses * factor,
      netProfit: totals.profit - totals.fees + (costs.monthlyFees - losses - costs.expenses) * factor,
    };
  };
  const rows: ReportRow[] = branches.map((branch) => ({ key: branch.id, cells: { name: branch.name, ...row([branch.id], ownCurrency ? branch.currency : undefined) }, currency: ownCurrency ? branch.currency : undefined }));
  const showTotal = !filter.branchId && !ownCurrency;
  const totals = showTotal ? { name: 'total', ...row(undefined) } : undefined;
  // Costs not tied to a branch (company-wide expenses such as salaries or marketing): their own row, so every
  // column adds up to the total.
  if (totals) {
    const branchSum = (key: 'expenses' | 'losses') => rows.reduce((sum, current) => sum + Number(current.cells[key] ?? 0), 0);
    const expenses = Number(totals.expenses) - branchSum('expenses');
    const losses = Number(totals.losses) - branchSum('losses');
    if (Math.abs(expenses) + Math.abs(losses) > 0.5)
      rows.push({ key: 'company', cells: { name: 'company', ...(Math.abs(losses) > 0.5 ? { losses } : {}), expenses, netProfit: -(expenses + losses) } });
  }
  return {
    currency: db.settings.reportingCurrency,
    columns: [col('name', 'text'), col('grossSales', 'money', true), col('discounts', 'money'), col('returns', 'money'), col('netSales', 'money', true), col('cost', 'money'), col('grossProfit', 'money', true), col('margin', 'percent'), col('cardFees', 'money'), col('monthlyFees', 'money'), col('losses', 'money'), col('expenses', 'money'), col('netProfit', 'money', true)],
    rows,
    totals,
  };
};

// Profit and margin per product or per variant (144).
const products: Builder = (filter, range) => {
  const n = names();
  const byVariant = filter.groupBy === 'variant';
  const facts = factsFor(filter, range, reportCurrency(filter));
  const groups = totalsBy(facts, (fact) => (byVariant ? fact.variantId : fact.productId));
  return {
    currency: reportCurrency(filter),
    columns: [col('name', 'text'), col('brand', 'text'), col('units', 'number', true), col('netSales', 'money', true), col('cost', 'money'), col('grossProfit', 'money', true), col('margin', 'percent')],
    rows: groups
      .sort((a, b) => b.totals.net - a.totals.net)
      .map(({ key, totals }) => {
        const entry = byVariant ? n.index.get(key) : undefined;
        const productId = entry?.product.id ?? key;
        return {
          key,
          cells: {
            name: entry ? `${entry.product.name} · ${entry.variant.size} · ${entry.variant.color}` : (n.product.get(key) ?? key),
            brand: n.brand.get(db.products.find((product) => product.id === productId)?.brandId ?? '') ?? '',
            units: totals.soldUnits - totals.returnedUnits,
            netSales: totals.net,
            cost: totals.cost,
            grossProfit: totals.profit,
            margin: marginPercent(totals.profit, totals.net),
          },
        };
      }),
    totals: { name: 'total', ...salesCells(facts) },
  };
};

// Each product's, brand's or category's share of sales and of gross profit (145).
const contribution: Builder = (filter, range) => {
  const n = names();
  const groupBy = filter.groupBy ?? 'brand';
  const facts = factsFor(filter, range, reportCurrency(filter));
  const all = totalsOf(facts);
  const keyOf = (fact: Fact) => (groupBy === 'category' ? fact.categoryId : groupBy === 'product' ? fact.productId : fact.brandId);
  const label = (key: string) => (groupBy === 'category' ? (n.category.get(key) ?? key) : groupBy === 'product' ? (n.product.get(key) ?? key) : (n.brand.get(key) ?? key));
  return {
    currency: reportCurrency(filter),
    columns: [col('name', 'text'), col('netSales', 'money', true), col('salesShare', 'percent'), col('grossProfit', 'money', true), col('profitShare', 'percent')],
    rows: totalsBy(facts, keyOf)
      .sort((a, b) => b.totals.net - a.totals.net)
      .map(({ key, totals }) => ({
        key,
        cells: {
          name: groupBy === 'category' ? `${label(key)}` : label(key),
          netSales: totals.net,
          salesShare: all.net ? (totals.net / all.net) * 100 : 0,
          grossProfit: totals.profit,
          profitShare: all.profit ? (totals.profit / all.profit) * 100 : 0,
        },
      })),
    totals: { name: 'total', netSales: all.net, salesShare: 100, grossProfit: all.profit, profitShare: 100 },
  };
};

// A scorecard per brand (146): units, net sales, profit to the store, commission, margin, sell-through, return and defect rates.
const brands: Builder = (filter, range) => {
  const n = names();
  const facts = factsFor(filter, range);
  const levels = stockLevels(db.movements);
  const onHand = new Map<Id, number>();
  levels.forEach((level) => {
    if (!onHandStatuses.includes(level.status) || (filter.branchId && level.branchId !== filter.branchId)) return;
    const brandId = n.index.get(level.variantId)?.product.brandId;
    if (brandId) onHand.set(brandId, (onHand.get(brandId) ?? 0) + level.qty);
  });
  const available = availableInPeriod(db, range, (variantId) => n.index.get(variantId)?.product.brandId, filter.branchId ? [filter.branchId] : undefined);
  const defects = new Map<Id, number>();
  db.defects.filter((defect) => inRange(defect.at, range) && (!filter.branchId || defect.branchId === filter.branchId)).forEach((defect) => {
    const brandId = n.index.get(defect.variantId)?.product.brandId;
    if (brandId) defects.set(brandId, (defects.get(brandId) ?? 0) + defect.qty);
  });
  return {
    currency: db.settings.reportingCurrency,
    columns: [col('name', 'text'), col('model', 'text'), col('units', 'number', true), col('netSales', 'money', true), col('grossProfit', 'money', true), col('commission', 'money'), col('margin', 'percent'), col('sellThrough', 'percent'), col('returnRate', 'percent'), col('defectRate', 'percent')],
    rows: totalsBy(facts, (fact) => fact.brandId)
      .sort((a, b) => b.totals.net - a.totals.net)
      .map(({ key, totals }) => {
        const brand = db.brands.find((current) => current.id === key);
        const sold = totals.soldUnits;
        return {
          key,
          cells: {
            name: n.brand.get(key) ?? key,
            model: brand ? currentTerms(brand).model : '',
            units: sold - totals.returnedUnits,
            netSales: totals.net,
            grossProfit: totals.profit,
            commission: totals.commission,
            margin: marginPercent(totals.profit, totals.net),
            sellThrough: sellThrough(sold - totals.returnedUnits, available.get(key) ?? 0),
            returnRate: sold ? (totals.returnedUnits / sold) * 100 : 0,
            defectRate: sold + (onHand.get(key) ?? 0) ? ((defects.get(key) ?? 0) / (sold + (onHand.get(key) ?? 0))) * 100 : 0,
          },
        };
      }),
  };
};

// Each sale (and each return or exchange) as a full record: when, the receipt, branch, staff member, customer,
// the items, how it was paid, the channel and its amounts. Newest first.
const salesRecords = (facts: Fact[], filter: ReportFilter): Omit<ReportResult, 'previous' | 'previousTotals'> => {
  const n = names();
  const groups = new Map<Id, Fact[]>();
  facts.forEach((fact) => {
    const key = fact.returnId ?? fact.saleId;
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  });
  const recordColumns = salesColumns.filter((column) => column.key !== 'orders');
  return {
    currency: reportCurrency(filter),
    columns: [col('dateTime', 'dateTime'), col('receipt', 'text'), col('branch', 'text'), col('cashier', 'text'), col('customer', 'text'), col('items', 'text'), col('payment', 'text'), col('channel', 'text'), ...recordColumns],
    rows: [...groups.entries()]
      .map(([key, group]) => {
        const first = group[0];
        const receipt = first.returnId ? (db.returns.find((saleReturn) => saleReturn.id === first.returnId)?.number ?? first.saleNumber) : first.saleNumber;
        const items = group
          .map((fact) => {
            const entry = n.index.get(fact.variantId);
            const totals = totalsOf([fact]);
            return `${entry?.product.name ?? ''} ${entry?.variant.size ?? ''} ${entry?.variant.color ?? ''} × ${Math.abs(totals.soldUnits - totals.returnedUnits)}`;
          })
          .join(', ');
        const { orders: _orders, ...amounts } = salesCells(group);
        return {
          key,
          cells: {
            dateTime: first.at,
            receipt,
            branch: n.branch.get(first.branchId) ?? '',
            cashier: n.user.get(first.cashierId) ?? '',
            customer: db.customers.find((customer) => customer.id === first.customerId)?.name ?? '',
            items,
            payment: first.paymentMethodIds.join(','),
            channel: first.channel,
            ...amounts,
          },
        };
      })
      .sort((a, b) => String(b.cells.dateTime).localeCompare(String(a.cells.dateTime))),
    totals: { dateTime: 'total', ...(({ orders: _orders, ...amounts }) => amounts)(salesCells(facts)) },
  };
};

// Sales grouped by date, branch, brand, category, product, cashier, payment method or channel (148, 161).
const sales: Builder = (filter, range) => {
  const n = names();
  const groupBy = filter.groupBy ?? 'sale';
  const facts = factsFor(filter, range, reportCurrency(filter));
  if (groupBy === 'sale') return salesRecords(facts, filter);
  const method = new Map(db.settings.paymentMethods.map((current) => [current.id, current.name.en]));
  const keyOf = (fact: Fact): string => {
    switch (groupBy) {
      case 'branch':
        return fact.branchId;
      case 'brand':
        return fact.brandId;
      case 'category':
        return fact.categoryId;
      case 'product':
        return fact.productId;
      case 'cashier':
        return fact.cashierId;
      case 'paymentMethod':
        return fact.paymentMethodIds[0] ?? '';
      case 'channel':
        return fact.channel;
      default:
        return fact.day;
    }
  };
  const label = (key: string) =>
    ({ branch: n.branch, brand: n.brand, category: n.category, product: n.product, cashier: n.user, paymentMethod: method })[groupBy as 'branch']?.get(key) ?? key;
  const groups = totalsBy(facts, keyOf);
  return {
    currency: reportCurrency(filter),
    columns: [col(groupBy === 'date' ? 'date' : 'name', groupBy === 'date' ? 'date' : 'text'), ...salesColumns],
    rows: groups
      .sort((a, b) => (groupBy === 'date' ? b.key.localeCompare(a.key) : b.totals.net - a.totals.net))
      .map(({ key }) => ({ key, cells: { [groupBy === 'date' ? 'date' : 'name']: groupBy === 'date' ? key : label(key), ...salesCells(facts.filter((fact) => keyOf(fact) === key)) } })),
    totals: { [groupBy === 'date' ? 'date' : 'name']: 'total', ...salesCells(facts) },
  };
};

// Sales by size and colour, to plan reorders; best sellers first (149, 150).
const sizes: Builder = (filter, range) => {
  const n = names();
  const groupBy = filter.groupBy ?? 'size';
  const facts = factsFor(filter, range, reportCurrency(filter));
  // Per item: the product with its size, its colour, or both (a single variant). Keyed "product|size",
  // "product|color" or "product|variant", named "Product · M".
  const keyOf = (fact: Fact) => {
    const entry = n.index.get(fact.variantId);
    const extra = groupBy === 'color' ? entry?.variant.color : groupBy === 'sizeColor' ? fact.variantId : entry?.variant.size;
    return `${fact.productId}|${extra ?? ''}`;
  };
  const nameOf = (key: string) => {
    const [productId, extra] = key.split('|');
    const product = n.product.get(productId) ?? '';
    if (groupBy === 'sizeColor') {
      const variant = n.index.get(extra)?.variant;
      return `${product} · ${variant?.size ?? ''} · ${variant?.color ?? ''}`;
    }
    return `${product} · ${extra}`;
  };
  return {
    currency: reportCurrency(filter),
    columns: [col('name', 'text'), col('units', 'number', true), col('netSales', 'money', true), col('salesShare', 'percent'), col('returnRate', 'percent')],
    rows: totalsBy(facts, keyOf)
      .sort((a, b) => b.totals.net - a.totals.net)
      .map(({ key, totals }) => ({
        key,
        cells: { name: nameOf(key), units: totals.soldUnits - totals.returnedUnits, netSales: totals.net, salesShare: totalsOf(facts).net ? (totals.net / totalsOf(facts).net) * 100 : 0, returnRate: totals.soldUnits ? (totals.returnedUnits / totals.soldUnits) * 100 : 0 },
      })),
  };
};

// Sell-through per product or brand: sold in the period / (stock at its start + received during it) (151).
const sellThroughReport: Builder = (filter, range) => {
  const n = names();
  const byBrand = filter.groupBy === 'brand';
  const facts = factsFor(filter, range);
  const available = availableInPeriod(
    db,
    range,
    (variantId) => {
      const product = n.index.get(variantId)?.product;
      if (!product || (filter.brandId && product.brandId !== filter.brandId)) return undefined;
      return byBrand ? product.brandId : product.id;
    },
    filter.branchId ? [filter.branchId] : undefined,
  );
  const sold = new Map(totalsBy(facts, (fact) => (byBrand ? fact.brandId : fact.productId)).map((row) => [row.key, row.totals.soldUnits - row.totals.returnedUnits]));
  const keys = [...new Set([...available.keys(), ...sold.keys()])];
  return {
    currency: db.settings.reportingCurrency,
    columns: [col('name', 'text'), col('sold', 'number', true), col('availableInPeriod', 'number'), col('sellThrough', 'percent', true)],
    rows: keys
      .map((key) => ({ key, cells: { name: (byBrand ? n.brand.get(key) : n.product.get(key)) ?? key, sold: sold.get(key) ?? 0, availableInPeriod: available.get(key) ?? 0, sellThrough: sellThrough(sold.get(key) ?? 0, available.get(key) ?? 0) } }))
      .sort((a, b) => Number(b.cells.sellThrough) - Number(a.cells.sellThrough)),
  };
};

// Items or brands with stock that haven't sold for a number of weeks (152).
const slowMovers: Builder = (filter) => {
  const n = names();
  const weeks = filter.weeks ?? db.settings.slowMoverWeeks;
  const since: IsoDate = addDays(today(), -weeks * 7);
  const lastSale = new Map<Id, string>();
  db.sales.forEach((sale) => {
    if (filter.branchId && sale.branchId !== filter.branchId) return;
    sale.lines.forEach((line) => {
      if ((lastSale.get(line.variantId) ?? '') < sale.at) lastSale.set(line.variantId, sale.at);
    });
  });
  const onHand = new Map<Id, number>();
  stockLevels(db.movements).forEach((level) => {
    if (level.status !== 'available' || (filter.branchId && level.branchId !== filter.branchId)) return;
    onHand.set(level.variantId, (onHand.get(level.variantId) ?? 0) + level.qty);
  });
  const rows: ReportRow[] = [];
  onHand.forEach((qty, variantId) => {
    const entry = n.index.get(variantId);
    if (!entry || qty <= 0 || (filter.brandId && entry.product.brandId !== filter.brandId)) return;
    const last = lastSale.get(variantId);
    if (last && toIsoDate(last) >= since) return;
    rows.push({ key: variantId, cells: { name: `${entry.product.name} · ${entry.variant.size} · ${entry.variant.color}`, brand: n.brand.get(entry.product.brandId) ?? '', onHand: qty, lastSale: last ?? null } });
  });
  return { currency: db.settings.reportingCurrency, columns: [col('name', 'text'), col('brand', 'text'), col('onHand', 'number'), col('lastSale', 'date')], rows: rows.sort((a, b) => String(a.cells.lastSale ?? '').localeCompare(String(b.cells.lastSale ?? ''))) };
};

// Items at or under their minimum (153).
const lowStock: Builder = (filter) => {
  const n = names();
  return {
    currency: db.settings.reportingCurrency,
    columns: [col('name', 'text'), col('brand', 'text'), col('branch', 'text'), col('available', 'number'), col('minimum', 'number')],
    rows: lowStockRows()
      .filter((row) => (!filter.branchId || row.branchId === filter.branchId) && (!filter.brandId || n.index.get(row.variantId)?.product.brandId === filter.brandId))
      .map((row) => {
        const entry = n.index.get(row.variantId);
        return { key: `${row.variantId}|${row.branchId}`, cells: { name: entry ? `${entry.product.name} · ${entry.variant.size} · ${entry.variant.color}` : '', brand: n.brand.get(entry?.product.brandId ?? '') ?? '', branch: n.branch.get(row.branchId) ?? '', available: row.qty, minimum: row.min } };
      }),
  };
};

// Every discount given: by whom, why, on what, and who pays for it (154).
const discounts: Builder = (filter, range) => {
  const n = names();
  const reason = new Map(Object.values(db.settings.lists).flat().map((option) => [option.id, option.label.en]));
  const promotion = new Map(db.promotions.map((current) => [current.id, current.name]));
  const code = new Map(db.promoCodes.map((current) => [current.id, current.code]));
  const facts = factsFor(filter, range, reportCurrency(filter)).filter((fact) => !fact.isReturn && fact.figures.discount > 0);
  return {
    currency: reportCurrency(filter),
    columns: [col('dateTime', 'dateTime'), col('sale', 'text'), col('branch', 'text'), col('givenBy', 'text'), col('reason', 'text'), col('name', 'text'), col('discounts', 'money', true), col('brandShare', 'money'), col('storeShare', 'money')],
    rows: facts
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((fact) => ({
        key: fact.lineId,
        cells: {
          dateTime: fact.at,
          sale: fact.saleNumber,
          branch: n.branch.get(fact.branchId) ?? '',
          givenBy: n.user.get(fact.discountById ?? fact.cashierId) ?? '',
          reason: fact.promotionId ? (promotion.get(fact.promotionId) ?? '') : fact.promoCodeId ? (code.get(fact.promoCodeId) ?? '') : (reason.get(fact.discountReasonId ?? '') ?? ''),
          name: n.product.get(fact.productId) ?? '',
          discounts: fact.figures.discount,
          brandShare: fact.figures.brandDiscount,
          storeShare: fact.figures.storeDiscount,
        },
      })),
    totals: { dateTime: 'total', discounts: facts.reduce((sum, fact) => sum + fact.figures.discount, 0), brandShare: facts.reduce((sum, fact) => sum + fact.figures.brandDiscount, 0), storeShare: facts.reduce((sum, fact) => sum + fact.figures.storeDiscount, 0) },
  };
};

// Returns and exchanges by reason, product, brand, branch or cashier, with the return and exchange rates (155).
const returns: Builder = (filter, range) => {
  const n = names();
  const groupBy = filter.groupBy ?? 'reason';
  const reason = new Map(db.settings.lists.returnReasons.map((option) => [option.id, option.label.en]));
  const facts = factsFor(filter, range, reportCurrency(filter));
  const sold = facts.filter((fact) => !fact.isReturn);
  const returned = facts.filter((fact) => fact.isReturn);
  const keyOf = (fact: Fact) => ({ reason: fact.returnReasonId ?? '', product: fact.productId, brand: fact.brandId, branch: fact.branchId, cashier: fact.cashierId })[groupBy as 'reason'];
  const label = (key: string) => ({ reason, product: n.product, brand: n.brand, branch: n.branch, cashier: n.user })[groupBy as 'reason'].get(key) ?? key;
  const soldUnits = (key: string) => (groupBy === 'reason' ? sold : sold.filter((fact) => keyOf(fact) === key)).reduce((sum, fact) => sum + fact.figures.units, 0);
  return {
    currency: reportCurrency(filter),
    columns: [col('name', 'text'), col('returnsCount', 'number', true), col('exchanges', 'number'), col('returnedUnits', 'number'), col('returns', 'money', true), col('returnRate', 'percent'), col('exchangeRate', 'percent')],
    rows: totalsBy(returned, keyOf)
      .sort((a, b) => b.totals.returnsAmount - a.totals.returnsAmount)
      .map(({ key, totals }) => {
        const group = returned.filter((fact) => keyOf(fact) === key);
        const exchanges = group.filter((fact) => fact.isExchange).length;
        return {
          key,
          cells: {
            name: label(key),
            returnsCount: group.length,
            exchanges,
            returnedUnits: totals.returnedUnits,
            returns: totals.returnsAmount,
            returnRate: soldUnits(key) ? (totals.returnedUnits / soldUnits(key)) * 100 : 0,
            exchangeRate: group.length ? (exchanges / group.length) * 100 : 0,
          },
        };
      }),
    totals: {
      name: 'total',
      returnsCount: returned.length,
      exchanges: returned.filter((fact) => fact.isExchange).length,
      returnedUnits: totalsOf(returned).returnedUnits,
      returns: totalsOf(returned).returnsAmount,
      returnRate: totalsOf(sold).soldUnits ? (totalsOf(returned).returnedUnits / totalsOf(sold).soldUnits) * 100 : 0,
      exchangeRate: returned.length ? (returned.filter((fact) => fact.isExchange).length / returned.length) * 100 : 0,
    },
  };
};

// Differences found in stock counts (156).
const counts: Builder = (filter, range) => {
  const n = names();
  const rows: ReportRow[] = db.counts
    .filter((count) => count.status !== 'open' && inRange(count.at, range) && (!filter.branchId || count.branchId === filter.branchId))
    .flatMap((count) =>
      count.lines
        .filter((line) => line.counted !== line.expected && (!filter.brandId || n.index.get(line.variantId)?.product.brandId === filter.brandId))
        .map((line) => {
          const entry = n.index.get(line.variantId);
          return { key: `${count.id}|${line.variantId}`, cells: { dateTime: count.at, document: count.number, branch: n.branch.get(count.branchId) ?? '', name: entry ? `${entry.product.name} · ${entry.variant.size} · ${entry.variant.color}` : '', expected: line.expected, counted: line.counted, difference: line.counted - line.expected, status: count.status } };
        }),
    );
  return { currency: db.settings.reportingCurrency, columns: [col('dateTime', 'dateTime'), col('document', 'text'), col('branch', 'text'), col('name', 'text'), col('expected', 'number'), col('counted', 'number'), col('difference', 'number'), col('status', 'text')], rows };
};

// Every shift closing and its cash difference, per register and branch (157).
const shifts: Builder = (filter, range) => {
  const n = names();
  const rows: ReportRow[] = db.shifts
    .filter((shift) => shift.closedAt && inRange(shift.closedAt, range) && (!filter.branchId || shift.branchId === filter.branchId))
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))
    .map((shift) => ({
      key: shift.id,
      currency: shift.currency,
      cells: { dateTime: shift.closedAt ?? '', branch: n.branch.get(shift.branchId) ?? '', register: shift.register, cashier: n.user.get(shift.cashierId) ?? '', expectedCash: shift.expectedCash ?? 0, countedCash: shift.countedCash ?? 0, cashDifference: (shift.countedCash ?? 0) - (shift.expectedCash ?? 0), note: shift.note ?? '' },
    }));
  return { currency: db.settings.reportingCurrency, columns: [col('dateTime', 'dateTime'), col('branch', 'text'), col('register', 'text'), col('cashier', 'text'), col('expectedCash', 'money'), col('countedCash', 'money'), col('cashDifference', 'money'), col('note', 'text')], rows };
};

// Transfers and any pieces missing on arrival (158).
const transfers: Builder = (filter, range) => {
  const n = names();
  const rows: ReportRow[] = db.transfers
    .filter((transfer) => inRange(transfer.createdAt, range) && (!filter.branchId || transfer.fromBranchId === filter.branchId || transfer.toBranchId === filter.branchId))
    .map(toTransferView)
    .map((view) => ({
      key: view.transfer.id,
      cells: {
        dateTime: view.transfer.createdAt,
        document: view.transfer.number,
        branch: `${n.branch.get(view.transfer.fromBranchId) ?? ''} → ${n.branch.get(view.transfer.toBranchId) ?? ''}`,
        sent: view.lines.reduce((sum, line) => sum + line.qty, 0),
        received: view.lines.reduce((sum, line) => sum + (line.received ?? 0), 0),
        missing: view.missing,
        status: view.transfer.status,
      },
    }));
  return { currency: db.settings.reportingCurrency, columns: [col('dateTime', 'dateTime'), col('document', 'text'), col('branch', 'text'), col('sent', 'number'), col('received', 'number'), col('missing', 'number'), col('status', 'text')], rows };
};

// Sales and VAT per country, each in its own currency, for the accountant's software (163).
const vat: Builder = (filter, range) => {
  const rows: ReportRow[] = db.settings.countries
    .map((country) => {
      const branches = db.branches.filter((branch) => branch.countryCode === country.countryCode && (!filter.branchId || branch.id === filter.branchId));
      const currency = branches[0]?.currency ?? db.settings.baseCurrency;
      const facts = branches.length ? salesFacts(db, { range, branchIds: branches.map((branch) => branch.id), currency }) : [];
      const totals = totalsOf(facts);
      return { key: country.countryCode, currency, cells: { name: country.countryCode, vatNumber: country.registration.vatNumber, salesInclVat: totals.netInclVat, netSales: totals.net, vat: totals.vat, orders: totals.orders } };
    })
    .filter((row) => row.cells.orders);
  return { currency: db.settings.reportingCurrency, columns: [col('name', 'text'), col('vatNumber', 'text'), col('orders', 'number'), col('salesInclVat', 'money'), col('netSales', 'money'), col('vat', 'money')], rows };
};

const builders: Record<ReportId, Builder> = {
  pnl,
  products,
  contribution,
  brands,
  sales,
  sizes,
  sellThrough: sellThroughReport,
  slowMovers,
  lowStock,
  discounts,
  returns,
  counts,
  shifts,
  transfers,
  vat,
};

// Reports where comparing with the previous period makes sense (159).
export const comparableReports: readonly ReportId[] = ['pnl', 'products', 'contribution', 'brands', 'sales', 'sizes', 'sellThrough', 'discounts', 'returns'];

export const runReport = (id: ReportId, filter: ReportFilter) =>
  respond((): ReportResult => {
    const result = builders[id](filter, filter.range);
    if (!filter.compare || !comparableReports.includes(id)) return result;
    const before = builders[id](filter, previousRange(filter.range));
    return { ...result, previous: Object.fromEntries(before.rows.map((row) => [row.key, row.cells])), previousTotals: before.totals };
  });

// Per-country sales and VAT as separate tables, for export (one sheet or page per country).
export const vatExport = (range: DateRange) =>
  respond(() =>
    db.settings.countries.map((country) => {
      const branches = db.branches.filter((branch) => branch.countryCode === country.countryCode);
      const currency = branches[0]?.currency ?? db.settings.baseCurrency;
      const facts = branches.length ? salesFacts(db, { range, branchIds: branches.map((branch) => branch.id), currency }) : [];
      const bySale = new Map<string, { number: string; at: string; branchId: Id; incl: number; net: number; vat: number; isReturn: boolean }>();
      facts.forEach((fact) => {
        const key = `${fact.saleId}|${fact.returnId ?? ''}`;
        const row = bySale.get(key) ?? { number: fact.saleNumber, at: fact.at, branchId: fact.branchId, incl: 0, net: 0, vat: 0, isReturn: fact.isReturn };
        row.incl += fact.figures.netInclVat;
        row.net += fact.figures.net;
        row.vat += fact.figures.vat;
        bySale.set(key, row);
      });
      return { countryCode: country.countryCode, currency, registration: country.registration, rows: [...bySale.values()].sort((a, b) => a.at.localeCompare(b.at)) };
    }),
  );
