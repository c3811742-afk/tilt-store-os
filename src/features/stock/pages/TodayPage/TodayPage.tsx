import { useNavigate } from 'react-router';
import { getNotifications, getStorekeeperToday } from '@/shared/api';
import { AsyncContent, Button, Card, ErrorBoundary, Grid, Notice, NotificationList, PageHeader, Stack, Text } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

const latestCount = 5;

// The storekeeper's start page: today's open work in the branch, quick actions and the latest alerts.
export const TodayPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const today = useAsync(() => getStorekeeperToday(branchId), [branchId, version], () => false);
  const alerts = useAsync(getNotifications, [version]);
  const t = text.storekeeper.today;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <ErrorBoundary>
        <AsyncContent state={today}>
          {(data) => {
            const items = [
              { key: 'toPrepare', count: data.toPrepare, label: t.toPrepare, to: withQuery(routes.storekeeper.transfers, { tab: 'prepare' }) },
              { key: 'toReceive', count: data.toReceive, label: t.toReceive, to: withQuery(routes.storekeeper.transfers, { tab: 'incoming' }) },
              { key: 'inspection', count: data.inspection, label: t.inspection, to: routes.storekeeper.defects },
              { key: 'drafts', count: data.drafts, label: t.drafts, to: routes.storekeeper.receiving },
              { key: 'openCounts', count: data.openCounts, label: t.openCounts, to: routes.storekeeper.counts },
              { key: 'lowOnFloor', count: data.lowOnFloor, label: t.lowOnFloor, to: routes.storekeeper.stock },
              { key: 'lowStock', count: data.lowStock, label: t.lowStock, to: withQuery(routes.storekeeper.stock, { tab: 'low' }) },
            ].filter((item) => item.count > 0);
            return items.length ? (
              <Grid>
                {items.map((item) => (
                  <Card key={item.key} to={item.to}>
                    <Text variant="bodySm">{fillText(item.label, { count: format.number(item.count) })}</Text>
                  </Card>
                ))}
              </Grid>
            ) : (
              <Notice tone="success">{t.allClear}</Notice>
            );
          }}
        </AsyncContent>
      </ErrorBoundary>
      <Card title={t.quick}>
        <Stack direction="row" wrap gap={vars.spacing[2]}>
          <Button onClick={() => navigate(routes.storekeeper.newReceiving)}>{text.storekeeper.receiving.new}</Button>
          <Button variant="secondary" onClick={() => navigate(withQuery(routes.storekeeper.newTransfer, { mode: 'send' }))}>
            {text.storekeeper.transfers.newTransfer}
          </Button>
          <Button variant="secondary" onClick={() => navigate(routes.storekeeper.counts)}>
            {text.staff.counts.start}
          </Button>
          <Button variant="secondary" onClick={() => navigate(routes.storekeeper.newBrandReturn)}>
            {text.storekeeper.brandReturns.new}
          </Button>
        </Stack>
      </Card>
      <ErrorBoundary>
        <Card title={t.latest}>
          <AsyncContent state={alerts} empty={<Text variant="bodySm">{t.noAlerts}</Text>}>
            {(items) => <NotificationList items={items.slice(0, latestCount)} />}
          </AsyncContent>
        </Card>
      </ErrorBoundary>
    </Stack>
  );
};
