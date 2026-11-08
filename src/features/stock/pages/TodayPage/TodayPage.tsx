import { useNavigate } from 'react-router';
import { getNotifications, getStorekeeperToday } from '@/shared/api';
import { AsyncContent, Button, Card, ErrorBoundary, Grid, Icon, Notice, NotificationList, PageHeader, Stack, StatCard, Text } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

const latestCount = 5;

// The storekeeper's start page: the main actions, today's open work in the branch and the latest alerts.
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
      {/* The page's actions sit in its header, as in most admin apps: the main one (new receiving) last and highlighted. */}
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(withQuery(routes.storekeeper.newTransfer, { mode: 'send' }))}>
              {text.storekeeper.transfers.newTransfer}
            </Button>
            <Button variant="secondary" onClick={() => navigate(routes.storekeeper.counts)}>
              {text.staff.counts.start}
            </Button>
            <Button variant="secondary" onClick={() => navigate(routes.storekeeper.newBrandReturn)}>
              {text.storekeeper.brandReturns.new}
            </Button>
            <Button onClick={() => navigate(routes.storekeeper.newReceiving)}>
              <Icon name="plus" />
              {text.storekeeper.receiving.new}
            </Button>
          </>
        }
      />
      <ErrorBoundary>
        <AsyncContent state={today}>
          {(data) => {
            // Each piece of open work as a number with its name, like the other dashboards; a card opens the list behind it.
            const items = [
              { key: 'toPrepare', count: data.toPrepare, label: t.toPrepare, to: withQuery(routes.storekeeper.transfers, { tab: 'prepare' }) },
              { key: 'toReceive', count: data.toReceive, label: t.toReceive, to: withQuery(routes.storekeeper.transfers, { tab: 'incoming' }) },
              { key: 'inspection', count: data.inspection, label: t.inspection, to: routes.storekeeper.defects },
              { key: 'drafts', count: data.drafts, label: t.drafts, to: routes.storekeeper.receiving },
              { key: 'openCounts', count: data.openCounts, label: t.openCounts, to: routes.storekeeper.counts },
              { key: 'lowOnFloor', count: data.lowOnFloor, label: t.lowOnFloor, detail: t.lowOnFloorDetail, to: routes.storekeeper.stock },
              { key: 'lowStock', count: data.lowStock, label: t.lowStock, to: withQuery(routes.storekeeper.stock, { tab: 'low' }) },
            ].filter((item) => item.count > 0);
            return items.length ? (
              <Grid>
                {items.map((item) => (
                  <StatCard key={item.key} label={item.label} value={format.number(item.count)} detail={item.detail} to={item.to} />
                ))}
              </Grid>
            ) : (
              <Notice tone="success">{t.allClear}</Notice>
            );
          }}
        </AsyncContent>
      </ErrorBoundary>
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
