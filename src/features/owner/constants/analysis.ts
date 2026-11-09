import type { ReportFilter, ReportGrouping, ReportId } from '@/shared/api';
import type { SalesChannel } from '@/shared/types';

// The perspectives of the owner's analysis. Each one is a view of the same data with the same filters: which
// report builds it, the section it is listed under, which filters apply, and where clicking a row leads.

export type AnalysisSection = 'sales' | 'profit' | 'stock' | 'checks';
export type AnalysisFilterKey = 'period' | 'branch' | 'brand' | 'category' | 'staff' | 'payment' | 'channel' | 'size' | 'color' | 'weeks';

export interface AnalysisView {
  id: string;
  report: ReportId;
  groupBy?: ReportGrouping;
  section: AnalysisSection;
  filters: readonly AnalysisFilterKey[];
  // Clicking a row narrows the analysis to it and shows the next view (e.g. a brand → its products).
  drill?: { view: string; filter: (rowKey: string) => Partial<ReportFilter> | undefined };
  // The column the rows open sorted by, highest first (shown with the arrow on its heading).
  sortBy?: string;
}

const bySales = 'netSales';

const salesFilters: readonly AnalysisFilterKey[] = ['period', 'branch', 'brand', 'category', 'staff', 'payment', 'channel', 'size', 'color'];
const toSales = (filter: (rowKey: string) => Partial<ReportFilter> | undefined) => ({ view: 'sale', filter });
const productAnd = (key: 'size' | 'color') => (rowKey: string) => {
  const [productId, value] = rowKey.split('|');
  return { productId, [key]: value };
};

export const analysisViews: readonly AnalysisView[] = [
  // Sales
  { id: 'sale', report: 'sales', groupBy: 'sale', section: 'sales', filters: salesFilters },
  { id: 'date', report: 'sales', groupBy: 'date', section: 'sales', filters: salesFilters, drill: toSales((day) => ({ range: { from: day, to: day } })) },
  { id: 'branch', report: 'sales', groupBy: 'branch', section: 'sales', filters: salesFilters, sortBy: bySales, drill: { view: 'brand', filter: (branchId) => ({ branchId }) } },
  { id: 'brand', report: 'brands', section: 'sales', filters: salesFilters, sortBy: bySales, drill: { view: 'product', filter: (brandId) => ({ brandId }) } },
  { id: 'category', report: 'sales', groupBy: 'category', section: 'sales', filters: salesFilters, sortBy: bySales, drill: { view: 'product', filter: (categoryId) => ({ categoryId }) } },
  { id: 'product', report: 'products', groupBy: 'product', section: 'sales', filters: salesFilters, sortBy: bySales, drill: { view: 'item', filter: (productId) => ({ productId }) } },
  { id: 'item', report: 'products', groupBy: 'variant', section: 'sales', filters: salesFilters, sortBy: bySales, drill: toSales((variantId) => ({ variantId })) },
  { id: 'size', report: 'sizes', groupBy: 'size', section: 'sales', filters: salesFilters, sortBy: bySales, drill: toSales(productAnd('size')) },
  { id: 'color', report: 'sizes', groupBy: 'color', section: 'sales', filters: salesFilters, sortBy: bySales, drill: toSales(productAnd('color')) },
  { id: 'staff', report: 'sales', groupBy: 'cashier', section: 'sales', filters: salesFilters, sortBy: bySales, drill: toSales((cashierId) => ({ cashierId })) },
  { id: 'payment', report: 'sales', groupBy: 'paymentMethod', section: 'sales', filters: salesFilters, sortBy: bySales, drill: toSales((paymentMethodId) => ({ paymentMethodId })) },
  { id: 'channel', report: 'sales', groupBy: 'channel', section: 'sales', filters: salesFilters, sortBy: bySales, drill: toSales((channel) => ({ channel: channel as SalesChannel })) },
  // Profit
  { id: 'pnl', report: 'pnl', section: 'profit', filters: ['period', 'branch', 'brand'], drill: { view: 'brand', filter: (branchId) => (branchId === 'company' ? undefined : { branchId }) } },
  { id: 'contribution', report: 'contribution', groupBy: 'brand', section: 'profit', filters: salesFilters, sortBy: bySales, drill: { view: 'product', filter: (brandId) => ({ brandId }) } },
  { id: 'contributionCategory', report: 'contribution', groupBy: 'category', section: 'profit', filters: salesFilters, sortBy: bySales, drill: { view: 'product', filter: (categoryId) => ({ categoryId }) } },
  { id: 'contributionProduct', report: 'contribution', groupBy: 'product', section: 'profit', filters: salesFilters, sortBy: bySales, drill: { view: 'item', filter: (productId) => ({ productId }) } },
  { id: 'discounts', report: 'discounts', section: 'profit', filters: salesFilters },
  { id: 'returns', report: 'returns', groupBy: 'reason', section: 'profit', filters: salesFilters },
  { id: 'returnsProduct', report: 'returns', groupBy: 'product', section: 'profit', filters: salesFilters },
  { id: 'returnsBrand', report: 'returns', groupBy: 'brand', section: 'profit', filters: salesFilters },
  { id: 'returnsBranch', report: 'returns', groupBy: 'branch', section: 'profit', filters: salesFilters },
  { id: 'returnsStaff', report: 'returns', groupBy: 'cashier', section: 'profit', filters: salesFilters },
  // Stock
  { id: 'sellThrough', report: 'sellThrough', groupBy: 'product', section: 'stock', filters: ['period', 'branch', 'brand'], sortBy: 'sellThrough' },
  { id: 'slowMovers', report: 'slowMovers', section: 'stock', filters: ['branch', 'brand', 'weeks'] },
  { id: 'lowStock', report: 'lowStock', section: 'stock', filters: ['branch', 'brand'] },
  // Checks
  { id: 'counts', report: 'counts', section: 'checks', filters: ['period', 'branch'] },
  { id: 'shifts', report: 'shifts', section: 'checks', filters: ['period', 'branch'] },
  { id: 'transfers', report: 'transfers', section: 'checks', filters: ['period', 'branch'] },
  { id: 'vat', report: 'vat', section: 'checks', filters: ['period', 'branch'] },
];

export const defaultAnalysisView = 'brand';

// The perspective an older report address opened (/owner/reports/brands), for links kept in alerts and bookmarks.
export const viewForReport: Partial<Record<ReportId, string>> = { pnl: 'pnl', products: 'product', contribution: 'contribution', brands: 'brand', sales: 'sale', sizes: 'size' };
