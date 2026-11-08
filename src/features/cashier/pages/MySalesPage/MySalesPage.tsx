import { useNavigate } from 'react-router';
import { getMySales } from '@/shared/api';
import { AsyncContent, Card, Grid, Notice, PageHeader, Stack, StatCard, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// The cashier's own sales: the open shift and today.
export const MySalesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const version = useLiveVersion();
  const { branch } = useBranchScope();
  const t = text.cashier.mySales;
  const state = useAsync(() => getMySales(branch?.id ?? ''), [branch?.id, version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <AsyncContent state={state}>
        {({ currency, shift, today, list }) => (
          <Stack gap={vars.spacing[5]}>
            <Grid minColumnWidth={vars.sizes.statCard.minWidth}>
              <StatCard label={t.shift} value={shift ? format.money(shift.total, currency) : t.noShift} detail={shift ? fillText(t.sales, { count: format.number(shift.sales), pieces: format.number(shift.pieces) }) : undefined} highlight />
              <StatCard label={t.today} value={format.money(today.total, currency)} detail={fillText(t.sales, { count: format.number(today.sales), pieces: format.number(today.pieces) })} />
            </Grid>
            <Card title={t.today}>
              {list.length ? (
                <Table
                  label={t.today}
                  stackOnMobile
                  columns={[
                    { key: 'number', label: t.receipt },
                    { key: 'time', label: t.time },
                    { key: 'customer', label: t.customer },
                    { key: 'pieces', label: t.pieces, align: 'end' },
                    { key: 'paid', label: t.paidBy },
                    { key: 'total', label: text.common.total, align: 'end' },
                  ]}
                  rows={list.map((sale) => ({
                    key: sale.saleId,
                    onClick: () => navigate(toPath(routes.cashier.receipt, { saleId: sale.saleId })),
                    cells: {
                      number: sale.number,
                      time: format.time(sale.at),
                      customer: sale.customerName,
                      pieces: format.number(sale.pieces),
                      paid: sale.methodIds.map(format.payment).join(text.common.listSeparator),
                      total: format.money(sale.total, currency),
                    },
                  }))}
                />
              ) : (
                <Notice>{t.empty}</Notice>
              )}
            </Card>
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
