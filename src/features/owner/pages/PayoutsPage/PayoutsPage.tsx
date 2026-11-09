import { useNavigate } from 'react-router';
import { getBrandBalances } from '@/shared/api';
import { AsyncContent, Badge, Notice, PageHeader, Stack, Table, Text, recordRows } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, signAt } from '@/shared/utils';

// Every brand's balance on one screen: what the store owes it, or what it owes the store.
export const PayoutsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const version = useLiveVersion();
  const state = useAsync(getBrandBalances, [version]);
  const t = text.owner.payouts;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <AsyncContent state={state} empty={<Notice>{t.noBrands}</Notice>}>
        {(rows) => (
          <Table
            label={t.title}
            columns={[
              { key: 'brand', label: text.owner.fields.brand },
              { key: 'balance', label: t.weOwe, align: 'end' },
              { key: 'unsettled', label: t.notOnStatement, align: 'end' },
              { key: 'approved', label: t.approvedUnpaid, align: 'end' },
              { key: 'last', label: t.lastPayment },
            ]}
            rows={recordRows(
              rows,
              (row) => row.brandId,
              [
                {
                  key: 'brand',
                  label: '',
                  render: (row) => (
                    <Stack direction="row" gap={vars.spacing[2]} align="center" wrap>
                      {format.brand(row.brandId)}
                      {row.feesOverdue > 0 && <Badge variant="danger">{fillText(t.overdueFees, { count: format.number(row.feesOverdue) })}</Badge>}
                    </Stack>
                  ),
                },
                {
                  key: 'balance',
                  label: '',
                  render: (row) => (
                    <Stack gap={vars.spacing[0]} align="flex-end">
                      <Text as="span" variant="h4" color={signAt(row.balance) < 0 ? vars.colors.danger : vars.colors.text}>
                        {format.money(Math.abs(row.balance), row.currency)}
                      </Text>
                      {signAt(row.balance) < 0 && (
                        <Text as="span" variant="caption" color={vars.colors.danger}>
                          {t.brandOwesUs}
                        </Text>
                      )}
                    </Stack>
                  ),
                },
                { key: 'unsettled', label: '', render: (row) => format.money(row.unsettled, row.currency) },
                { key: 'approved', label: '', render: (row) => format.money(row.approvedUnpaid, row.currency) },
                { key: 'last', label: '', render: (row) => (row.lastPaymentAt ? format.date(row.lastPaymentAt) : text.common.none) },
              ],
              (row) => navigate(toPath(routes.owner.brandPayouts, { brandId: row.brandId })),
            )}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
