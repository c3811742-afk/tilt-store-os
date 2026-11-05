import { PageHeader, Stack, Tabs } from '@/shared/components';
import { useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { LevelsTab } from './LevelsTab';
import { ValueTab } from './ValueTab';
import { StatusTab } from './StatusTab';
import { AgingTab } from './AgingTab';
import { LowStockTab } from './LowStockTab';
import { CountsTab } from './CountsTab';
import { RequestsTab } from './RequestsTab';

type StockTab = 'levels' | 'value' | 'status' | 'aging' | 'low' | 'counts' | 'requests';

// Stock in every branch: pieces, value, status, aging, low items, count adjustments and stock requests.
export const StockPage = () => {
  const { text } = useLocale();
  const [tab, setTab] = useQueryState<StockTab>('tab', 'levels');
  const t = text.owner.stock;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<StockTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={(['levels', 'value', 'status', 'aging', 'low', 'counts', 'requests'] as const).map((value) => ({ value, label: t.tabs[value] }))}
      >
        {tab === 'levels' && <LevelsTab />}
        {tab === 'value' && <ValueTab />}
        {tab === 'status' && <StatusTab />}
        {tab === 'aging' && <AgingTab />}
        {tab === 'low' && <LowStockTab />}
        {tab === 'counts' && <CountsTab />}
        {tab === 'requests' && <RequestsTab />}
      </Tabs>
    </Stack>
  );
};
