import { useState } from 'react';
import { listOnlineOrders, simulateOnlineOrder, type OnlineOrderView } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, PageHeader, Stack, Tabs, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import type { OnlineOrderStatus } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { PaymentChip } from '../../components/PaymentChip';
import { orderStatusTone } from '../../constants/statuses';

const statuses: readonly OnlineOrderStatus[] = ['new', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

// Online orders by step, newest first. New orders arrive from the website on their own (and with "Simulate order").
export const OrdersPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const [tab, setTab] = useQueryState<OnlineOrderStatus>('tab', 'new');
  const state = useAsync(listOnlineOrders, [version], () => false);
  const action = useAction();
  const [done, setDone] = useState('');
  const t = text.online.orders;
  const views = state.status === 'success' ? state.data : [];

  const card = ({ order, total }: OnlineOrderView) => (
    <Card
      key={order.id}
      to={toPath(routes.online.order, { orderId: order.id })}
      title={`${order.number} · ${order.customer.name}`}
      actions={
        <>
          {order.status !== 'cancelled' && <PaymentChip paid={order.paid} />}
          <Badge variant={orderStatusTone[order.status]}>{text.online.order.states[order.status]}</Badge>
        </>
      }
    >
      <Text variant="caption" color={vars.colors.textMuted}>
        {[
          format.dateTime(order.at),
          fillText(t.summary, { items: format.pieces(order.lines.reduce((sum, line) => sum + line.qty, 0)), total: format.money(total, order.currency), payment: format.payment(order.methodId), branch: format.branch(order.fulfilBranchId) }),
        ].join(' · ')}
      </Text>
    </Card>
  );

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button
            variant="secondary"
            disabled={Boolean(action.busy)}
            onClick={async () => {
              const order = await action.run('simulate', simulateOnlineOrder);
              if (order) setDone(fillText(t.simulated, { number: order.number }));
            }}
          >
            {t.simulate}
          </Button>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}
      <Tabs<OnlineOrderStatus> label={t.title} value={tab} onChange={setTab} tabs={statuses.map((value) => ({ value, label: t.tabs[value], count: views.filter((view) => view.order.status === value).length || undefined }))}>
        <AsyncContent state={state}>
          {(data) => {
            const shown = data.filter((view) => view.order.status === tab);
            return shown.length ? <Stack gap={vars.spacing[3]}>{shown.map(card)}</Stack> : <Notice>{t.none}</Notice>;
          }}
        </AsyncContent>
      </Tabs>
    </Stack>
  );
};
