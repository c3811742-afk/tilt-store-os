import { useNavigate } from 'react-router';
import { listPromotions, type PromotionRow } from '@/shared/api';
import { AsyncContent, Badge, Button, Icon, PageHeader, Stack, Table, Tabs, recordRows } from '@/shared/components';
import { promotionStateTone, routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { PromoCodesTab } from './PromoCodesTab';
import { usePromotionText } from './usePromotionText';

type PromotionsTab = 'promotions' | 'requests' | 'codes';

// Promotions the owner runs, the ones brands asked for, and promo and influencer codes.
export const PromotionsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { settings } = useReference();
  const version = useLiveVersion();
  const state = useAsync(listPromotions, [version]);
  const [tab, setTab] = useQueryState<PromotionsTab>('tab', 'promotions');
  const describe = usePromotionText();
  const t = text.owner.promotions;
  const money = (amount: number) => format.money(amount, settings.reportingCurrency);

  const table = (rows: PromotionRow[]) => (
    <Table
      label={t.title}
      emptyText={tab === 'requests' ? t.noRequests : t.empty}
      columns={[
        { key: 'name', label: text.common.name },
        { key: 'discount', label: t.discount },
        { key: 'dates', label: text.common.date },
        { key: 'units', label: t.results.units, align: 'end' },
        { key: 'sales', label: t.results.sales, align: 'end' },
        { key: 'status', label: text.common.status },
      ]}
      rows={recordRows(
        rows,
        (row) => row.promotion.id,
        [
          { key: 'name', label: '', render: (row) => `${row.promotion.name}${row.promotion.requestedByBrandId ? ` · ${format.brand(row.promotion.requestedByBrandId)}` : ''}` },
          { key: 'discount', label: '', render: (row) => describe(row.promotion) },
          { key: 'dates', label: '', render: (row) => `${format.date(row.promotion.startDate)} – ${format.date(row.promotion.endDate)}` },
          { key: 'units', label: '', render: (row) => format.number(row.results.units) },
          { key: 'sales', label: '', render: (row) => money(row.results.sales) },
          { key: 'status', label: '', render: (row) => <Badge variant={promotionStateTone[row.state]}>{t.states[row.state]}</Badge> },
        ],
        (row) => navigate(toPath(routes.owner.promotion, { promotionId: row.promotion.id })),
      )}
    />
  );

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button onClick={() => navigate(routes.owner.newPromotion)}>
            <Icon name="plus" />
            {t.add}
          </Button>
        }
      />
      <AsyncContent state={state} empty={null}>
        {(rows) => {
          const requests = rows.filter((row) => row.state === 'requested');
          return (
            <Tabs<PromotionsTab>
              label={t.title}
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'promotions', label: t.tabs.promotions },
                { value: 'requests', label: t.tabs.requests, count: requests.length },
                { value: 'codes', label: t.tabs.codes },
              ]}
            >
              {tab === 'promotions' && table(rows.filter((row) => row.state !== 'requested'))}
              {tab === 'requests' && table(requests)}
              {tab === 'codes' && <PromoCodesTab />}
            </Tabs>
          );
        }}
      </AsyncContent>
    </Stack>
  );
};
