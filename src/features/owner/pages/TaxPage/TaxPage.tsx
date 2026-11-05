import { useLocale, useQueryState } from '@/shared/hooks';
import { PageHeader, Stack, Tabs } from '@/shared/components';
import { vars } from '@/shared/theme';
import { RegistrationsTab } from './RegistrationsTab';
import { DevicesTab } from './DevicesTab';
import { ReceiptsTab } from './ReceiptsTab';

type TaxTab = 'countries' | 'devices' | 'receipts';

// Tax registration and VAT per country, tills registered with the tax authority, and the e-receipt log.
export const TaxPage = () => {
  const { text } = useLocale();
  const [tab, setTab] = useQueryState<TaxTab>('tab', 'countries');
  const t = text.owner.tax;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<TaxTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'countries', label: t.tabs.countries },
          { value: 'devices', label: t.tabs.devices },
          { value: 'receipts', label: t.tabs.receipts },
        ]}
      >
        {tab === 'countries' && <RegistrationsTab />}
        {tab === 'devices' && <DevicesTab />}
        {tab === 'receipts' && <ReceiptsTab />}
      </Tabs>
    </Stack>
  );
};
