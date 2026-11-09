import type { StockFilter } from '@/shared/api';
import { PageHeader, Stack, Tabs, TextField, OfflineStockNotice } from '@/shared/components';
import { useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { useAnalysisFilters } from '../../components';
import type { AnalysisFilterKey } from '../../constants/analysis';
import { LevelsTab } from './LevelsTab';
import { ValueTab } from './ValueTab';
import { StatusTab } from './StatusTab';
import { AgingTab } from './AgingTab';
import { LowStockTab } from './LowStockTab';
import { CountsTab } from './CountsTab';
import { RequestsTab } from './RequestsTab';

type StockTab = 'levels' | 'value' | 'status' | 'aging' | 'low' | 'counts' | 'requests';

// The same filters on every tab, as on Reports; they combine and stay when switching tabs.
const stockFilterKeys: readonly AnalysisFilterKey[] = ['branch', 'brand', 'category', 'product', 'size', 'color'];

// Stock in every branch: pieces, value, status, aging, low items, count adjustments and stock requests.
export const StockPage = () => {
  const { text } = useLocale();
  const [tab, setTab] = useQueryState<StockTab>('tab', 'levels');
  const filters = useAnalysisFilters(stockFilterKeys);
  const { branchId, brandId, categoryId, productId, size, color } = filters.values;
  const [query, setQuery] = useQueryState('q', '');
  const filter: StockFilter = { branchId, brandId, categoryId, productId, size, color, query: tab === 'levels' ? query : undefined };
  const t = text.owner.stock;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <OfflineStockNotice />
      <Tabs<StockTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={(['levels', 'value', 'status', 'aging', 'low', 'counts', 'requests'] as const).map((value) => ({ value, label: t.tabs[value] }))}
      >
        <Stack gap={vars.spacing[4]}>
          <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-end">
            {tab === 'levels' && <TextField type="search" label={text.common.search} placeholder={text.owner.products.searchPlaceholder} value={query} onChange={setQuery} />}
            {filters.button}
          </Stack>
          {filters.panel}
          {filters.chips}
          {tab === 'levels' && <LevelsTab filter={filter} />}
          {tab === 'value' && <ValueTab filter={filter} />}
          {tab === 'status' && <StatusTab filter={filter} />}
          {tab === 'aging' && <AgingTab filter={filter} />}
          {tab === 'low' && <LowStockTab filter={filter} />}
          {tab === 'counts' && <CountsTab filter={filter} />}
          {tab === 'requests' && <RequestsTab filter={filter} />}
        </Stack>
      </Tabs>
    </Stack>
  );
};
